/**
 * HTTP 请求封装 — 基于 axios 的统一请求模块
 * 
 * 所有前端 API 调用都应使用此模块导出的 http 实例
 * - baseURL: /api
 * - withCredentials: true（自动携带 httpOnly cookie）
 * - 响应拦截器：自动解包 response.data
 */

const http = axios.create({
  baseURL: '/api',
  timeout: 10000,
  withCredentials: true,  // 自动携带 httpOnly cookie（JWT token）
});

// 响应拦截器：自动解包 response.data
http.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error)
);

// 挂载到 window，供非模块化页面使用
window.http = http;
