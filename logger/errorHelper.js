const logger = require('./index');

/**
 * 异步包装器 - 自动捕获和记录异步函数的错误
 * @param {Function} fn - 异步函数
 * @param {Object} options - 配置选项
 * @returns {Function} 包装后的函数
 */
function asyncHandler(fn, options = {}) {
  const { context = 'Unknown', logError = true } = options;

  return async function(req, res, next) {
    try {
      await fn(req, res, next);
    } catch (error) {
      if (logError) {
        logger.error(`${context} - 未捕获的异步错误`, {
          error: error.message,
          stack: error.stack,
          url: req.originalUrl,
          method: req.method,
        });
      }

      // 传递错误给Express错误处理中间件
      next(error);
    }
  };
}

/**
 * 错误响应辅助函数
 * @param {Object} res - Express响应对象
 * @param {Error|string} error - 错误对象或消息
 * @param {number} status - HTTP状态码
 * @param {Object} meta - 额外的元数据
 */
function errorResponse(res, error, status = 500, meta = {}) {
  const message = error instanceof Error ? error.message : error;
  const statusCode = error instanceof Error && error.statusCode ? error.statusCode : status;

  // 记录错误
  if (statusCode >= 500) {
    logger.error('API错误响应', {
      message,
      statusCode,
      ...meta,
      stack: error instanceof Error ? error.stack : undefined,
    });
  } else {
    logger.warn('API错误响应', {
      message,
      statusCode,
      ...meta,
    });
  }

  res.status(statusCode).json({
    error: message,
    ...(meta && { details: meta }),
  });
}

/**
 * 成功响应辅助函数（带日志）
 * @param {Object} res - Express响应对象
 * @param {string} message - 成功消息
 * @param {Object} data - 响应数据
 * @param {Object} meta - 额外的元数据（用于日志）
 */
function successResponse(res, message, data = null, meta = {}) {
  const responseData = data !== null ? { data, message } : { message };

  // 记录成功操作
  if (Object.keys(meta).length > 0) {
    logger.info('API成功响应', {
      message,
      ...meta,
    });
  }

  res.json(responseData);
}

/**
 * Try-Catch包装器 - 用于同步或异步代码块
 * @param {Function} fn - 要执行的函数
 * @param {Object} context - 上下文信息
 */
async function tryCatch(fn, context = {}) {
  try {
    return await fn();
  } catch (error) {
    logger.error('Try-Catch错误', {
      error: error.message,
      stack: error.stack,
      ...context,
    });
    throw error; // 重新抛出错误
  }
}

module.exports = {
  asyncHandler,
  errorResponse,
  successResponse,
  tryCatch,
};
