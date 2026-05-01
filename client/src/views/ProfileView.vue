<template>
  <div class="profile-view">
    <section class="profile-section">
      <div class="section-container">
        <!-- 页面标题 -->
        <div class="page-header">
          <div class="header-left">
            <span class="title-bar"></span>
            <h1 class="page-title">个人中心</h1>
          </div>
        </div>

        <!-- 用户信息卡片 -->
        <div class="profile-card">
          <!-- 头像区域 -->
          <div class="avatar-section">
            <div class="avatar-wrapper">
              <div class="avatar-image">
                {{ userStore.user?.username?.[0]?.toUpperCase() || 'U' }}
              </div>
              <button class="avatar-upload-btn" @click="handleAvatarUpload">
                <n-icon :size="14"><camera-outline></camera-outline></n-icon>
              </button>
            </div>
            <div class="avatar-info">
              <h3 class="avatar-username">{{ userStore.user?.username }}</h3>
              <span class="avatar-joined">加入于 {{ joinDate }}</span>
            </div>
          </div>

          <div class="profile-divider"></div>

          <!-- 设置表单 -->
          <div class="settings-section">
            <!-- 修改密码 -->
            <div class="setting-group" @click="passwordFormExpanded = !passwordFormExpanded">
              <div class="setting-header">
                <div class="setting-icon-wrap">
                  <n-icon :size="18" color="#3B82F6"><key-outline></key-outline></n-icon>
                </div>
                <div class="setting-info">
                  <h4 class="setting-title">修改密码</h4>
                  <p class="setting-desc">定期更新密码以保护账户安全</p>
                </div>
              </div>
              <div class="setting-arrow" :class="{ expanded: passwordFormExpanded }">
                <n-icon :size="18"><chevron-down-outline></chevron-down-outline></n-icon>
              </div>
            </div>

            <n-collapse-transition :show="passwordFormExpanded">
              <div class="setting-form">
                <n-form ref="passwordFormRef" :model="passwordForm" :rules="passwordRules" :show-label="false">
                  <n-form-item path="oldPassword">
                    <n-input
                      v-model:value="passwordForm.oldPassword"
                      type="password"
                      placeholder="当前密码"
                      size="large"
                      show-password-on="click"
                      :disabled="passwordLoading"
                    >
                      <template #prefix>
                        <n-icon :size="18" color="#94A3B8"><lock-closed-outline></lock-closed-outline></n-icon>
                      </template>
                    </n-input>
                  </n-form-item>
                  <n-form-item>
                    <n-input
                      v-model:value="passwordForm.newPassword"
                      type="password"
                      placeholder="新密码（至少6位）"
                      size="large"
                      show-password-on="click"
                      :disabled="passwordLoading"
                    >
                      <template #prefix>
                        <n-icon :size="18" color="#94A3B8"><lock-closed-outline></lock-closed-outline></n-icon>
                      </template>
                    </n-input>
                  </n-form-item>
                  <n-form-item>
                    <n-input
                      v-model:value="passwordForm.confirmPassword"
                      type="password"
                      placeholder="确认新密码"
                      size="large"
                      show-password-on="click"
                      :disabled="passwordLoading"
                    >
                      <template #prefix>
                        <n-icon :size="18" color="#94A3B8"><lock-closed-outline></lock-closed-outline></n-icon>
                      </template>
                    </n-input>
                  </n-form-item>
                  <n-button
                    type="primary"
                    size="large"
                    block
                    :loading="passwordLoading"
                    @click="handlePasswordChange"
                    class="setting-submit"
                  >
                    更新密码
                  </n-button>
                </n-form>
              </div>
            </n-collapse-transition>

            <div class="setting-divider"></div>

            <!-- 退出登录 -->
            <div class="setting-group setting-group-danger">
              <div class="setting-header">
                <div class="setting-icon-wrap icon-wrap-danger">
                  <n-icon :size="18" color="#EF4444"><log-out-outline></log-out-outline></n-icon>
                </div>
                <div class="setting-info">
                  <h4 class="setting-title">退出登录</h4>
                  <p class="setting-desc">退出当前账号</p>
                </div>
              </div>
              <n-button
                text
                type="error"
                @click="handleLogout"
                class="setting-action"
              >
                退出
              </n-button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 移动端底部安全距离 -->
    <div class="bottom-spacer"></div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  NButton, NIcon, NForm, NFormItem, NInput, NCollapseTransition, useMessage, useDialog
} from 'naive-ui'
import {
  LockClosedOutline, KeyOutline, LogOutOutline,
  CameraOutline, ChevronDownOutline
} from '@vicons/ionicons5'
import { useUserStore } from '@/stores/user'
import { userApi } from '@/api'

const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const userStore = useUserStore()

const passwordFormExpanded = ref(false)
const passwordLoading = ref(false)

const passwordFormRef = ref(null)

const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const joinDate = computed(() => {
  if (!userStore.user?.createdAt) return '未知'
  const date = new Date(userStore.user.createdAt)
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })
})

const passwordRules = {
  oldPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' },
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '至少6位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (rule, value) => value === passwordForm.value.newPassword,
      message: '两次密码不一致',
      trigger: 'blur',
    },
  ],
}

