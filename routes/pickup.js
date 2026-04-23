const express = require('express');
const pickupService = require('../services/pickupService');
const couponService = require('../services/couponService');
const dataSource = require('../config/database');
const Product = require('../entities/Product');
const { optionalAuth } = require('../middleware/auth');
const { pickupVerify, pickupRedeem, pickup } = require('../middleware/rateLimiter');
const { action, system } = require('../logger');

const router = express.Router();

// 验证卡密（严格限速：5次/分钟，防止暴力破解）
router.post('/verify-card', pickupVerify, async (req, res) => {
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

// 兑换卡密 — 验证卡密后返回CDK，并写入订单（严格限速：3次/分钟，防止批量盗刷）
router.post('/redeem', pickupRedeem, optionalAuth, async (req, res) => {
  try {
    const { code, productId, contact } = req.body;
    if (!code || !code.trim()) {
      return res.status(400).json({ error: '请输入卡密' });
    }
    const result = await pickupService.redeemCardKey(code.trim(), productId);

    // 写入订单
    try {
      // 查询商品价格
      let productPrice = null;
      try {
        const productRepo = dataSource.getRepository(Product);
        const product = await productRepo.findOne({ where: { id: result.productId || productId } });
        if (product) productPrice = product.price;
      } catch (e) {}

      await pickupService.createOrder({
        userId: req.userId || null,
        cardKeyId: result.id,
        productId: result.productId || productId,
        amount: productPrice,
        payMethod: '兑换',
        contact: contact || '',
        phone: '',
        verifyCode: '',
      }, { ip: req.ip });
    } catch (orderErr) {
      console.warn('[Redeem] 写入订单失败:', orderErr.message);
      system.warn('兑换写入订单失败', { error: orderErr.message, code: code.trim() });
    }

    res.json({
      success: true,
      CDK: result.CDK,
      productId: result.productId,
      id: result.id,
      message: '兑换成功',
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 获取手机号（MAAPI）
router.post('/get-phone', pickup, async (req, res) => {
  try {
    const { cardCode, keyword, phone, cardType } = req.body;

    // 卡密模式下验证卡密，免费接码模式跳过
    let cardKey = null;
    if (cardCode && cardCode !== 'FREE_SMS') {
      cardKey = await pickupService.verifyCardKey(cardCode.trim());
    }

    // 调用 MAAPI 获取手机号
    const result = await pickupService.getPhone(
      keyword || (cardKey ? cardKey.keyword : ''),
      phone || '',
      cardType || '全部',
      req.ip
    );

    // 卡密模式下把手机号暂存到卡密记录
    if (cardKey) {
      const cardKeyRepo = pickupService.getCardKeyRepo();
      await cardKeyRepo.update(cardKey.id, { phone: result });
    }

    res.json({ phone: result, cardKeyId: cardKey ? cardKey.id : null, productId: cardKey ? cardKey.productId : null });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 获取验证码（MAAPI，单次查询，前端轮询调用）
router.post('/get-verify-code', pickup, async (req, res) => {
  try {
    const { phone, keyword } = req.body;
    if (!phone) {
      return res.status(400).json({ error: '手机号不能为空' });
    }

    const result = await pickupService.getVerifyCode(phone, keyword);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 检查号码是否已有接码记录（非首次登录检测）
router.get('/check-phone-record', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ error: '手机号不能为空' });
    }
    const count = await pickupService.getPhoneRecordCount(phone.trim());
    res.json({ phone: phone.trim(), exists: count > 0, count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 确认提货 — 创建订单
router.post('/confirm', pickup, optionalAuth, async (req, res) => {
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

    // 查询商品价格
    let productPrice = null;
    try {
      const productRepo = dataSource.getRepository(Product);
      const product = await productRepo.findOne({ where: { id: productId } });
      if (product) productPrice = product.price;
    } catch (e) {}

    const order = await pickupService.createOrder({
      userId: req.userId || null,
      cardKeyId,
      productId,
      amount: productPrice,
      payMethod: '兑换',
      contact: contact.trim(),
      phone: phone.trim(),
      verifyCode: verifyCode || '',
    }, { ip: req.ip });

    res.json({
      orderNo: order.orderNo,
      status: order.status,
      message: '提货成功！',
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 释放号码（MAAPI）
router.post('/release-phone', pickup, async (req, res) => {
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

// 拉黑号码（MAAPI）
router.post('/block-phone', pickup, async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: '手机号不能为空' });
    }
    await pickupService.blockPhone(phone);
    res.json({ message: '号码已拉黑' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 查询余额（MAAPI）
router.get('/balance', async (req, res) => {
  try {
    const balance = await pickupService.getBalance();
    res.json({ balance });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 查询订单（免登录，支持多条件；已登录用户可按 userId 查询）
router.get('/orders', async (req, res) => {
  try {
    const { keyword, contact, orderNo, phone, status, productId, userId, page, pageSize } = req.query;
    const filter = {};
    if (userId) filter.userId = userId;
    if (keyword) filter.keyword = keyword.trim();
    if (contact) filter.contact = contact.trim();
    if (orderNo) filter.orderNo = orderNo.trim();
    if (phone) filter.phone = phone.trim();
    if (status) filter.status = status.trim();
    if (productId) filter.productId = productId;
    if (page) filter.page = parseInt(page);
    if (pageSize) filter.pageSize = parseInt(pageSize);

    // 至少需要一个查询条件
    if (Object.keys(filter).filter(k => !['page', 'pageSize'].includes(k)).length === 0) {
      return res.status(400).json({ error: '请至少输入一个查询条件' });
    }

    const result = await pickupService.queryOrders(filter);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== 优惠码验证（前台） ====================

// 验证优惠码（不使用，仅返回折扣信息）
router.post('/validate-coupon', pickup, optionalAuth, async (req, res) => {
  try {
    const { code, productId } = req.body;
    if (!code || !code.trim()) {
      return res.status(400).json({ error: '请输入优惠码' });
    }
    if (!productId) {
      return res.status(400).json({ error: '缺少商品ID' });
    }

    // 查询商品价格
    const productRepo = dataSource.getRepository(Product);
    const product = await productRepo.findOne({ where: { id: productId } });
    if (!product) {
      return res.status(400).json({ error: '商品不存在' });
    }

    const result = await couponService.validateCoupon(code.trim(), productId, product.price, req.userId || null, req.ip || null);
    if (result.valid) {
      res.json({
        valid: true,
        originalPrice: parseFloat(product.price),
        finalAmount: result.finalAmount,
        discount: result.coupon.discount ? parseFloat(result.coupon.discount) : null,
        deduction: result.coupon.deduction ? parseFloat(result.coupon.deduction) : null,
        description: result.coupon.deduction
          ? `抵扣 ¥${result.coupon.deduction}`
          : result.coupon.discount
            ? `减${result.coupon.discount}%`
            : '',
      });
    } else {
      res.json({ valid: false, error: result.error });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== isCode 商品专用接口 ====================

// isCode 商品：获取验证码（关联卡密和商品）
router.post('/iscode/get-verify-code', pickup, async (req, res) => {
  try {
    const { phone, cardKeyId, productId } = req.body;
    if (!phone) {
      return res.status(400).json({ error: '手机号不能为空' });
    }
    const result = await pickupService.iscodeGetVerifyCode(
      phone,
      cardKeyId || null,
      productId || null,
      req.ip,
      { ip: req.ip },
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// isCode 商品：检查接码状态（按卡密+手机号查询）
router.get('/iscode/check-status', pickup, async (req, res) => {
  try {
    const { phone, cardKeyId } = req.query;
    if (!phone) {
      return res.status(400).json({ error: '手机号不能为空' });
    }
    const result = await pickupService.iscodeCheckStatus(phone.trim(), cardKeyId || null);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
