const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// 自定义日志级别：error > warn > success > info > debug
const customLevels = {
  error:   0,
  warn:    1,
  success: 2,
  info:    3,
  debug:   4,
};

// 日志通用配置
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

// 统一日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// 控制台格式（开发环境）
const consoleFormat = winston.format.combine(
  winston.format.colorize({ colors: { error: 'red', warn: 'yellow', success: 'green', info: 'blue', debug: 'gray' } }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// 创建日志传输器
function createTransport(filename, options = {}) {
  return new DailyRotateFile({
    filename: path.join(LOG_CONFIG.dirname, filename),
    datePattern: LOG_CONFIG.datePattern,
    maxSize: LOG_CONFIG.maxSize,
    maxFiles: LOG_CONFIG.maxFiles,
    zippedArchive: LOG_CONFIG.zippedArchive,
    format: logFormat,
    ...options,
  });
}

// 控制台传输器
const consoleTransport = new winston.transports.Console({
  format: consoleFormat,
  silent: process.env.NODE_ENV === 'production',
});

// ========== access 日志（请求访问） ==========
const access = winston.createLogger({
  levels: customLevels,
  level: LOG_CONFIG.level,
  format: logFormat,
  transports: [
    consoleTransport,
    createTransport('access/access-%DATE%.log'),
  ],
});

// ========== business 日志（金钱业务：订单/支付/充值/退款） ==========
const business = winston.createLogger({
  levels: customLevels,
  level: LOG_CONFIG.level,
  format: logFormat,
  transports: [
    consoleTransport,
    createTransport('business/business-%DATE%.log'),
  ],
});

// ========== action 日志（用户操作：登录/注册/兑换卡密/管理员操作等） ==========
const action = winston.createLogger({
  levels: customLevels,
  level: LOG_CONFIG.level,
  format: logFormat,
  transports: [
    consoleTransport,
    createTransport('action/action-%DATE%.log'),
  ],
});

// ========== system 日志（系统状态：启停/异常/超时/数据库等） ==========
const system = winston.createLogger({
  levels: customLevels,
  level: LOG_CONFIG.level,
  format: logFormat,
  transports: [
    consoleTransport,
    createTransport('system/system-%DATE%.log'),
  ],
  // 未捕获异常 → system
  exceptionHandlers: [
    createTransport('system/system-%DATE%.log'),
    consoleTransport,
  ],
  // 未处理的 Promise rejection → system
  rejectionHandlers: [
    createTransport('system/system-%DATE%.log'),
    consoleTransport,
  ],
});

// 为每个 logger 添加脱敏包装
function wrapLogger(logr) {
  return {
    error:   (message, meta = {}) => logr.error(message, maskSensitiveData(meta)),
    warn:    (message, meta = {}) => logr.warn(message, maskSensitiveData(meta)),
    success: (message, meta = {}) => logr.success(message, maskSensitiveData(meta)),
    info:    (message, meta = {}) => logr.info(message, maskSensitiveData(meta)),
    debug:   (message, meta = {}) => logr.debug(message, maskSensitiveData(meta)),
  };
}

module.exports = {
  access:   wrapLogger(access),
  business: wrapLogger(business),
  action:   wrapLogger(action),
  system:   wrapLogger(system),
  maskSensitiveData,
};
