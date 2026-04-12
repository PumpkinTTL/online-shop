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
      isManualPhone: false  // 是否手动输入了号码
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
    console.log('[SmsModule.getPhone] 开始执行, currentPhone:', sms.value.currentPhone);
    
    if (!sms.value.keyWord.trim()) {
      Toast.warning('请输入短信关键词');
      return;
    }

    // 如果已有号码，提示确认是否替换（不释放，直接覆盖）
    if (sms.value.currentPhone) {
      console.log('[SmsModule.getPhone] 已有号码，准备弹出确认框');
      
      // 检查 ConfirmDialog 是否存在
      if (typeof ConfirmDialog === 'undefined') {
        console.error('[SmsModule.getPhone] ConfirmDialog 未定义!');
        Toast.error('确认框组件加载失败，请刷新页面');
        return;
      }
      
      try {
        console.log('[SmsModule.getPhone] 调用 ConfirmDialog.show()');
        const ok = await ConfirmDialog.show('当前已有号码，确定要重新获取吗？');
        console.log('[SmsModule.getPhone] 确认框结果:', ok);
        if (!ok) {
          console.log('[SmsModule.getPhone] 用户取消了操作');
          return;
        }
        // 用户确认重新获取：如果不是手动输入的号码，清空以获取新号码
        if (!sms.value.isManualPhone) {
          console.log('[SmsModule.getPhone] 非手动输入，清空 phoneInput 以获取新号码');
          sms.value.phoneInput = '';
        }
      } catch (err) {
        console.error('[SmsModule.getPhone] 确认框异常:', err);
        Toast.error('确认框弹出失败: ' + err.message);
        return;
      }
    }

    console.log('[SmsModule.getPhone] 准备发送请求');
    sms.value.loading = true;
    try {
      const res = await axios.post('/api/pickup/get-phone', {
        cardCode: 'FREE_SMS',
        keyword: sms.value.keyWord.trim(),
        phone: String(sms.value.phoneInput || '').trim() || undefined,
        cardType: sms.value.cardType,
      });
      console.log('[SmsModule.getPhone] 请求成功:', res.data);
      sms.value.currentPhone = String(res.data.phone);
      sms.value.phoneInput = String(res.data.phone);
      sms.value.isManualPhone = false;  // 获取成功后标记为非手动输入
      sms.value.smsContent = '';
      sms.value.smsTime = '';
      sms.value.extractedCode = '';
      Toast.success('获取号码成功');
    } catch (error) {
      console.log('[SmsModule.getPhone] 请求失败:', error);
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
  async releasePhone(sms, Toast) {
    if (!sms.value.currentPhone) return;
    const ok = await ConfirmDialog.show('确定要释放该号码吗？');
    if (!ok) return;
    axios.post('/api/pickup/release-phone', { phone: sms.value.currentPhone })
      .catch(() => {});
    sms.value.currentPhone = '';
    sms.value.phoneInput = '';
    sms.value.isManualPhone = false;
    sms.value.smsContent = '';
    sms.value.extractedCode = '';
    Toast.info('已释放号码');
  },

  // 拉黑号码（调用后端 MAAPI）
  async blockPhone(sms, Toast) {
    if (!sms.value.currentPhone) return;
    const ok = await ConfirmDialog.show('确定要拉黑该号码吗？拉黑后将无法再获取此号码');
    if (!ok) return;
    axios.post('/api/pickup/block-phone', { phone: sms.value.currentPhone })
      .catch(() => {});
    sms.value.currentPhone = '';
    sms.value.phoneInput = '';
    sms.value.isManualPhone = false;
    sms.value.smsContent = '';
    sms.value.extractedCode = '';
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
