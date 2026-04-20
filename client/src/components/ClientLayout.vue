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
    <n-modal v-model:show="showAuthModal" :mask-closable="true" :style="{ maxWidth: '420px', width: '90vw' }">
      <div class="auth-modal-content">
        <div class="auth-header">
          <div class="auth-header-bg"></div>
          <div class="auth-header-icon">
            <n-icon :size="28" color="white"><shield-checkmark-outline></shield-checkmark-outline></n-icon>
          </div>
          <h2 class="auth-title">{{ isLogin ? '欢迎回来' : '加入我们' }}</h2>
          <p class="auth-subtitle">{{ isLogin ? '登录你的账号继续使用' : '创建账号开始使用服务' }}</p>
        </div>
        <div class="auth-body">
          <n-form ref="authFormRef" :model="authForm" :rules="authRules" :show-label="false">
            <n-form-item path="username">
              <n-input v-model:value="authForm.username" placeholder="用户名" size="large">
                <template #prefix>
                  <n-icon :size="18" color="#94A3B8"><person-outline></person-outline></n-icon>
                </template>
              </n-input>
            </n-form-item>
            <n-form-item path="password">
              <n-input v-model:value="authForm.password" type="password" placeholder="密码" size="large" show-password-on="click">
                <template #prefix>
                  <n-icon :size="18" color="#94A3B8"><lock-closed-outline></lock-closed-outline></n-icon>
                </template>
              </n-input>
            </n-form-item>
            <n-form-item v-if="!isLogin" path="confirmPassword">
              <n-input v-model:value="authForm.confirmPassword" type="password" placeholder="确认密码" size="large" show-password-on="click">
                <template #prefix>
                  <n-icon :size="18" color="#94A3B8"><lock-closed-outline></lock-closed-outline></n-icon>
                </template>
              </n-input>
            </n-form-item>
            <n-form-item v-if="!isLogin" path="inviteCode">
              <n-input v-model:value="authForm.inviteCode" placeholder="邀请码（必填）" size="large">
                <template #prefix>
                  <n-icon :size="18" color="#94A3B8"><key-outline></key-outline></n-icon>
                </template>
              </n-input>
            </n-form-item>
          </n-form>
          <n-button type="primary" block size="large" :loading="authLoading" @click="handleAuth" class="auth-submit">
            {{ isLogin ? '登 录' : '注 册' }}
          </n-button>
          <div class="auth-switch">
            <span class="auth-switch-text">{{ isLogin ? '还没有账号？' : '已有账号？' }}</span>
            <n-button text type="primary" @click="isLogin = !isLogin">
              {{ isLogin ? '立即注册' : '去登录' }}
            </n-button>
          </div>
        </div>
      </div>
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
  PersonOutline, LockClosedOutline, KeyOutline, ShieldCheckmarkOutline
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
.auth-modal-content {
  overflow: hidden;
  border-radius: 16px;
  background: white;
}

.auth-header {
  position: relative;
  padding: 32px 28px 24px;
  text-align: center;
  overflow: hidden;
}

.auth-header-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #6366F1 0%, #818CF8 50%, #A5B4FC 100%);
}

.auth-header-icon {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 14px;
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.auth-title {
  position: relative;
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: white;
  font-family: 'Poppins', sans-serif;
  letter-spacing: -0.02em;
}

.auth-subtitle {
  position: relative;
  margin: 6px 0 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 400;
}

.auth-body {
  padding: 24px 28px 28px;
}

.auth-body :deep(.n-form-item) {
  margin-bottom: 16px;
}

.auth-body :deep(.n-form-item:last-child) {
  margin-bottom: 0;
}

.auth-body :deep(.n-input) {
  border-radius: 10px;
}

.auth-submit {
  margin-top: 20px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 15px;
  height: 44px;
  background: linear-gradient(135deg, #6366F1, #818CF8);
  border: none;
}

.auth-submit:hover {
  background: linear-gradient(135deg, #4F46E5, #6366F1);
}

.auth-switch {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-top: 16px;
  font-size: 13px;
}

.auth-switch-text {
  color: #94A3B8;
}
</style>
