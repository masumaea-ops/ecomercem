const fs = require('fs');
const path = require('path');
const { parseCrspWorkbook } = require('../dist/utils/crspWorkbookParser');
const { parseCrspCsvText } = require('../dist/utils/crspCsvParser');

const xlsxPath = path.join(__dirname, '../src/data/crsp_2025_template.xlsx');
const csvOutputPath = path.join(__dirname, '../src/data/crsp_2025_template.csv');
const distCsvOutputPath = path.join(__dirname, '../dist/data/crsp_2025_template.csv');

const buf = fs.readFileSync(xlsxPath);
const records = parseCrspWorkbook(buf, '2025');

console.log(`Parsed ${records.length} records from Excel workbook.`);

const headers = [
  'Make',
  'Model',
  'Model number',
  'Transmission',
  'Drive Configuration',
  'Engine Capacity',
  'Body Type',
  'GVW',
  'Seating',
  'Fuel',
  'CRSP (KES.)'
];

function escapeCsv(val) {
  if (val === undefined || val === null) return '';
  const str = String(val).trim();
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

const lines = [headers.join(',')];
for (const r of records) {
  const row = [
    escapeCsv(r.make),
    escapeCsv(r.model),
    escapeCsv(r.modelNumber || ''),
    escapeCsv(r.transmission || ''),
    escapeCsv(r.driveConfiguration || ''),
    escapeCsv(r.engineSize || ''),
    escapeCsv(r.category || r.bodyType || 'CAR'),
    escapeCsv(r.gvw || ''),
    escapeCsv(r.seating || ''),
    escapeCsv(r.fuelType || 'GASOLINE'),
    Math.round(r.crspValue)
  ];
  lines.push(row.join(','));
}

const csvOutput = lines.join('\r\n');
fs.writeFileSync(csvOutputPath, csvOutput, 'utf8');

// Also write to dist/data if dist exists
const distDataDir = path.dirname(distCsvOutputPath);
if (!fs.existsSync(distDataDir)) {
  fs.mkdirSync(distDataDir, { recursive: true });
}
fs.writeFileSync(distCsvOutputPath, csvOutput, 'utf8');

console.log(`Generated CSV with ${lines.length} lines at:`);
console.log(csvOutputPath);

// Validate with CSV parser
const parsedBack = parseCrspCsvText(csvOutput, '2025');
console.log(`Verification: parseCrspCsvText successfully parsed back ${parsedBack.length} records!`);
