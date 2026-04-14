const express = require('express');
const jwt = require('jsonwebtoken');
const userService = require('../services/UserService');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

const JWT_EXPIRES_IN = '7d';

// 用户名验证正则：只能包含英文、数字、下划线，长度3-20
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

// 生成 JWT Token（登录/注册时使用）
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Cookie 配置
const COOKIE_OPTIONS = {
  httpOnly: true,      // 防止 XSS 攻击
  secure: false,       // 生产环境应为 true（需要 HTTPS）
  sameSite: 'strict',  // 防止 CSRF 攻击
  maxAge: 7 * 24 * 60 * 60 * 1000  // 7天（毫秒）
};

// 注册
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 验证用户名
    if (!username || !USERNAME_REGEX.test(username)) {
      return res.status(400).json({ 
        error: '用户名只能包含英文、数字、下划线，长度3-20位' 
      });
    }
    
    // 验证密码
    if (!password || password.length < 6) {
      return res.status(400).json({ 
        error: '密码长度至少6位' 
      });
    }
    
    const user = await userService.register(username, password);
    
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
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        error: '用户名和密码不能为空' 
      });
    }
    
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
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// 退出登录
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: '退出成功' });
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

// 获取所有用户
router.get('/', async (req, res) => {
  try {
    const users = await userService.findAll();
    // 移除密码字段
    const safeUsers = users.map(({ password, ...u }) => u);
    res.json(safeUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单个用户
router.get('/:id', async (req, res) => {
  try {
    const user = await userService.findOne(parseInt(req.params.id));
    if (!user) return res.status(404).json({ error: '用户不存在' });
    const { password, ...userInfo } = user;
    res.json(userInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;