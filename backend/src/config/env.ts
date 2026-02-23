import dotenv from 'dotenv'

dotenv.config()

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 4000),
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hospital_dev',
  JWT_SECRET: process.env.JWT_SECRET || 'dev_secret_change_me',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  BACKUP_DIR: process.env.BACKUP_DIR || 'backups',
  BACKUP_RETENTION_COUNT: Number(process.env.BACKUP_RETENTION_COUNT || 30),
  BACKUP_CRON: process.env.BACKUP_CRON || '0 2 * * *', // daily at 02:00
  ADMIN_KEY: process.env.ADMIN_KEY || 'admin_key_change_me',

  // FBR
  FBR_ENABLED: (process.env.FBR_ENABLED || '').toLowerCase() === 'true' || process.env.FBR_ENABLED === '1',
  FBR_ENVIRONMENT: (process.env.FBR_ENVIRONMENT === 'production' ? 'production' : 'sandbox') as 'sandbox' | 'production',
  FBR_POS_ID: process.env.FBR_POS_ID || '',
  FBR_NTN: process.env.FBR_NTN || '',
  FBR_USIN_PREFIX: process.env.FBR_USIN_PREFIX || 'HMS',
  FBR_IMS_URL: process.env.FBR_IMS_URL || 'http://localhost:8524',
  FBR_CODE: process.env.FBR_CODE || '',

  // Biometric
  BIOMETRIC_ENABLED: (process.env.BIOMETRIC_ENABLED || '').toLowerCase() === 'true' || process.env.BIOMETRIC_ENABLED === '1',
  BIOMETRIC_IP: process.env.BIOMETRIC_IP || '',
  BIOMETRIC_PORT: Number(process.env.BIOMETRIC_PORT || 4370),
  BIOMETRIC_DEVICE_ID: process.env.BIOMETRIC_DEVICE_ID || 'ZK-01',
  BIOMETRIC_COMM_PASSWORD: Number(process.env.BIOMETRIC_COMM_PASSWORD || 0),
  BIOMETRIC_POLL_INTERVAL_MS: Number(process.env.BIOMETRIC_POLL_INTERVAL_MS || 15000),
  BIOMETRIC_DUPLICATE_WINDOW_SEC: Number(process.env.BIOMETRIC_DUPLICATE_WINDOW_SEC || 0),
}
