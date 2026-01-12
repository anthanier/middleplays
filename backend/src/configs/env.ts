export const env = {
  // App
  NODE_ENV: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
  PORT: parseInt(process.env.PORT || '3000'),
  APP_URL: process.env.APP_URL || 'http://localhost:3000',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  
  // Database
  DATABASE_URL: process.env.DATABASE_URL!,
  
  // Redis
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379'),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  
  // JWT - ✅ NOW WITH SEPARATE SECRETS
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!, // ✅ NEW
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || '15m',
  JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES || '7d',
  
  // Encryption
  CREDENTIAL_ENCRYPTION_KEY: process.env.CREDENTIAL_ENCRYPTION_KEY!,
  CREDENTIAL_ENCRYPTION_SALT: process.env.CREDENTIAL_ENCRYPTION_SALT!,
  
  // Xendit
  XENDIT_SECRET_KEY: process.env.XENDIT_SECRET_KEY || '',
  XENDIT_WEBHOOK_TOKEN: process.env.XENDIT_WEBHOOK_TOKEN || '',
  
  // KYC
  KYC_API_KEY: process.env.KYC_API_KEY || '',
  KYC_API_URL: process.env.KYC_API_URL || '',
  
  // Image Upload
  MAX_IMAGE_SIZE: parseInt(process.env.MAX_IMAGE_SIZE || '5242880'),
  ALLOWED_IMAGE_TYPES: process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/webp',
} as const

// Validate required environment variables at startup
export function validateEnv() {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET', // ✅ NEW
    'CREDENTIAL_ENCRYPTION_KEY',
    'CREDENTIAL_ENCRYPTION_SALT',
  ] as const
  
  const missing: string[] = []
  
  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }
  
  if (missing.length > 0) {
    throw new Error(
      `❌ Missing required environment variables:\n  - ${missing.join('\n  - ')}\n\nPlease check your .env file.`
    )
  }
  
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
    console.log('✅ Environment variables validated')
  }
}

// Auto-validate on import (all environments)
validateEnv()