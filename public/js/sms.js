/**
 * 接码服务模块
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
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
  },

  // 获取号码
  async getPhone(sms, Toast) {
    if (!sms.value.keyWord.trim()) {
      Toast.warning('请输入短信关键词');
      return;
    }
    sms.value.loading = true;
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (sms.value.phoneInput.trim()) {
        sms.value.currentPhone = sms.value.phoneInput.trim();
      } else {
        const randomPhone = '165' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
        sms.value.currentPhone = randomPhone;
        sms.value.phoneInput = randomPhone;
      }
      sms.value.smsContent = '';
      sms.value.smsTime = '';
      sms.value.extractedCode = '';
      Toast.success('获取号码成功');
    } catch (error) {
      Toast.error('获取失败：' + error.message);
    } finally {
      sms.value.loading = false;
    }
  },

  // 获取短信
  async getMsg(sms, Toast) {
    if (!sms.value.currentPhone || !sms.value.keyWord) {
      Toast.warning('请先获取号码');
      return;
    }
    sms.value.smsLoading = true;
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const codes = ['123456', '654321', '888888', '666666', '999999'];
      const code = codes[Math.floor(Math.random() * codes.length)];
      sms.value.smsContent = `【${sms.value.keyWord}】验证码${code}，有效期5分钟，请勿泄露。`;
      sms.value.smsTime = new Date().toLocaleString('zh-CN');
      sms.value.extractedCode = code;
      Toast.success('获取短信成功');
    } catch (error) {
      Toast.error('获取失败：' + error.message);
    } finally {
      sms.value.smsLoading = false;
    }
  },

  // 释放号码
  releasePhone(sms, Toast) {
    if (confirm('确定要释放该号码吗？')) {
      sms.value.currentPhone = '';
      sms.value.smsContent = '';
      sms.value.extractedCode = '';
      Toast.info('已释放号码');
    }
  },

  // 拉黑号码
  blockPhone(sms, Toast) {
    if (confirm('确定要拉黑该号码吗？')) {
      sms.value.currentPhone = '';
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
