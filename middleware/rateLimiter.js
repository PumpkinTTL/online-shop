const rateLimit = require('express-rate-limit');
const rateLimitService = require('../services/rateLimitService');

// 缓存当前生效的配置
const configCache = {
  global: { windowMs: 60000, maxRequests: 100, enabled: true },
  login: { windowMs: 900000, maxRequests: 5, enabled: true },
  payment: { windowMs: 60000, maxRequests: 3, enabled: true },
  api: { windowMs: 60000, maxRequests: 20, enabled: true },
  admin: { windowMs: 900000, maxRequests: 10, enabled: true },
  pickup: { windowMs: 60000, maxRequests: 20, enabled: true },      // 接码接口：20次/分钟
  pickupVerify: { windowMs: 60000, maxRequests: 5, enabled: true }, // 卡密验证：5次/分钟
  pickupRedeem: { windowMs: 60000, maxRequests: 3, enabled: true }, // 卡密兑换：3次/分钟
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
  pickup: createLimiter('pickup'),
  pickupVerify: createLimiter('pickupVerify'),
  pickupRedeem: createLimiter('pickupRedeem'),
};

// 创建动态限速中间件（始终使用最新实例）
const createDynamicMiddleware = (key) => {
  return (req, res, next) => {
    return limiters[key](req, res, next);
  };
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

module.exports = {
  global: createDynamicMiddleware('global'),
  login: createDynamicMiddleware('login'),
  payment: createDynamicMiddleware('payment'),
  api: createDynamicMiddleware('api'),
  admin: createDynamicMiddleware('admin'),
  pickup: createDynamicMiddleware('pickup'),
  pickupVerify: createDynamicMiddleware('pickupVerify'),
  pickupRedeem: createDynamicMiddleware('pickupRedeem'),
};
module.exports.refreshConfigs = refreshConfigs;
