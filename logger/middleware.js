const logger = require('./index');

// 请求日志中间件
function requestLogger(req, res, next) {
  const startTime = Date.now();

  // 记录请求信息
  const requestInfo = {
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    query: req.query,
    // body会在响应时记录
  };

  // 添加用户信息（如果有）
  if (req.userId) {
    requestInfo.userId = req.userId;
  }
  if (req.admin) {
    requestInfo.adminId = req.admin.id;
  }

  // 监听响应完成事件
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;

    const responseInfo = {
      ...requestInfo,
      statusCode: res.statusCode,
      responseTime: responseTime,
      contentLength: res.get('content-length') || 0,
    };

    // 只记录成功和重定向的请求（避免大量错误日志）
    if (res.statusCode < 400) {
      logger.http(`${req.method} ${req.url}`, responseInfo);
    } else {
      logger.warn(`${req.method} ${req.url} - ${res.statusCode}`, responseInfo);
    }
  });

  next();
}

// 错误日志中间件
function errorLogger(err, req, res, next) {
  const errorInfo = {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl || req.url,
    method: req.method,
    ip: req.ip || req.connection.remoteAddress,
    statusCode: err.statusCode || 500,
  };

  // 添加用户信息
  if (req.userId) {
    errorInfo.userId = req.userId;
  }
  if (req.admin) {
    errorInfo.adminId = req.admin.id;
  }

  // 添加请求体（敏感信息已在logger中脱敏）
  if (req.body) {
    errorInfo.body = req.body;
  }

  logger.error('请求错误', errorInfo);

  next(err);
}

module.exports = {
  requestLogger,
  errorLogger,
};
