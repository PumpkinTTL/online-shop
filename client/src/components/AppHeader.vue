<template>
  <header class="app-header">
    <div class="header-inner">
      <!-- Logo -->
      <router-link to="/" class="brand">
        <div class="brand-logo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white" />
          </svg>
        </div>
        <div class="brand-text-group">
          <span class="brand-name">工具商店</span>
          <span class="brand-tagline">ToolShop</span>
        </div>
      </router-link>

      <!-- 分隔线（桌面端显示） -->
      <div class="header-divider"></div>

      <!-- 导航链接 -->
      <nav class="header-nav">
        <router-link to="/" class="nav-item" :class="{ active: isNavActive('home') }">
          <div class="nav-icon-wrap">
            <n-icon :size="17"><home-outline></home-outline></n-icon>
          </div>
          <span>首页</span>
        </router-link>
        <!-- 接码暂时隐藏 -->
        <!-- <router-link to="/sms" class="nav-item" :class="{ active: isNavActive('sms') }">
          <div class="nav-icon-wrap">
            <n-icon :size="17"><phone-portrait-outline></phone-portrait-outline></n-icon>
          </div>
          <span>接码</span>
        </router-link> -->
        <router-link to="/orders" class="nav-item" :class="{ active: isNavActive('orders') }">
          <div class="nav-icon-wrap">
            <n-icon :size="17"><receipt-outline></receipt-outline></n-icon>
          </div>
          <span>订单</span>
        </router-link>
      </nav>

      <!-- 弹性空间 -->
      <div class="header-spacer"></div>

      <!-- 右侧操作区 -->
      <div class="header-actions">
        <template v-if="userStore.isLoggedIn">
          <div class="user-pill" @click="toggleUserMenu">
            <div class="user-avatar">{{ userStore.user?.username?.[0]?.toUpperCase() || 'U' }}</div>
            <span class="user-name">{{ userStore.user?.username }}</span>
            <n-icon :size="14" color="#94A3B8"><chevron-down-outline></chevron-down-outline></n-icon>
          </div>
          <!-- 下拉菜单 -->
          <transition name="menu-fade">
            <div v-if="userMenuOpen" class="user-dropdown" @click.stop>
              <div class="dropdown-header">
                <div class="dropdown-avatar">{{ userStore.user?.username?.[0]?.toUpperCase() || 'U' }}</div>
                <div class="dropdown-user-info">
                  <span class="dropdown-username">{{ userStore.user?.username }}</span>
                  <span class="dropdown-role">普通用户</span>
                </div>
              </div>
              <div class="dropdown-divider"></div>
              <router-link to="/orders" class="dropdown-item" @click="userMenuOpen = false">
                <n-icon :size="16"><receipt-outline></receipt-outline></n-icon>
                我的订单
              </router-link>
              <button class="dropdown-item dropdown-item-danger" @click="handleLogout">
                <n-icon :size="16"><log-out-outline></log-out-outline></n-icon>
                退出登录
              </button>
            </div>
          </transition>
        </template>
        <template v-else>
          <button class="login-btn" @click="showAuthModal = true; isLogin = true">
            <n-icon :size="16"><person-outline></person-outline></n-icon>
            <span>登录</span>
          </button>
        </template>
      </div>
    </div>

    <!-- 点击空白关闭菜单 -->
    <div v-if="userMenuOpen" class="menu-overlay" @click="userMenuOpen = false"></div>

    <!-- 登录注册弹窗 -->
    <n-modal v-model:show="showAuthModal" preset="card" :title="isLogin ? '登录' : '注册'" :style="{ maxWidth: '400px', width: '90vw' }">
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { NButton, NIcon, NModal, NForm, NFormItem, NInput, useMessage } from 'naive-ui'
import {
  HomeOutline, PhonePortraitOutline, ReceiptOutline,
  PersonOutline, LogOutOutline, ChevronDownOutline
} from '@vicons/ionicons5'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const message = useMessage()
const userStore = useUserStore()

const showAuthModal = ref(false)
const isLogin = ref(true)
const authLoading = ref(false)
const authFormRef = ref(null)
const authForm = ref({ username: '', password: '', confirmPassword: '' })
const userMenuOpen = ref(false)

