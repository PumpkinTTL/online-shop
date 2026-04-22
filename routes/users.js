const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const userService = require('../services/UserService');
const activationCodeService = require('../services/ActivationCodeService');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');
const { login: loginLimiter } = require('../middleware/rateLimiter');
const { action } = require('../logger');

const router = express.Router();

const JWT_EXPIRES_IN = '7d';

// 生成 JWT Token（登录/注册时使用）
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Cookie 配置
const COOKIE_OPTIONS = {
  httpOnly: true,      // 防止 XSS 攻击
  secure: process.env.NODE_ENV === 'production',  // 生产环境需要 HTTPS
  sameSite: 'lax',     // lax: 允许顶级导航携带 cookie（strict 会导致页面跳转后登录丢失）
  maxAge: 7 * 24 * 60 * 60 * 1000  // 7天（毫秒）
};

// 验证中间件：统一处理验证错误
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// 注册
router.post('/register', [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('用户名长度必须为3-20位')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用户名只能包含英文、数字、下划线'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码长度至少6位'),
  body('inviteCode')
    .trim()
    .notEmpty()
    .withMessage('邀请码不能为空'),
], handleValidationErrors, async (req, res) => {
  try {
    const { username, password, inviteCode } = req.body;

    // 验证邀请码
    await activationCodeService.validate(inviteCode, 'invite');

    const user = await userService.register(username, password);

    // 使用邀请码
    await activationCodeService.use(inviteCode, user.id, 'invite');

    // 生成 token
    const token = generateToken(user.id);

    // 设置 Cookie
    res.cookie('token', token, COOKIE_OPTIONS);

    // 脱敏返回
    res.status(201).json({
      message: '注册成功',
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        createdAt: user.createdAt
      }
    });

    // 记录用户注册日志
    action.success('user.register', {
      userId: user.id,
      username: user.username,
      ip: req.ip,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 登录
router.post('/login', loginLimiter, [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('用户名不能为空')
    .isLength({ min: 3, max: 20 })
    .withMessage('用户名长度必须为3-20位'),
  body('password')
    .notEmpty()
    .withMessage('密码不能为空'),
], handleValidationErrors, async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await userService.login(username, password);

    // 生成 JWT token
    const token = generateToken(user.id);

    // 设置 Cookie
    res.cookie('token', token, COOKIE_OPTIONS);

    // 脱敏返回
    res.json({
      message: '登录成功',
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        createdAt: user.createdAt
      }
    });

    // 记录用户登录日志
    action.success('user.login', {
      userId: user.id,
      username: user.username,
      ip: req.ip,
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// 退出登录
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: '退出成功' });

  // 记录用户登出日志
  action.info('user.logout', {
    userId: req.userId || null,
    ip: req.ip,
  });
});

// 获取当前用户信息（需要登录）
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await userService.findOne(req.userId);

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 脱敏：只返回必要字段
    const userInfo = {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      createdAt: user.createdAt
    };

    res.json(userInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 修改密码（需要登录）
router.post('/change-password', requireAuth, [
  body('oldPassword')
    .trim()
    .notEmpty()
    .withMessage('请输入原密码'),
  body('newPassword')
    .trim()
    .isLength({ min: 6 })
    .withMessage('新密码长度至少6位'),
], handleValidationErrors, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    await userService.changePassword(req.userId, oldPassword, newPassword);
    res.json({ message: '密码修改成功' });

    // 记录密码修改日志
    action.success('user.changePassword', {
      userId: req.userId,
      ip: req.ip,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;