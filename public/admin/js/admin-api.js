// 后台管理 API 封装（基于 axios）
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

  // 创建 axios 实例
  _http: null,
  getHttp() {
    if (!this._http) {
      this._http = axios.create({
        baseURL: '/api/admin',
        timeout: 15000,
      });

      // 请求拦截器：自动注入 token
      this._http.interceptors.request.use((config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      });

      // 响应拦截器：401 跳转登录，429验证码，统一错误处理
      this._http.interceptors.response.use(
        (response) => response.data,
        (error) => {
          if (error.response) {
            const { status, data } = error.response;
            if (status === 429 && data?.captchaRequired) {
              const err = new Error(data?.error || '需要验证码');
              err.captchaRequired = true;
              throw err;
            }
            if (status === 401) {
              this.clearToken();
              window.location.href = '/admin/login';
              throw new Error('登录已过期');
            }
            throw new Error(data?.error || '请求失败');
          }
          throw new Error('网络连接失败');
        }
      );
    }
    return this._http;
  },

  // 登录
  login(username, password) {
    return this.getHttp().post('/login', { username, password });
  },

  // 验证 Token
  check() {
    return this.getHttp().get('/check');
  },

  // 修改密码
  changePassword(oldPassword, newPassword) {
    return this.getHttp().post('/change-password', { oldPassword, newPassword });
  },

  // 仪表盘
  getStats() {
    return this.getHttp().get('/stats');
  },

  // 商品
  getProducts(params) {
    return this.getHttp().get('/products', { params });
  },
  getProduct(id) {
    return this.getHttp().get(`/products/${id}`);
  },
  createProduct(data) {
    return this.getHttp().post('/products', data);
  },
  updateProduct(id, data) {
    return this.getHttp().put(`/products/${id}`, data);
  },
  deleteProduct(id) {
    return this.getHttp().delete(`/products/${id}`);
  },
  batchDeleteProducts(ids) {
    return this.getHttp().post('/products/batch-delete', { ids });
  },

  // 用户
  getUsers(params) {
    return this.getHttp().get('/users', { params });
  },
  getUser(id) {
    return this.getHttp().get(`/users/${id}`);
  },
  toggleUserActive(id) {
    return this.getHttp().put(`/users/${id}/toggle-active`);
  },
  deleteUser(id) {
    return this.getHttp().delete(`/users/${id}`);
  },
  batchDeleteUsers(ids) {
    return this.getHttp().post('/users/batch-delete', { ids });
  },

  // 卡密
  getCardPrefixes() {
    return this.getHttp().get('/card-prefixes');
  },
  getCardKeys(params) {
    return this.getHttp().get('/card-keys', { params });
  },
  generateCardKeys(data) {
    return this.getHttp().post('/card-keys/generate', data);
  },
  manualAddCardKeys(data) {
    return this.getHttp().post('/card-keys/manual', data);
  },
  updateCardKey(id, data) {
    return this.getHttp().put(`/card-keys/${id}`, data);
  },
  deleteCardKey(id) {
    return this.getHttp().delete(`/card-keys/${id}`);
  },
  batchDeleteCardKeys(ids) {
    return this.getHttp().post('/card-keys/batch-delete', { ids });
  },

  // 订单
  getOrders(params) {
    return this.getHttp().get('/orders', { params });
  },
  deleteOrder(id) {
    return this.getHttp().delete(`/orders/${id}`);
  },
  batchDeleteOrders(ids) {
    return this.getHttp().post('/orders/batch-delete', { ids });
  },

  // 商品类别
  getCategories() {
    return this.getHttp().get('/categories');
  },
  getCategory(id) {
    return this.getHttp().get(`/categories/${id}`);
  },
  createCategory(data) {
    return this.getHttp().post('/categories', data);
  },
  updateCategory(id, data) {
    return this.getHttp().put(`/categories/${id}`, data);
  },
  deleteCategory(id) {
    return this.getHttp().delete(`/categories/${id}`);
  },
  batchDeleteCategories(ids) {
    return this.getHttp().post('/categories/batch-delete', { ids });
  },

  // 管理员
  getAdmins(params) {
    return this.getHttp().get('/admins', { params });
  },
  createAdmin(data) {
    return this.getHttp().post('/admins', data);
  },
  deleteAdmin(id) {
    return this.getHttp().delete(`/admins/${id}`);
  },

  // 接码记录
  getSmsRecords(params) {
    return this.getHttp().get('/sms-records', { params });
  },
  batchDeleteSmsRecords(ids) {
    return this.getHttp().post('/sms-records/batch-delete', { ids });
  },

  // 日志管理
  getLogStats() {
    return this.getHttp().get('/logs/stats');
  },
  getLogFiles(params) {
    return this.getHttp().get('/logs/files', { params });
  },
  getLogContent(params) {
    return this.getHttp().get('/logs/content', { params });
  },
  cleanupLogs(data) {
    return this.getHttp().post('/logs/cleanup', data);
  },
};
