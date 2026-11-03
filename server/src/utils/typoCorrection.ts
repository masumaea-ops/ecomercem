/**
 * Automotive Domain Typo Correction & Fuzzy Vocabulary Matcher
 * Uses Levenshtein distance against domain terms and product vocabulary.
 */

export const AUTOMOTIVE_VOCABULARY = [
  // Brake system
  'brake', 'brakes', 'pad', 'pads', 'rotor', 'rotors', 'disc', 'discs', 'caliper', 'shoe', 'drum',
  // Ignition & Engine
  'spark', 'plug', 'plugs', 'iridium', 'platinum', 'ignition', 'coil', 'coils', 'lead', 'distributor',
  'engine', 'motor', 'mount', 'gasket', 'valve', 'piston', 'ring', 'cylinder',
  // Filtration
  'filter', 'filters', 'filtration', 'element', 'spin', 'tank', 'oil', 'air', 'fuel', 'cabin',
  // Suspension & Steering
  'suspension', 'bushing', 'bushings', 'bush', 'arm', 'control', 'ball', 'joint', 'link', 'stabilizer',
  'sway', 'bar', 'tie', 'rod', 'rack', 'end', 'knuckle', 'hub', 'bearing',
  // Drivetrain & Chassis
  'shock', 'shocks', 'absorber', 'absorbers', 'strut', 'struts', 'spring', 'cv', 'boot', 'axle', 'shaft',
  // Belts & Cooling
  'belt', 'belts', 'serpentine', 'timing', 'ribbed', 'pulley', 'tensioner',
  'water', 'pump', 'thermostat', 'radiator', 'hose', 'cooling', 'coolant',
  // Wipers & Body
  'wiper', 'wipers', 'blade', 'blades', 'hybrid', 'rubber', 'refill', 'clip', 'fastener',
  // Fluids & Lubrication
  'fluid', 'lubricant', 'grease', 'synthetic', 'viscosity',
  // Common Vehicle Makes & Models in Kenya
  'toyota', 'nissan', 'subaru', 'mitsubishi', 'honda', 'mazda', 'isuzu', 'suzuki',
  'land', 'cruiser', 'prado', 'forester', 'outback', 'impreza', 'rav4', 'harrier',
  'axio', 'fielder', 'vitz', 'demio', 'hilux', 'hiace', 'probox', 'succeed', 'premio', 'allion', 'xtrail', 'patrol'
];

/**
 * Computes Levenshtein edit distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const aLen = a.length;
  const bLen = b.length;

  // Use two rows instead of full matrix for O(min(m, n)) memory
  let prevRow = new Array(aLen + 1);
  let currRow = new Array(aLen + 1);

  for (let j = 0; j <= aLen; j++) {
    prevRow[j] = j;
  }

  for (let i = 1; i <= bLen; i++) {
    currRow[0] = i;
    const bChar = b.charAt(i - 1);

    for (let j = 1; j <= aLen; j++) {
      const aChar = a.charAt(j - 1);
      const cost = aChar === bChar ? 0 : 1;

      currRow[j] = Math.min(
        prevRow[j] + 1,       // deletion
        currRow[j - 1] + 1,   // insertion
        prevRow[j - 1] + cost // substitution
      );
    }

    for (let j = 0; j <= aLen; j++) {
      prevRow[j] = currRow[j];
    }
  }

  return currRow[aLen];
}

/**
 * Finds the closest vocabulary term for a single word
 */
export function findClosestWord(word: string, customVocab?: string[]): { match: string; distance: number } | null {
  const clean = word.toLowerCase().trim();
  if (clean.length < 3) return null;

  // If word contains numbers or punctuation, likely a part number/SKU (e.g. 5pk1100, ms-7460) -> don't modify
  if (/\d/.test(clean)) return null;

  const vocab = customVocab && customVocab.length > 0
    ? [...new Set([...AUTOMOTIVE_VOCABULARY, ...customVocab])]
    : AUTOMOTIVE_VOCABULARY;

  // If already an exact match in vocabulary
  if (vocab.includes(clean)) return { match: clean, distance: 0 };

  let bestMatch: string | null = null;
  let minDistance = Infinity;

  // Max allowed edit distance based on word length
  const maxAllowedDistance = clean.length <= 4 ? 1 : 2;

  for (const term of vocab) {
    // Optimization: Skip terms with length diff > maxAllowedDistance
    if (Math.abs(term.length - clean.length) > maxAllowedDistance) continue;

    const dist = levenshteinDistance(clean, term);

    if (dist <= maxAllowedDistance && dist < minDistance) {
      // Prioritize words sharing the first letter
      const firstLetterBonus = term[0] === clean[0] ? 0 : 0.5;
      if (dist + firstLetterBonus < minDistance) {
        minDistance = dist;
        bestMatch = term;
      }
    }
  }

  if (bestMatch && minDistance <= maxAllowedDistance) {
    return { match: bestMatch, distance: minDistance };
  }

  return null;
}

export interface TypoCorrectionResult {
  hasCorrection: boolean;
  originalQuery: string;
  correctedQuery: string;
  correctedTokens: { original: string; corrected: string; distance: number }[];
}

/**
 * Analyzes multi-word query and proposes corrections for misspelled automotive tokens
 */
export function correctTypo(query: string, customVocab?: string[]): TypoCorrectionResult {
  const trimmed = (query || '').trim();
  if (!trimmed || trimmed.length < 3) {
    return { hasCorrection: false, originalQuery: trimmed, correctedQuery: trimmed, correctedTokens: [] };
  }

  const rawTokens = trimmed.split(/\s+/);
  const correctedTokens: { original: string; corrected: string; distance: number }[] = [];
  let changed = false;

  const resultWords = rawTokens.map(token => {
    // Preserve token casing pattern if needed, but match on lower
    const closest = findClosestWord(token, customVocab);
    if (closest && closest.distance > 0 && closest.distance <= 2) {
      changed = true;
      correctedTokens.push({
        original: token,
        corrected: closest.match,
        distance: closest.distance
      });
      return closest.match;
    }
    return token;
  });

  return {
    hasCorrection: changed,
    originalQuery: trimmed,
    correctedQuery: resultWords.join(' '),
    correctedTokens
  };
}
