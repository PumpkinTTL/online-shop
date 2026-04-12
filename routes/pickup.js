const express = require('express');
const pickupService = require('../services/pickupService');

const router = express.Router();

// 验证卡密
router.post('/verify-card', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || !code.trim()) {
      return res.status(400).json({ error: '请输入卡密' });
    }
    const cardKey = await pickupService.verifyCardKey(code.trim());
    res.json({
      id: cardKey.id,
      productId: cardKey.productId,
      keyword: cardKey.keyword,
      status: cardKey.status,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 兑换卡密 — 验证卡密后返回CDK
router.post('/redeem', async (req, res) => {
  try {
    const { code, productId } = req.body;
    if (!code || !code.trim()) {
      return res.status(400).json({ error: '请输入卡密' });
    }
    const result = await pickupService.redeemCardKey(code.trim(), productId);
    res.json({
      success: true,
      CDK: result.CDK,
      productId: result.productId,
      message: '兑换成功',
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 获取手机号
router.post('/get-phone', async (req, res) => {
  try {
    const { cardCode, keyword } = req.body;
    if (!cardCode || !cardCode.trim()) {
      return res.status(400).json({ error: '卡密不能为空' });
    }

    // 先验证卡密
    const cardKey = await pickupService.verifyCardKey(cardCode.trim());

    // 调用 MAAPI 获取手机号
    const phone = await pickupService.getPhone(keyword || cardKey.keyword);

    // 把手机号暂存到卡密记录
    const cardKeyRepo = pickupService.getCardKeyRepo();
    await cardKeyRepo.update(cardKey.id, { phone });

    res.json({ phone, cardKeyId: cardKey.id, productId: cardKey.productId });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 获取验证码（长轮询，前端可多次调用）
router.post('/get-verify-code', async (req, res) => {
  try {
    const { phone, keyword } = req.body;
    if (!phone) {
      return res.status(400).json({ error: '手机号不能为空' });
    }

    const result = await pickupService.getVerifyCode(phone, keyword, 1, 0);
    if (!result.code) {
      return res.json({ received: false, content: result.content });
    }

    res.json({ received: true, code: result.code, content: result.content });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 确认提货 — 创建订单
router.post('/confirm', async (req, res) => {
  try {
    const { cardKeyId, productId, contact, phone, verifyCode } = req.body;

    if (!contact || !contact.trim()) {
      return res.status(400).json({ error: '请留下联系方式' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ error: '手机号不能为空' });
    }

    // 如果有卡密ID，再次验证卡密有效性
    if (cardKeyId) {
      const cardKeyRepo = pickupService.getCardKeyRepo();
      const cardKey = await cardKeyRepo.findOne({ where: { id: cardKeyId } });
      if (!cardKey) {
        return res.status(400).json({ error: '卡密不存在' });
      }
      if (cardKey.status === 'used') {
        return res.status(400).json({ error: '卡密已使用' });
      }
    }

    const order = await pickupService.createOrder({
      cardKeyId,
      productId,
      contact: contact.trim(),
      phone: phone.trim(),
      verifyCode: verifyCode || '',
    });

    res.json({
      orderNo: order.orderNo,
      status: order.status,
      message: '提货成功！',
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 释放号码
router.post('/release-phone', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: '手机号不能为空' });
    }
    await pickupService.releasePhone(phone);
    res.json({ message: '号码已释放' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 按联系方式查询订单
router.get('/orders', async (req, res) => {
  try {
    const { contact } = req.query;
    if (!contact || !contact.trim()) {
      return res.status(400).json({ error: '请输入联系方式' });
    }
    const orders = await pickupService.queryOrders(contact.trim());
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
