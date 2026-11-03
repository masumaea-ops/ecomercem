/**
 * Enterprise Cross-Selling & Internal Contextual Linking Engine
 * 
 * Maps technical automotive components to their corresponding replacement companions
 * (e.g. Brake Pads -> Brake Discs/Rotors + Caliper Pins; Shock Absorbers -> Strut Mounts + Coil Springs)
 * to maximize Average Order Value (AOV), user convenience, and search engine crawl depth.
 */

export interface CrossSellRule {
  targetCategory: string;
  complementaryCategories: string[];
  recommendedReason: string;
}

export const CATEGORY_CROSS_SELL_RULES: CrossSellRule[] = [
  {
    targetCategory: 'Brake Pads',
    complementaryCategories: ['Brake Discs', 'Brake Rotors', 'Brake Caliper Pins', 'Brake Fluid'],
    recommendedReason: 'Mechanics recommend inspecting and replacing worn brake discs and lubricating caliper pins when fitting new pads.'
  },
  {
    targetCategory: 'Brakes',
    complementaryCategories: ['Brake Discs', 'Brake Rotors', 'Brake Caliper Repair Kit', 'Brake Fluid'],
    recommendedReason: 'Replacing rotors alongside brake pads prevents vibration, brake shudder, and uneven pad wear.'
  },
  {
    targetCategory: 'Brake Shoes',
    complementaryCategories: ['Brake Drums', 'Wheel Cylinders', 'Brake Fluid'],
    recommendedReason: 'Check rear wheel cylinders for brake fluid leaks when replacing drum brake shoes.'
  },
  {
    targetCategory: 'Shock Absorbers',
    complementaryCategories: ['Strut Mounts', 'Coil Springs', 'Stabilizer Linkages', 'Suspension Bushings'],
    recommendedReason: 'Replacing worn strut mounts and dust covers restores original ride height and protects new shock seals.'
  },
  {
    targetCategory: 'Suspension',
    complementaryCategories: ['Ball Joints', 'Control Arms', 'Stabilizer Links', 'Tie Rod Ends'],
    recommendedReason: 'Fresh suspension bushes and ball joints ensure precise wheel alignment and eliminate chassis knocks.'
  },
  {
    targetCategory: 'Spark Plugs',
    complementaryCategories: ['Ignition Coils', 'Air Filters', 'Fuel Filters'],
    recommendedReason: 'Installing fresh air filters and inspecting ignition coils maximizes fuel economy and prevents engine misfires.'
  },
  {
    targetCategory: 'Filters',
    complementaryCategories: ['Motor Oil', 'Spark Plugs', 'Engine Flush', 'Cabin Filters'],
    recommendedReason: 'Replace engine oil and air filters simultaneously during minor vehicle servicing.'
  },
  {
    targetCategory: 'Oil Filters',
    complementaryCategories: ['Motor Oil', 'Air Filters', 'Engine Flush'],
    recommendedReason: 'Always change motor oil when installing a new genuine oil filter.'
  },
  {
    targetCategory: 'Air Filters',
    complementaryCategories: ['Cabin Filters', 'Spark Plugs', 'Fuel Filters'],
    recommendedReason: 'Pairing clean air and cabin filters prevents dust intrusion into engine combustion chambers and cabin air.'
  },
  {
    targetCategory: 'Ball Joints',
    complementaryCategories: ['Tie Rod Ends', 'Rack Ends', 'Control Arms', 'Steering Boots'],
    recommendedReason: 'Replace steering rack ends and tie rods in pairs for uniform steering responsiveness and wheel alignment.'
  },
  {
    targetCategory: 'Tie Rod Ends',
    complementaryCategories: ['Rack Ends', 'Ball Joints', 'Steering Rack Boots'],
    recommendedReason: 'Replacing inner rack ends with outer tie rod ends saves labor during steering geometry alignment.'
  },
  {
    targetCategory: 'Stabilizer Links',
    complementaryCategories: ['Suspension Bushings', 'Shock Absorbers', 'Control Arms'],
    recommendedReason: 'Eliminate clunking noises over bumps by refreshing stabilizer bar D-bushings with new drop links.'
  }
];

/**
 * Returns matching complementary category names for a given category name
 */
export function getComplementaryCategories(categoryName: string | undefined): string[] {
  if (!categoryName) return ['Brake Pads', 'Filters', 'Shock Absorbers', 'Spark Plugs'];
  
  const cleanCat = categoryName.toLowerCase().trim();
  const rule = CATEGORY_CROSS_SELL_RULES.find(r => 
    cleanCat.includes(r.targetCategory.toLowerCase()) || 
    r.targetCategory.toLowerCase().includes(cleanCat)
  );

  return rule ? rule.complementaryCategories : ['Brake Pads', 'Filters', 'Shock Absorbers', 'Spark Plugs'];
}

/**
 * Returns the recommendation reason for a given category
 */
export function getCrossSellReason(categoryName: string | undefined): string {
  if (!categoryName) return 'Customers frequently replace related wear-and-tear components during maintenance.';
  
  const cleanCat = categoryName.toLowerCase().trim();
  const rule = CATEGORY_CROSS_SELL_RULES.find(r => 
    cleanCat.includes(r.targetCategory.toLowerCase()) || 
    r.targetCategory.toLowerCase().includes(cleanCat)
  );

  return rule ? rule.recommendedReason : 'Customers frequently replace related wear-and-tear components during maintenance.';
}
