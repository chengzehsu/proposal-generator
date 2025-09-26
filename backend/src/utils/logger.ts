import winston from 'winston';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables if not already loaded
if (!process.env.LOG_DIR) {
  dotenv.config();
}

// Create logs directory if it doesn't exist
const logsDir = process.env.LOG_DIR || './logs';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.prettyPrint()
  ),
  defaultMeta: { service: 'proposal-generator-backend' },
  transports: [
    // Write all logs with importance level of 'error' or less to error.log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    // Write all logs with importance level of 'info' or less to app.log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'app.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
  ],
});

// If we're not in production then log to the console with a simple format
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ level, message, timestamp, ...meta }) => {
        let metaStr = '';
        if (Object.keys(meta).length > 0) {
          metaStr = ` ${JSON.stringify(meta)}`;
        }
        return `${timestamp} ${level}: ${message}${metaStr}`;
      })
    ),
  }));
}

export { logger };