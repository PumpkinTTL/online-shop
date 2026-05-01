const rateLimitService = require('../services/rateLimitService');
const { system } = require('../logger');

// 配置缓存（后台管理可更新）
const configCache = {
  global:        { windowMs: 60000,  maxRequests: 100, enabled: true },
  login:         { windowMs: 900000, maxRequests: 5,   enabled: true },
  payment:       { windowMs: 60000,  maxRequests: 3,   enabled: true },
  api:           { windowMs: 60000,  maxRequests: 20,  enabled: true },
  admin:         { windowMs: 900000, maxRequests: 10,  enabled: true },
  pickup:        { windowMs: 60000,  maxRequests: 20,  enabled: true },
  pickupVerify:  { windowMs: 60000,  maxRequests: 5,   enabled: true },
  pickupRedeem:  { windowMs: 60000,  maxRequests: 3,   enabled: true },
  captcha:       { windowMs: 60000,  maxRequests: 10,  enabled: true },
};

const LIMITER_KEYS = Object.keys(configCache);

// ── IP 标准化：IPv4-mapped IPv6 → 纯 IPv4 ──
function normalizeIp(ip) {
  if (!ip) return 'unknown';
  const m = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return m ? m[1] : ip;
}

// ── 限流计数器：`{key}:{ip}` → { count, resetTime } ──
const counters = new Map();

/**
 * 检查限流：超限返回 false
 * 计数 +1 → 判断是否超限
 */
function checkLimit(key, ip) {
  const config = configCache[key];
  if (!config || !config.enabled) return true;

  const nip = normalizeIp(ip);
  const now = Date.now();
  const ck = `${key}:${nip}`;
  let rec = counters.get(ck);

  // 窗口过期 → 重新计数
  if (!rec || now >= rec.resetTime) {
    rec = { count: 0, resetTime: now + config.windowMs };
    counters.set(ck, rec);
  }

  rec.count++;
  return rec.count <= config.maxRequests;
}

/**
 * 验证码通过后调用：清除该 IP 的所有计数器，从 0 重新开始
 */
function resetForIp(ip) {
  const nip = normalizeIp(ip);
  for (const ck of counters.keys()) {
    if (ck.endsWith(`:${nip}`)) counters.delete(ck);
  }
  system.info('rateLimiter.resetForIp', { ip, nip });
}

// ── 中间件工厂 ──
function createLimiter(key) {
  return (req, res, next) => {
    const ip = req.ip || req.connection?.remoteAddress;
    if (!checkLimit(key, ip)) {
      return res.status(429).json({
        error: '请求过于频繁，请完成验证码后重试',
        captchaRequired: true,
      });
    }
    next();
  };
}

// ── 从数据库刷新配置（管理后台调用） ──
async function refreshConfigs() {
  try {
    const configs = await rateLimitService.findAll();
    configs.forEach(c => {
      if (configCache[c.key]) {
        configCache[c.key] = {
          windowMs: c.windowMs,
          maxRequests: c.maxRequests,
          enabled: c.enabled,
        };
      }
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 定期清理过期的计数器（每分钟）
const MAX_COUNTERS = 10000;
setInterval(() => {
  const now = Date.now();
  for (const [ck, rec] of counters) {
    if (now >= rec.resetTime) counters.delete(ck);
  }
  // 超过上限时强制清理最旧的一半
  if (counters.size > MAX_COUNTERS) {
    const entries = [...counters.entries()]
      .sort((a, b) => a[1].resetTime - b[1].resetTime);
    const toDelete = entries.slice(0, Math.ceil(entries.length / 2));
    toDelete.forEach(([ck]) => counters.delete(ck));
  }
}, 60000);

module.exports = {
  global:       createLimiter('global'),
  login:        createLimiter('login'),
  payment:      createLimiter('payment'),
  api:          createLimiter('api'),
  admin:        createLimiter('admin'),
  pickup:       createLimiter('pickup'),
  pickupVerify: createLimiter('pickupVerify'),
  pickupRedeem: createLimiter('pickupRedeem'),
  captcha:      createLimiter('captcha'),
  resetAllKeys: resetForIp,
  refreshConfigs,
};