function isNavActive(key) {
  if (key === 'home') return route.path === '/'
  if (key === 'orders') return route.path === '/orders'
  if (key === 'sms') return route.path === '/sms'
  return false
}

function toggleUserMenu() {
  userMenuOpen.value = !userMenuOpen.value
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
  userMenuOpen.value = false
  await userStore.logout()
  message.info('已退出登录')
}

// ESC 关闭菜单
function onKeydown(e) {
  if (e.key === 'Escape') userMenuOpen.value = false
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
  display: flex;
  align-items: center;
  height: 52px;
  gap: 0;
}

/* ===== Logo ===== */
.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: #1E293B;
  flex-shrink: 0;
  padding: 4px 0;
}

.brand-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  background: linear-gradient(135deg, #3B82F6, #2563EB);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: box-shadow 0.2s ease-out, transform 0.2s ease-out;
}

.brand:hover .brand-logo {
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

/* 移动端隐藏品牌文字 */
.brand-text-group {
  display: none;
  flex-direction: column;
  line-height: 1.2;
}

.brand-name {
  font-weight: 700;
  font-size: 15px;
  font-family: 'Poppins', sans-serif;
  color: #0F172A;
  letter-spacing: -0.01em;
}

.brand-tagline {
  font-size: 9px;
  font-weight: 500;
  font-family: 'Poppins', sans-serif;
  color: #94A3B8;
  letter-spacing: 0.05em;
  margin-top: 2px;
}

/* ===== 分隔线（移动端隐藏） ===== */
.header-divider {
  display: none;
  width: 1px;
  height: 24px;
  background: #E2E8F0;
  margin: 0 16px;
  flex-shrink: 0;
}

/* ===== 导航（移动端隐藏，由 Tab Bar 负责） ===== */
.header-nav {
  display: none;
  align-items: center;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  font-family: 'Open Sans', sans-serif;
  color: #64748B;
  text-decoration: none;
  transition: all 0.2s ease-out;
  cursor: pointer;
  position: relative;
  -webkit-tap-highlight-color: transparent;
}

.nav-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease-out;
}

.nav-item:hover {
  color: #3B82F6;
  background: rgba(59, 130, 246, 0.06);
}

.nav-item:hover .nav-icon-wrap {
  transform: scale(1.1);
}

.nav-item:active {
  background: rgba(59, 130, 246, 0.1);
}

.nav-item.active {
  color: #3B82F6;
  background: rgba(59, 130, 246, 0.08);
  font-weight: 600;
}

.nav-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 14px;
  height: 2.5px;
  border-radius: 2px;
  background: linear-gradient(90deg, #3B82F6, #60A5FA);
}

/* ===== 弹性空间 ===== */
.header-spacer {
  flex: 1;
}

/* ===== 右侧操作 ===== */
.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  position: relative;
}

/* ===== 登录按钮 ===== */
.login-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 14px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, #3B82F6, #2563EB);
  color: white;
  font-size: 12px;
  font-weight: 600;
  font-family: 'Open Sans', sans-serif;
  cursor: pointer;
  transition: all 0.2s ease-out;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15);
  position: relative;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}

.login-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.12), transparent);
  opacity: 0;
  transition: opacity 0.2s ease-out;
}

.login-btn:hover {
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
}

.login-btn:hover::before {
  opacity: 1;
}

.login-btn:active {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(59, 130, 246, 0.3);
}

/* ===== 用户药丸 ===== */
.user-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px 3px 3px;
  border-radius: 8px;
  background: rgba(241, 245, 249, 0.8);
  border: 1px solid #E2E8F0;
  cursor: pointer;
  transition: all 0.2s ease-out;
  -webkit-tap-highlight-color: transparent;
}

.user-pill:hover {
  background: rgba(241, 245, 249, 1);
  border-color: #CBD5E1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.user-pill:active {
  background: rgba(241, 245, 249, 1);
  border-color: #CBD5E1;
}

.user-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3B82F6, #2563EB);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  font-family: 'Poppins', sans-serif;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.25);
}

