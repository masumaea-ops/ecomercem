import * as XLSX from 'xlsx';

export interface ParsedCrspRecord {
  make: string;
  model: string;
  modelNumber?: string;
  transmission?: string;
  driveConfiguration?: string;
  engineSize?: number;
  category?: string;
  gvw?: string;
  seating?: string;
  fuelType: string;
  crspValue: number;
  crspEdition?: string;
}

export function parseCrspWorkbook(fileBuffer: Buffer, defaultEdition: string = '2025'): ParsedCrspRecord[] {
  const records: ParsedCrspRecord[] = [];
  const wb = XLSX.read(fileBuffer, { type: 'buffer' });

  for (const sheetName of wb.SheetNames) {
    const upperSheet = sheetName.toUpperCase();
    if (upperSheet.includes('TEMPLATE') || upperSheet.includes('GUIDELINE')) {
      // Skip the documentation / formula explanation sheet
      continue;
    }

    const ws = wb.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
    if (!rawRows || rawRows.length < 2) continue;

    // Detect header row by scanning first 6 rows
    let headerRowIdx = -1;
    let colMap: Record<string, number> = {};

    for (let r = 0; r < Math.min(6, rawRows.length); r++) {
      const row = rawRows[r];
      if (!Array.isArray(row)) continue;
      const normalizedCells = row.map(c => String(c || '').toUpperCase().replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim());

      const hasMake = normalizedCells.some(c => c === 'MAKE' || c.startsWith('MAKE '));
      const hasModel = normalizedCells.some(c => c === 'MODEL' || c.startsWith('MODEL '));

      if (hasMake || hasModel) {
        headerRowIdx = r;
        normalizedCells.forEach((cell, idx) => {
          if (cell === 'MAKE' || cell.startsWith('MAKE ')) colMap['make'] = idx;
          else if (cell.includes('MODEL NUMBER') || cell.includes('MODEL NO') || cell.includes('CHASSIS') || cell.includes('FRAME')) colMap['modelNumber'] = idx;
          else if (cell === 'MODEL' || cell.startsWith('MODEL ')) colMap['model'] = idx;
          else if (cell.includes('TRANSMISSION') || cell.includes('TRANS')) colMap['transmission'] = idx;
          else if (cell.includes('DRIVE') || cell.includes('CONFIG')) colMap['drive'] = idx;
          else if (cell.includes('ENGINE') || cell.includes('CAPACITY') || cell.includes('CC') || cell.includes('HORSEPOWER') || cell.includes('KWH')) colMap['engine'] = idx;
          else if (cell.includes('BODY') || cell.includes('TYPE') || cell.includes('CATEGORY')) colMap['body'] = idx;
          else if (cell.includes('GVW') || cell.includes('WEIGHT')) colMap['gvw'] = idx;
          else if (cell.includes('SEAT')) colMap['seating'] = idx;
          else if (cell.includes('FUEL')) colMap['fuel'] = idx;
          else if (cell.includes('CRSP') || cell.includes('KES') || cell.includes('KSHS') || cell.includes('VALUE') || cell.includes('BENCHMARK')) colMap['crsp'] = idx;
        });
        break;
      }
    }

    if (upperSheet.includes('TRACTOR') || upperSheet.includes('GRADER')) {
      let currentBrand = 'TRACTOR';
      for (let i = (headerRowIdx !== -1 ? headerRowIdx + 1 : 2); i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || row.length === 0) continue;

        const first = row[0] ? String(row[0]).trim() : '';
        if (first.includes('MASSEY') || first.includes('VOLVO') || first.includes('LIEBHERR') || first.includes('CASE') || first.includes('BOBCAT') || first.includes('CAT') || first.includes('JCB') || first.includes('DYNAPAC') || first.includes('JOHN DEERE')) {
          currentBrand = first;
          continue;
        }

        if (!first || first.toUpperCase() === 'MODEL' || first.toUpperCase() === 'KSHS') continue;

        const powerRaw = row[1] ? String(row[1]).trim() : '';
        const crspRaw = row[2] !== undefined ? row[2] : row[3];
        const crspValue = cleanNumeric(crspRaw);
        if (isNaN(crspValue) || crspValue <= 0) continue;

        records.push({
          make: currentBrand.toUpperCase(),
          model: first,
          engineSize: extractEngineCc(powerRaw),
          category: 'HEAVY MACHINERY',
          fuelType: 'DIESEL',
          crspValue,
          crspEdition: defaultEdition
        });
      }
    } else if (headerRowIdx !== -1 && (colMap['model'] !== undefined || colMap['make'] !== undefined)) {
      // Dynamic header mapping for Vehicles, Motorcycles, or any generic CRSP sheet
      const startRow = headerRowIdx + 1;
      const isMotorcycle = upperSheet.includes('MOTOR') || upperSheet.includes('CYCLE');

      for (let i = startRow; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || row.length === 0) continue;

        const makeRaw = colMap['make'] !== undefined ? row[colMap['make']] : row[0];
        const modelRaw = colMap['model'] !== undefined ? row[colMap['model']] : row[1];
        if (!makeRaw || !modelRaw) continue;

        const make = String(makeRaw).trim();
        const model = String(modelRaw).trim();
        if (!make || !model || make.toUpperCase() === 'MAKE') continue;

        const modelNumber = colMap['modelNumber'] !== undefined && row[colMap['modelNumber']] ? String(row[colMap['modelNumber']]).trim() : undefined;
        const transmission = colMap['transmission'] !== undefined && row[colMap['transmission']] ? String(row[colMap['transmission']]).trim() : undefined;
        const driveConfiguration = colMap['drive'] !== undefined && row[colMap['drive']] ? String(row[colMap['drive']]).trim() : undefined;
        const engineRaw = colMap['engine'] !== undefined && row[colMap['engine']] ? String(row[colMap['engine']]).trim() : '';
        const bodyType = colMap['body'] !== undefined && row[colMap['body']] ? String(row[colMap['body']]).trim() : (isMotorcycle ? 'MOTORCYCLE' : 'SUV');
        const gvw = colMap['gvw'] !== undefined && row[colMap['gvw']] ? String(row[colMap['gvw']]).trim() : undefined;
        const seating = colMap['seating'] !== undefined && row[colMap['seating']] ? String(row[colMap['seating']]).trim() : undefined;
        const fuelRaw = colMap['fuel'] !== undefined && row[colMap['fuel']] ? String(row[colMap['fuel']]).trim() : '';

        const crspRaw = colMap['crsp'] !== undefined && row[colMap['crsp']] !== undefined ? row[colMap['crsp']] : row[row.length - 1];
        const crspValue = cleanNumeric(crspRaw);
        if (isNaN(crspValue) || crspValue <= 0) continue;

        records.push({
          make: make.toUpperCase(),
          model,
          modelNumber,
          transmission,
          driveConfiguration,
          engineSize: extractEngineCc(engineRaw),
          category: bodyType,
          gvw,
          seating,
          fuelType: normalizeFuelType(fuelRaw),
          crspValue,
          crspEdition: defaultEdition
        });
      }
    } else {
      // Fallback for sheets without recognized header row
      for (let i = 0; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || !row[0] || !row[1]) continue;
        const make = String(row[0]).trim();
        const model = String(row[1]).trim();
        if (make.toUpperCase() === 'MAKE' || model.toUpperCase() === 'MODEL') continue;

        const crspVal = cleanNumeric(row[row.length - 1]);
        if (make && model && !isNaN(crspVal) && crspVal > 0) {
          records.push({
            make: make.toUpperCase(),
            model,
            fuelType: 'GASOLINE',
            crspValue: crspVal,
            crspEdition: defaultEdition
          });
        }
      }
    }
  }

  return records;
}

