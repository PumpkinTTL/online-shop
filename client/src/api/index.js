import axios from 'axios'
import { useCaptchaStore } from '@/stores/captcha'

// ===== HTTP 实例 =====
const http = axios.create({
  baseURL: '/api',
  timeout: 15000,
  withCredentials: true,
})

// 请求拦截器：Admin Token 注入
http.interceptors.request.use((config) => {
  const adminToken = localStorage.getItem('admin_token')
  if (adminToken) {
    config.headers.Authorization = `Bearer ${adminToken}`
  }
  return config
})

// 响应拦截器
http.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config

    // Admin 接口 401 → 清除 token
    if (error.response?.status === 401 && originalRequest?.url?.startsWith('/admin')) {
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_info')
      if (window.location.hash.startsWith('#/admin')) {
        window.location.hash = '#/admin/login'
      }
    }

    // 429 → 等待验证码通过后重新发起请求
    if (error.response?.status === 429 && error.response.data?.captchaRequired) {
      // 验证码接口自身的 429 不触发弹窗（防止自循环）
      const url = originalRequest?.url || ''
      if (url.includes('/captcha')) {
        return Promise.reject(error)
      }

      try {
        const captchaStore = useCaptchaStore()

        // 等待验证码通过（返回一个 Promise）
        // cooldown 期间会等 cooldown 结束后自动弹窗
        // 刚通过验证码的重试又 429 会 reject → 放弃重试
        try {
          await captchaStore.waitForCaptcha()
        } catch {
          // justResolved / 用户关闭弹窗 → 不再弹窗，返回原始错误
          return Promise.reject(error)
        }

        // 验证码通过，重新发起原始请求（全新请求）
        // 此时后端已 resetAllKeys，新请求从 0 开始计数
        return http.request({
          method: originalRequest.method,
          url: originalRequest.url,
          data: originalRequest.data,
          params: originalRequest.params,
          headers: originalRequest.headers,
        })
      } catch {
        // store 未初始化等异常，静默处理
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

// ===== 前台用户 API =====
export const userApi = {
  getMe: () => http.get('/users/me'),
  login: (username, password) => http.post('/users/login', { username, password }),
  register: (username, password, inviteCode) => http.post('/users/register', { username, password, inviteCode }),
  logout: () => http.post('/users/logout'),
  changePassword: (oldPassword, newPassword) => http.post('/users/change-password', { oldPassword, newPassword }),
}

// ===== 商品 API（前台） =====
export const productApi = {
  getCategories: () => http.get('/products/categories'),
  getProducts: (params) => http.get('/products', { params }),
  getProduct: (id) => http.get(`/products/${id}`),
}

// ===== 卡密/提货 API =====
export const pickupApi = {
  verifyCard: (code) => http.post('/pickup/verify-card', { code }),
  redeem: (code, productId, contact) => http.post('/pickup/redeem', { code, productId, contact }),
  getOrders: (params) => http.get('/pickup/orders', { params }),
  getPhone: (data) => http.post('/pickup/get-phone', data),
  getVerifyCode: (data) => http.post('/pickup/get-verify-code', data),
  releasePhone: (phone) => http.post('/pickup/release-phone', { phone }),
  blockPhone: (phone) => http.post('/pickup/block-phone', { phone }),
  confirm: (data) => http.post('/pickup/confirm', data),
  checkPhoneRecord: (phone) => http.get('/pickup/check-phone-record', { params: { phone } }),
  getBalance: () => http.get('/pickup/balance'),
  // isCode 专用
  iscodeGetVerifyCode: (data) => http.post('/pickup/iscode/get-verify-code', data),
  iscodeCheckStatus: (params) => http.get('/pickup/iscode/check-status', { params }),
}

// ===== 支付 API =====
export const paymentApi = {
  create: (productId, contact, couponCode) => http.post('/payment/create', { productId, contact, couponCode }),
  createSms: (cardKeyId, productId, contact) => http.post('/payment/create-sms', { cardKeyId, productId, contact }),
  queryStatus: (orderNo) => http.get('/payment/status', { params: { orderNo } }),
  updateContact: (orderNo, contact) => http.post('/payment/update-contact', { orderNo, contact }),
}

// ===== 优惠码 API（前台） =====
export const couponApi = {
  validate: (code, productId) => http.post('/pickup/validate-coupon', { code, productId }),
}

// ===== 激活码 API（前台） =====
export const activationCodeApi = {
  validate: (code) => http.post('/users/validate-invite-code', { code }),
}

// ===== 验证码 API =====
export const captchaApi = {
  fetch: () => http.get('/captcha'),
  verify: (captchaId, answer) => http.post('/captcha/verify', { captchaId, answer }),
}

// ===== Admin API =====
export const adminApi = {
  // 认证
  login: (username, password) => http.post('/admin/login', { username, password }),
  check: () => http.get('/admin/check'),
  changePassword: (oldPassword, newPassword) => http.post('/admin/change-password', { oldPassword, newPassword }),

  // 仪表盘
  getStats: () => http.get('/admin/stats'),

  // 商品管理
  getProducts: (params) => http.get('/admin/products', { params }),
  getProduct: (id) => http.get(`/admin/products/${id}`),
  createProduct: (data) => http.post('/admin/products', data),
  updateProduct: (id, data) => http.put(`/admin/products/${id}`, data),
  deleteProduct: (id) => http.delete(`/admin/products/${id}`),
  batchDeleteProducts: (ids) => http.post('/admin/products/batch-delete', { ids }),

  // 类别管理
  getCategories: () => http.get('/admin/categories'),
  getCategory: (id) => http.get(`/admin/categories/${id}`),
  createCategory: (data) => http.post('/admin/categories', data),
  updateCategory: (id, data) => http.put(`/admin/categories/${id}`, data),
  deleteCategory: (id) => http.delete(`/admin/categories/${id}`),
  batchDeleteCategories: (ids) => http.post('/admin/categories/batch-delete', { ids }),

  // 卡密管理
  getCardPrefixes: () => http.get('/admin/card-prefixes'),
  getCardKeys: (params) => http.get('/admin/card-keys', { params }),
  generateCardKeys: (data) => http.post('/admin/card-keys/generate', data),
  manualAddCardKeys: (data) => http.post('/admin/card-keys/manual', data),
  updateCardKey: (id, data) => http.put(`/admin/card-keys/${id}`, data),
  deleteCardKey: (id) => http.delete(`/admin/card-keys/${id}`),
  batchDeleteCardKeys: (ids) => http.post('/admin/card-keys/batch-delete', { ids }),

  // 订单管理
  getOrders: (params) => http.get('/admin/orders', { params }),
  deleteOrder: (id) => http.delete(`/admin/orders/${id}`),
  batchDeleteOrders: (ids) => http.post('/admin/orders/batch-delete', { ids }),

  // 用户管理
  getUsers: (params) => http.get('/admin/users', { params }),
  getUser: (id) => http.get(`/admin/users/${id}`),
  toggleUserActive: (id) => http.put(`/admin/users/${id}/toggle-active`),
  deleteUser: (id) => http.delete(`/admin/users/${id}`),
  batchDeleteUsers: (ids) => http.post('/admin/users/batch-delete', { ids }),

  // 管理员管理
  getAdmins: (params) => http.get('/admin/admins', { params }),
  createAdmin: (data) => http.post('/admin/admins', data),
  deleteAdmin: (id) => http.delete(`/admin/admins/${id}`),

  // 接码记录
  getSmsRecords: (params) => http.get('/admin/sms-records', { params }),
  batchDeleteSmsRecords: (ids) => http.post('/admin/sms-records/batch-delete', { ids }),

  // 日志管理
  getLogFiles: (params) => http.get('/admin/logs/files', { params }),
  getLogContent: (params) => http.get('/admin/logs/content', { params }),
  getLogStats: () => http.get('/admin/logs/stats'),
  cleanupLogs: (data) => http.post('/admin/logs/cleanup', data),

  // 速率限制
  getRateLimits: () => http.get('/admin/rate-limits'),
  getRateLimit: (key) => http.get(`/admin/rate-limits/${key}`),
  updateRateLimit: (key, data) => http.put(`/admin/rate-limits/${key}`, data),
  resetRateLimits: () => http.post('/admin/rate-limits/reset'),

  // 激活码管理
  getActivationCodes: (params) => http.get('/admin/activation-codes', { params }),
  generateActivationCodes: (data) => http.post('/admin/activation-codes/generate', data),
  deleteActivationCode: (id) => http.delete(`/admin/activation-codes/${id}`),
  updateActivationCode: (id, data) => http.put(`/admin/activation-codes/${id}`, data),
  batchDeleteActivationCodes: (ids) => http.post('/admin/activation-codes/batch-delete', { ids }),

  // 优惠码管理
  getCoupons: (params) => http.get('/admin/coupons', { params }),
  createCoupon: (data) => http.post('/admin/coupons', data),
  generateCoupons: (data) => http.post('/admin/coupons/generate', data),
  updateCoupon: (id, data) => http.put(`/admin/coupons/${id}`, data),
  deleteCoupon: (id) => http.delete(`/admin/coupons/${id}`),
  batchDeleteCoupons: (ids) => http.post('/admin/coupons/batch-delete', { ids }),
}

export default http
