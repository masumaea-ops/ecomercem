/**
 * Masuma Autoparts East Africa - Automotive Semantic & Domain Knowledge Search Engine
 * 
 * Provides:
 * 1. Symptom-to-component mapping (e.g. "car shakes when braking" -> Brake Rotors & Pads)
 * 2. Colloquial automotive synonym expansion (e.g. "shocks" -> "shock absorber", "bushes" -> "bushing")
 * 3. Vehicle & Japanese chassis code cross-resolution (e.g. "fielder" -> NZE141, NZE161, ZRE142)
 * 4. Bidirectional SKU/OEM code normalization and stripping
 */

export interface SemanticAnalysisResult {
  originalQuery: string;
  isSemantic: boolean;
  detectedSymptom?: string;
  suggestedParts: string[];
  suggestedCategory?: string;
  detectedVehicles: string[];
  cleanAlphanumeric: string;
}

// 1. Common Automotive Symptoms mapped to genuine Masuma replacement components
const SYMPTOM_MAP: Array<{
  triggers: string[];
  symptomName: string;
  targetParts: string[];
  category: string;
}> = [
  {
    triggers: [
      'vibrate when braking', 'vibration when braking', 'shakes when braking', 'shaking when braking',
      'pulsing brake', 'brake shudder', 'steering wheel shakes braking', 'wobble when braking', 'disc warped'
    ],
    symptomName: 'Brake Rotor Warping / Brake Shudder',
    targetParts: ['brake disc', 'brake rotor', 'brake pad'],
    category: 'Brakes'
  },
  {
    triggers: [
      'squeaking brake', 'squealing brake', 'screeching brake', 'grinding brake', 'spongy brake',
      'brake noise', 'brake pad worn', 'soft brake pedal', 'metal grinding on wheel'
    ],
    symptomName: 'Worn Brake Friction Material',
    targetParts: ['brake pad', 'brake shoe', 'brake disc'],
    category: 'Brakes'
  },
  {
    triggers: [
      'clunking over bumps', 'knocking over bumps', 'rattling over bumps', 'thumping suspension',
      'creaking over speed bumps', 'suspension noise', 'rattle on rough road'
    ],
    symptomName: 'Worn Suspension Bushings / Stabilizer Links',
    targetParts: ['stabilizer link', 'bushing', 'control arm', 'ball joint', 'shock absorber'],
    category: 'Suspension'
  },
  {
    triggers: [
      'car bouncing', 'bouncy ride', 'rough ride', 'bottoming out', 'shock leaking',
      'oil leak on wheel', 'floaty ride', 'poor damping'
    ],
    symptomName: 'Blown / Leaking Shock Absorbers',
    targetParts: ['shock absorber', 'strut', 'strut mount'],
    category: 'Suspension'
  },
  {
    triggers: [
      'car pulls to one side', 'steering drift', 'loose steering', 'play in steering wheel',
      'steering wandering', 'wandering on highway'
    ],
    symptomName: 'Steering Play / Worn Tie Rod or Rack End',
    targetParts: ['tie rod end', 'rack end', 'ball joint', 'control arm'],
    category: 'Suspension'
  },
  {
    triggers: [
      'engine overheating', 'hot engine', 'coolant boiling', 'radiator boiling',
      'water temperature high', 'coolant leaking'
    ],
    symptomName: 'Cooling System Overheating',
    targetParts: ['water pump', 'radiator cap', 'thermostat'],
    category: 'Cooling System'
  },
  {
    triggers: [
      'engine misfire', 'rough idle', 'hard start', 'car struggling to start',
      'jerking on acceleration', 'loss of engine power', 'check engine misfire'
    ],
    symptomName: 'Ignition / Fuel Delivery Degradation',
    targetParts: ['spark plug', 'ignition coil', 'fuel pump', 'fuel filter', 'air filter'],
    category: 'Engine & Ignition'
  },
  {
    triggers: [
      'squealing belt', 'chirping sound from engine', 'alternator belt squeal', 'fan belt squeak'
    ],
    symptomName: 'Loose / Worn Drive Belt',
    targetParts: ['drive belt', 'fan belt', 'v-ribbed belt'],
    category: 'Drive Belts'
  },
  {
    triggers: [
      'streaking windshield', 'wipers screeching', 'blurry windshield in rain', 'wiper smudge'
    ],
    symptomName: 'Worn Wiper Rubber',
    targetParts: ['wiper blade'],
    category: 'Wiper Blades'
  },
  {
    triggers: [
      'oil light', 'low oil', 'oil change', 'engine oil low', 'service oil', 'motor oil', 'engine oil',
      'engine oil leak', 'burning oil', 'black oil', 'synthetic oil', 'change oil'
    ],
    symptomName: 'Engine Lubrication & Periodic Oil Service',
    targetParts: ['motor oil', 'engine oil', 'oil filter', 'synthetic oil'],
    category: 'Motor Oils'
  }
];

