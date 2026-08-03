import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRATION: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),
  TWILIO_ACCOUNT_SID: Joi.string().allow('').optional(),
  TWILIO_AUTH_TOKEN: Joi.string().allow('').optional(),
  TWILIO_SERVICE_SID: Joi.string().allow('').optional(),
  GOOGLE_CLIENT_ID: Joi.string().allow('').optional(),
  APPLE_CLIENT_ID: Joi.string().allow('').optional(),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  S3_BUCKET_NAME: Joi.string().allow('').optional(),
  S3_REGION: Joi.string().allow('').optional(),
  S3_ACCESS_KEY_ID: Joi.string().allow('').optional(),
  S3_SECRET_ACCESS_KEY: Joi.string().allow('').optional(),
  S3_ENDPOINT: Joi.string().allow('').optional(),
  QDRANT_URL: Joi.string().allow('').optional(),
  QDRANT_API_KEY: Joi.string().allow('').optional(),
  STRIPE_SECRET_KEY: Joi.string().allow('').optional(),
  STRIPE_WEBHOOK_SECRET: Joi.string().allow('').optional(),
  PAYSTACK_SECRET_KEY: Joi.string().allow('').optional(),
  FLUTTERWAVE_SECRET_KEY: Joi.string().allow('').optional(),
});

export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    serviceSid: process.env.TWILIO_SERVICE_SID,
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
  },
  apple: {
    clientId: process.env.APPLE_CLIENT_ID,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  s3: {
    bucketName: process.env.S3_BUCKET_NAME,
    region: process.env.S3_REGION || 'us-east-1',
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    endpoint: process.env.S3_ENDPOINT,
  },
  qdrant: {
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY,
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY,
  },
  flutterwave: {
    secretKey: process.env.FLUTTERWAVE_SECRET_KEY,
  },
});
