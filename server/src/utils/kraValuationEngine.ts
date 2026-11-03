/**
 * Official KRA 2025 Tariff & Vehicle Import Valuation Engine
 * Incorporates exact reverse deductive valuation factors, 8-year depreciation schedules,
 * cascading taxes (Duty, Excise, VAT, IDF, RDL), port handling, and 3.5% concierge sourcing commission.
 */

export interface KraCalculationInput {
  crspBenchmarkKes: number;
  yearOfManufacture: number;
  engineCc?: number;
  fuelType?: string;
  vehicleType?: string; // CAR, SUV, TRUCK, MOTORCYCLE, ELECTRIC, AMBULANCE, MACHINERY
  cifValueKes?: number; // Optional user-provided actual CIF
  portChargesKes?: number; // Default 65,000 KES
}

export interface KraTaxBreakdown {
  crspBenchmarkKes: number;
  vehicleAge: number;
  depreciationRate: number;
  depreciatedCrspKes: number;
  customsValueCifKes: number;
  
  importDutyRate: number;
  importDutyKes: number;
  
  exciseValueKes: number;
  exciseDutyRate: number;
  fixedExciseKes: number;
  exciseDutyKes: number;
  
  vatValueKes: number;
  vatRate: number;
  vatKes: number;
  
  idfRate: number;
  idfFeeKes: number;
  
  rdlRate: number;
  rdlFeeKes: number;
  
  totalKraTaxesKes: number;
  portChargesKes: number;
  landedVehicleValueKes: number;
  
  sourcingCommissionRate: number;
  sourcingCommissionKes: number;
  
  grandTotalKes: number;
  categoryRule: string;
}

// 8-Year Direct Import Depreciation Schedule according to KS 1515:2000 & KRA Guidelines
export const DIRECT_IMPORT_DEPRECIATION: Record<number, number> = {
  0: 0.10, // Under 1 year
  1: 0.10, // 1 year
  2: 0.20, // >1 <=2 years
  3: 0.30, // >2 <=3 years
  4: 0.40, // >3 <=4 years
  5: 0.50, // >4 <=5 years
  6: 0.55, // >5 <=6 years
  7: 0.60, // >6 <=7 years
  8: 0.65  // >7 <=8 years
};

