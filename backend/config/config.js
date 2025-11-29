import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const config = {
  // Application
  app: {
    name: process.env.APP_NAME || 'Vinyl Catalog API',
    port: parseInt(process.env.APP_PORT, 10) || 3001,
    host: process.env.APP_HOST || 'localhost',
    env: process.env.NODE_ENV || 'development',
  },

  // Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || 'vinyl_catalog_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },

  // Authentication
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-key',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    format: process.env.LOG_FORMAT || 'json',
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'],
  },

  // External APIs
  externalAPIs: {
    discogs: {
      baseURL: process.env.DISCOGS_API_URL || 'https://api.discogs.com',
      userAgent: process.env.DISCOGS_USER_AGENT || 'VinylCatalog/0.1',
    },
    ebay: {
      baseURL: process.env.EBAY_API_URL || 'https://api.ebay.com',
      appId: process.env.EBAY_APP_ID,
    },
  },

  // Feature Flags
  features: {
    pricingEngine: process.env.FEATURE_PRICING_ENGINE === 'true',
    inventoryManagement: process.env.FEATURE_INVENTORY_MANAGEMENT === 'true',
    sellerSubmissions: process.env.FEATURE_SELLER_SUBMISSIONS === 'true',
  },
};

// Validate required environment variables in production
if (config.app.env === 'production') {
  const requiredVars = ['JWT_SECRET', 'DB_HOST', 'DB_USER', 'DB_PASSWORD'];
  const missing = requiredVars.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables in production: ${missing.join(', ')}`);
  }
}

export default config;
