/**
 * 通用头部组件 — 导航栏 + 登录注册弹窗
 * 
 * Props:
 *   activePage    String   当前页面高亮: 'home' | 'sms' | 'orders'
 *   showSearch    Boolean  是否显示搜索框（默认 false）
 *   showAuth      Boolean  是否显示登录/用户信息（默认 false）
 *   hideInIframe  Boolean  iframe中是否隐藏（默认 false）
 * 
 * Events:
 *   @search       搜索框回车
 *   @go-orders    点击订单按钮
 *   @go-home      点击首页
 */
const AppHeader = {
  props: {
    activePage: { type: String, default: 'home' },
    showSearch: { type: Boolean, default: false },
    showAuth: { type: Boolean, default: false },
    hideInIframe: { type: Boolean, default: false }
  },
  emits: ['search', 'go-orders', 'go-home'],
  template: `
    <nav class="nav" v-if="!hideInIframe || !isInIframe">
      <div class="nav-inner">
        <div class="nav-left">
          <a href="/" class="brand" @click.prevent="goHome">
            <div class="brand-icon"><i class="fa-solid fa-bolt"></i></div>
            <span>工具商店</span>
          </a>
          <div class="nav-menu">
            <a href="/" class="nav-link" :class="{ active: activePage === 'home' }" @click.prevent="goHome">
              <i class="fa-solid fa-house"></i> 首页
            </a>
            <a href="/orders" class="nav-link" :class="{ active: activePage === 'orders' }">
              <i class="fa-solid fa-receipt"></i> 订单
            </a>
          </div>
        </div>
        <div class="nav-links" v-if="showSearch || showAuth">
          <div class="search-box" v-if="showSearch">
            <i class="fa-solid fa-search"></i>
            <input type="text" placeholder="搜索商品..." v-model="searchKeyword" @keyup.enter="onSearch">
          </div>
          <button class="btn btn-ghost" @click="$emit('go-orders')" title="我的订单" v-if="showSearch">
            <i class="fa-solid fa-box"></i>
          </button>
          <!-- 未登录 -->
          <button class="btn btn-primary" @click="showAuthModal" v-if="showAuth && !isLoggedIn">
            <i class="fa-solid fa-user"></i> 登录
          </button>
          <!-- 已登录 -->
          <div class="user-info" v-if="showAuth && isLoggedIn">
            <div class="user-avatar">
              <i class="fa-solid fa-user"></i>
            </div>
            <span class="user-name">{{ currentUser?.username || '用户' }}</span>
            <button class="btn btn-ghost btn-sm" @click="logout" title="退出登录">
              <i class="fa-solid fa-right-from-bracket"></i>
            </button>
          </div>
        </div>
      </div>
    </nav>

    <!-- 登录注册弹窗 -->
    <div class="modal-overlay" v-if="showAuth && authModalVisible" @click.self="closeAuthModal">
      <div class="auth-modal">
        <div class="auth-header">
          <h3>{{ isLogin ? '登录' : '注册' }}</h3>
          <button class="modal-close" @click="closeAuthModal">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="auth-tabs">
          <button :class="['auth-tab', { active: isLogin }]" @click="isLogin = true">登录</button>
          <button :class="['auth-tab', { active: !isLogin }]" @click="isLogin = false">注册</button>
        </div>
        <div class="auth-form">
          <div class="form-group">
            <label><i class="fa-solid fa-user"></i> 用户名</label>
            <input type="text" v-model="authForm.username" placeholder="3-20位英文、数字、下划线" class="form-input">
          </div>
          <div class="form-group">
            <label><i class="fa-solid fa-lock"></i> 密码</label>
            <input type="password" v-model="authForm.password" placeholder="至少6位" class="form-input">
          </div>
          <div class="form-group" v-if="!isLogin">
            <label><i class="fa-solid fa-lock"></i> 确认密码</label>
            <input type="password" v-model="authForm.confirmPassword" placeholder="再次输入密码" class="form-input">
          </div>
          <button class="btn btn-primary btn-block" @click="handleAuth" :disabled="authLoading">
            <i class="fa-solid fa-spinner fa-spin" v-if="authLoading"></i>
            {{ authLoading ? '处理中...' : (isLogin ? '登录' : '注册') }}
          </button>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      isInIframe: window.self !== window.top,
      searchKeyword: '',
      isLoggedIn: false,
      currentUser: null,
      authModalVisible: false,
      isLogin: true,
      authLoading: false,
      authForm: {
        username: '',
        password: '',
        confirmPassword: ''
      }
    };
  },
  methods: {
    goHome() {
      this.$emit('go-home');
      window.location.href = '/';
    },
    onSearch() {
      this.$emit('search', this.searchKeyword);
    },
    showAuthModal() {
      this.authModalVisible = true;
      this.authForm = { username: '', password: '', confirmPassword: '' };
    },
    closeAuthModal() {
      this.authModalVisible = false;
      this.authForm = { username: '', password: '', confirmPassword: '' };
    },
    async handleAuth() {
      const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
      if (!this.authForm.username.trim()) {
        Toast.warning('请输入用户名');
        return;
      }
      if (!USERNAME_REGEX.test(this.authForm.username)) {
        Toast.warning('用户名只能包含英文、数字、下划线，长度3-20位');
        return;
      }
      if (!this.authForm.password) {
        Toast.warning('请输入密码');
        return;
      }
      if (this.authForm.password.length < 6) {
        Toast.warning('密码长度至少6位');
        return;
      }
      if (!this.isLogin) {
        if (!this.authForm.confirmPassword) {
          Toast.warning('请确认密码');
          return;
        }
        if (this.authForm.password !== this.authForm.confirmPassword) {
          Toast.warning('两次密码不一致');
          return;
        }
      }

      this.authLoading = true;
      try {
        const url = this.isLogin ? '/api/users/login' : '/api/users/register';
        const response = await axios.post(url, {
          username: this.authForm.username,
          password: this.authForm.password
        });
        const { user } = response.data;
        this.currentUser = user;
        this.isLoggedIn = true;
        localStorage.setItem('user', JSON.stringify(user));
        Toast.success(this.isLogin ? '登录成功' : '注册成功');
        this.closeAuthModal();
      } catch (error) {
        Toast.error(error.response?.data?.error || error.message || '操作失败');
      } finally {
        this.authLoading = false;
      }
    },
    async logout() {
      try {
        await axios.post('/api/users/logout');
      } catch (e) { /* 忽略 */ }
      localStorage.removeItem('user');
      this.isLoggedIn = false;
      this.currentUser = null;
      Toast.info('已退出登录');
    },
    async checkLogin() {
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      if (user) {
        this.currentUser = user;
        this.isLoggedIn = true;
        try {
          const response = await axios.get('/api/users/me');
          this.currentUser = response.data;
          localStorage.setItem('user', JSON.stringify(response.data));
        } catch (error) {
          localStorage.removeItem('user');
          this.isLoggedIn = false;
          this.currentUser = null;
        }
      }
    }
  },
  mounted() {
    if (this.showAuth) {
      this.checkLogin();
    }
  }
};

// 注册为全局组件的辅助方法
function registerAppHeader(app) {
  app.component('app-header', AppHeader);
}
