/**
 * 验证码工具类
 * 
 * 用于前端获取和验证验证码（数学算术题）
 * 配合后端 /api/captcha 接口使用
 */
const CaptchaUtil = {
  // 获取验证码题目
  async fetch() {
    const res = await axios.get('/api/captcha');
    return res.data;
  },

  // 提交验证码答案
  async verify(captchaId, answer) {
    const res = await axios.post('/api/captcha/verify', { captchaId, answer });
    return res.data;
  },
};

window.CaptchaUtil = CaptchaUtil;
