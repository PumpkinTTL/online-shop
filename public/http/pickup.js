/**
 * 兑换/接码相关 API
 */

const pickupApi = {
  // 验证卡密
  verifyCard: (code) => http.post('/pickup/verify-card', { code }),

  // 兑换卡密
  redeem: (code, productId, contact) => http.post('/pickup/redeem', { code, productId, contact }),

  // 确认兑换（接码类）
  confirm: (code, productId, phone, verifyCode) =>
    http.post('/pickup/confirm', { code, productId, phone, verifyCode }),

  // 查询订单
  getOrders: (params) => http.get('/pickup/orders', { params }),

  // 检查手机号接码记录
  checkPhoneRecord: (phone) => http.get('/pickup/check-phone-record', { params: { phone } }),

  // 获取验证码
  getVerifyCode: (phone, keyword) => http.post('/pickup/get-verify-code', { phone, keyword }),

  // 获取接码手机号
  getPhone: (keyword, phone, cardType) => http.post('/pickup/get-phone', {
    cardCode: 'FREE_SMS', keyword, phone, cardType
  }),

  // 释放号码
  releasePhone: (phone) => http.post('/pickup/release-phone', { phone }),

  // 拉黑号码
  blockPhone: (phone) => http.post('/pickup/block-phone', { phone }),
};

window.pickupApi = pickupApi;
