import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { AppDataSource } from '../config/database';
import { config } from '../config/env';
import { authenticate, authorize } from '../middleware/auth';
import { AuditService } from '../services/auditService';
import { SeedService } from '../services/seedService';
import { Branch } from '../entities/Branch';
import { User, UserRole } from '../entities/User';
import { Category } from '../entities/Category';
import { Product } from '../entities/Product';
import { SystemSetting } from '../entities/SystemSetting';

const router = Router();

// Secure backup directory in server storage
const BACKUP_DIR = path.resolve(process.cwd(), 'backups');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Helper to escape SQL values safely
function escapeSqlValue(value: any): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }
  if (typeof value === 'number') {
    return isFinite(value) ? String(value) : 'NULL';
  }
  if (value instanceof Date) {
    return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
  }
  if (typeof value === 'object') {
    // Array or JSON object
    const str = JSON.stringify(value);
    return `'${str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
      switch (char) {
        case '\0': return '\\0';
        case '\x08': return '\\b';
        case '\x09': return '\\t';
        case '\x1a': return '\\z';
        case '\n': return '\\n';
        case '\r': return '\\r';
        case '"':
        case "'":
        case '\\':
        case '%': return '\\' + char;
        default: return char;
      }
    })}'`;
  }
  
  // String escaping
  const str = String(value);
  return `'${str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
    switch (char) {
      case '\0': return '\\0';
      case '\x08': return '\\b';
      case '\x09': return '\\t';
      case '\x1a': return '\\z';
      case '\n': return '\\n';
      case '\r': return '\\r';
      case '"':
      case "'":
      case '\\':
      case '%': return '\\' + char;
      default: return char;
    }
  })}'`;
}

// Format bytes into human readable string
function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// 1. GET /api/backup/stats - Real-time statistics across all tables
router.get('/stats', authenticate, authorize(['ADMIN']), async (req: Request, res: Response) => {
  try {
    if (!AppDataSource.isInitialized) {
      return res.status(503).json({ error: 'Database is not initialized' });
    }

    const metadatas = AppDataSource.entityMetadatas;
    const tableStats: Record<string, number> = {};
    let totalRecords = 0;

    for (const meta of metadatas) {
      try {
        const repo = AppDataSource.getRepository(meta.target);
        const count = await repo.count();
        tableStats[meta.tableName] = count;
        totalRecords += count;
      } catch (err) {
        tableStats[meta.tableName] = 0;
      }
    }

    const dbName = (AppDataSource.options as any).database || config.DB_NAME;

    res.json({
      success: true,
      dbType: 'MySQL 8.0',
      database: dbName,
      totalTables: metadatas.length,
      totalRecords,
      tables: tableStats
    });
  } catch (error: any) {
    console.error('Backup stats error:', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve database stats' });
  }
});

// 2. GET /api/backup/list - List all generated backup snapshots
router.get('/list', authenticate, authorize(['ADMIN']), async (req: Request, res: Response) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return res.json({ backups: [] });
    }

    const files = fs.readdirSync(BACKUP_DIR);
    const backupList = files
      .filter(f => f.endsWith('.sql') || f.endsWith('.json'))
      .map(filename => {
        const filePath = path.join(BACKUP_DIR, filename);
        const stat = fs.statSync(filePath);
        return {
          filename,
          size: stat.size,
          formattedSize: formatBytes(stat.size),
          createdAt: stat.birthtime || stat.mtime,
          format: filename.endsWith('.sql') ? 'SQL' : 'JSON'
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ success: true, backups: backupList });
  } catch (error: any) {
    console.error('Backup list error:', error);
    res.status(500).json({ error: error.message || 'Failed to list backups' });
  }
});

