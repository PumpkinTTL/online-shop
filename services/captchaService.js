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

  // 校验验证码（一次性使用，无论对错都删除，防止重试）
  verify(captchaId, answer) {
    const data = captchaStore.get(captchaId);
    if (!data) return false;
    captchaStore.delete(captchaId);
    if (data.expiresAt < Date.now()) return false;
    return data.answer === String(answer).trim();
  }
}

module.exports = new CaptchaService();
