const crypto = require('crypto');
const axios = require('axios');

const MAX_STORE_SIZE = 5000;
const CLEANUP_INTERVAL = 5 * 60 * 1000;
const CAPTCHA_TTL = 5 * 60 * 1000;

// 内存存储验证码（captchaId → { answer, expiresAt }）
const captchaStore = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [id, data] of captchaStore) {
    if (data.expiresAt < now) captchaStore.delete(id);
  }
  // 超过上限时清理最旧的一半
  if (captchaStore.size > MAX_STORE_SIZE) {
    const entries = [...captchaStore.entries()]
      .sort((a, b) => a[1].expiresAt - b[1].expiresAt);
    const toDelete = entries.slice(0, Math.ceil(entries.length / 2));
    toDelete.forEach(([id]) => captchaStore.delete(id));
  }
}, CLEANUP_INTERVAL);

class CaptchaService {
  // 生成数学算术验证码
  generate() {
    const operators = ['+', '-', '×'];
    const op = operators[Math.floor(Math.random() * operators.length)];
    let a, b, answer;

    switch (op) {
      case '+':
        a = Math.floor(Math.random() * 50) + 1;
        b = Math.floor(Math.random() * 50) + 1;
        answer = a + b;
        break;
      case '-':
        a = Math.floor(Math.random() * 50) + 10;
        b = Math.floor(Math.random() * a);
        answer = a - b;
        break;
      case '×':
        a = Math.floor(Math.random() * 12) + 1;
        b = Math.floor(Math.random() * 9) + 1;
        answer = a * b;
        break;
    }

    const captchaId = crypto.randomBytes(16).toString('hex');
    captchaStore.set(captchaId, {
      answer: String(answer),
      expiresAt: Date.now() + CAPTCHA_TTL,
    });

    return {
      captchaId,
      question: `${a} ${op} ${b} = ?`,
    };
  }

  // 校验验证码（一次性使用，无论对错都删除，防止重试）
  verify(captchaId, answer) {
    const data = captchaStore.get(captchaId);
    if (!data) return false;
    captchaStore.delete(captchaId);
    if (data.expiresAt < Date.now()) return false;
    return data.answer === String(answer).trim();
  }

  /**
   * 验证 Cloudflare Turnstile token
   * @param {string} token - 前端 Turnstile 验证成功后返回的 token
   * @returns {Promise<{valid: boolean, reason?: string}>}
   */
  async verifyTurnstileToken(token) {
    if (!token) {
      return { valid: false, reason: 'missing_token' };
    }

    const secretKey = process.env.TURNSTILE_SECRET_KEY;
    if (!secretKey) {
      return { valid: false, reason: 'missing_secret_key' };
    }

    try {
      const params = new URLSearchParams();
      params.append('secret', secretKey);
      params.append('response', token);

      const response = await axios.post(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      if (response.data.success) {
        return { valid: true };
      } else {
        console.error('[Turnstile] Cloudflare rejected:', response.data);
        return { valid: false, reason: 'cloudflare_rejected', errors: response.data['error-codes'] };
      }
    } catch (error) {
      console.error('[Turnstile] Verification error:', error.message);
      return { valid: false, reason: 'network_error' };
    }
  }

  /**
   * 中间件：验证 Turnstile token
   */
  requireTurnstile(options = {}) {
    const { tokenParam = 'turnstileToken' } = options;

    return async (req, res, next) => {
      const token = req.body[tokenParam] || req.query[tokenParam];

      if (!token) {
        return res.status(400).json({
          error: '请完成人机验证',
          turnstileRequired: true,
        });
      }

      const result = await this.verifyTurnstileToken(token);

      if (!result.valid) {
        const messages = {
          missing_token: '请完成人机验证',
          missing_secret_key: '服务配置错误',
          cloudflare_rejected: '人机验证失败，请重试',
          network_error: '验证服务暂时不可用，请稍后重试',
        };

        return res.status(400).json({
          error: messages[result.reason] || '人机验证失败',
          turnstileRequired: true,
        });
      }

      next();
    };
  }
}

module.exports = new CaptchaService();
