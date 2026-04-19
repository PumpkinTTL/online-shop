/**
 * HTTP 请求封装 — 基于 axios 的统一请求模块
 * 
 * 所有前端 API 调用都应使用此模块导出的 http 实例
 * - baseURL: /api
 * - withCredentials: true（自动携带 httpOnly cookie）
 * - 响应拦截器：自动解包 response.data
 * - 429 + captchaRequired：触发全局验证码流程
 */

const http = axios.create({
  baseURL: '/api',
  timeout: 10000,
  withCredentials: true,  // 自动携带 httpOnly cookie（JWT token + captcha_verified）
});

// 待重试的请求队列（验证码通过后自动重试）
let pendingCaptchaRetry = null;

// 响应拦截器：自动解包 response.data
http.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response && error.response.status === 429 && error.response.data?.captchaRequired) {
      // 触发验证码流程
      return new Promise((resolve, reject) => {
        pendingCaptchaRetry = { resolve, reject, config: error.config };
        window.dispatchEvent(new CustomEvent('captcha-required', {
          detail: { captchaRequired: true }
        }));
      });
    }
    return Promise.reject(error);
  }
);

// 验证码通过后的重试方法
window.__captchaVerified = function() {
  if (pendingCaptchaRetry) {
    const { resolve, reject, config } = pendingCaptchaRetry;
    pendingCaptchaRetry = null;
    // 用原始配置重试请求
    http.request(config).then(resolve).catch(reject);
  }
};

// 挂载到 window，供非模块化页面使用
window.http = http;