.user-name {
  font-size: 12px;
  font-weight: 500;
  color: #1E293B;
  font-family: 'Open Sans', sans-serif;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ===== 用户下拉菜单 ===== */
.user-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 220px;
  background: white;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.04);
  z-index: 200;
  overflow: hidden;
}

.dropdown-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.04), rgba(96, 165, 250, 0.02));
}

.dropdown-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3B82F6, #2563EB);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  font-family: 'Poppins', sans-serif;
  flex-shrink: 0;
}

.dropdown-user-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.dropdown-username {
  font-size: 13px;
  font-weight: 600;
  color: #0F172A;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-role {
  font-size: 11px;
  color: #94A3B8;
  font-weight: 500;
}

.dropdown-divider {
  height: 1px;
  background: #F1F5F9;
  margin: 0;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 11px 16px;
  font-size: 13px;
  font-weight: 500;
  color: #475569;
  background: none;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease-out;
  text-decoration: none;
  font-family: 'Open Sans', sans-serif;
  -webkit-tap-highlight-color: transparent;
}

.dropdown-item:hover {
  background: #F8FAFC;
  color: #1E293B;
}

.dropdown-item:active {
  background: #F1F5F9;
}

.dropdown-item-danger:hover {
  background: rgba(239, 68, 68, 0.06);
  color: #EF4444;
}

.dropdown-item-danger:active {
  background: rgba(239, 68, 68, 0.1);
}

/* 菜单弹出动画 */
.menu-fade-enter-active {
  transition: opacity 0.15s ease-out, transform 0.15s ease-out;
}
.menu-fade-leave-active {
  transition: opacity 0.1s ease-in, transform 0.1s ease-in;
}
.menu-fade-enter-from {
  opacity: 0;
  transform: translateY(-6px) scale(0.96);
}
.menu-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}

/* 点击遮罩 */
.menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 150;
}

/* ===== 平板 768px+ ===== */
@media (min-width: 768px) {
  .header-inner {
    padding: 0 24px;
    height: 56px;
  }

  .brand-logo {
    width: 34px;
    height: 34px;
    border-radius: 10px;
  }

  /* 显示品牌文字 */
  .brand-text-group {
    display: flex;
  }

  .brand {
    gap: 10px;
  }

  /* 显示分隔线 */
  .header-divider {
    display: block;
  }

  /* 显示导航 */
  .header-nav {
    display: flex;
    margin-left: 0;
    gap: 6px;
  }

  .nav-item {
    padding: 7px 12px;
    gap: 5px;
    font-size: 13px;
  }

  .nav-item.active::after {
    width: 16px;
  }

  .login-btn {
    padding: 7px 16px;
    font-size: 13px;
    gap: 6px;
  }

  .user-avatar {
    width: 28px;
    height: 28px;
    font-size: 11px;
  }

  .user-name {
    font-size: 13px;
    max-width: 100px;
  }
}

/* ===== 桌面 1024px+ ===== */
@media (min-width: 1024px) {
  .header-inner {
    height: 64px;
  }

  .brand-logo {
    width: 40px;
    height: 40px;
    border-radius: 12px;
  }

  .brand-logo svg {
    width: 24px;
    height: 24px;
  }

  .brand-name {
    font-size: 17px;
  }

  .brand-tagline {
    font-size: 11px;
    margin-top: 3px;
  }

  .header-divider {
    margin: 0 20px;
  }

  .nav-item {
    padding: 8px 16px;
    font-size: 14px;
  }

  .nav-item.active::after {
    width: 18px;
  }

  .login-btn {
    padding: 9px 22px;
    font-size: 14px;
    gap: 7px;
  }
}

/* ===== 减少动画偏好 ===== */
@media (prefers-reduced-motion: reduce) {
  .brand-logo,
  .nav-item,
  .nav-icon-wrap,
  .user-pill,
  .dropdown-item,
  .login-btn {
    transition: none;
  }
  .brand:hover .brand-logo {
    transform: none;
  }
  .nav-item:hover .nav-icon-wrap {
    transform: none;
  }
  .login-btn:hover {
    transform: none;
  }
}
</style>
