const http = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// 请求拦截器
http.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器
http.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      const { status } = error.response;
      alert(status === 401 ? '未登录' : status === 404 ? '资源不存在' : '请求失败');
    } else {
      alert('网络连接失败');
    }
    return Promise.reject(error);
  }
);
