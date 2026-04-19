<template>
  <n-layout has-sider class="admin-layout" :class="{ 'light-theme': !isDark }">
    <!-- 移动端遮罩 -->
    <div v-if="mobileMenuOpen" class="mobile-overlay" @click="mobileMenuOpen = false"></div>

    <!-- 侧边栏：桌面端固定 / 移动端抽屉 -->
    <n-layout-sider
      bordered
      collapse-mode="width"
      :collapsed-width="64"
      :width="220"
      :collapsed="collapsed"
      show-trigger
      @collapse="collapsed = true"
      @expand="collapsed = false"
      :native-scrollbar="false"
      :class="['admin-sider', { 'mobile-sider': isMobile, 'mobile-sider-open': mobileMenuOpen }]"
    >
      <div class="sider-header">
        <n-icon size="24" :color="isDark ? '#60A5FA' : '#3B82F6'"><FlashOutline /></n-icon>
        <span v-if="!collapsed" class="sider-title">后台管理</span>
      </div>
      <n-menu
        :collapsed="collapsed"
        :collapsed-width="64"
        :collapsed-icon-size="22"
        :options="menuOptions"
        :value="activeKey"
        @update:value="handleMenuClick"
        :inverted="isDark"
      />
    </n-layout-sider>

    <n-layout class="admin-main">
      <n-layout-header bordered class="admin-header">
        <div class="header-left">
          <!-- 移动端汉堡菜单 -->
          <n-button quaternary class="mobile-menu-btn" @click="mobileMenuOpen = !mobileMenuOpen">
            <template #icon><n-icon size="20"><MenuOutline /></n-icon></template>
          </n-button>
          <span class="header-title">{{ currentMenuLabel }}</span>
        </div>
        <div class="header-right">
          <!-- 主题切换 -->
          <n-button quaternary circle size="small" @click="toggleTheme" class="theme-toggle">
            <template #icon>
              <n-icon size="18">
                <SunnyOutline v-if="isDark"></SunnyOutline>
                <MoonOutline v-else></MoonOutline>
              </n-icon>
            </template>
          </n-button>
          <n-dropdown :options="userDropdownOptions" @select="handleUserAction">
            <n-button quaternary size="small">
              <template #icon><n-icon><PersonOutline /></n-icon></template>
              {{ adminStore.adminInfo?.username || '管理员' }}
            </n-button>
          </n-dropdown>
        </div>
      </n-layout-header>
      <n-layout-content class="admin-content">
        <router-view />
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<script setup>
import { ref, computed, h, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NLayout, NLayoutSider, NLayoutHeader, NLayoutContent,
  NMenu, NIcon, NButton, NDropdown, useMessage, useDialog
} from 'naive-ui'
import {
  FlashOutline, GridOutline, KeyOutline,
  ReceiptOutline, PeopleOutline, ShieldOutline,
  PhonePortraitOutline, DocumentTextOutline, SpeedometerOutline,
  AppsOutline, MenuOutline, PersonOutline,
  SunnyOutline, MoonOutline
} from '@vicons/ionicons5'
import { useAdminStore } from '@/stores/admin'
import { useTheme } from '@/composables/useTheme'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const adminStore = useAdminStore()
const { isDark, toggleTheme } = useTheme()

const collapsed = ref(false)
const isMobile = ref(false)
const mobileMenuOpen = ref(false)

// 响应式检测
function checkMobile() {
  isMobile.value = window.innerWidth < 768
  if (isMobile.value) {
    collapsed.value = true
    mobileMenuOpen.value = false
  }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})
onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

const menuMap = {
  dashboard: { label: '仪表盘', icon: SpeedometerOutline },
  products: { label: '商品管理', icon: GridOutline },
  categories: { label: '类别管理', icon: AppsOutline },
  cardKeys: { label: '卡密管理', icon: KeyOutline },
  orders: { label: '订单管理', icon: ReceiptOutline },
  users: { label: '用户管理', icon: PeopleOutline },
  admins: { label: '管理员管理', icon: ShieldOutline },
  smsRecords: { label: '接码记录', icon: PhonePortraitOutline },
  logs: { label: '日志管理', icon: DocumentTextOutline },
  rateLimits: { label: '速率限制', icon: SpeedometerOutline },
}

const menuOptions = Object.entries(menuMap).map(([key, val]) => ({
  label: val.label,
  key,
  icon: () => h(NIcon, null, () => h(val.icon)),
}))

