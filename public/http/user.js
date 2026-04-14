/**
 * 用户相关 API
 */

const userApi = {
  // 获取当前登录用户信息
  getMe: () => http.get('/users/me'),

  // 登录
  login: (username, password) => http.post('/users/login', { username, password }),

  // 注册
  register: (username, password) => http.post('/users/register', { username, password }),

  // 退出登录
  logout: () => http.post('/users/logout'),
};

window.userApi = userApi;
