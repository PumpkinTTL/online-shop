/**
 * 支付相关 API
 */

const paymentApi = {
  // 创建支付订单（预下单，返回二维码）
  create: (productId, contact) => http.post('/payment/create', { productId, contact }),

  // 创建接码服务支付订单（paySMS）
  createSms: (cardKeyId, productId, amount, contact) =>
    http.post('/payment/create-sms', { cardKeyId, productId, amount, contact }),

  // 查询支付状态（前端轮询）
  getStatus: (orderNo) => http.get('/payment/status', { params: { orderNo } }),

  // 更新联系方式
  updateContact: (orderNo, contact) => http.post('/payment/update-contact', { orderNo, contact }),
};

window.paymentApi = paymentApi;
