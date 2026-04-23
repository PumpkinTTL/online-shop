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
        @click="userStore.isLoggedIn ? router.push({ name: 'Profile' }) : (showAuthModal = true, isLogin = true)"
      >
        <div class="tabbar-icon-wrap">
          <n-icon :size="22"><person-outline></person-outline></n-icon>
        </div>
        <span class="tabbar-label">{{ userStore.isLoggedIn ? '我的' : '登录' }}</span>
      </div>
    </nav>

    <!-- 登录注册弹窗（Tab Bar 的登录入口触发） -->
    <n-modal v-model:show="showAuthModal" :mask-closable="true" :style="{ maxWidth: '400px', width: '90vw' }">
      <n-card :bordered="false" class="auth-card" :closable="true" @close="showAuthModal = false">
        <div class="auth-brand">
          <div class="auth-brand-icon">
            <n-icon :size="20" color="#fff"><shield-checkmark-outline></shield-checkmark-outline></n-icon>
          </div>
          <div>
            <div class="auth-brand-title">{{ isLogin ? '登录' : '注册' }}</div>
            <div class="auth-brand-desc">{{ isLogin ? '登录你的账号继续使用' : '输入邀请码注册新账号' }}</div>
          </div>
        </div>

        <n-form ref="authFormRef" :model="authForm" :rules="authRules" :show-label="false" style="margin-top: 20px">
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

        <n-button type="primary" block size="large" :loading="authLoading" @click="handleAuth" class="auth-submit">
          {{ isLogin ? '登录' : '注册' }}
        </n-button>

        <div class="auth-switch">
          <n-button v-if="isLogin" text size="small" class="auth-forgot" @click="showForgotTip = true">忘记密码？</n-button>
          <span v-else class="auth-switch-text">已有账号？</span>
          <n-button text type="primary" size="small" @click="isLogin = !isLogin">{{ isLogin ? '立即注册' : '去登录' }}</n-button>
        </div>
      </n-card>
    </n-modal>

    <!-- 忘记密码提示弹窗 -->
    <n-modal v-model:show="showForgotTip" :mask-closable="true" :style="{ maxWidth: '360px', width: '90vw' }">
      <n-card :bordered="false" class="auth-card" :closable="true" @close="showForgotTip = false">
        <div class="auth-brand">
          <div class="auth-brand-icon" style="background: #F59E0B">
            <n-icon :size="20" color="#fff"><key-outline></key-outline></n-icon>
          </div>
          <div>
            <div class="auth-brand-title">忘记密码</div>
            <div class="auth-brand-desc">请联系管理员重置密码</div>
          </div>
        </div>
        <div class="forgot-contact">
          <div class="forgot-contact-item">
            <span class="forgot-label">QQ</span>
            <span class="forgot-value">{{ adminContact.qq }}</span>
          </div>
          <div class="forgot-contact-item" v-if="adminContact.wechat">
            <span class="forgot-label">微信</span>
            <span class="forgot-value">{{ adminContact.wechat }}</span>
          </div>
        </div>
        <n-button block size="large" class="auth-submit" @click="showForgotTip = false">我知道了</n-button>
      </n-card>
    </n-modal>
    <CaptchaModal></CaptchaModal>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NModal, NCard, NForm, NFormItem, NInput, NButton, NIcon, useMessage } from 'naive-ui'
import {
  HomeOutline, PhonePortraitOutline, ReceiptOutline,
  PersonOutline, LockClosedOutline, KeyOutline, ShieldCheckmarkOutline
} from '@vicons/ionicons5'
import AppHeader from '@/components/AppHeader.vue'
import CaptchaModal from '@/components/CaptchaModal.vue'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const userStore = useUserStore()

const showAuthModal = ref(false)
const isLogin = ref(true)
const authLoading = ref(false)
const authFormRef = ref(null)
const authForm = ref({ username: '', password: '', confirmPassword: '', inviteCode: '' })
const showForgotTip = ref(false)

// 管理员联系方式
const adminContact = {
  qq: import.meta.env.VITE_ADMIN_QQ || '请联系站长获取',
  wechat: import.meta.env.VITE_ADMIN_WECHAT || '',
}

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
  if (key === 'mine') return route.path === '/profile'
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
.auth-card {
  border-radius: 16px !important;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1) !important;
}

.auth-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.auth-brand-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #3B82F6;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.auth-brand-title {
  font-size: 18px;
  font-weight: 700;
  color: #1E293B;
  line-height: 1.3;
}

.auth-brand-desc {
  font-size: 13px;
  color: #94A3B8;
  line-height: 1.4;
}

.auth-submit {
  margin-top: 8px;
  border-radius: 8px;
  font-weight: 600;
  height: 42px;
}

.auth-switch {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  margin-top: 14px;
  font-size: 13px;
}

.auth-switch-text {
  color: #94A3B8;
}

.auth-forgot {
  color: #94A3B8;
  margin-right: auto;
}

.auth-forgot:hover {
  color: #F59E0B;
}

/* ===== 忘记密码弹窗 ===== */
.forgot-contact {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.forgot-contact-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #F8FAFC;
  border-radius: 10px;
  border: 1px solid #F1F5F9;
}

.forgot-label {
  font-size: 12px;
  font-weight: 600;
  color: #94A3B8;
  min-width: 32px;
}

.forgot-value {
  font-size: 15px;
  font-weight: 600;
  color: #1E293B;
  font-family: 'Poppins', sans-serif;
}
</style>
