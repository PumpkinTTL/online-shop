/**
 * 全局验证码弹窗组件 — 独立于 app-header
 * 
 * 监听全局 captcha-required 事件，自动弹出验证码
 * 验证通过后调用 window.__captchaVerified() 重试原始请求
 * 
 * 用法：在任何页面的 Vue app 中注册即可
 *   <captcha-modal></captcha-modal>
 */
const CaptchaModal = {
  template: `
    <div class="modal-overlay" v-if="visible" @click.self="close">
      <div class="auth-modal" style="max-width:360px;">
        <div class="auth-header">
          <h3><i class="fa-solid fa-shield-halved" style="margin-right:6px;color:#3B82F6;"></i>安全验证</h3>
          <button class="modal-close" @click="close">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="auth-form" style="padding-top:8px;">
          <p style="color:#64748B;font-size:13px;margin:0 0 12px 0;">请求过于频繁，请完成验证码后继续操作</p>
          <div class="form-group">
            <div style="display:flex;gap:8px;align-items:center;">
              <span class="captcha-question">{{ question }}</span>
              <input type="text" v-model="answer" placeholder="请输入答案" class="form-input" style="flex:1;"
                @keyup.enter="submit" ref="captchaInput">
              <button class="btn btn-ghost btn-sm" @click="refresh" :disabled="loading" title="换一个">
                <i class="fa-solid fa-rotate" :class="{ 'fa-spin': loading }"></i>
              </button>
            </div>
          </div>
          <button class="btn btn-primary btn-block" @click="submit" :disabled="loading">
            <i class="fa-solid fa-spinner fa-spin" v-if="loading"></i>
            {{ loading ? '验证中...' : '提交验证码' }}
          </button>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      visible: false,
      captchaId: '',
      question: '',
      answer: '',
      loading: false,
    };
  },
  methods: {
    async show() {
      this.visible = true;
      await this.refresh();
      // 自动聚焦输入框
      this.$nextTick(() => {
        if (this.$refs.captchaInput) this.$refs.captchaInput.focus();
      });
    },
    close() {
      this.visible = false;
      this.captchaId = '';
      this.question = '';
      this.answer = '';
      // 关闭时清除挂起的重试请求
      if (window.__captchaCancelPending) window.__captchaCancelPending();
    },
    async refresh() {
      this.loading = true;
      try {
        const data = await CaptchaUtil.fetch();
        this.captchaId = data.captchaId;
        this.question = data.question;
        this.answer = '';
      } catch (e) {
        Toast.error('获取验证码失败');
      } finally {
        this.loading = false;
      }
    },
    async submit() {
      if (!this.answer.trim()) {
        Toast.warning('请输入验证码答案');
        return;
      }
      this.loading = true;
      try {
        await CaptchaUtil.verify(this.captchaId, this.answer.trim());
        Toast.success('验证码通过');
        this.visible = false;
        this.answer = '';
        // 触发全局重试
        if (window.__captchaVerified) window.__captchaVerified();
      } catch (e) {
        Toast.error(e.response?.data?.error || '验证码错误');
        await this.refresh();
      } finally {
        this.loading = false;
      }
    },
    handleCaptchaRequired() {
      this.show();
    },
  },
  mounted() {
    window.addEventListener('captcha-required', this.handleCaptchaRequired);
  },
  beforeUnmount() {
    window.removeEventListener('captcha-required', this.handleCaptchaRequired);
  },
};

// 注册辅助方法
function registerCaptchaModal(app) {
  app.component('captcha-modal', CaptchaModal);
}

window.CaptchaModal = CaptchaModal;
window.registerCaptchaModal = registerCaptchaModal;