function handleAvatarUpload() {
  message.info('头像上传功能开发中')
}

async function handlePasswordChange() {
  try {
    await passwordFormRef.value?.validate()
  } catch { return }

  passwordLoading.value = true
  try {
    await userApi.changePassword(passwordForm.value.oldPassword, passwordForm.value.newPassword)
    message.success('密码修改成功')
    passwordFormExpanded.value = false
    passwordForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
  } catch (error) {
    const errData = error.response?.data
    message.error(errData?.error || error.message || '修改失败')
  } finally {
    passwordLoading.value = false
  }
}

function handleLogout() {
  dialog.warning({
    title: '退出登录',
    content: '确定要退出登录吗？',
    positiveText: '退出',
    negativeText: '取消',
    onPositiveClick: async () => {
      await userStore.logout()
      message.info('已退出登录')
      router.push({ name: 'Home' })
    },
  })
}
</script>

<style scoped>
/* ===== 页面容器 ===== */
.profile-view {
  min-height: 100vh;
}

.profile-section {
  padding: 12px 0 0;
}

.section-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 16px;
}

/* ===== 页面标题 ===== */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-bar {
  display: inline-block;
  width: 3px;
  height: 18px;
  border-radius: 2px;
  background: linear-gradient(180deg, #3B82F6, #60A5FA);
}

.page-title {
  font-family: 'Poppins', sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: #0F172A;
  line-height: 1;
}

/* ===== 主卡片 ===== */
.profile-card {
  background: white;
  border-radius: 16px;
  border: 1px solid #F1F5F9;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  margin-bottom: 16px;
}

/* ===== 头像区域 ===== */
.avatar-section {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 16px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.04), rgba(96, 165, 250, 0.02));
}

.avatar-wrapper {
  position: relative;
  flex-shrink: 0;
}

.avatar-image {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3B82F6, #2563EB);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  font-family: 'Poppins', sans-serif;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.3);
}

.avatar-upload-btn {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid white;
  background: #3B82F6;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease-out;
}

.avatar-upload-btn:hover {
  background: #2563EB;
  transform: scale(1.1);
}

.avatar-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.avatar-username {
  font-size: 16px;
  font-weight: 700;
  color: #0F172A;
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.avatar-joined {
  font-size: 12px;
  color: #94A3B8;
  font-weight: 500;
}

/* ===== 分隔线 ===== */
.profile-divider {
  height: 1px;
  background: #F1F5F9;
  margin: 0;
}

/* ===== 设置区域 ===== */
.settings-section {
  padding: 8px 0;
}

.setting-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  cursor: pointer;
  transition: background 0.15s ease-out;
  -webkit-tap-highlight-color: transparent;
}

.setting-group:hover {
  background: #F8FAFC;
}

.setting-header {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.setting-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgba(59, 130, 246, 0.08);
  flex-shrink: 0;
}

.setting-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.setting-title {
  font-size: 14px;
  font-weight: 600;
  color: #0F172A;
  margin-bottom: 2px;
}

.setting-desc {
  font-size: 12px;
  color: #94A3B8;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.setting-action {
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.setting-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  color: #94A3B8;
  transition: all 0.2s ease-out;
  flex-shrink: 0;
}

.setting-arrow.expanded {
  color: #3B82F6;
  transform: rotate(180deg);
}

/* 危险操作样式 */
.setting-group-danger:hover {
  background: rgba(239, 68, 68, 0.04);
}

.icon-wrap-danger {
  background: rgba(239, 68, 68, 0.08);
}

/* ===== 设置表单 ===== */
.setting-form {
  padding: 0 16px 16px;
  background: #F8FAFC;
  border-top: 1px solid #F1F5F9;
  margin-top: 8px;
}

.setting-submit {
  border-radius: 10px;
  font-weight: 600;
  height: 42px;
}

.setting-divider {
  height: 1px;
  background: #F1F5F9;
  margin: 8px 0;
}

/* ===== 底部间距 ===== */
.bottom-spacer {
  height: 68px;
}

/* ===== 桌面端响应式 ===== */
@media (min-width: 768px) {
  .section-container {
    padding: 0 24px;
  }

  .profile-section {
    padding: 24px 0 0;
  }

  .page-header {
    margin-bottom: 20px;
  }

  .page-title {
    font-size: 24px;
  }

  .title-bar {
    height: 20px;
  }

  .profile-card {
    border-radius: 20px;
    padding-bottom: 8px;
  }

  .avatar-section {
    padding: 28px 24px;
  }

  .avatar-image {
    width: 72px;
    height: 72px;
    font-size: 28px;
  }

  .avatar-username {
    font-size: 18px;
  }

  .avatar-joined {
    font-size: 13px;
  }

  .setting-group {
    padding: 16px 20px;
  }

  .setting-title {
    font-size: 15px;
  }

  .setting-desc {
    font-size: 13px;
  }

  .setting-form {
    padding: 0 20px 20px;
  }

  .bottom-spacer {
    height: 24px;
  }
}

/* ===== 减少动画偏好 ===== */
@media (prefers-reduced-motion: reduce) {
  .avatar-upload-btn,
  .setting-group {
    transition: none;
  }
  .avatar-upload-btn:hover {
    transform: none;
  }
}
</style>
