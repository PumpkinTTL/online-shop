const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const { customFormat, consoleFormat } = require('./config/formats');

// 日志配置
const LOG_CONFIG = {
  level: process.env.LOG_LEVEL || 'info',
  dirname: path.join(__dirname, '../logs'),
  maxSize: '20m',
  maxFiles: '30d',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
};

// 敏感字段脱敏
const sensitiveFields = ['password', 'token', 'secret', 'authorization', 'apiKey'];

function maskSensitiveData(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  const masked = Array.isArray(obj) ? [...obj] : { ...obj };

  for (const key in masked) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      masked[key] = '***MASKED***';
    } else if (typeof masked[key] === 'object') {
      masked[key] = maskSensitiveData(masked[key]);
    }
  }

  return masked;
}

// 创建日志传输器
function createTransport(filename, options = {}) {
  return new DailyRotateFile({
    filename: path.join(LOG_CONFIG.dirname, filename),
    datePattern: LOG_CONFIG.datePattern,
    maxSize: LOG_CONFIG.maxSize,
    maxFiles: LOG_CONFIG.maxFiles,
    zippedArchive: LOG_CONFIG.zippedArchive,
    format: customFormat,
    ...options,
  });
}

// 主 Logger
const logger = winston.createLogger({
  level: LOG_CONFIG.level,
  format: customFormat,
  transports: [
    // 控制台输出（开发环境）
    new winston.transports.Console({
      format: consoleFormat,
      silent: process.env.NODE_ENV === 'production',
    }),

    // 访问日志
    createTransport('access/combined-%DATE%.log', {
      level: 'http',
    }),

    // 错误日志
    createTransport('error/error-%DATE%.log', {
      level: 'error',
    }),

    // 业务日志
    createTransport('business/business-%DATE%.log', {
      level: 'info',
    }),

    // 所有日志
    createTransport('combined/combined-%DATE%.log'),
  ],

  // 异常处理
  exceptionHandlers: [
    createTransport('exceptions/exceptions-%DATE%.log'),
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],

  // 未处理的 Promise rejection
  rejectionHandlers: [
    createTransport('rejections/rejections-%DATE%.log'),
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
});

// 业务日志（记录到特定文件）
const businessLogger = winston.createLogger({
  level: 'info',
  format: customFormat,
  transports: [
    createTransport('business/order-%DATE%.log', {
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }),
  ],
});

// 创建子logger
function createChildLogger(context) {
  const childLogger = logger.child({ context });

  return {
    info: (message, meta = {}) => childLogger.info(message, maskSensitiveData(meta)),
    warn: (message, meta = {}) => childLogger.warn(message, maskSensitiveData(meta)),
    error: (message, meta = {}) => childLogger.error(message, maskSensitiveData(meta)),
    debug: (message, meta = {}) => childLogger.debug(message, maskSensitiveData(meta)),
  };
}

// 订单日志
const orderLogger = createChildLogger('order');

// 支付日志
const paymentLogger = createChildLogger('payment');

// 用户日志
const userLogger = createChildLogger('user');

// 管理员日志
const adminLogger = createChildLogger('admin');

module.exports = {
  // 主logger
  logger,

  // 业务logger
  business: businessLogger,
  order: orderLogger,
  payment: paymentLogger,
  user: userLogger,
  admin: adminLogger,

  // 辅助函数
  createChildLogger,
  maskSensitiveData,

  // 快捷方法
  info: (message, meta) => logger.info(message, maskSensitiveData(meta)),
  warn: (message, meta) => logger.warn(message, maskSensitiveData(meta)),
  error: (message, meta) => logger.error(message, maskSensitiveData(meta)),
  debug: (message, meta) => logger.debug(message, maskSensitiveData(meta)),
  http: (message, meta) => logger.http(message, maskSensitiveData(meta)),
};
