const rateLimit = require('express-rate-limit');
const rateLimitService = require('../services/rateLimitService');

// 缓存当前生效的配置
const configCache = {
  global: { windowMs: 60000, maxRequests: 100, enabled: true },
  login: { windowMs: 900000, maxRequests: 5, enabled: true },
  payment: { windowMs: 60000, maxRequests: 3, enabled: true },
  api: { windowMs: 60000, maxRequests: 20, enabled: true },
  admin: { windowMs: 900000, maxRequests: 10, enabled: true },
};

// 创建限速器工厂函数
function createLimiter(key) {
  const config = configCache[key];

  const limiter = rateLimit({
    windowMs: config.windowMs,
    max: config.enabled ? config.maxRequests : 0,
    message: { error: '请求过于频繁，请稍后再试' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: key === 'login',
    skip: (req) => !configCache[key].enabled,
  });

  // 如果返回的是 AsyncFunction，包装成同步函数
  if (limiter.constructor.name === 'AsyncFunction') {
    return (req, res, next) => {
      Promise.resolve().then(() => limiter(req, res, next)).catch(next);
    };
  }

  return limiter;
}

// 创建限速器实例
const limiters = {
  global: createLimiter('global'),
  login: createLimiter('login'),
  payment: createLimiter('payment'),
  api: createLimiter('api'),
  admin: createLimiter('admin'),
};

// 从数据库刷新配置（供管理API调用）
async function refreshConfigs() {
  try {
    const configs = await rateLimitService.findAll();

    configs.forEach(config => {
      if (configCache[config.key]) {
        configCache[config.key] = {
          windowMs: config.windowMs,
          maxRequests: config.maxRequests,
          enabled: config.enabled,
        };
      }
    });

    // 重新创建限速器实例
    Object.keys(limiters).forEach(key => {
      limiters[key] = createLimiter(key);
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = limiters;
module.exports.refreshConfigs = refreshConfigs;
