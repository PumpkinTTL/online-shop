const { access, system } = require('./index');

// 静态资源跳过（不记录访问日志）
const SKIP_EXTENSIONS = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.map', '.woff', '.woff2', '.ttf', '.eot'];

function shouldSkip(url) {
  return SKIP_EXTENSIONS.some(ext => url.endsWith(ext));
}

// 请求日志中间件 → access
function requestLogger(req, res, next) {
  // 跳过静态资源和非 API 请求
  if (shouldSkip(req.originalUrl || req.url)) {
    return next();
  }

  const startTime = Date.now();

  const requestInfo = {
    ip: req.ip || req.connection.remoteAddress,
    userId: req.userId || undefined,
    adminId: req.admin ? req.admin.id : undefined,
    method: req.method,
    path: req.originalUrl || req.url,
    userAgent: req.get('user-agent'),
  };

  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const status = res.statusCode;

    const logData = {
      ...requestInfo,
      status,
      time: `${responseTime}ms`,
    };

    // 按 HTTP 状态码映射日志级别
    if (status >= 500) {
      access.error(`${req.method} ${req.url}`, logData);
    } else if (status >= 400) {
      access.warn(`${req.method} ${req.url}`, logData);
    } else {
      access.success(`${req.method} ${req.url}`, logData);
    }
  });

  next();
}

// 错误日志中间件 → system
function errorLogger(err, req, res, next) {
  const errorInfo = {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl || req.url,
    method: req.method,
    ip: req.ip || req.connection.remoteAddress,
    statusCode: err.statusCode || 500,
  };

  if (req.userId) errorInfo.userId = req.userId;
  if (req.admin) errorInfo.adminId = req.admin.id;
  if (req.body) errorInfo.body = req.body;

  system.error('请求错误', errorInfo);

  next(err);
}

module.exports = {
  requestLogger,
  errorLogger,
};