// 2. Automotive colloquial synonyms
const SYNONYM_MAP: Record<string, string[]> = {
  'oil': ['motor oil', 'engine oil', 'oil filter', 'lubricant'],
  'oils': ['motor oil', 'engine oil', 'lubricant'],
  'lubricant': ['motor oil', 'engine oil', 'lubricant'],
  'lubricants': ['motor oil', 'engine oil', 'lubricant'],
  'engine': ['motor', 'engine'],
  'motor': ['engine', 'motor'],
  'fluid': ['brake fluid', 'transmission fluid', 'coolant'],
  'fluids': ['brake fluid', 'transmission fluid', 'coolant'],
  'coolant': ['antifreeze', 'coolant', 'radiator coolant'],
  'shocks': ['shock absorber', 'strut'],
  'shock': ['shock absorber', 'strut'],
  'absorber': ['shock absorber'],
  'absorbers': ['shock absorber'],
  'struts': ['shock absorber', 'strut'],
  'strut': ['shock absorber', 'strut'],
  'bushes': ['bushing', 'arm bush'],
  'bush': ['bushing'],
  'bushings': ['bushing'],
  'links': ['stabilizer link', 'sway bar link'],
  'link': ['stabilizer link'],
  'swaybar': ['stabilizer link'],
  'sway': ['stabilizer link'],
  'pads': ['brake pad'],
  'shoes': ['brake shoe'],
  'rotors': ['brake disc', 'brake rotor'],
  'rotor': ['brake disc', 'brake rotor'],
  'discs': ['brake disc'],
  'disc': ['brake disc'],
  'plugs': ['spark plug', 'glow plug'],
  'plug': ['spark plug'],
  'coils': ['ignition coil'],
  'coil': ['ignition coil'],
  'filter': ['oil filter', 'air filter', 'fuel filter', 'cabin filter'],
  'filters': ['oil filter', 'air filter', 'fuel filter', 'cabin filter'],
  'cleaner': ['air filter'],
  'belts': ['drive belt', 'fan belt', 'v-ribbed belt'],
  'belt': ['drive belt', 'fan belt', 'v-ribbed belt'],
  'wipers': ['wiper blade'],
  'wiper': ['wiper blade'],
  'blades': ['wiper blade'],
  'blade': ['wiper blade'],
  'cap': ['radiator cap', 'fuel cap']
};