// 3. POST /api/backup/create - Initiate on-demand database backup
router.post('/create', authenticate, authorize(['ADMIN']), async (req: Request, res: Response) => {
  try {
    if (!AppDataSource.isInitialized) {
      return res.status(503).json({ error: 'Database is not initialized' });
    }

    const format = (req.query.format === 'json' ? 'json' : 'sql');
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:T]/g, '-').slice(0, 19);
    const filename = `masuma_backup_${timestamp}.${format}`;
    const filePath = path.join(BACKUP_DIR, filename);

    const metadatas = AppDataSource.entityMetadatas;
    let totalRows = 0;
    const tableSummary: Record<string, number> = {};

    if (format === 'json') {
      const fullDump: Record<string, any[]> = {};

      for (const meta of metadatas) {
        const repo = AppDataSource.getRepository(meta.target);
        const rows = await repo.find();
        fullDump[meta.tableName] = rows;
        totalRows += rows.length;
        tableSummary[meta.tableName] = rows.length;
      }

      const payload = {
        metadata: {
          app: 'Masuma Autoparts East Africa ERP',
          generatedAt: now.toISOString(),
          totalTables: metadatas.length,
          totalRecords: totalRows
        },
        data: fullDump
      };

      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
    } else {
      // Generate standard SQL Dump
      const writeStream = fs.createWriteStream(filePath, { flags: 'w', encoding: 'utf8' });

      writeStream.write(`-- ========================================================\n`);
      writeStream.write(`-- Masuma Autoparts East Africa Limited\n`);
      writeStream.write(`-- Official Database Backup Snapshot\n`);
      writeStream.write(`-- Generated: ${now.toUTCString()}\n`);
      writeStream.write(`-- Total Registered Entities: ${metadatas.length}\n`);
      writeStream.write(`-- ========================================================\n\n`);
      writeStream.write(`SET FOREIGN_KEY_CHECKS = 0;\n`);
      writeStream.write(`SET NAMES utf8mb4;\n\n`);

      for (const meta of metadatas) {
        const tableName = meta.tableName;
        const repo = AppDataSource.getRepository(meta.target);
        const columns = meta.columns.map(c => c.databaseName);

        writeStream.write(`--\n-- Table structure and data for table \`${tableName}\`\n--\n`);

        const count = await repo.count();
        tableSummary[tableName] = count;
        totalRows += count;

        if (count > 0) {
          // Stream rows in chunks of 500 to keep memory low
          const CHUNK_SIZE = 500;
          let offset = 0;

          while (offset < count) {
            const chunk = await repo.find({
              skip: offset,
              take: CHUNK_SIZE
            });

            if (chunk.length > 0) {
              const columnList = columns.map(c => `\`${c}\``).join(', ');
              const valueRows: string[] = [];

              for (const row of chunk) {
                const values = meta.columns.map(col => {
                  const val = (row as any)[col.propertyName];
                  return escapeSqlValue(val);
                });
                valueRows.push(`(${values.join(', ')})`);
              }

              writeStream.write(`INSERT INTO \`${tableName}\` (${columnList}) VALUES\n${valueRows.join(',\n')};\n`);
            }

            offset += CHUNK_SIZE;
          }
        }
        writeStream.write(`\n`);
      }

      writeStream.write(`SET FOREIGN_KEY_CHECKS = 1;\n`);
      writeStream.write(`-- ========================================================\n`);
      writeStream.write(`-- Backup Complete: ${totalRows} records dumped\n`);
      writeStream.write(`-- ========================================================\n`);

      await new Promise<void>((resolve, reject) => {
        writeStream.end(() => resolve());
        writeStream.on('error', reject);
      });
    }

    const stat = fs.statSync(filePath);
    const formattedSize = formatBytes(stat.size);

    // Record in Audit Log
    const user = (req as any).user;
    await AuditService.log(
      'DATABASE_BACKUP_CREATED',
      filename,
      JSON.stringify({
        filename,
        size: formattedSize,
        totalTables: metadatas.length,
        totalRows,
        format: format.toUpperCase()
      }),
      user,
      req.ip
    );

    res.json({
      success: true,
      message: 'Database backup completed successfully',
      backup: {
        filename,
        size: stat.size,
        formattedSize,
        createdAt: now.toISOString(),
        tablesCount: metadatas.length,
        totalRows,
        format: format.toUpperCase(),
        summary: tableSummary
      }
    });
  } catch (error: any) {
    console.error('Database backup execution error:', error);
    res.status(500).json({ error: error.message || 'Failed to create database backup' });
  }
});

