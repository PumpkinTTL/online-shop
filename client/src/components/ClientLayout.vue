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
    <n-modal v-model:show="showAuthModal" :mask-closable="true" :style="{ maxWidth: '400px', width: '90vw' }">
      <div class="auth-modal">
        <div class="auth-deco">
          <div class="auth-deco-orb auth-deco-orb-1"></div>
          <div class="auth-deco-orb auth-deco-orb-2"></div>
          <div class="auth-deco-orb auth-deco-orb-3"></div>
        </div>

        <button class="auth-close" @click="showAuthModal = false">
          <n-icon :size="18" color="#64748B"><close-outline></close-outline></n-icon>
        </button>

        <div class="auth-top">
          <div class="auth-logo">
            <n-icon :size="22" color="white"><shield-checkmark-outline></shield-checkmark-outline></n-icon>
          </div>
          <h2 class="auth-title">{{ isLogin ? '欢迎回来' : '创建账号' }}</h2>
          <p class="auth-desc">{{ isLogin ? '登录以继续使用服务' : '输入邀请码注册新账号' }}</p>
        </div>

        <n-form ref="authFormRef" :model="authForm" :rules="authRules" :show-label="false" class="auth-form">
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

        <n-button type="primary" block size="large" :loading="authLoading" @click="handleAuth" class="auth-btn">
          {{ isLogin ? '登录' : '注册' }}
        </n-button>

        <div class="auth-footer">
          <span>{{ isLogin ? '还没有账号？' : '已有账号？' }}</span>
          <button class="auth-toggle" @click="isLogin = !isLogin">{{ isLogin ? '立即注册' : '去登录' }}</button>
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
  PersonOutline, LockClosedOutline, KeyOutline, ShieldCheckmarkOutline, CloseOutline
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
.auth-modal {
  position: relative;
  overflow: hidden;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(40px);
  padding: 32px 28px 28px;
}

.auth-deco {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.auth-deco-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.5;
}

.auth-deco-orb-1 {
  width: 200px;
  height: 200px;
  background: #818CF8;
  top: -60px;
  right: -40px;
}

.auth-deco-orb-2 {
  width: 160px;
  height: 160px;
  background: #38BDF8;
  bottom: -40px;
  left: -30px;
}

.auth-deco-orb-3 {
  width: 100px;
  height: 100px;
  background: #A78BFA;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.auth-close {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: rgba(100, 116, 139, 0.08);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 200ms;
}

.auth-close:hover {
  background: rgba(100, 116, 139, 0.16);
}

.auth-top {
  position: relative;
  text-align: center;
  margin-bottom: 24px;
}

.auth-logo {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: linear-gradient(135deg, #6366F1, #818CF8);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 14px;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.3);
}

.auth-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1E293B;
  letter-spacing: -0.01em;
}

.auth-desc {
  margin: 4px 0 0;
  font-size: 13px;
  color: #64748B;
}

.auth-form {
  position: relative;
}

.auth-form :deep(.n-form-item) {
  margin-bottom: 14px;
}

.auth-form :deep(.n-form-item:last-child) {
  margin-bottom: 0;
}

.auth-form :deep(.n-input) {
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.6);
}

.auth-btn {
  position: relative;
  margin-top: 18px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 15px;
  height: 44px;
  background: linear-gradient(135deg, #6366F1, #818CF8);
  border: none;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.25);
  transition: box-shadow 200ms, transform 200ms;
}

.auth-btn:hover {
  background: linear-gradient(135deg, #4F46E5, #6366F1);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.35);
}

.auth-btn:active {
  transform: scale(0.98);
}

.auth-footer {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-top: 16px;
  font-size: 13px;
  color: #64748B;
}

.auth-toggle {
  border: none;
  background: none;
  color: #6366F1;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  transition: color 200ms;
}

.auth-toggle:hover {
  color: #4F46E5;
}

@media (prefers-reduced-motion: reduce) {
  .auth-btn { transition: none; }
  .auth-close { transition: none; }
  .auth-toggle { transition: none; }
  .auth-btn:active { transform: none; }
}
</style>
