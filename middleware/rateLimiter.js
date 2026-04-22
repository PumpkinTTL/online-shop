const rateLimit = require('express-rate-limit');
const rateLimitService = require('../services/rateLimitService');
const { system } = require('../logger');

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
  captcha: { windowMs: 60000, maxRequests: 10, enabled: true },     // 验证码接口：10次/分钟
};

// 创建限速器工厂函数
// 返回 { middleware, resetKey } —— middleware 用于路由挂载，resetKey 用于计数器重置
function createLimiter(key) {
  const config = configCache[key];

  const limiter = rateLimit({
    windowMs: config.windowMs,
    max: config.enabled ? config.maxRequests : 0,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: key === 'login',
    skip: () => {
      return !configCache[key].enabled;
    },
    handler: (req, res) => {
      res.status(429).json({
        error: '请求过于频繁，请完成验证码后重试',
        captchaRequired: true,
      });
    },
  });

  // 保存原始 limiter 的 resetKey 方法引用（包装后不丢失）
  const originalResetKey = limiter.resetKey?.bind(limiter);

  // 包装中间件函数（如果 limiter 是 AsyncFunction 需要包装）
  let middleware = limiter;
  if (limiter.constructor.name === 'AsyncFunction') {
    middleware = (req, res, next) => {
      Promise.resolve().then(() => limiter(req, res, next)).catch(next);
    };
  }

  return { middleware, resetKey: originalResetKey };
}

// 限流器实例（存 { middleware, resetKey } 对象）
const limiters = {
  global: createLimiter('global'),
  login: createLimiter('login'),
  payment: createLimiter('payment'),
  api: createLimiter('api'),
  admin: createLimiter('admin'),
  pickup: createLimiter('pickup'),
  pickupVerify: createLimiter('pickupVerify'),
  pickupRedeem: createLimiter('pickupRedeem'),
  captcha: createLimiter('captcha'),
};

// 限流器名称集合
const LIMITER_KEYS = ['global', 'login', 'payment', 'api', 'admin', 'pickup', 'pickupVerify', 'pickupRedeem', 'captcha'];

// 创建动态限速中间件（始终使用最新的 middleware）
const createDynamicMiddleware = (key) => {
  return (req, res, next) => {
    return limiters[key].middleware(req, res, next);
  };
};

// 将 IPv4-mapped IPv6 地址转换为纯 IPv4
function normalizeIp(ip) {
  if (!ip) return [];
  const keys = [ip];
  const ipv4Match = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (ipv4Match) {
    keys.push(ipv4Match[1]);
  }
  const pureIpv4 = ip.match(/^(\d+\.\d+\.\d+\.\d+)$/);
  if (pureIpv4) {
    keys.push(`::ffff:${ip}`);
  }
  return keys;
}

/**
 * 重置指定 IP 在所有限流器上的计数器
 * 验证码通过后调用，让用户从 0 开始重新计数
 */
function resetAllKeys(ip) {
  if (!ip) return;
  const ipKeys = normalizeIp(ip);
  let resetCount = 0;
  LIMITER_KEYS.forEach(key => {
    const resetFn = limiters[key].resetKey;
    if (typeof resetFn === 'function') {
      ipKeys.forEach(ipKey => {
        try {
          resetFn(ipKey);
          resetCount++;
        } catch (e) {
          system.error('resetKey 失败', { key, ipKey, error: e.message });
        }
      });
    } else {
      system.warn('限流器缺少 resetKey', { key });
    }
  });
  system.info('resetAllKeys', { ip, ipKeys, resetCount });
}

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
    LIMITER_KEYS.forEach(key => {
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
  captcha: createDynamicMiddleware('captcha'),
  resetAllKeys,
  refreshConfigs,
};
