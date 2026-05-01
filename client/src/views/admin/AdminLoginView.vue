<template>
  <div class="admin-login" :class="{ 'light-theme': !isDark }">
    <!-- 主题切换按钮 -->
    <n-button quaternary circle size="small" class="login-theme-toggle" @click="toggleTheme">
      <template #icon>
        <n-icon size="20">
          <SunnyOutline v-if="isDark"></SunnyOutline>
          <MoonOutline v-else></MoonOutline>
        </n-icon>
      </template>
    </n-button>
    <div class="login-card">
      <div class="login-header">
        <n-icon size="40" :color="isDark ? '#60A5FA' : '#3B82F6'"><FlashOutline /></n-icon>
        <h1>后台管理</h1>
        <p>请登录管理员账号</p>
      </div>
      <n-form ref="formRef" :model="form" :rules="rules">
        <n-form-item path="username" label="用户名">
          <n-input v-model:value="form.username" placeholder="请输入管理员用户名" size="large" @keyup.enter="handleLogin">
            <template #prefix><n-icon><PersonOutline /></n-icon></template>
          </n-input>
        </n-form-item>
        <n-form-item path="password" label="密码">
          <n-input v-model:value="form.password" type="password" placeholder="请输入密码" show-password-on="click" size="large" @keyup.enter="handleLogin">
            <template #prefix><n-icon><LockClosedOutline /></n-icon></template>
          </n-input>
        </n-form-item>

        <!-- Cloudflare Turnstile 验证码 -->
        <n-form-item :show-label="false">
          <div ref="turnstileRef" class="turnstile-container"></div>
        </n-form-item>

        <n-button type="primary" block size="large" :loading="loading" @click="handleLogin">
          登录
        </n-button>
      </n-form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { NForm, NFormItem, NInput, NButton, NIcon, useMessage } from 'naive-ui'
import { FlashOutline, PersonOutline, LockClosedOutline, SunnyOutline, MoonOutline } from '@vicons/ionicons5'
import { useAdminStore } from '@/stores/admin'
import { useTheme } from '@/composables/useTheme'

const router = useRouter()
const route = useRoute()
const message = useMessage()
const adminStore = useAdminStore()
const { isDark, toggleTheme } = useTheme()

const formRef = ref(null)
const loading = ref(false)
const form = ref({ username: '', password: '' })
const turnstileRef = ref(null)
const turnstileToken = ref(null)
const turnstileWidgetId = ref(null)

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

// Turnstile Site Key
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'

// 初始化 Turnstile
onMounted(() => {
  if (window.turnstile && turnstileRef.value) {
    turnstileWidgetId.value = window.turnstile.render(turnstileRef.value, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: (token) => {
        turnstileToken.value = token
      },
      'error-callback': () => {
        turnstileToken.value = null
        message.warning('人机验证加载失败，请刷新页面重试')
      },
      'expired-callback': () => {
        turnstileToken.value = null
        message.warning('验证已过期，请重新验证')
      },
    })
  }
})

// 清理 Turnstile
onUnmounted(() => {
  if (turnstileWidgetId.value && window.turnstile) {
    window.turnstile.remove(turnstileWidgetId.value)
  }
})

async function handleLogin() {
  try {
    await formRef.value?.validate()
  } catch { return }

  if (!turnstileToken.value) {
    message.warning('请完成人机验证')
    return
  }

  loading.value = true
  try {
    await adminStore.login(form.value.username, form.value.password, turnstileToken.value)
    message.success('登录成功')
    const redirect = route.query.redirect || '/admin'
    router.push(redirect)
  } catch (error) {
    message.error(error.response?.data?.error || '登录失败')
    // 登录失败，重置 Turnstile
    if (window.turnstile && turnstileWidgetId.value) {
      window.turnstile.reset(turnstileWidgetId.value)
      turnstileToken.value = null
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* ===== 深色主题（默认） ===== */
.admin-login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  position: relative;
}

.login-theme-toggle {
  position: absolute;
  top: 20px;
  right: 20px;
  color: #94A3B8;
}
.login-theme-toggle:hover {
  color: #F1F5F9;
}

.login-card {
  width: 100%;
  max-width: 420px;
  padding: 40px 32px;
  background: #1E293B;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-header h1 {
  margin: 12px 0 4px;
  font-size: 24px;
  font-weight: 700;
  color: #F1F5F9;
  font-family: Poppins, sans-serif;
}

.login-header p {
  color: #94A3B8;
  font-size: 14px;
}

.turnstile-container {
  display: flex;
  justify-content: center;
  width: 100%;
  margin-top: 4px;
  min-height: 65px;
}

/* ===== 浅色主题 ===== */
.admin-login.light-theme {
  background: #F1F5F9;
}

.admin-login.light-theme .login-theme-toggle {
  color: #64748B;
}
.admin-login.light-theme .login-theme-toggle:hover {
  color: #1E293B;
}

.admin-login.light-theme .login-card {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.08);
}

.admin-login.light-theme .login-header h1 {
  color: #1E293B;
}

.admin-login.light-theme .login-header p {
  color: #64748B;
}

@media (max-width: 480px) {
  .login-card {
    padding: 28px 20px;
  }
}
</style>
