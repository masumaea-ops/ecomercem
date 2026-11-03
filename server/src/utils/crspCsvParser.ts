/**
 * High-performance, fault-tolerant KRA CRSP CSV & Excel data parser.
 * Handles multiline headers, quoted fields with internal commas/newlines,
 * commercial equipment sections, and motorcycles.
 */

export interface ParsedCrspRecord {
  make: string;
  model: string;
  modelNumber?: string;
  transmission?: string;
  driveConfiguration?: string;
  engineSize?: number;
  bodyType?: string;
  gvw?: string;
  seating?: string;
  fuelType: string;
  crspValue: number;
  crspEdition?: string;
}

export function parseCrspCsvText(csvText: string, defaultEdition: string = '2025'): ParsedCrspRecord[] {
  const records: ParsedCrspRecord[] = [];
  if (!csvText || csvText.trim().length === 0) return records;

  // 1. Split CSV into rows while respecting quoted multiline fields
  const rows: string[] = [];
  let currentRow = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      currentRow += char;
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && csvText[i + 1] === '\n') {
        i++; // Skip \n in CRLF
      }
      if (currentRow.trim().length > 0) {
        rows.push(currentRow);
      }
      currentRow = '';
    } else {
      currentRow += char;
    }
  }
  if (currentRow.trim().length > 0) {
    rows.push(currentRow);
  }

  let currentSection: 'VEHICLES' | 'MOTORCYCLES' | 'MACHINERY' | 'UNKNOWN' = 'VEHICLES';
  let currentMachineryBrand = 'EQUIPMENT';

  for (let r = 0; r < rows.length; r++) {
    const rawLine = rows[r].trim();
    if (!rawLine) continue;

    // Detect section transitions or skip non-data rows
    if (rawLine.includes('TABULATION FOR') || rawLine.includes('DIRECT IMPORTS TO KENYA') || rawLine.includes('Prepared by:')) {
      // Reached summary/tabulation guidelines at the bottom of the sheet
      break;
    }

    if (rawLine.startsWith('MASSEY FERGUSON') || rawLine.startsWith('VOLVO CE EQUIPMENTS') || rawLine.startsWith('LIEBHERR') || rawLine.startsWith('CASE/NEW HOLLAND') || rawLine.startsWith('BOBCAT') || rawLine.startsWith('CAT') || rawLine.startsWith('JCB') || rawLine.startsWith('DYNAPAC') || rawLine.startsWith('JOHN DEERE')) {
      currentSection = 'MACHINERY';
      currentMachineryBrand = rawLine.replace(/,.*$/, '').trim();
      continue;
    }

    const columns = parseCsvRow(rawLine);
    if (columns.length === 0) continue;

    const firstCol = columns[0].trim().toUpperCase();
    const secondCol = (columns[1] || '').trim().toUpperCase();

    // Check if header row
    if (firstCol === 'MAKE' && secondCol === 'MODEL') {
      if (columns.some(c => c.toUpperCase().includes('BODY TYPE') || c.toUpperCase().includes('DRIVE'))) {
        currentSection = 'VEHICLES';
      } else {
        currentSection = 'MOTORCYCLES';
      }
      continue;
    }

    if (firstCol === 'MODEL' && (secondCol.includes('HORSEPOWER') || secondCol.includes('CC'))) {
      currentSection = 'MACHINERY';
      continue;
    }

    // Parse according to active section
    if (currentSection === 'VEHICLES') {
      // Columns: Make, Model, Model number, Transmission, Drive Config, Engine Capacity, Body Type, GVW, Seating, Fuel, CRSP (KES.)
      if (columns.length < 5) continue;
      const make = columns[0]?.trim();
      const model = columns[1]?.trim();
      if (!make || !model || make.toUpperCase() === 'MAKE') continue;

      const modelNumber = columns[2]?.trim() || undefined;
      const transmission = columns[3]?.trim() || undefined;
      const driveConfiguration = columns[4]?.trim() || undefined;
      const engineCapacityRaw = columns[5]?.trim() || '';
      const bodyType = columns[6]?.trim() || undefined;
      const gvw = columns[7]?.trim() || undefined;
      const seating = columns[8]?.trim() || undefined;
      const fuelRaw = columns[9]?.trim() || '';
      const crspRaw = columns[10]?.trim() || columns[columns.length - 1]?.trim() || '';

      const crspValue = cleanNumeric(crspRaw);
      if (isNaN(crspValue) || crspValue <= 0) continue;

      const engineCc = extractEngineCc(engineCapacityRaw);
      const fuelType = normalizeFuelType(fuelRaw);

      records.push({
        make: make.toUpperCase(),
        model,
        modelNumber,
        transmission,
        driveConfiguration,
        engineSize: engineCc,
        bodyType,
        gvw,
        seating,
        fuelType,
        crspValue,
        crspEdition: defaultEdition
      });
    } else if (currentSection === 'MOTORCYCLES') {
      // Columns: Make, Model, Model number, Transmission, Engine Capacity, seating, Fuel, CRSP (KES)
      if (columns.length < 5) continue;
      const make = columns[0]?.trim();
      const model = columns[1]?.trim();
      if (!make || !model || make.toUpperCase() === 'MAKE') continue;

      const modelNumber = columns[2]?.trim() || undefined;
      const transmission = columns[3]?.trim() || undefined;
      const engineCapacityRaw = columns[4]?.trim() || '';
      const seating = columns[5]?.trim() || undefined;
      const fuelRaw = columns[6]?.trim() || '';
      const crspRaw = columns[7]?.trim() || '';

      const crspValue = cleanNumeric(crspRaw);
      if (isNaN(crspValue) || crspValue <= 0) continue;

      records.push({
        make: make.toUpperCase(),
        model,
        modelNumber,
        transmission,
        engineSize: extractEngineCc(engineCapacityRaw),
        bodyType: 'MOTORCYCLE',
        seating,
        fuelType: normalizeFuelType(fuelRaw),
        crspValue,
        crspEdition: defaultEdition
      });
    } else if (currentSection === 'MACHINERY') {
      // Model, Horsepower/CC, Value
      const model = columns[0]?.trim();
      if (!model || model.toUpperCase() === 'MODEL' || model.toUpperCase() === 'KSHS') continue;
      const powerRaw = columns[1]?.trim() || '';
      const crspRaw = columns[2]?.trim() || columns[3]?.trim() || '';

      const crspValue = cleanNumeric(crspRaw);
      if (isNaN(crspValue) || crspValue <= 0) continue;

      records.push({
        make: currentMachineryBrand.toUpperCase(),
        model,
        engineSize: extractEngineCc(powerRaw),
        bodyType: 'HEAVY MACHINERY',
        fuelType: 'DIESEL',
        crspValue,
        crspEdition: defaultEdition
      });
    }
  }

  return records;
}