// 3. Vehicle Models and Japanese Chassis Codes common in Kenya / East Africa
const VEHICLE_ALIASES: Record<string, string[]> = {
  'fielder': ['Toyota Corolla Fielder', 'NZE141', 'NZE161', 'NZE121', 'ZRE142'],
  'axio': ['Toyota Corolla Axio', 'NZE141', 'NZE161'],
  'premio': ['Toyota Premio', 'ZRT260', 'NZT260', 'ZZT240'],
  'allion': ['Toyota Allion', 'ZRT260', 'NZT260', 'ZZT240'],
  'probox': ['Toyota Probox', 'NCP51', 'NCP58', 'NCP160', 'NLP51'],
  'succeed': ['Toyota Succeed', 'NCP51', 'NCP58', 'NCP160'],
  'vitz': ['Toyota Vitz', 'Toyota Yaris', 'KSP130', 'NSP130', 'SCP90'],
  'yaris': ['Toyota Yaris', 'Toyota Vitz', 'KSP130', 'NSP130', 'SCP90'],
  'prado': ['Toyota Land Cruiser Prado', 'GDJ150', 'TRJ150', 'GRJ150', 'KDJ120', 'KZJ95'],
  'hiace': ['Toyota Hiace', 'KDH200', 'TRH200', 'LH172'],
  'prius': ['Toyota Prius', 'ZVW30', 'ZVW50'],
  'harrier': ['Toyota Harrier', 'ACU30', 'MCU30', 'ZSU60', 'AVU65'],
  'rav4': ['Toyota RAV4', 'ACA31', 'ACA36', 'ACA21'],
  'markx': ['Toyota Mark X', 'GRX120', 'GRX130'],
  'forester': ['Subaru Forester', 'SG5', 'SH5', 'SJ5', 'SK9'],
  'outback': ['Subaru Outback', 'BP5', 'BR9', 'BS9'],
  'legacy': ['Subaru Legacy', 'BP5', 'BR9', 'BM9'],
  'impreza': ['Subaru Impreza', 'GP7', 'GH2', 'GH8', 'GT7'],
  'xv': ['Subaru XV', 'GP7', 'GT7'],
  'xtrail': ['Nissan X-Trail', 'T31', 'T32', 'NT31', 'NT32'],
  'x-trail': ['Nissan X-Trail', 'T31', 'T32', 'NT31', 'NT32'],
  'note': ['Nissan Note', 'E12', 'E11'],
  'serena': ['Nissan Serena', 'C26', 'C27', 'C25'],
  'tiida': ['Nissan Tiida', 'C11', 'SC11'],
  'demio': ['Mazda Demio', 'DJ5FS', 'DE3FS'],
  'cx5': ['Mazda CX-5', 'KE2FW', 'KF2P'],
  'cx-5': ['Mazda CX-5', 'KE2FW', 'KF2P'],
  'fit': ['Honda Fit', 'GK3', 'GP5', 'GE6'],
  'vezel': ['Honda Vezel', 'RU1', 'RU3']
};

/**
 * Analyzes a user search string to identify symptoms, colloquial automotive terms,
 * vehicle codes, and stripped alphanumeric keys.
 */
export function analyzeSemanticQuery(query: string): SemanticAnalysisResult {
  const normalized = query.toLowerCase().trim();
  const cleanAlphanumeric = normalized.replace(/[^a-z0-9]/g, '');

  let detectedSymptom: string | undefined;
  let suggestedCategory: string | undefined;
  const suggestedParts = new Set<string>();
  const detectedVehicles = new Set<string>();

  // Check symptoms
  for (const item of SYMPTOM_MAP) {
    if (item.triggers.some(trigger => normalized.includes(trigger))) {
      detectedSymptom = item.symptomName;
      suggestedCategory = item.category;
      item.targetParts.forEach(p => suggestedParts.add(p));
      break;
    }
  }

  // Check multi-word phrase synonyms
  if (normalized.includes('engine oil') || normalized.includes('motor oil')) {
    suggestedParts.add('motor oil');
    suggestedParts.add('engine oil');
  }

  // Check individual words against synonyms (with plural stemming support)
  const words = normalized.split(/\s+/).filter(w => w.length > 0);
  for (const word of words) {
    if (SYNONYM_MAP[word]) {
      SYNONYM_MAP[word].forEach(syn => suggestedParts.add(syn));
    }
    if (word.endsWith('s') && word.length > 3) {
      const singular = word.slice(0, -1);
      if (SYNONYM_MAP[singular]) {
        SYNONYM_MAP[singular].forEach(syn => suggestedParts.add(syn));
      }
    }
  }

  // Check vehicle aliases
  for (const [key, aliases] of Object.entries(VEHICLE_ALIASES)) {
    if (normalized.includes(key)) {
      aliases.forEach(a => detectedVehicles.add(a));
    }
  }

  const isSemantic = Boolean(detectedSymptom || suggestedParts.size > 0 || detectedVehicles.size > 0);

  return {
    originalQuery: query,
    isSemantic,
    detectedSymptom,
    suggestedParts: Array.from(suggestedParts),
    suggestedCategory,
    detectedVehicles: Array.from(detectedVehicles),
    cleanAlphanumeric
  };
}
