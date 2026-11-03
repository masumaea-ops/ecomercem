
import { AppDataSource } from '../config/database';
import { ProductStock } from '../entities/ProductStock';
import { Product } from '../entities/Product';
import { Branch } from '../entities/Branch';
import { AuditService } from './auditService';

export class InventoryService {
  private static stockRepo = AppDataSource.getRepository(ProductStock);

  static async getStockForBranch(branchId: string, lowStockOnly: boolean = false) {
    const query = this.stockRepo.createQueryBuilder('stock')
      .leftJoinAndSelect('stock.product', 'product')
      .leftJoinAndSelect('stock.branch', 'branch')
      .where('stock.branchId = :branchId', { branchId });

    if (lowStockOnly) {
      query.andWhere('stock.quantity <= stock.lowStockThreshold');
    }

    return query.getMany();
  }

  static async updateStock(productId: string, branchId: string, quantity: number, operation: 'set' | 'add' | 'subtract') {
    let stockEntry = await this.stockRepo.findOne({
      where: { product: { id: productId } as any, branch: { id: branchId } as any }
    });

    if (!stockEntry) {
      // Create new entry if it doesn't exist
      stockEntry = new ProductStock();
      stockEntry.product = { id: productId } as Product;
      stockEntry.branch = { id: branchId } as Branch;
      stockEntry.quantity = 0;
      stockEntry.lowStockThreshold = 5; // Default
    }

    if (operation === 'set') {
      stockEntry.quantity = quantity;
    } else if (operation === 'add') {
      stockEntry.quantity += quantity;
    } else if (operation === 'subtract') {
      stockEntry.quantity = Math.max(0, stockEntry.quantity - quantity);
    }

    return this.stockRepo.save(stockEntry);
  }

  static async transferStock(productId: string, fromBranchId: string, toBranchId: string, quantity: number, userId: string) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const stockRepo = queryRunner.manager.getRepository(ProductStock);

      // 1. Get Source Stock
      const sourceStock = await stockRepo.findOne({
        where: { product: { id: productId } as any, branch: { id: fromBranchId } as any },
        lock: { mode: 'pessimistic_write' }
      });

      if (!sourceStock || sourceStock.quantity < quantity) {
        throw new Error('Insufficient stock at source branch');
      }

      // 2. Get/Create Destination Stock
      let destStock = await stockRepo.findOne({
        where: { product: { id: productId } as any, branch: { id: toBranchId } as any },
        lock: { mode: 'pessimistic_write' }
      });

      if (!destStock) {
        destStock = new ProductStock();
        destStock.product = { id: productId } as any;
        destStock.branch = { id: toBranchId } as any;
        destStock.quantity = 0;
      }

      // 3. Perform Transfer
      sourceStock.quantity -= quantity;
      destStock.quantity += quantity;

      await stockRepo.save(sourceStock);
      await stockRepo.save(destStock);

      await queryRunner.commitTransaction();

      // 4. Audit Log (Async)
      AuditService.log(
        'STOCK_TRANSFER', 
        productId, 
        `Transferred ${quantity} units from Branch ${fromBranchId} to ${toBranchId}`, 
        { id: userId } as any
      );

      return { source: sourceStock, dest: destStock };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
