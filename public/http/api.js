const http = axios.create({
  baseURL: '/api',
  timeout: 10000,
  withCredentials: true,  // 自动携带 httpOnly cookie（JWT token）
});

// 请求拦截器（token 由 httpOnly cookie 自动携带，无需手动设置 header）
http.interceptors.request.use(
  (config) => config,
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

// 暴露到全局，供其他组件使用
window.http = http;
