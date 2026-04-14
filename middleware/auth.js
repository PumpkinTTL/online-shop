const jwt = require('jsonwebtoken');

// JWT 密钥（与 users.js 登录时签名保持一致）
const JWT_SECRET = 'online-shop-secret-key-2026';

/**
 * 从请求中提取 JWT token
 * 优先从 httpOnly cookie 读取，其次从 Authorization header 读取
 */
function extractToken(req) {
  // 1. 优先从 cookie 获取（httpOnly，防 XSS）
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  // 2. 其次从 Authorization header 获取
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

/**
 * 验证 JWT 并解析用户信息
 * 成功: req.userId = decoded.userId, next()
 * 失败: 返回 401
 */
function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: '未登录' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

/**
 * 可选鉴权：有 token 就解析，没有也不拦截
 * 成功: req.userId = decoded.userId
 * 无 token: req.userId = null
 */
function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.userId = decoded.userId;
    } catch {
      req.userId = null;
    }
  } else {
    req.userId = null;
  }
  next();
}

module.exports = { requireAuth, optionalAuth, extractToken, JWT_SECRET };
