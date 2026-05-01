<template>
  <div class="dashboard" :class="{ 'light-theme': !isDark }">
    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(59,130,246,0.15);">
          <n-icon size="24" color="#60A5FA"><GridOutline /></n-icon>
        </div>
        <div class="stat-info">
          <span class="stat-label">商品总数</span>
          <span class="stat-value">{{ stats?.productCount || 0 }}</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(249,115,22,0.15);">
          <n-icon size="24" color="#FB923C"><ReceiptOutline /></n-icon>
        </div>
        <div class="stat-info">
          <span class="stat-label">今日订单</span>
          <span class="stat-value">{{ stats?.todayOrderCount || 0 }}</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(16,185,129,0.15);">
          <n-icon size="24" color="#34D399"><PeopleOutline /></n-icon>
        </div>
        <div class="stat-info">
          <span class="stat-label">用户总数</span>
          <span class="stat-value">{{ stats?.userCount || 0 }}</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(168,85,247,0.15);">
          <n-icon size="24" color="#C084FC"><WalletOutline /></n-icon>
        </div>
        <div class="stat-info">
          <span class="stat-label">今日收入</span>
          <span class="stat-value">¥{{ stats?.todayRevenue || 0 }}</span>
        </div>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="data-grid">
      <div class="data-card">
        <h3 class="card-title">待处理订单</h3>
        <n-empty v-if="!pendingOrders.length" description="暂无待处理订单" />
        <n-data-table v-else :columns="orderColumns" :data="pendingOrders" :bordered="false" size="small" />
      </div>
      <div class="data-card">
        <h3 class="card-title">库存不足商品</h3>
        <n-empty v-if="!lowStockProducts.length" description="库存充足" />
        <n-data-table v-else :columns="productColumns" :data="lowStockProducts" :bordered="false" size="small" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, h, onMounted } from 'vue'
import { NIcon, NDataTable, NEmpty, NTag, useMessage } from 'naive-ui'
import { GridOutline, ReceiptOutline, PeopleOutline, WalletOutline } from '@vicons/ionicons5'
import { useAdminStore } from '@/stores/admin'
import { useTheme } from '@/composables/useTheme'

const adminStore = useAdminStore()
const { isDark } = useTheme()
const message = useMessage()
const stats = ref(null)
const pendingOrders = ref([])
const lowStockProducts = ref([])

const orderColumns = [
  { title: '订单号', key: 'orderNo', ellipsis: { tooltip: true } },
  { title: '金额', key: 'amount', width: 100, render: (row) => `¥${row.amount || 0}` },
  { title: '状态', key: 'status', width: 100, render: (row) => h(NTag, { type: 'warning', size: 'small' }, () => row.status) },
]

const productColumns = [
  { title: '商品', key: 'name', ellipsis: { tooltip: true } },
  { title: '库存', key: 'stock', width: 80, render: (row) => h(NTag, { type: 'error', size: 'small' }, () => row.stock) },
]

onMounted(async () => {
  try {
    stats.value = await adminStore.fetchStats()
    pendingOrders.value = stats.value?.pendingOrders || []
    lowStockProducts.value = stats.value?.lowStockProducts || []
  } catch (e) {
    message.error('仪表盘数据加载失败')
  }
})
</script>

<style scoped>
.dashboard {
  max-width: 1400px;
}

/* ===== 统计卡片网格 ===== */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  background: #0F172A;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: transform 0.2s, border-color 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  border-color: rgba(59, 130, 246, 0.3);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  color: #94A3B8;
  font-size: 13px;
}

.stat-value {
  color: #F1F5F9;
  font-size: 24px;
  font-weight: 700;
  font-family: Poppins, sans-serif;
}

/* ===== 数据卡片网格 ===== */
.data-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.data-card {
  background: #0F172A;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.card-title {
  color: #F1F5F9;
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px 0;
  font-family: Poppins, sans-serif;
}

/* ===== 浅色主题 ===== */
.light-theme .stat-card {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
}

.light-theme .stat-card:hover {
  border-color: rgba(59, 130, 246, 0.3);
}

.light-theme .stat-label {
  color: #64748B;
}

.light-theme .stat-value {
  color: #1E293B;
}

.light-theme .data-card {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
}

.light-theme .card-title {
  color: #1E293B;
}

/* ===== 移动端适配 ===== */
@media (max-width: 767px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .stat-card {
    padding: 14px;
    gap: 10px;
  }

  .stat-icon {
    width: 40px;
    height: 40px;
  }

  .stat-value {
    font-size: 18px;
  }

  .data-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
