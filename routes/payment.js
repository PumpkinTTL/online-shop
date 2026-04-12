const express = require('express');
const paymentService = require('../services/paymentService');

const router = express.Router();

// 创建支付订单（预下单，返回二维码）
router.post('/create', async (req, res) => {
  try {
    const { productId, contact } = req.body;
    if (!productId) {
      return res.status(400).json({ error: '请选择商品' });
    }
    const result = await paymentService.createPayment(parseInt(productId), contact);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 查询支付状态（前端轮询）
router.get('/status', async (req, res) => {
  try {
    const { orderNo } = req.query;
    if (!orderNo) {
      return res.status(400).json({ error: '缺少订单号' });
    }
    const result = await paymentService.queryPaymentStatus(orderNo.trim());
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 更新联系方式
router.post('/update-contact', async (req, res) => {
  try {
    const { orderNo, contact } = req.body;
    if (!orderNo || !contact) {
      return res.status(400).json({ error: '参数不完整' });
    }
    const paymentRepo = paymentService.getPaymentOrderRepo();
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
    const success = await paymentService.handleNotify(params);
    if (success) {
      res.send('success'); // 支付宝要求返回 success
    } else {
      res.status(400).send('fail');
    }
  } catch (error) {
    console.error('[PaymentNotify] 处理失败:', error.message);
    res.status(500).send('fail');
  }
});

// 关闭超时订单（可定时调用）
router.post('/close-expired', async (req, res) => {
  try {
    const closed = await paymentService.closeExpiredOrders();
    res.json({ message: `已关闭 ${closed} 个超时订单` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
