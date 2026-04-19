<template>
  <div class="client-layout">
    <!-- 移动端精简 Header -->
    <header class="mobile-header">
      <div class="mobile-header-inner">
        <router-link to="/" class="mobile-brand">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="url(#mBrandGrad)" />
            <defs>
              <linearGradient id="mBrandGrad" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
                <stop stop-color="#3B82F6" />
                <stop offset="1" stop-color="#60A5FA" />
              </linearGradient>
            </defs>
          </svg>
          <span class="mobile-brand-text">工具商店</span>
        </router-link>
        <div class="mobile-header-right">
          <template v-if="userStore.isLoggedIn">
            <div class="mobile-user-avatar">{{ userStore.user?.username?.[0]?.toUpperCase() || 'U' }}</div>
          </template>
          <template v-else>
            <n-button type="primary" size="tiny" round @click="showAuthModal = true">登录</n-button>
          </template>
        </div>
      </div>
    </header>

    <!-- 桌面端顶部导航 -->
    <AppHeader class="desktop-header" />

    <main class="client-main">
      <router-view></router-view>
    </main>

    <!-- 移动端底部 Tab Bar -->
    <nav class="mobile-tabbar">
      <router-link
        v-for="tab in tabs"
        :key="tab.key"
        :to="tab.to"
        class="tabbar-item"
        :class="{ active: isActive(tab.key) }"
      >
        <div class="tabbar-icon">
          <n-icon :size="22"><component :is="tab.icon"></component></n-icon>
        </div>
        <span class="tabbar-label">{{ tab.label }}</span>
      </router-link>
      <router-link
        v-if="userStore.isLoggedIn"
        to="/orders"
        class="tabbar-item"
        :class="{ active: isActive('orders') }"
      >
        <div class="tabbar-icon">
          <n-icon :size="22"><receipt-outline></receipt-outline></n-icon>
        </div>
        <span class="tabbar-label">订单</span>
      </router-link>
      <div v-else class="tabbar-item" @click="showAuthModal = true">
        <div class="tabbar-icon">
          <n-icon :size="22"><person-outline></person-outline></n-icon>
        </div>
        <span class="tabbar-label">我的</span>
      </div>
    </nav>

    <!-- 登录注册弹窗 -->
    <n-modal v-model:show="showAuthModal" preset="card" :title="isLogin ? '登录' : '注册'" style="max-width: 400px;">
      <n-form ref="authFormRef" :model="authForm" :rules="authRules">
        <n-form-item label="用户名" path="username">
          <n-input v-model:value="authForm.username" placeholder="3-20位英文、数字、下划线"></n-input>
        </n-form-item>
        <n-form-item label="密码" path="password">
          <n-input v-model:value="authForm.password" type="password" placeholder="至少6位" show-password-on="click"></n-input>
        </n-form-item>
        <n-form-item v-if="!isLogin" label="确认密码" path="confirmPassword">
          <n-input v-model:value="authForm.confirmPassword" type="password" placeholder="再次输入密码"></n-input>
        </n-form-item>
      </n-form>
      <template #footer>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <n-button text @click="isLogin = !isLogin">
            {{ isLogin ? '没有账号？去注册' : '已有账号？去登录' }}
          </n-button>
          <n-button type="primary" :loading="authLoading" @click="handleAuth">
            {{ isLogin ? '登录' : '注册' }}
          </n-button>
        </div>
      </template>
    </n-modal>
    <CaptchaModal></CaptchaModal>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { NModal, NForm, NFormItem, NInput, NButton, NIcon, useMessage } from 'naive-ui'
import { HomeOutline, PhonePortraitOutline, ReceiptOutline, PersonOutline } from '@vicons/ionicons5'
import AppHeader from '@/components/AppHeader.vue'
import CaptchaModal from '@/components/CaptchaModal.vue'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const message = useMessage()
const userStore = useUserStore()

const showAuthModal = ref(false)
const isLogin = ref(true)
const authLoading = ref(false)
const authFormRef = ref(null)
const authForm = ref({ username: '', password: '', confirmPassword: '' })

const authRules = computed(() => ({
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]{3,20}$/, message: '3-20位英文、数字、下划线', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '至少6位', trigger: 'blur' },
  ],
  confirmPassword: !isLogin.value ? [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (rule, value) => value === authForm.value.password,
      message: '两次密码不一致',
      trigger: 'blur',
    },
  ] : undefined,
}))

async function handleAuth() {
  try {
    await authFormRef.value?.validate()
  } catch { return }

  authLoading.value = true
  try {
    if (isLogin.value) {
      await userStore.login(authForm.value.username, authForm.value.password)
      message.success('登录成功')
    } else {
      await userStore.register(authForm.value.username, authForm.value.password)
      message.success('注册成功')
    }
    showAuthModal.value = false
    authForm.value = { username: '', password: '', confirmPassword: '' }
  } catch (error) {
    const errData = error.response?.data
    message.error(errData?.error || error.message || '操作失败')
  } finally {
    authLoading.value = false
  }
}

const tabs = [
  { key: 'home', label: '首页', to: '/', icon: HomeOutline },
  { key: 'sms', label: '接码', to: '/sms', icon: PhonePortraitOutline },
]

function isActive(key) {
  if (key === 'home') return route.path === '/'
  if (key === 'orders') return route.path === '/orders'
  if (key === 'sms') return route.path === '/sms'
  return false
}
</script>

<style scoped>
.client-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}

.client-main {
  flex: 1;
}

/* ===== 移动端 Header ===== */
.mobile-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.mobile-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
}

.mobile-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
}

.mobile-brand-text {
  font-weight: 700;
  font-size: 16px;
  font-family: 'Poppins', sans-serif;
  background: linear-gradient(135deg, #3B82F6, #60A5FA);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.mobile-header-right {
  display: flex;
  align-items: center;
}

.mobile-user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3B82F6, #60A5FA);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  font-family: 'Poppins', sans-serif;
}

/* ===== 桌面端顶部导航 ===== */
.desktop-header {
  display: none;
}

/* ===== 移动端底部 Tab Bar ===== */
.mobile-tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: 56px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid rgba(0, 0, 0, 0.04);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.tabbar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  flex: 1;
  height: 100%;
  text-decoration: none;
  color: #94A3B8;
  transition: color 0.2s ease;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.tabbar-item.active {
  color: #3B82F6;
}

.tabbar-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}

.tabbar-item.active .tabbar-icon {
  transform: translateY(-1px);
}

.tabbar-label {
  font-size: 10px;
  font-weight: 500;
  font-family: 'Open Sans', sans-serif;
}

/* ===== 桌面端：隐藏移动端导航，显示桌面导航 ===== */
@media (min-width: 768px) {
  .mobile-header {
    display: none;
  }

  .desktop-header {
    display: block;
  }

  .mobile-tabbar {
    display: none;
  }
}
</style>
