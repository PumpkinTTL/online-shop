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
      extractedCode: '',
      isManualPhone: false
    };
  },

  // 复制到剪贴板（统一方法）
  _copyToClipboard(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => this._fallbackCopy(text));
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

  // 重置号码相关状态
  _resetPhoneState(sms) {
    sms.value.currentPhone = '';
    sms.value.phoneInput = '';
    sms.value.isManualPhone = false;
    sms.value.smsContent = '';
    sms.value.smsTime = '';
    sms.value.extractedCode = '';
  },

  // 确认弹窗（带安全检查）
  async _confirm(message) {
    if (typeof ConfirmDialog === 'undefined') return false;
    try {
      return await ConfirmDialog.show(message);
    } catch {
      return false;
    }
  },

  // 获取号码
  async getPhone(sms, Toast) {
    if (!sms.value.keyWord.trim()) {
      Toast.warning('请输入短信关键词');
      return;
    }

    // 已有号码时确认是否替换
    if (sms.value.currentPhone) {
      const ok = await this._confirm('当前已有号码，确定要重新获取吗？');
      if (!ok) return;
      // 非手动输入的号码，清空以获取新号码
      if (!sms.value.isManualPhone) {
        sms.value.phoneInput = '';
      }
    }

    sms.value.loading = true;
    try {
      const res = await pickupApi.getPhone(
        sms.value.keyWord.trim(),
        String(sms.value.phoneInput || '').trim() || undefined,
        sms.value.cardType,
      );
      sms.value.currentPhone = String(res.phone);
      sms.value.phoneInput = String(res.phone);
      sms.value.isManualPhone = false;
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

  // 获取短信
  async getMsg(sms, Toast) {
    if (!sms.value.currentPhone) {
      Toast.warning('请先获取号码');
      return;
    }
    if (!sms.value.keyWord.trim()) {
      Toast.warning('请输入短信关键词');
      return;
    }
    sms.value.smsLoading = true;
    try {
      const res = await pickupApi.getVerifyCode(sms.value.currentPhone, sms.value.keyWord.trim());
      if (res.received) {
        sms.value.smsContent = res.content || '';
        sms.value.smsTime = new Date().toLocaleString('zh-CN');
        sms.value.extractedCode = res.code || '';
        Toast.success(res.code ? '获取验证码成功' : '已收到短信，但无法自动提取验证码，请查看短信原文');
      } else {
        Toast.info('尚未收到短信，请稍后再试');
      }
    } catch (error) {
      Toast.error(error.response?.data?.error || '获取短信失败');
    } finally {
      sms.value.smsLoading = false;
    }
  },

  // 释放号码
  async releasePhone(sms, Toast) {
    if (!sms.value.currentPhone) return;
    const ok = await this._confirm('确定要释放该号码吗？');
    if (!ok) return;
    pickupApi.releasePhone(sms.value.currentPhone).catch(() => {});
    this._resetPhoneState(sms);
    Toast.info('已释放号码');
  },

  // 拉黑号码
  async blockPhone(sms, Toast) {
    if (!sms.value.currentPhone) return;
    const ok = await this._confirm('确定要拉黑该号码吗？拉黑后将无法再获取此号码');
    if (!ok) return;
    pickupApi.blockPhone(sms.value.currentPhone).catch(() => {});
    this._resetPhoneState(sms);
    Toast.info('已拉黑号码');
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
  },

  // 标记号码为手动输入
  markManualPhone(sms) {
    sms.value.isManualPhone = true;
  }
};
