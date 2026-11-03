import { EventSubscriber, EntitySubscriberInterface, InsertEvent, UpdateEvent, RemoveEvent } from 'typeorm';
import { Product } from '../entities/Product';
import { CacheService } from '../lib/cache';

@EventSubscriber()
export class ProductSubscriber implements EntitySubscriberInterface<Product> {
  listenTo() {
    return Product;
  }

  async afterInsert(event: InsertEvent<Product>): Promise<void> {
    await this.invalidateProductCache(event.entity?.id);
  }

  async afterUpdate(event: UpdateEvent<Product>): Promise<void> {
    const id = event.entity?.id || (event.databaseEntity && event.databaseEntity.id);
    await this.invalidateProductCache(id);
  }

  async afterRemove(event: RemoveEvent<Product>): Promise<void> {
    const id = (event.entityId as string) || event.entity?.id;
    await this.invalidateProductCache(id);
  }

  private async invalidateProductCache(productId?: string): Promise<void> {
    try {
      await CacheService.invalidate('products:*');
      await CacheService.invalidate('autocomplete:*');
      if (productId) {
        await CacheService.invalidate(`product:detail:${productId}`);
      }
    } catch (error) {
      console.error('ProductSubscriber Cache Invalidation Error:', error);
    }
  }
}
