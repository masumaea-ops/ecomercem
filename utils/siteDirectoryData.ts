export interface VehicleHub {
  make: string;
  model: string;
  chassis: string;
  aliases: string[];
}

export interface DirectoryCategory {
  name: string;
  slug: string;
}

export const POPULAR_VEHICLE_HUBS: VehicleHub[] = [
  { make: 'Toyota', model: 'Corolla Fielder', chassis: 'NZE141 / NZE161', aliases: ['fielder', 'corolla-fielder', 'nze141', 'nze161'] },
  { make: 'Toyota', model: 'Premio', chassis: 'NZT260 / ZRT260', aliases: ['premio', 'allion', 'zrt260', 'nzt260'] },
  { make: 'Toyota', model: 'Probox / Succeed', chassis: 'NCP51 / NCP58 / NCP160', aliases: ['probox', 'succeed', 'ncp51', 'ncp160'] },
  { make: 'Toyota', model: 'Land Cruiser Prado', chassis: 'KDJ120 / KDJ150 / TRJ150', aliases: ['prado', 'land-cruiser-prado', 'kdj150', 'trj150'] },
  { make: 'Toyota', model: 'Vitz / Yaris', chassis: 'KSP130 / NSP130 / SCP90', aliases: ['vitz', 'yaris', 'ksp130', 'nsp130'] },
  { make: 'Toyota', model: 'Hiace', chassis: 'KDH200 / TRH200', aliases: ['hiace', 'kdh200', 'trh200'] },
  { make: 'Toyota', model: 'Prius', chassis: 'ZVW30 / ZVW50', aliases: ['prius', 'zvw30', 'zvw50'] },
  { make: 'Subaru', model: 'Forester', chassis: 'SG5 / SH5 / SJ5 / SK9', aliases: ['forester', 'sg5', 'sh5', 'sj5'] },
  { make: 'Subaru', model: 'Outback / Legacy', chassis: 'BP5 / BR9 / BS9', aliases: ['outback', 'legacy', 'bp5', 'br9'] },
  { make: 'Subaru', model: 'XV / Impreza', chassis: 'GP7 / GT7 / GJ7', aliases: ['xv', 'impreza', 'gp7'] },
  { make: 'Nissan', model: 'X-Trail', chassis: 'T31 / T32 / NT31', aliases: ['x-trail', 'xtrail', 't31', 't32'] },
  { make: 'Nissan', model: 'Note', chassis: 'E11 / E12 / NE12', aliases: ['note', 'e11', 'e12'] },
  { make: 'Nissan', model: 'Serena', chassis: 'C26 / C27', aliases: ['serena', 'c26', 'c27'] },
  { make: 'Honda', model: 'Fit', chassis: 'GE6 / GK3 / GP5', aliases: ['fit', 'jazz', 'gk3', 'gp5'] },
  { make: 'Honda', model: 'Vezel / HR-V', chassis: 'RU1 / RU3', aliases: ['vezel', 'hr-v', 'ru3'] },
  { make: 'Mazda', model: 'Demio', chassis: 'DE3FS / DJ5FS', aliases: ['demio', 'mazda2', 'dj5fs'] },
  { make: 'Mazda', model: 'CX-5', chassis: 'KE2FW / KF2P', aliases: ['cx-5', 'cx5', 'kf2p'] }
];

export const PRIMARY_CATEGORIES: DirectoryCategory[] = [
  { name: 'Brake Pads', slug: 'brake-pads' },
  { name: 'Shock Absorbers', slug: 'shock-absorbers' },
  { name: 'Filters', slug: 'filters' },
  { name: 'Spark Plugs', slug: 'spark-plugs' },
  { name: 'Suspension Bushings', slug: 'suspension-bushings' },
  { name: 'Ball Joints', slug: 'ball-joints' }
];
