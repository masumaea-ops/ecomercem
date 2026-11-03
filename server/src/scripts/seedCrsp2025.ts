import { AppDataSource } from '../config/database';
import { CrspData } from '../entities/CrspData';
import { parseCrspWorkbook } from '../utils/crspWorkbookParser';
import fs from 'fs';
import path from 'path';

async function seedCrsp2025() {
  console.log('--- Seeding Official KRA 2025 CRSP Schedule ---');
  await AppDataSource.initialize();
  console.log('Database connected.');

  console.log('Synchronizing schema to ensure tables exist...');
  await AppDataSource.synchronize();
  console.log('Schema synchronized successfully.');

  const xlsxPath = path.resolve(__dirname, '../data/crsp_2025_template.xlsx');
  if (!fs.existsSync(xlsxPath)) {
    console.error('File not found:', xlsxPath);
    process.exit(1);
  }

  const buffer = fs.readFileSync(xlsxPath);
  console.log('Parsing workbook...');
  const records = parseCrspWorkbook(buffer, '2025');
  console.log(`Parsed ${records.length} records from sheets.`);

  const crspRepo = AppDataSource.getRepository(CrspData);

  // Clear existing 2025 records
  console.log('Clearing old 2025 records...');
  await crspRepo.createQueryBuilder().delete().where('crspEdition = :edition', { edition: '2025' }).execute();

  console.log('Inserting in chunks of 500...');
  const CHUNK_SIZE = 500;
  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE);
    const entities = crspRepo.create(chunk);
    await crspRepo.save(entities);
    console.log(`Saved ${Math.min(i + CHUNK_SIZE, records.length)} / ${records.length}`);
  }

  console.log('CRSP 2025 Seeding Complete!');
  await AppDataSource.destroy();
  process.exit(0);
}

seedCrsp2025().catch((err) => {
  console.error('CRSP Seeding Failed:', err);
  process.exit(1);
});
