
import { AppDataSource } from '../config/database';
import { AuditLog } from '../entities/AuditLog';
import { User } from '../entities/User';

export class AuditService {
  private static repo = AppDataSource.getRepository(AuditLog);

  static async log(
    action: string,
    resourceId: string,
    details: string,
    user?: User,
    ip?: string
  ) {
    try {
      const log = new AuditLog();
      log.action = action;
      log.resourceId = resourceId;
      log.details = details;
      log.user = user;
      log.ipAddress = ip;

      // Fire and forget - don't await strictly to avoid blocking main thread too long
      await this.repo.save(log);
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }
}
