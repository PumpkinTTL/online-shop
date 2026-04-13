// 后台管理 API 封装
const AdminAPI = {
  // 获取存储的 Token
  getToken() {
    return localStorage.getItem('admin_token');
  },

  // 设置 Token
  setToken(token) {
    localStorage.setItem('admin_token', token);
  },

  // 清除 Token
  clearToken() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_info');
  },

  // 获取管理员信息
  getAdminInfo() {
    return JSON.parse(localStorage.getItem('admin_info') || 'null');
  },

  // 设置管理员信息
  setAdminInfo(info) {
    localStorage.setItem('admin_info', JSON.stringify(info));
  },

  // 通用请求方法
  async request(method, url, data) {
    const token = this.getToken();
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = { method, headers };
    if (data && (method === 'POST' || method === 'PUT')) {
      headers['Content-Type'] = 'application/json';
      config.body = JSON.stringify(data);
    }

    const response = await fetch(`/api/admin${url}`, config);

    if (response.status === 401) {
      this.clearToken();
      window.location.href = '/admin/login';
      throw new Error('登录已过期');
    }

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || '请求失败');
    }
    return result;
  },

  // 登录
  login(username, password) {
    return this.request('POST', '/login', { username, password });
  },

  // 验证 Token
  check() {
    return this.request('GET', '/check');
  },

  // 修改密码
  changePassword(oldPassword, newPassword) {
    return this.request('POST', '/change-password', { oldPassword, newPassword });
  },

  // 仪表盘
  getStats() {
    return this.request('GET', '/stats');
  },

  // 商品
  getProducts() {
    return this.request('GET', '/products');
  },
  getProduct(id) {
    return this.request('GET', `/products/${id}`);
  },
  createProduct(data) {
    return this.request('POST', '/products', data);
  },
  updateProduct(id, data) {
    return this.request('PUT', `/products/${id}`, data);
  },
  deleteProduct(id) {
    return this.request('DELETE', `/products/${id}`);
  },

  // 用户
  getUsers() {
    return this.request('GET', '/users');
  },
  getUser(id) {
    return this.request('GET', `/users/${id}`);
  },
  toggleUserActive(id) {
    return this.request('PUT', `/users/${id}/toggle-active`);
  },
  deleteUser(id) {
    return this.request('DELETE', `/users/${id}`);
  },

  // 卡密
  getCardPrefixes() {
    return this.request('GET', '/card-prefixes');
  },
  getCardKeys(params) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/card-keys?${query}`);
  },
  generateCardKeys(data) {
    return this.request('POST', '/card-keys/generate', data);
  },
  manualAddCardKeys(data) {
    return this.request('POST', '/card-keys/manual', data);
  },
  updateCardKey(id, data) {
    return this.request('PUT', `/card-keys/${id}`, data);
  },
  deleteCardKey(id) {
    return this.request('DELETE', `/card-keys/${id}`);
  },

  // 订单
  getOrders(params) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/orders?${query}`);
  },
  deleteOrder(id) {
    return this.request('DELETE', `/orders/${id}`);
  },

  // 管理员
  getAdmins() {
    return this.request('GET', '/admins');
  },
  createAdmin(data) {
    return this.request('POST', '/admins', data);
  },
  deleteAdmin(id) {
    return this.request('DELETE', `/admins/${id}`);
  },

  // 接码记录
  getSmsRecords(params) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/sms-records?${query}`);
  },
};
