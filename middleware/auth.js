const jwt = require('jsonwebtoken');

// JWT 密钥（从环境变量读取，必须配置）
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET 环境变量未配置，请设置后重启服务');
}

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
 * 验证 JWT 并解析用户信息，同时检查用户是否被禁用
 * 成功: req.userId = decoded.userId, next()
 * 未登录: 返回 401
 * 账号禁用: 返回 403 { error, accountBanned: true }
 */
async function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: '未登录' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;

    // 查库检查用户是否被禁用
    try {
      const dataSource = require('../config/database');
      const User = require('../entities/User');
      const userRepo = dataSource.getRepository(User);
      const user = await userRepo.findOne({ where: { id: decoded.userId } });
      if (!user || !user.isActive) {
        return res.status(403).json({ error: '账号已被禁用', accountBanned: true });
      }
    } catch (dbErr) {
      // 数据库查询失败不阻断请求，只记录警告
      console.warn('[Auth] 用户状态检查失败:', dbErr.message);
    }

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

// ── 管理员鉴权 ──

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;
if (!ADMIN_JWT_SECRET) {
  throw new Error('ADMIN_JWT_SECRET 环境变量未配置，请设置后重启服务');
}

/**
 * 管理员鉴权中间件
 * 优先从 httpOnly Cookie (admin_token) 获取，兼容 Authorization Header
 */
async function requireAdminAuth(req, res, next) {
  // 优先 Cookie，其次 Header
  let token = req.cookies?.admin_token;
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }
  if (!token) {
    return res.status(401).json({ error: '未登录，请先登录' });
  }

  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET);
    if (decoded.type !== 'admin') {
      return res.status(403).json({ error: '无权限访问' });
    }

    const dataSource = require('../config/database');
    const Admin = require('../entities/Admin');
    const adminRepo = dataSource.getRepository(Admin);
    const admin = await adminRepo.findOne({ where: { id: decoded.adminId } });
    if (!admin) {
      return res.status(401).json({ error: '管理员不存在' });
    }
    if (!admin.isActive) {
      return res.status(403).json({ error: '账号已被禁用' });
    }

    req.admin = { id: admin.id, role: admin.role };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '登录已过期，请重新登录' });
    }
    return res.status(401).json({ error: '无效的认证信息' });
  }
}

module.exports = { requireAuth, optionalAuth, extractToken, JWT_SECRET, requireAdminAuth };