function cleanNumeric(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return NaN;
  const cleaned = String(val).replace(/[^0-9.]/g, '');
  return parseFloat(cleaned);
}

function extractEngineCc(val: any): number {
  if (typeof val === 'number') return Math.round(val);
  if (!val) return 0;
  const str = String(val);
  if (str.toLowerCase().includes('kwh')) {
    const m = str.match(/([0-9.]+)/);
    return m ? Math.round(parseFloat(m[1])) : 0;
  }
  const m = str.match(/([0-9]+)/);
  return m ? parseInt(m[1], 10) : 0;
}

function normalizeFuelType(raw: any): string {
  const upper = String(raw || '').toUpperCase().trim();
  if (upper.includes('ELEC') || upper.includes('EV')) return 'ELECTRIC';
  if (upper.includes('PLUG-IN') || upper.includes('PHEV')) return 'PLUG-IN HYBRID';
  if (upper.includes('HYBRID') || upper.includes('HEV')) return 'HYBRID';
  if (upper.includes('DIESEL')) return 'DIESEL';
  if (upper.includes('GAS') || upper.includes('PETROL')) return 'GASOLINE';
  if (upper.includes('CNG')) return 'CNG';
  if (upper.includes('LNG')) return 'LNG';
  return 'GASOLINE';
}
