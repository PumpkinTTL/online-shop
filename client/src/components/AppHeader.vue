<template>
  <n-layout-header bordered class="app-header">
    <div class="header-inner">
      <div class="header-left">
        <router-link to="/" class="brand">
          <n-icon size="24" color="#3B82F6"><FlashOutline /></n-icon>
          <span class="brand-text">工具商店</span>
        </router-link>
        <n-menu mode="horizontal" :value="activeMenu" :options="menuOptions" @update:value="handleMenuClick" />
      </div>
      <div class="header-right">
        <template v-if="userStore.isLoggedIn">
          <n-avatar round size="small">{{ userStore.user?.username?.[0]?.toUpperCase() || 'U' }}</n-avatar>
          <span class="user-name">{{ userStore.user?.username }}</span>
          <n-button quaternary size="small" @click="handleLogout">
            <template #icon><n-icon><LogOutOutline /></n-icon></template>
          </n-button>
        </template>
        <template v-else>
          <n-button type="primary" size="small" @click="showAuthModal = true">
            <template #icon><n-icon><PersonOutline /></n-icon></template>
            登录
          </n-button>
        </template>
      </div>
    </div>
  </n-layout-header>

  <!-- 登录注册弹窗 -->
  <n-modal v-model:show="showAuthModal" preset="card" :title="isLogin ? '登录' : '注册'" style="max-width: 400px;">
    <n-form ref="authFormRef" :model="authForm" :rules="authRules">
      <n-form-item label="用户名" path="username">
        <n-input v-model:value="authForm.username" placeholder="3-20位英文、数字、下划线" />
      </n-form-item>
      <n-form-item label="密码" path="password">
        <n-input v-model:value="authForm.password" type="password" placeholder="至少6位" show-password-on="click" />
      </n-form-item>
      <n-form-item v-if="!isLogin" label="确认密码" path="confirmPassword">
        <n-input v-model:value="authForm.confirmPassword" type="password" placeholder="再次输入密码" />
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
</template>

<script setup>
import { ref, computed, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NLayoutHeader, NMenu, NButton, NIcon, NAvatar, NModal, NForm, NFormItem, NInput, useMessage } from 'naive-ui'
import { FlashOutline, HomeOutline, PhonePortraitOutline, ReceiptOutline, PersonOutline, LogOutOutline } from '@vicons/ionicons5'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
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

const activeMenu = computed(() => {
  if (route.path === '/sms') return 'sms'
  if (route.path === '/orders') return 'orders'
  return 'home'
})

const menuOptions = [
  { label: '首页', key: 'home', icon: () => h(NIcon, null, () => h(HomeOutline)) },
  { label: '接码', key: 'sms', icon: () => h(NIcon, null, () => h(PhonePortraitOutline)) },
  { label: '订单', key: 'orders', icon: () => h(NIcon, null, () => h(ReceiptOutline)) },
]

function handleMenuClick(key) {
  const map = { home: '/', sms: '/sms', orders: '/orders' }
  router.push(map[key])
}

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
  backdrop-filter: blur(12px);
  background: rgba(255, 255, 255, 0.85);
}

.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: #1E293B;
  font-weight: 700;
  font-size: 18px;
  font-family: Poppins, sans-serif;
}

.brand-text {
  background: linear-gradient(135deg, #3B82F6, #60A5FA);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-name {
  font-size: 14px;
  color: #475569;
  margin-left: 4px;
}
</style>