function parseCsvRow(rowString: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < rowString.length; i++) {
    const char = rowString[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function cleanNumeric(val: string): number {
  if (!val) return NaN;
  const cleaned = val.replace(/[^0-9.]/g, '');
  return parseFloat(cleaned);
}

function extractEngineCc(val: string): number {
  if (!val) return 0;
  // If e.g. "63 kWh", return 63 or 0
  if (val.toLowerCase().includes('kwh')) {
    const m = val.match(/([0-9.]+)/);
    return m ? Math.round(parseFloat(m[1])) : 0;
  }
  // If e.g. "1496" or "2000cc" or "1.5L"
  const m = val.match(/([0-9]+)/);
  return m ? parseInt(m[1], 10) : 0;
}

function normalizeFuelType(raw: string): string {
  const upper = (raw || '').toUpperCase().trim();
  if (upper.includes('ELEC') || upper.includes('EV')) return 'ELECTRIC';
  if (upper.includes('PLUG-IN') || upper.includes('PHEV')) return 'PLUG-IN HYBRID';
  if (upper.includes('HYBRID') || upper.includes('HEV')) return 'HYBRID';
  if (upper.includes('DIESEL')) return 'DIESEL';
  if (upper.includes('GAS') || upper.includes('PETROL')) return 'GASOLINE';
  if (upper.includes('CNG')) return 'CNG';
  if (upper.includes('LNG')) return 'LNG';
  return 'GASOLINE';
}
