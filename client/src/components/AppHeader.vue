<template>
  <header class="app-header">
    <div class="header-inner">
      <!-- Logo -->
      <router-link to="/" class="brand">
        <div class="brand-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="url(#brandGrad)" />
            <defs>
              <linearGradient id="brandGrad" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
                <stop stop-color="#3B82F6" />
                <stop offset="1" stop-color="#60A5FA" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <span class="brand-text">工具商店</span>
      </router-link>

      <!-- 导航链接 -->
      <nav class="header-nav">
        <router-link to="/" class="nav-link" :class="{ active: route.path === '/' }">
          <n-icon :size="18"><home-outline></home-outline></n-icon>
          <span>首页</span>
        </router-link>
        <router-link to="/sms" class="nav-link" :class="{ active: route.path === '/sms' }">
          <n-icon :size="18"><phone-portrait-outline></phone-portrait-outline></n-icon>
          <span>接码</span>
        </router-link>
        <router-link v-if="userStore.isLoggedIn" to="/orders" class="nav-link" :class="{ active: route.path === '/orders' }">
          <n-icon :size="18"><receipt-outline></receipt-outline></n-icon>
          <span>订单</span>
        </router-link>
      </nav>

      <!-- 右侧操作区 -->
      <div class="header-right">
        <template v-if="userStore.isLoggedIn">
          <div class="user-info">
            <div class="user-avatar">{{ userStore.user?.username?.[0]?.toUpperCase() || 'U' }}</div>
            <span class="user-name">{{ userStore.user?.username }}</span>
          </div>
          <button class="logout-btn" @click="handleLogout" title="退出登录">
            <n-icon :size="18"><log-out-outline></log-out-outline></n-icon>
          </button>
        </template>
        <template v-else>
          <n-button type="primary" size="small" round @click="showAuthModal = true">
            <template #icon><n-icon><person-outline></person-outline></n-icon></template>
            登录
          </n-button>
        </template>
      </div>
    </div>

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
  </header>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { NButton, NIcon, NModal, NForm, NFormItem, NInput, useMessage } from 'naive-ui'
import { HomeOutline, PhonePortraitOutline, ReceiptOutline, PersonOutline, LogOutOutline } from '@vicons/ionicons5'
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

async function handleLogout() {
  await userStore.logout()
  message.info('已退出登录')
}
</script>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
}

/* Logo */
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: #1E293B;
}

.brand-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(96, 165, 250, 0.1));
}

.brand-text {
  font-weight: 700;
  font-size: 18px;
  font-family: 'Poppins', sans-serif;
  background: linear-gradient(135deg, #3B82F6, #60A5FA);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 导航 */
.header-nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #64748B;
  text-decoration: none;
  transition: all 0.2s ease;
  cursor: pointer;
}

.nav-link:hover {
  color: #3B82F6;
  background: rgba(59, 130, 246, 0.06);
}

.nav-link.active {
  color: #3B82F6;
  background: rgba(59, 130, 246, 0.08);
  font-weight: 600;
}

/* 右侧操作 */
.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3B82F6, #60A5FA);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  font-family: 'Poppins', sans-serif;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: #1E293B;
}

.logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #94A3B8;
  cursor: pointer;
  transition: all 0.2s ease;
}

.logout-btn:hover {
  color: #EF4444;
  background: rgba(239, 68, 68, 0.06);
}
</style>
