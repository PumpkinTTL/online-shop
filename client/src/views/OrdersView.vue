<template>
  <div class="orders-view">
    <div class="container">
      <n-h2>我的订单</n-h2>
      <n-spin :show="orderStore.loading">
        <n-data-table :columns="columns" :data="orderStore.orders" :bordered="false" />
        <n-empty v-if="!orderStore.loading && orderStore.orders.length === 0" description="暂无订单" />
      </n-spin>
    </div>
  </div>
</template>

<script setup>
import { h, onMounted } from 'vue'
import { NH2, NDataTable, NSpin, NEmpty, NTag } from 'naive-ui'
import { useOrderStore } from '@/stores/order'
import { useUserStore } from '@/stores/user'

const orderStore = useOrderStore()
const userStore = useUserStore()

const columns = [
  { title: '订单号', key: 'orderNo', ellipsis: { tooltip: true } },
  { title: '金额', key: 'amount', width: 100, render: (row) => h('span', { style: 'color:#EF4444;font-weight:600' }, `¥${row.amount}`) },
  { title: '状态', key: 'status', width: 100, render: (row) => h(NTag, { type: row.status === 'completed' ? 'success' : 'warning', size: 'small' }, () => row.status === 'completed' ? '已完成' : '待处理') },
  { title: '创建时间', key: 'createdAt', width: 180 },
]

onMounted(async () => {
  if (userStore.user?.id) {
    await orderStore.fetchOrders(userStore.user.id)
  }
})
</script>

<style scoped>
.orders-view {
  padding: 24px 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px 72px 24px;
}

@media (min-width: 768px) {
  .container {
    padding-bottom: 24px;
  }
}
</style>
