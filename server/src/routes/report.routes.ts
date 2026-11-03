import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { Sale } from '../entities/Sale';
import { ProductStock } from '../entities/ProductStock';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Helper to escape CSV fields
const escapeCsv = (field: any) => {
  if (field === null || field === undefined) return '';
  const stringValue = String(field);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

// GET /api/reports/sales
router.get('/sales', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res) => {
    try {
        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(0); // Epoch if no start
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
        const format = req.query.format as string || 'csv';
        
        // Adjust end date to end of day
        endDate.setHours(23, 59, 59, 999);

        const salesRepo = AppDataSource.getRepository(Sale);
        
        const query = salesRepo.createQueryBuilder('sale')
            .leftJoinAndSelect('sale.customer', 'customer')
            .leftJoinAndSelect('sale.cashier', 'cashier')
            .where('sale.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
            .orderBy('sale.createdAt', 'DESC');

        if (format === 'json') {
            const sales = await query.getMany();
            const jsonData = sales.map(sale => ({
                receiptNumber: sale.receiptNumber,
                date: new Date(sale.createdAt).toLocaleString(),
                customer: sale.customerName || 'Walk-in',
                paymentMethod: sale.paymentMethod,
                itemsCount: sale.itemsCount || (sale.itemsSnapshot ? (sale.itemsSnapshot as any[]).length : 0),
                netAmount: Number(sale.netAmount || (sale.totalAmount / 1.16)),
                taxAmount: Number(sale.taxAmount || (sale.totalAmount - (sale.totalAmount / 1.16))),
                totalAmount: Number(sale.totalAmount),
                cashier: sale.cashier?.fullName || 'System',
                kraStatus: sale.kraControlCode ? 'Signed' : 'Pending'
            }));
            return res.json(jsonData);
        }

        // Stream CSV
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="sales_report_${Date.now()}.csv"`);
        
        res.write('Receipt Number,Date,Customer,Payment Method,Items Count,Net Amount,VAT (16%),Total Amount (KES),Cashier,KRA Status\n');

        const stream = await query.stream();

        for await (const sale of stream) {
            const total = Number(sale.sale_totalAmount);
            const net = Number(sale.sale_netAmount || (total / 1.16));
            const tax = Number(sale.sale_taxAmount || (total - net));

            const row = [
                sale.sale_receiptNumber,
                new Date(sale.sale_createdAt).toLocaleString(),
                sale.customer_name || 'Walk-in',
                sale.sale_paymentMethod,
                sale.sale_itemsSnapshot ? JSON.parse(sale.sale_itemsSnapshot).length : 0,
                net.toFixed(2),
                tax.toFixed(2),
                total.toFixed(2),
                sale.cashier_fullName || 'System',
                sale.sale_kraControlCode ? 'Signed' : 'Pending'
            ].map(escapeCsv).join(',');

            res.write(row + '\n');
        }

        res.end();
    } catch (error) {
        console.error(error);
        if (!res.headersSent) res.status(500).json({ error: 'Failed to generate report' });
    }
});

// GET /api/reports/inventory
router.get('/inventory', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res) => {
    try {
        const format = req.query.format as string || 'csv';

        const query = AppDataSource.getRepository(ProductStock)
            .createQueryBuilder('stock')
            .leftJoinAndSelect('stock.product', 'product')
            .leftJoinAndSelect('product.category', 'category')
            .leftJoinAndSelect('stock.branch', 'branch');

        if (format === 'json') {
            const stocks = await query.getMany();
            const jsonData = stocks.map(item => ({
                productName: item.product.name,
                sku: item.product.sku,
                category: item.product.category?.name || 'Uncategorized',
                branch: item.branch.name,
                quantity: item.quantity,
                unitPriceExclVAT: Number(item.product.price),
                vatAmount: parseFloat((Number(item.product.price) * 0.16).toFixed(2)),
                unitPriceInclVAT: parseFloat((Number(item.product.price) * 1.16).toFixed(2)),
                totalValueExclVAT: parseFloat((Number(item.quantity) * Number(item.product.price)).toFixed(2)),
                status: item.quantity <= item.lowStockThreshold ? 'LOW STOCK' : 'OK'
            }));
            return res.json(jsonData);
        }

        // CSV Stream
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="inventory_valuation_${Date.now()}.csv"`);
        
        res.write('Product Name,SKU,Category,Branch,Quantity,Unit Price (Excl),VAT,Unit Price (Incl),Total Value (Excl),Status\n');

        const stockStream = await query.stream();

        for await (const item of stockStream) {
            const qty = item.stock_quantity;
            const priceExcl = Number(item.product_price);
            const vat = parseFloat((priceExcl * 0.16).toFixed(2));
            const priceIncl = parseFloat((priceExcl + vat).toFixed(2));
            const valueExcl = parseFloat((qty * priceExcl).toFixed(2));
            const status = qty <= item.stock_lowStockThreshold ? 'LOW STOCK' : 'OK';

            const row = [
                item.product_name,
                item.product_sku,
                item.category_name,
                item.branch_name,
                qty,
                priceExcl.toFixed(2),
                vat.toFixed(2),
                priceIncl.toFixed(2),
                valueExcl.toFixed(2),
                status
            ].map(escapeCsv).join(',');

            res.write(row + '\n');
        }

        res.end();
    } catch (error) {
        console.error(error);
        if (!res.headersSent) res.status(500).json({ error: 'Failed to generate report' });
    }
});

export default router;