<template>
  <div class="client-layout">
    <!-- 统一 Header（响应式适配） -->
    <AppHeader />

    <main class="client-main">
      <router-view></router-view>
    </main>

    <!-- 移动端底部 Tab Bar（商品详情页隐藏） -->
    <nav v-if="!isProductDetail" class="mobile-tabbar">
      <router-link
        to="/"
        class="tabbar-item"
        :class="{ active: isActive('home') }"
      >
        <div class="tabbar-icon-wrap">
          <n-icon :size="22"><home-outline></home-outline></n-icon>
        </div>
        <span class="tabbar-label">首页</span>
      </router-link>
      <!-- 接码暂时隐藏 -->
      <!-- <router-link to="/sms" class="tabbar-item" :class="{ active: isActive('sms') }">
        <div class="tabbar-icon-wrap">
          <n-icon :size="22"><phone-portrait-outline></phone-portrait-outline></n-icon>
        </div>
        <span class="tabbar-label">接码</span>
      </router-link> -->
      <router-link
        to="/orders"
        class="tabbar-item"
        :class="{ active: isActive('orders') }"
      >
        <div class="tabbar-icon-wrap">
          <n-icon :size="22"><receipt-outline></receipt-outline></n-icon>
        </div>
        <span class="tabbar-label">订单</span>
      </router-link>
      <div
        class="tabbar-item"
        :class="{ active: isActive('mine') }"
        @click="userStore.isLoggedIn ? null : (showAuthModal = true, isLogin = true)"
      >
        <div class="tabbar-icon-wrap">
          <n-icon :size="22"><person-outline></person-outline></n-icon>
        </div>
        <span class="tabbar-label">{{ userStore.isLoggedIn ? '我的' : '登录' }}</span>
      </div>
    </nav>

    <!-- 登录注册弹窗（Tab Bar 的登录入口触发） -->
    <n-modal v-model:show="showAuthModal" preset="card" :title="isLogin ? '登录' : '注册'" :style="{ maxWidth: '400px', width: '90vw' }" :closable="true" class="auth-card">
      <template #header>
        <div class="auth-header-wrap">
          <div class="auth-accent-bar"></div>
          <span class="auth-header-title">{{ isLogin ? '登录' : '注册' }}</span>
          <p class="auth-header-desc">{{ isLogin ? '登录你的账号继续使用' : '输入邀请码注册新账号' }}</p>
        </div>
      </template>
      <n-form ref="authFormRef" :model="authForm" :rules="authRules" :show-label="false" class="auth-form">
        <n-form-item path="username">
          <n-input v-model:value="authForm.username" placeholder="用户名" size="large">
            <template #prefix><n-icon :size="18" color="#94A3B8"><person-outline></person-outline></n-icon></template>
          </n-input>
        </n-form-item>
        <n-form-item path="password">
          <n-input v-model:value="authForm.password" type="password" placeholder="密码" size="large" show-password-on="click">
            <template #prefix><n-icon :size="18" color="#94A3B8"><lock-closed-outline></lock-closed-outline></n-icon></template>
          </n-input>
        </n-form-item>
        <n-form-item v-if="!isLogin" path="confirmPassword">
          <n-input v-model:value="authForm.confirmPassword" type="password" placeholder="确认密码" size="large" show-password-on="click">
            <template #prefix><n-icon :size="18" color="#94A3B8"><lock-closed-outline></lock-closed-outline></n-icon></template>
          </n-input>
        </n-form-item>
        <n-form-item v-if="!isLogin" path="inviteCode">
          <n-input v-model:value="authForm.inviteCode" placeholder="邀请码（必填）" size="large">
            <template #prefix><n-icon :size="18" color="#94A3B8"><key-outline></key-outline></n-icon></template>
          </n-input>
        </n-form-item>
      </n-form>
      <template #footer>
        <div class="auth-footer">
          <n-button text size="small" @click="isLogin = !isLogin">{{ isLogin ? '没有账号？去注册' : '已有账号？去登录' }}</n-button>
          <n-button type="primary" size="large" :loading="authLoading" @click="handleAuth" class="auth-submit-btn">{{ isLogin ? '登录' : '注册' }}</n-button>
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
import {
  HomeOutline, PhonePortraitOutline, ReceiptOutline,
  PersonOutline, LockClosedOutline, KeyOutline
} from '@vicons/ionicons5'
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
const authForm = ref({ username: '', password: '', confirmPassword: '', inviteCode: '' })

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
  inviteCode: !isLogin.value ? [
    { required: true, message: '邀请码不能为空', trigger: 'blur' },
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
      await userStore.register(authForm.value.username, authForm.value.password, authForm.value.inviteCode)
      message.success('注册成功')
    }
    showAuthModal.value = false
    authForm.value = { username: '', password: '', confirmPassword: '', inviteCode: '' }
  } catch (error) {
    const errData = error.response?.data
    message.error(errData?.error || error.message || '操作失败')
  } finally {
    authLoading.value = false
  }
}

function isActive(key) {
  if (key === 'home') return route.path === '/'
  if (key === 'orders') return route.path === '/orders'
  if (key === 'sms') return route.path === '/sms'
  if (key === 'mine') return false
  return false
}

// 是否是商品详情页
const isProductDetail = computed(() => /^\/product\/\w+/.test(route.path))
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
  height: 52px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-top: 1px solid rgba(0, 0, 0, 0.06);
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
  transition: color 0.2s ease-out;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.tabbar-item.active {
  color: #3B82F6;
}

.tabbar-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 26px;
  border-radius: 13px;
  transition: all 0.2s ease-out;
}

.tabbar-item.active .tabbar-icon-wrap {
  background: rgba(59, 130, 246, 0.08);
}

.tabbar-label {
  font-size: 10px;
  font-weight: 500;
  font-family: 'Open Sans', sans-serif;
  transition: font-weight 0.15s ease-out;
}

.tabbar-item.active .tabbar-label {
  font-weight: 700;
}

/* ===== 桌面端：隐藏 Tab Bar ===== */
@media (min-width: 768px) {
  .mobile-tabbar {
    display: none;
  }
}

/* ===== 减少动画偏好 ===== */
@media (prefers-reduced-motion: reduce) {
  .tabbar-icon-wrap {
    transition: none;
  }
  .tabbar-item.active .tabbar-icon-wrap {
    background: rgba(59, 130, 246, 0.08);
  }
}

/* ===== 登录注册弹窗 ===== */
.auth-card :deep(.n-card) {
  border-radius: 16px;
  overflow: hidden;
}

.auth-header-wrap {
  padding: 4px 0 0;
}

.auth-accent-bar {
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(90deg, #6366F1, #818CF8);
  margin-bottom: 12px;
}

.auth-header-title {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #1E293B;
  letter-spacing: -0.01em;
}

.auth-header-desc {
  margin: 4px 0 0;
  font-size: 13px;
  color: #94A3B8;
  font-weight: 400;
}

.auth-form :deep(.n-input) {
  border-radius: 10px;
}

.auth-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.auth-submit-btn {
  border-radius: 8px;
  font-weight: 600;
  padding: 0 28px;
}
</style>
