/**
 * 接码服务模块 — 调用后端 MAAPI 接口
 */
const SmsModule = {
  // 创建接码状态
  createState() {
    return {
      loading: false,
      smsLoading: false,
      keyWord: '',
      phoneInput: '',
      cardType: '全部',
      currentPhone: '',
      smsContent: '',
      smsTime: '',
      extractedCode: ''
    };
  },

  // 复制到剪贴板
  _copyToClipboard(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {
        this._fallbackCopy(text);
      });
    } else {
      this._fallbackCopy(text);
    }
  },

  _fallbackCopy(text) {
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
  },

  // 获取号码（调用后端 MAAPI）
  async getPhone(sms, Toast) {
    if (!sms.value.keyWord.trim()) {
      Toast.warning('请输入短信关键词');
      return;
    }
    sms.value.loading = true;
    try {
      const res = await axios.post('/api/pickup/get-phone', {
        cardCode: 'FREE_SMS', // 免费接码不需要卡密
        keyword: sms.value.keyWord.trim(),
        phone: sms.value.phoneInput.trim() || undefined,
        cardType: sms.value.cardType,
      });
      sms.value.currentPhone = res.data.phone;
      sms.value.phoneInput = res.data.phone;
      sms.value.smsContent = '';
      sms.value.smsTime = '';
      sms.value.extractedCode = '';
      Toast.success('获取号码成功');
    } catch (error) {
      Toast.error(error.response?.data?.error || '获取号码失败');
    } finally {
      sms.value.loading = false;
    }
  },

  // 获取短信（调用后端 MAAPI）
  async getMsg(sms, Toast) {
    if (!sms.value.currentPhone) {
      Toast.warning('请先获取号码');
      return;
    }
    if (!sms.value.keyWord) {
      Toast.warning('请输入短信关键词');
      return;
    }
    sms.value.smsLoading = true;
    try {
      const res = await axios.post('/api/pickup/get-verify-code', {
        phone: sms.value.currentPhone,
        keyword: sms.value.keyWord.trim(),
      });

      if (res.data.received) {
        sms.value.smsContent = res.data.content || '';
        sms.value.smsTime = new Date().toLocaleString('zh-CN');
        sms.value.extractedCode = res.data.code || '';
        if (res.data.code) {
          Toast.success('获取验证码成功');
        } else {
          Toast.info('已收到短信，但无法自动提取验证码，请查看短信原文');
        }
      } else {
        Toast.info('尚未收到短信，请稍后再试');
      }
    } catch (error) {
      Toast.error(error.response?.data?.error || '获取短信失败');
    } finally {
      sms.value.smsLoading = false;
    }
  },

  // 释放号码（调用后端 MAAPI）
  releasePhone(sms, Toast) {
    if (!sms.value.currentPhone) return;
    if (confirm('确定要释放该号码吗？')) {
      axios.post('/api/pickup/release-phone', { phone: sms.value.currentPhone })
        .catch(() => {});
      sms.value.currentPhone = '';
      sms.value.phoneInput = '';
      sms.value.smsContent = '';
      sms.value.extractedCode = '';
      Toast.info('已释放号码');
    }
  },

  // 拉黑号码（调用后端 MAAPI）
  blockPhone(sms, Toast) {
    if (!sms.value.currentPhone) return;
    if (confirm('确定要拉黑该号码吗？拉黑后将无法再获取此号码')) {
      axios.post('/api/pickup/block-phone', { phone: sms.value.currentPhone })
        .catch(() => {});
      sms.value.currentPhone = '';
      sms.value.phoneInput = '';
      sms.value.smsContent = '';
      sms.value.extractedCode = '';
      Toast.info('已拉黑号码');
    }
  },

  // 复制号码
  copyPhone(sms, Toast) {
    this._copyToClipboard(sms.value.currentPhone);
    Toast.success('已复制号码');
  },

  // 复制验证码
  copyCode(sms, Toast) {
    this._copyToClipboard(sms.value.extractedCode);
    Toast.success('已复制验证码');
  }
};
