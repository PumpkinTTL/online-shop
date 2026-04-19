const crypto = require('crypto');

// 内存存储验证码（captchaId → { answer, expiresAt }）
const captchaStore = new Map();

// 清理过期验证码（每5分钟）
const CLEANUP_INTERVAL = 5 * 60 * 1000;
const CAPTCHA_TTL = 5 * 60 * 1000; // 验证码5分钟有效

setInterval(() => {
  const now = Date.now();
  for (const [id, data] of captchaStore) {
    if (data.expiresAt < now) {
      captchaStore.delete(id);
    }
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

  // 校验验证码（一次性使用）
  verify(captchaId, answer) {
    const data = captchaStore.get(captchaId);
    if (!data) return false;
    // 无论对错都删除，防止重试
    captchaStore.delete(captchaId);
    if (data.expiresAt < Date.now()) return false;
    return data.answer === String(answer).trim();
  }

  // 生成验证通过的签名token
  generateVerifiedToken() {
    const payload = {
      verified: true,
      exp: Date.now() + 10 * 60 * 1000, // 10分钟有效
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  }

  // 校验签名token
  verifyToken(token) {
    try {
      const payload = JSON.parse(Buffer.from(token, 'base64url').toString());
      return payload.verified === true && payload.exp > Date.now();
    } catch {
      return false;
    }
  }
}

module.exports = new CaptchaService();