// 4. GET /api/backup/download/:filename - Secure download to local computer
router.get('/download/:filename', authenticate, authorize(['ADMIN']), (req: Request, res: Response) => {
  try {
    const rawFilename = req.params.filename;
    // Prevent path traversal attacks
    const safeFilename = path.basename(rawFilename);
    const filePath = path.join(BACKUP_DIR, safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Requested backup file does not exist' });
    }

    const isSql = safeFilename.endsWith('.sql');
    const contentType = isSql ? 'application/sql' : 'application/json';

    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Type', contentType);

    res.download(filePath, safeFilename, (err) => {
      if (err) {
        console.error('Error streaming backup file:', err);
      }
    });
  } catch (error: any) {
    console.error('Download backup error:', error);
    res.status(500).json({ error: error.message || 'Failed to download backup' });
  }
});

// 5. DELETE /api/backup/:filename - Delete old backup file
router.delete('/:filename', authenticate, authorize(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const rawFilename = req.params.filename;
    const safeFilename = path.basename(rawFilename);
    const filePath = path.join(BACKUP_DIR, safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }

    fs.unlinkSync(filePath);

    const user = (req as any).user;
    await AuditService.log(
      'DATABASE_BACKUP_DELETED',
      safeFilename,
      `Admin deleted backup snapshot ${safeFilename}`,
      user,
      req.ip
    );

    res.json({ success: true, message: `Backup file ${safeFilename} deleted successfully` });
  } catch (error: any) {
    console.error('Delete backup error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete backup file' });
  }
});

// 6. POST /api/backup/migrate - Run schema synchronization/migrations
router.post('/migrate', authenticate, authorize(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const success = await SeedService.syncDatabaseSchema();
    const user = (req as any).user;
    await AuditService.log(
      'DATABASE_SCHEMA_MIGRATION_RUN',
      'System',
      'Administrator initiated schema synchronization',
      user,
      req.ip
    );

    res.json({
      success,
      message: success ? 'Database schema synchronized successfully' : 'Schema synchronization finished with warnings',
      totalTables: AppDataSource.entityMetadatas.length
    });
  } catch (error: any) {
    console.error('Schema migration error:', error);
    res.status(500).json({ error: error.message || 'Failed to run schema migration' });
  }
});

// 7. POST /api/backup/seed - Run idempotent baseline data seeding
router.post('/seed', authenticate, authorize(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const result = await SeedService.runAutoMigrationAndSeed();
    const user = (req as any).user;
    await AuditService.log(
      'DATABASE_SEEDING_RUN',
      'System',
      `Administrator initiated baseline seeding: ${result.categoriesCreated} categories, ${result.productsCreated} products, ${result.settingsCreated} settings`,
      user,
      req.ip
    );

    res.json(result);
  } catch (error: any) {
    console.error('Seeding error:', error);
    res.status(500).json({ error: error.message || 'Failed to run database seeding' });
  }
});

// 8. GET /api/backup/migration-status - Check current migration & seeding status
router.get('/migration-status', authenticate, authorize(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const totalTables = AppDataSource.entityMetadatas.length;
    const branchCount = await AppDataSource.getRepository(Branch).count();
    const adminExists = !!(await AppDataSource.getRepository(User).findOne({ where: { role: UserRole.ADMIN } }));
    const categoryCount = await AppDataSource.getRepository(Category).count();
    const productCount = await AppDataSource.getRepository(Product).count();
    const settingsCount = await AppDataSource.getRepository(SystemSetting).count();

    res.json({
      success: true,
      totalTables,
      branchCount,
      adminExists,
      categoryCount,
      productCount,
      settingsCount
    });
  } catch (error: any) {
    console.error('Migration status error:', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve migration status' });
  }
});

export default router;
