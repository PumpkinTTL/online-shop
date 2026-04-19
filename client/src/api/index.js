import axios from 'axios'

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

// 429 验证码处理
let pendingCaptchaRetry = null

http.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // Admin 接口 401 → 清除 token
    if (error.response?.status === 401 && error.config?.url?.startsWith('/admin')) {
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_info')
      // 如果在 admin 页面内，跳转登录
      if (window.location.hash.startsWith('#/admin')) {
        window.location.hash = '#/admin/login'
      }
    }

    if (error.response?.status === 429 && error.response.data?.captchaRequired) {
      return new Promise((resolve, reject) => {
        pendingCaptchaRetry = { resolve, reject, config: error.config }
        window.dispatchEvent(new CustomEvent('captcha-required'))
      })
    }
    return Promise.reject(error)
  }
)

window.__captchaVerified = function () {
  if (pendingCaptchaRetry) {
    const { resolve, reject, config } = pendingCaptchaRetry
    pendingCaptchaRetry = null
    http.request(config).then(resolve).catch(reject)
  }
}

// ===== 前台用户 API =====
export const userApi = {
  getMe: () => http.get('/users/me'),
  login: (username, password) => http.post('/users/login', { username, password }),
  register: (username, password) => http.post('/users/register', { username, password }),
  logout: () => http.post('/users/logout'),
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
  create: (productId, contact) => http.post('/payment/create', { productId, contact }),
  createSms: (cardKeyId, productId, contact) => http.post('/payment/create-sms', { cardKeyId, productId, contact }),
  queryStatus: (orderNo) => http.get('/payment/status', { params: { orderNo } }),
  updateContact: (orderNo, contact) => http.post('/payment/update-contact', { orderNo, contact }),
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
}

export default http
