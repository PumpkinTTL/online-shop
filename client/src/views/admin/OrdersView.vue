<template>
  <div class="orders-view">
    <div class="admin-page-header">
      <h2 class="admin-page-title">订单管理</h2>
      <div class="admin-page-actions">
        <n-select v-model:value="filterStatus" :options="statusOptions" placeholder="按状态筛选" clearable style="width:140px" @update:value="handleFilter" />
      </div>
    </div>

    <div class="admin-table-card">
      <n-data-table
        :columns="columns"
        :data="adminStore.orders"
        :bordered="false"
        :loading="loading"
        :row-key="row => row.id"
        v-model:checked-row-keys="selectedKeys"
      />
      <div class="admin-pagination">
        <n-button type="error" size="small" :disabled="!selectedKeys.length" @click="handleBatchDelete">
          批量删除 ({{ selectedKeys.length }})
        </n-button>
        <n-pagination
          v-model:page="currentPage"
          v-model:page-size="pageSize"
          :item-count="adminStore.ordersTotal"
          :page-sizes="[10, 20, 50]"
          show-size-picker
          @update:page="loadData"
          @update:page-size="handlePageSizeChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, h, onMounted } from 'vue'
import {
  NButton, NDataTable, NPagination, NSelect,
  NSpace, NTag, useMessage, useDialog
} from 'naive-ui'
import { useAdminStore } from '@/stores/admin'

const adminStore = useAdminStore()
const message = useMessage()
const dialog = useDialog()

const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const selectedKeys = ref([])
const filterStatus = ref(null)

const statusOptions = [
  { label: '待处理', value: 'pending' },
  { label: '已完成', value: 'completed' },
  { label: '已关闭', value: 'closed' },
]

const statusMap = { pending: 'warning', completed: 'success', closed: 'default' }
const statusLabel = { pending: '待处理', completed: '已完成', closed: '已关闭' }

const columns = [
  { type: 'selection' },
  { title: 'ID', key: 'id', width: 60 },
  { title: '订单号', key: 'orderNo', ellipsis: { tooltip: true } },
  { title: '金额', key: 'amount', width: 100, render: (row) => `¥${row.amount || 0}` },
  { title: '支付方式', key: 'payMethod', width: 100 },
  {
    title: '状态', key: 'status', width: 100,
    render: (row) => h(NTag, { type: statusMap[row.status] || 'default', size: 'small' }, () => statusLabel[row.status] || row.status)
  },
  { title: '联系方式', key: 'contact', ellipsis: { tooltip: true } },
  { title: '创建时间', key: 'createdAt', width: 170 },
  {
    title: '操作', key: 'actions', width: 80, fixed: 'right',
    render: (row) => h(NButton, { size: 'small', type: 'error', tertiary: true, onClick: () => handleDelete(row) }, () => '删除')
  },
]

function handleDelete(row) {
  dialog.warning({
    title: '确认删除',
    content: `确定删除订单「${row.orderNo}」吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try { await adminStore.deleteOrder(row.id); message.success('删除成功'); loadData() }
      catch (e) { message.error(e.response?.data?.error || '删除失败') }
    },
  })
}

function handleBatchDelete() {
  dialog.warning({
    title: '批量删除',
    content: `确定删除选中的 ${selectedKeys.value.length} 条订单吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try { await adminStore.batchDeleteOrders(selectedKeys.value); message.success('批量删除成功'); selectedKeys.value = []; loadData() }
      catch (e) { message.error(e.response?.data?.error || '删除失败') }
    },
  })
}

function handleFilter() { currentPage.value = 1; loadData() }
function handlePageSizeChange(size) { pageSize.value = size; currentPage.value = 1; loadData() }

async function loadData() {
  loading.value = true
  try {
    const params = { page: currentPage.value, pageSize: pageSize.value }
    if (filterStatus.value) params.status = filterStatus.value
    await adminStore.fetchOrders(params)
  } finally { loading.value = false }
}

onMounted(() => loadData())
</script>
