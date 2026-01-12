// src/types/env.d.ts
declare module 'bun' {
  interface Env {
    // App
    NODE_ENV: 'development' | 'production' | 'test'
    PORT: string
    APP_URL: string
    FRONTEND_URL: string
    
    // Database
    DATABASE_URL: string
    
    // Redis
    REDIS_HOST: string
    REDIS_PORT: string
    REDIS_PASSWORD?: string
    
    // JWT
    JWT_SECRET: string
    JWT_REFRESH_SECRET: string // ✅ NEW
    JWT_ACCESS_EXPIRES: string
    JWT_REFRESH_EXPIRES: string
    
    // Encryption
    CREDENTIAL_ENCRYPTION_KEY: string
    CREDENTIAL_ENCRYPTION_SALT: string
    
    // Xendit
    XENDIT_SECRET_KEY: string
    XENDIT_WEBHOOK_TOKEN: string
    
    // KYC
    KYC_API_KEY: string
    KYC_API_URL: string
    
    // Image Upload
    MAX_IMAGE_SIZE: string
    ALLOWED_IMAGE_TYPES: string
  }
}

export {}