export function calculateKraVehicleImport(input: KraCalculationInput): KraTaxBreakdown {
  const currentYear = new Date().getFullYear();
  const yom = input.yearOfManufacture;
  const age = Math.max(0, currentYear - yom);

  if (age > 8) {
    throw new Error(`Vehicle is ${age} years old. Under Kenya Bureau of Standards (KS 1515:2000), vehicles older than 8 years cannot be imported.`);
  }

  const crspBenchmark = Math.max(0, Number(input.crspBenchmarkKes || 0));
  if (crspBenchmark <= 0 && (!input.cifValueKes || input.cifValueKes <= 0)) {
    throw new Error('Valid KRA CRSP benchmark or CIF value is required.');
  }

  // 1. Depreciation Calculation
  const depRate = DIRECT_IMPORT_DEPRECIATION[age] !== undefined ? DIRECT_IMPORT_DEPRECIATION[age] : 0.65;
  const depreciatedCrsp = parseFloat((crspBenchmark * (1 - depRate)).toFixed(2));

  // 2. Identify Category, Rates and Reverse Divisor Factor
  const fuel = (input.fuelType || 'GASOLINE').toUpperCase();
  const vType = (input.vehicleType || 'CAR').toUpperCase();
  const cc = Number(input.engineCc || 1500);

  let importDutyRate = 0.35;
  let exciseDutyRate = 0.20;
  let fixedExcise = 0;
  let reverseDivisor = 2.3489999;
  let categoryRule = 'Passenger Vehicles <= 1500cc';

  const isElectric = fuel.includes('ELECTRIC') || fuel.includes('EV') || vType === 'ELECTRIC';
  const isMotorcycle = vType.includes('MOTO') || vType.includes('BIKE');
  const isTruckOrPrimeMover = vType.includes('TRUCK') || vType.includes('PRIME MOVER') || vType.includes('TRAILER');
  const isMachinery = vType.includes('MACHIN') || vType.includes('EQUIP');
  const isAmbulance = vType.includes('AMBULANCE');

  if (isElectric) {
    categoryRule = '100% Electric Vehicles (EV)';
    importDutyRate = 0.35;
    exciseDutyRate = 0.10;
    // (1 + 0.35) * (1 + 0.10) * (1 + 0.16) * 1.25 = 2.15325
    reverseDivisor = 2.15325;
  } else if (isMotorcycle) {
    categoryRule = 'Motorcycles (Fixed Excise KES 12,953)';
    importDutyRate = 0.25;
    exciseDutyRate = 0.0;
    fixedExcise = 12953;
    reverseDivisor = 1.8125;
  } else if (isTruckOrPrimeMover) {
    categoryRule = 'Prime Movers & Heavy Trucks (0% Excise)';
    importDutyRate = 0.25; // 25% for commercial trucks
    exciseDutyRate = 0.0;
    // (1 + 0.25) * 1.0 * (1 + 0.16) * 1.25 = 1.8125
    reverseDivisor = 1.8125;
  } else if (isMachinery) {
    categoryRule = 'Heavy Machinery & Specialized Equipment';
    importDutyRate = 0.0;
    exciseDutyRate = 0.0;
    // 1.0 * 1.0 * (1 + 0.16) * 1.25 = 1.45
    reverseDivisor = 1.45;
  } else if (isAmbulance) {
    categoryRule = 'Ambulance (0% Import Duty, 25% Excise)';
    importDutyRate = 0.0;
    exciseDutyRate = 0.25;
    // 1.0 * (1 + 0.25) * (1 + 0.16) * 1.25 = 1.8125
    reverseDivisor = 1.8125;
  } else {
    // Passenger Vehicles (Sedans, SUVs, Hatches, Pickups, Vans)
    const isDiesel = fuel.includes('DIESEL');
    if (isDiesel) {
      if (cc > 2500) {
        categoryRule = 'Diesel Vehicles > 2500cc (35% Excise)';
        exciseDutyRate = 0.35;
        reverseDivisor = 2.642625; // 1.35 * 1.35 * 1.16 * 1.25
      } else if (cc > 1500) {
        categoryRule = 'Diesel Vehicles 1501cc - 2500cc (25% Excise)';
        exciseDutyRate = 0.25;
        reverseDivisor = 2.446875; // 1.35 * 1.25 * 1.16 * 1.25
      } else {
        categoryRule = 'Diesel Vehicles <= 1500cc (20% Excise)';
        exciseDutyRate = 0.20;
        reverseDivisor = 2.3489999;
      }
    } else {
      // Petrol / Hybrid
      if (cc > 3000) {
        categoryRule = 'Petrol/Hybrid Vehicles > 3000cc (35% Excise)';
        exciseDutyRate = 0.35;
        reverseDivisor = 2.642625; // 1.35 * 1.35 * 1.16 * 1.25
      } else if (cc > 1500) {
        categoryRule = 'Petrol/Hybrid Vehicles 1501cc - 3000cc (25% Excise)';
        exciseDutyRate = 0.25;
        reverseDivisor = 2.446875; // 1.35 * 1.25 * 1.16 * 1.25
      } else {
        categoryRule = 'Petrol/Hybrid Vehicles <= 1500cc (20% Excise)';
        exciseDutyRate = 0.20;
        reverseDivisor = 2.3489999;
      }
    }
  }

  // 3. Deduce Customs Value (CIF)
  let customsValueCif = 0;
  if (input.cifValueKes && input.cifValueKes > 0) {
    customsValueCif = input.cifValueKes;
  } else if (isMotorcycle) {
    customsValueCif = parseFloat((Math.max(0, depreciatedCrsp - (fixedExcise * 1.16 * 1.25)) / reverseDivisor).toFixed(2));
  } else {
    customsValueCif = parseFloat((depreciatedCrsp / reverseDivisor).toFixed(2));
  }

  // 4. Cascading Duties & Statutory Levies
  const importDuty = parseFloat((customsValueCif * importDutyRate).toFixed(2));
  const exciseValue = parseFloat((customsValueCif + importDuty).toFixed(2));
  const exciseDuty = fixedExcise > 0 
    ? fixedExcise 
    : parseFloat((exciseValue * exciseDutyRate).toFixed(2));
    
  const vatValue = parseFloat((exciseValue + exciseDuty).toFixed(2));
  const vatRate = 0.16;
  const vat = parseFloat((vatValue * vatRate).toFixed(2));

  const idfRate = 0.025; // 2.5% Import Declaration Fee
  const idfFee = parseFloat((customsValueCif * idfRate).toFixed(2));

  const rdlRate = 0.020; // 2.0% Railway Development Levy
  const rdlFee = parseFloat((customsValueCif * rdlRate).toFixed(2));

  const totalKraTaxes = parseFloat((importDuty + exciseDuty + vat + idfFee + rdlFee).toFixed(2));

  // 5. Port Handling / CFS Charges
  const portCharges = parseFloat((input.portChargesKes !== undefined ? input.portChargesKes : 65000).toFixed(2));
  const landedVehicleValue = parseFloat((customsValueCif + totalKraTaxes + portCharges).toFixed(2));

  // 6. Masuma Concierge 3.5% Sourcing Commission
  const sourcingCommissionRate = 0.035;
  const sourcingCommissionKes = parseFloat((landedVehicleValue * sourcingCommissionRate).toFixed(2));

  // 7. Grand Total
  const grandTotalKes = parseFloat((landedVehicleValue + sourcingCommissionKes).toFixed(2));

  return {
    crspBenchmarkKes: crspBenchmark,
    vehicleAge: age,
    depreciationRate: depRate,
    depreciatedCrspKes: depreciatedCrsp,
    customsValueCifKes: customsValueCif,
    importDutyRate,
    importDutyKes: importDuty,
    exciseValueKes: exciseValue,
    exciseDutyRate,
    fixedExciseKes: fixedExcise,
    exciseDutyKes: exciseDuty,
    vatValueKes: vatValue,
    vatRate,
    vatKes: vat,
    idfRate,
    idfFeeKes: idfFee,
    rdlRate,
    rdlFeeKes: rdlFee,
    totalKraTaxesKes: totalKraTaxes,
    portChargesKes: portCharges,
    landedVehicleValueKes: landedVehicleValue,
    sourcingCommissionRate,
    sourcingCommissionKes,
    grandTotalKes,
    categoryRule
  };
}
