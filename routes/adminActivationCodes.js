const express = require('express');
const jwt = require('jsonwebtoken');
const activationCodeService = require('../services/ActivationCodeService');
const dataSource = require('../config/database');
const Admin = require('../entities/Admin');

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;

// 管理员认证中间件
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
    req.adminId = admin.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
};

const router = express.Router();

// 获取激活码列表
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, type = '', status = '' } = req.query;
    const result = await activationCodeService.list({
      page: Number(page),
      pageSize: Number(pageSize),
      type,
      status,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 生成激活码
router.post('/generate', auth, async (req, res) => {
  try {
    const { type, count = 1, prefix = '', remark = '', expiredAt = null } = req.body;
    const codes = await activationCodeService.generate({ type, count, prefix, remark, expiredAt });
    res.status(201).json({ message: `成功生成 ${codes.length} 个激活码`, codes });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 删除激活码
router.delete('/:id', auth, async (req, res) => {
  try {
    const ok = await activationCodeService.delete(Number(req.params.id));
    if (!ok) return res.status(404).json({ error: '激活码不存在' });
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 批量删除
router.post('/batch-delete', auth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请提供要删除的ID列表' });
    }
    const count = await activationCodeService.batchDelete(ids);
    res.json({ message: `成功删除 ${count} 个激活码` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
