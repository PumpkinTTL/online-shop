const express = require('express');
const dataSource = require('../config/database');
const activationCodeService = require('../services/ActivationCodeService');
const { requireAdminAuth } = require('../middleware/auth');

const auth = requireAdminAuth;
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

// 更新激活码
router.put('/:id', auth, async (req, res) => {
  try {
    const repo = dataSource.getRepository(require('../entities/ActivationCode'));
    const record = await repo.findOne({ where: { id: Number(req.params.id) } });
    if (!record) return res.status(404).json({ error: '激活码不存在' });
    const { type, status, remark, expiredAt } = req.body;
    if (type) record.type = type;
    if (status) record.status = status;
    if (remark !== undefined) record.remark = remark;
    if (expiredAt !== undefined) record.expiredAt = expiredAt ? new Date(expiredAt) : null;
    await repo.save(record);
    res.json({ message: '更新成功' });
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