const activeKey = computed(() => {
  const path = route.path
  if (path.includes('/admin/products')) return 'products'
  if (path.includes('/admin/categories')) return 'categories'
  if (path.includes('/admin/card-keys')) return 'cardKeys'
  if (path.includes('/admin/orders')) return 'orders'
  if (path.includes('/admin/users')) return 'users'
  if (path.includes('/admin/admins')) return 'admins'
  if (path.includes('/admin/sms-records')) return 'smsRecords'
  if (path.includes('/admin/logs')) return 'logs'
  if (path.includes('/admin/rate-limits')) return 'rateLimits'
  return 'dashboard'
})

const currentMenuLabel = computed(() => menuMap[activeKey.value]?.label || '仪表盘')

function handleMenuClick(key) {
  const routeMap = {
    dashboard: '/admin',
    products: '/admin/products',
    categories: '/admin/categories',
    cardKeys: '/admin/card-keys',
    orders: '/admin/orders',
    users: '/admin/users',
    admins: '/admin/admins',
    smsRecords: '/admin/sms-records',
    logs: '/admin/logs',
    rateLimits: '/admin/rate-limits',
  }
  router.push(routeMap[key] || '/admin')
  // 移动端点击菜单后关闭侧边栏
  if (isMobile.value) mobileMenuOpen.value = false
}

const userDropdownOptions = [
  { label: '修改密码', key: 'changePassword' },
  { label: '退出登录', key: 'logout' },
]

function handleUserAction(key) {
  if (key === 'logout') {
    dialog.warning({
      title: '确认退出',
      content: '确定要退出登录吗？',
      positiveText: '退出',
      negativeText: '取消',
      onPositiveClick: () => {
        adminStore.logout()
        router.push('/admin/login')
        message.success('已退出登录')
      },
    })
  } else if (key === 'changePassword') {
    message.info('修改密码功能开发中')
  }
}
</script>

<style scoped>
/* ===== 深色主题（默认） ===== */
.admin-layout {
  height: 100vh;
  background: #0F172A;
}

.admin-sider {
  background: #0F172A !important;
  border-right: 1px solid rgba(255, 255, 255, 0.06) !important;
  z-index: 100;
}

.sider-header {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.sider-title {
  color: #F1F5F9;
  font-weight: 700;
  font-size: 16px;
  font-family: Poppins, sans-serif;
}

.admin-main {
  background: #1E293B;
}

.admin-header {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: #1E293B;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-title {
  color: #F1F5F9;
  font-size: 16px;
  font-weight: 600;
  font-family: Poppins, sans-serif;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.admin-content {
  background: #1E293B;
  padding: 20px;
  overflow-y: auto;
}

.theme-toggle {
  color: #94A3B8;
}
.theme-toggle:hover {
  color: #F1F5F9;
}

/* ===== 浅色主题 ===== */
.admin-layout.light-theme {
  background: #F1F5F9;
}

.admin-layout.light-theme .admin-sider {
  background: #FFFFFF !important;
  border-right: 1px solid #E2E8F0 !important;
}

.admin-layout.light-theme .sider-header {
  border-bottom: 1px solid #E2E8F0;
}

.admin-layout.light-theme .sider-title {
  color: #1E293B;
}

.admin-layout.light-theme .admin-main {
  background: #F1F5F9;
}

.admin-layout.light-theme .admin-header {
  background: #FFFFFF;
  border-bottom: 1px solid #E2E8F0;
}

.admin-layout.light-theme .header-title {
  color: #1E293B;
}

.admin-layout.light-theme .admin-content {
  background: #F1F5F9;
}

.admin-layout.light-theme .theme-toggle {
  color: #64748B;
}
.admin-layout.light-theme .theme-toggle:hover {
  color: #1E293B;
}

.admin-layout.light-theme .mobile-menu-btn {
  color: #1E293B;
}

/* ===== 移动端适配 ===== */
.mobile-menu-btn {
  display: none;
  color: #F1F5F9;
}

.mobile-overlay {
  display: none;
}

@media (max-width: 767px) {
  .mobile-menu-btn {
    display: flex;
  }

  .mobile-overlay {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 99;
  }

  .mobile-sider {
    position: fixed !important;
    top: 0;
    left: 0;
    bottom: 0;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    z-index: 100;
  }

  .mobile-sider-open {
    transform: translateX(0);
  }

  .admin-content {
    padding: 12px;
  }

  .header-title {
    font-size: 14px;
  }
}

@media (min-width: 768px) and (max-width: 1024px) {
  .admin-content {
    padding: 16px;
  }
}
</style>
