
import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Ensure __dirname is recognized by TS
declare const __dirname: string;

console.log(`\n---------------------------------------------------`);
console.log(`🚀 [ENV] Starting Environment Loading...`);
console.log(`⏰ Time: ${new Date().toISOString()}`);
// @ts-ignore
console.log(`👤 User: ${process.env.USER || 'unknown'} (UID: ${process.getuid ? process.getuid() : 'n/a'})`);
// @ts-ignore
console.log(`📂 CWD:  ${process.cwd()}`);

// Define explicit candidates to check
// @ts-ignore
const currentDir = process.cwd();
const candidates = [
    path.join(currentDir, '.env'),
    path.join(__dirname, '../../.env'), // Standard dist/config/ -> server/
    path.join(__dirname, '../../../.env'), 
];

let envPath = null;

// 1. Try to find the file
for (const p of candidates) {
    try {
        if (fs.existsSync(p)) {
            // Check permissions
            const stats = fs.statSync(p);
            console.log(`🔎 Found candidate at: ${p}`);
            console.log(`   - Size: ${stats.size} bytes`);
            console.log(`   - Mode: ${stats.mode} (Octal: ${stats.mode.toString(8)})`);
            console.log(`   - Owner: UID ${stats.uid} / GID ${stats.gid}`);
            
            envPath = p;
            break;
        }
    } catch (e: any) {
        console.log(`⚠️  Error checking path ${p}: ${e.message}`);
    }
}

if (envPath) {
    console.log(`✅ [ENV] Loading from: ${envPath}`);
    const result = dotenv.config({ path: envPath });
    
    if (result.error) {
        console.error(`❌ [ENV] Parser Error:`, result.error);
    } else if (result.parsed) {
        const keys = Object.keys(result.parsed);
        console.log(`ℹ️  [ENV] Loaded ${keys.length} keys: [${keys.join(', ')}]`);
        
        // Sanity Check for Critical Keys
        if (!result.parsed.DB_NAME) console.warn('⚠️  DB_NAME is missing in the parsed file!');
        if (!result.parsed.JWT_SECRET) console.warn('⚠️  JWT_SECRET is missing in the parsed file!');
        if (result.parsed.JWT_SECRET === 'masuma_secret_key_123' && process.env.NODE_ENV === 'production') {
            console.error('❌ [SECURITY CRITICAL] Default JWT_SECRET detected in production! Please generate a unique secret.');
        }
    }
} else {
    console.error(`❌ [ENV] FATAL: .env file NOT FOUND in any expected location.`);
    console.log(`   Checked:`);
    candidates.forEach(c => console.log(`   - ${c}`));
}

// 2. Validation Schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  
  // Database
  DB_HOST: z.string().min(1, "DB_HOST is missing"),
  DB_PORT: z.string().default('3306'),
  DB_USER: z.string().min(1, "DB_USER is missing"),
  DB_PASSWORD: z.string().optional(),
  DB_NAME: z.string().min(1, "DB_NAME is missing"),

  // Redis
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),

  // Security
  JWT_SECRET: z.string().min(5, "JWT_SECRET is required"),
  CORS_ORIGIN: z.string().default('*'),

  // M-Pesa
  MPESA_CONSUMER_KEY: z.string().optional(),
  MPESA_CONSUMER_SECRET: z.string().optional(),
  MPESA_PASSKEY: z.string().optional(),
  MPESA_SHORTCODE: z.string().optional(),
  MPESA_CALLBACK_URL: z.string().optional(),
  MPESA_TRANSACTION_TYPE: z.string().optional(),
  MPESA_STORE_NUMBER: z.string().optional(),

  // SMTP
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().default('587'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  FROM_EMAIL: z.string().default('noreply@masuma.africa'),

  // External Keys
  GEMINI_API_KEY: z.string().optional(),
  VIN_API_KEY: z.string().optional(),
  EXCHANGE_RATE_API_KEY: z.string().optional(),
  
  // KRA eTIMS
  KRA_PIN: z.string().optional(),
  DEVICE_SERIAL: z.string().optional(),
  KRA_API_URL: z.string().optional(),
});

// 3. Validate
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('\n❌ [ENV] VALIDATION FAILED. The app may crash or misbehave.');
  const errors = parsedEnv.error.format();
  Object.entries(errors).forEach(([key, value]) => {
      if (key !== '_errors' && value) {
          const fieldError = value as { _errors: string[] };
          const issues = fieldError._errors || [];
          if (issues.length > 0) console.error(`   - ${key}: ${issues.join(', ')}`);
      }
  });
  console.error('---------------------------------------------------');
  
  // CRITICAL CHANGE: Do NOT exit process. 
  // We allow the app to continue so logs can be read in PM2.
  // We mock a fallback config to prevent immediate crashes in other modules.
  console.warn('⚠️  PROCEEDING WITH PARTIAL CONFIGURATION (DEBUG MODE)');
}

// Export parsed data or fallback to process.env (unsafe but keeps alive)
export const config = parsedEnv.success ? parsedEnv.data : (process.env as any);
