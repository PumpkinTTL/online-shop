const express = require('express');
const { body, query, validationResult } = require('express-validator');
const paymentService = require('../services/paymentService');
const { optionalAuth } = require('../middleware/auth');
const { payment: paymentLimiter } = require('../middleware/rateLimiter');
const { business, system } = require('../logger');

const router = express.Router();

// 验证中间件：统一处理验证错误
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// 创建支付订单（预下单，返回二维码）
router.post('/create', paymentLimiter, [
  body('productId')
    .isInt({ min: 1 })
    .withMessage('商品ID必须是正整数'),
  body('contact')
    .trim()
    .notEmpty()
    .withMessage('联系方式不能为空')
    .isLength({ max: 200 })
    .withMessage('联系方式长度不能超过200字符'),
], handleValidationErrors, optionalAuth, async (req, res) => {
  try {
    const { productId, contact, couponCode, amount: frontendAmount } = req.body;

    // 安全检测：前端如果传了金额参数，记录警告但不阻止（向后兼容）
    if (frontendAmount !== undefined) {
      console.warn(`[Security] 检测到前端传递金额参数: productId=${productId}, frontendAmount=${frontendAmount}, ip=${req.ip}`);
      system.warn('前端传递金额参数', { productId, frontendAmount, ip: req.ip });
    }

    const result = await paymentService.createPayment(
      parseInt(productId),
      contact,
      req.userId || null,
      couponCode || null,
      req.ip || null,
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 创建接码服务支付订单（paySMS）
router.post('/create-sms', paymentLimiter, [
  body('cardKeyId')
    .isInt({ min: 1 })
    .withMessage('卡密ID必须是正整数'),
  body('productId')
    .isInt({ min: 1 })
    .withMessage('商品ID必须是正整数'),
  body('contact')
    .trim()
    .notEmpty()
    .withMessage('联系方式不能为空')
    .isLength({ max: 200 })
    .withMessage('联系方式长度不能超过200字符'),
], handleValidationErrors, optionalAuth, async (req, res) => {
  try {
    const { cardKeyId, productId, contact, amount: frontendAmount } = req.body;

    // 安全检测：前端如果传了金额参数，记录警告但不阻止（向后兼容）
    if (frontendAmount !== undefined) {
      console.warn(`[Security] 检测到前端传递金额参数: cardKeyId=${cardKeyId}, productId=${productId}, frontendAmount=${frontendAmount}, ip=${req.ip}`);
      system.warn('前端传递金额参数', { cardKeyId, productId, frontendAmount, ip: req.ip });
    }

    const result = await paymentService.createSmsPayment(
      cardKeyId,
      productId,
      contact,
      req.userId || null,
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 查询支付状态（前端轮询）
router.get('/status', [
  query('orderNo')
    .trim()
    .notEmpty()
    .withMessage('订单号不能为空'),
], handleValidationErrors, async (req, res) => {
  try {
    const { orderNo } = req.query;
    const result = await paymentService.queryPaymentStatus(orderNo.trim());
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 用户主动取消支付（关闭支付宝交易 + 标记订单 closed）
router.post('/cancel', [
  body('orderNo')
    .trim()
    .notEmpty()
    .withMessage('订单号不能为空'),
], handleValidationErrors, async (req, res) => {
  try {
    const { orderNo } = req.body;
    await paymentService.cancelPayment(orderNo.trim());
    res.json({ message: '订单已取消' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 更新联系方式（需要订单号匹配，如果订单有userId则需要登录认证）
router.post('/update-contact', [
  body('orderNo')
    .trim()
    .notEmpty()
    .withMessage('订单号不能为空'),
  body('contact')
    .trim()
    .notEmpty()
    .withMessage('联系方式不能为空')
    .isLength({ max: 200 })
    .withMessage('联系方式长度不能超过200字符'),
], handleValidationErrors, async (req, res) => {
  try {
    const { orderNo, contact } = req.body;

    const paymentRepo = paymentService.getPaymentOrderRepo();
    const order = await paymentRepo.findOne({ where: { orderNo } });

    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }

    // 如果订单关联了用户，则需要验证登录状态
    if (order.userId) {
      const userId = req.userId || null;
      if (!userId || userId !== order.userId) {
        return res.status(403).json({ error: '无权操作此订单' });
      }
    }

    await paymentRepo.update({ orderNo }, { contact: contact.trim() });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 支付宝异步回调通知
router.post('/notify', async (req, res) => {
  try {
    const params = req.body;
    const success = await paymentService.handleNotify(params, { ip: req.ip });
    if (success) {
      res.send('success'); // 支付宝要求返回 success
    } else {
      res.status(400).send('fail');
    }
  } catch (error) {
    console.error('[PaymentNotify] 处理失败:', error.message);
    system.error('支付回调处理失败', { error: error.message });
    res.status(500).send('fail');
  }
});

// 关闭超时订单（内部调用，需要 ADMIN_INTERNAL_KEY 且长度≥16位）
router.post('/close-expired', async (req, res) => {
  try {
    const { internalKey } = req.body;
    const validKey = process.env.ADMIN_INTERNAL_KEY;

    // 环境变量未配置或密钥过短时，拒绝所有请求
    if (!validKey || validKey.trim().length < 16) {
      return res.status(403).json({ error: '内部密钥未配置或不安全（需≥16位）' });
    }

    // 验证请求中的密钥
    if (!internalKey || internalKey !== validKey) {
      return res.status(403).json({ error: '无权访问' });
    }

    const closed = await paymentService.closeExpiredOrders();
    res.json({ message: `已关闭 ${closed} 个超时订单` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
