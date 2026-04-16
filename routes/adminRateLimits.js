const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimitService = require('../services/rateLimitService');
const dataSource = require('../config/database');
const Admin = require('../entities/Admin');

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'admin-secret-key-2026-!@#';

// 管理员认证中间件（与 admin.js 保持一致）
const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未登录，请先登录' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET);

    if (decoded.type !== 'admin') {
      return res.status(403).json({ error: '无权限访问' });
    }

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
};

const router = express.Router();

// 获取所有速率限制配置（需要管理员权限）
router.get('/', auth, async (req, res) => {
  try {
    const configs = await rateLimitService.findAll();
    res.json(configs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单个速率限制配置（需要管理员权限）
router.get('/:key', auth, async (req, res) => {
  try {
    const config = await rateLimitService.getEffectiveConfig(req.params.key);
    if (!config) {
      return res.status(404).json({ error: '配置不存在' });
    }
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新速率限制配置（需要管理员权限）
router.put('/:key', auth, async (req, res) => {
  try {
    const { key } = req.params;
    const { windowMs, maxRequests, message, enabled } = req.body;

    const data = {};
    if (windowMs !== undefined) data.windowMs = windowMs;
    if (maxRequests !== undefined) data.maxRequests = maxRequests;
    if (message !== undefined) data.message = message;
    if (enabled !== undefined) data.enabled = enabled;

    const config = await rateLimitService.updateByKey(key, data);
    res.json({
      message: '配置更新成功',
      config,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 重置为默认配置（需要管理员权限）
router.post('/reset', auth, async (req, res) => {
  try {
    const configs = await rateLimitService.resetToDefaults();
    res.json({
      message: '配置已重置为默认值',
      configs,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
