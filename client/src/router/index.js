import { createRouter, createWebHistory } from 'vue-router'

// 前台布局
const ClientLayout = () => import('@/components/ClientLayout.vue')
// Admin 布局（登录页独占，不走 AdminLayout）
const AdminLayout = () => import('@/components/admin/AdminLayout.vue')

const routes = [
  // ===== 前台客户端（有 header） =====
  {
    path: '/',
    component: ClientLayout,
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('@/views/HomeView.vue'),
        meta: { title: '首页' },
      },
      {
        path: 'product/:id',
        name: 'ProductDetail',
        component: () => import('@/views/ProductDetailView.vue'),
        meta: { title: '商品详情' },
      },
      {
        path: 'sms',
        name: 'Sms',
        component: () => import('@/views/SmsView.vue'),
        meta: { title: '接码平台' },
      },
      {
        path: 'orders',
        name: 'Orders',
        component: () => import('@/views/OrdersView.vue'),
        meta: { title: '我的订单' },
      },
    ],
  },
  // ===== Admin 登录（独立页面，无侧边栏） =====
  {
    path: '/admin/login',
    name: 'AdminLogin',
    component: () => import('@/views/admin/AdminLoginView.vue'),
    meta: { title: '管理员登录' },
  },
  // ===== Admin 后台（侧边栏布局） =====
  {
    path: '/admin',
    component: AdminLayout,
    meta: { title: '后台管理', requiresAdmin: true },
    children: [
      {
        path: '',
        name: 'AdminDashboard',
        component: () => import('@/views/admin/DashboardView.vue'),
        meta: { title: '仪表盘' },
      },
      {
        path: 'products',
        name: 'AdminProducts',
        component: () => import('@/views/admin/ProductsView.vue'),
        meta: { title: '商品管理' },
      },
      {
        path: 'categories',
        name: 'AdminCategories',
        component: () => import('@/views/admin/CategoriesView.vue'),
        meta: { title: '类别管理' },
      },
      {
        path: 'card-keys',
        name: 'AdminCardKeys',
        component: () => import('@/views/admin/CardKeysView.vue'),
        meta: { title: '卡密管理' },
      },
      {
        path: 'orders',
        name: 'AdminOrders',
        component: () => import('@/views/admin/OrdersView.vue'),
        meta: { title: '订单管理' },
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('@/views/admin/UsersView.vue'),
        meta: { title: '用户管理' },
      },
      {
        path: 'admins',
        name: 'AdminAdmins',
        component: () => import('@/views/admin/AdminAdminsView.vue'),
        meta: { title: '管理员管理' },
      },
      {
        path: 'sms-records',
        name: 'AdminSmsRecords',
        component: () => import('@/views/admin/SmsRecordsView.vue'),
        meta: { title: '接码记录' },
      },
      {
        path: 'logs',
        name: 'AdminLogs',
        component: () => import('@/views/admin/LogsView.vue'),
        meta: { title: '日志管理' },
      },
      {
        path: 'rate-limits',
        name: 'AdminRateLimits',
        component: () => import('@/views/admin/RateLimitsView.vue'),
        meta: { title: '速率限制' },
      },
    ],
  },
  // 404
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: '页面不存在' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 更新页面标题
  document.title = `${to.meta.title || '工具商店'} - 工具商店`

  // 前台需要登录的页面
  if (to.meta.requiresAuth) {
    const user = JSON.parse(localStorage.getItem('user') || 'null')
    if (!user) {
      next({ name: 'Home', query: { redirect: to.fullPath } })
      return
    }
  }

  // Admin 后台需要管理员登录
  if (to.meta.requiresAdmin) {
    const adminToken = localStorage.getItem('admin_token')
    if (!adminToken) {
      next({ name: 'AdminLogin', query: { redirect: to.fullPath } })
      return
    }
  }

  // Admin 登录页已登录则跳转后台
  if (to.name === 'AdminLogin') {
    const adminToken = localStorage.getItem('admin_token')
    if (adminToken) {
      next({ name: 'AdminDashboard' })
      return
    }
  }

  next()
})

export default router
