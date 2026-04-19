<template>
  <div class="sms-records-view">
    <div class="admin-page-header">
      <h2 class="admin-page-title">接码记录</h2>
      <div class="admin-page-actions">
        <n-input v-model:value="filterPhone" placeholder="手机号" clearable style="width:140px" @keyup.enter="handleFilter" />
        <n-input v-model:value="filterKeyword" placeholder="关键词" clearable style="width:120px" @keyup.enter="handleFilter" />
        <n-select v-model:value="filterSource" :options="sourceOptions" placeholder="来源" clearable style="width:120px" @update:value="handleFilter" />
        <n-select v-model:value="filterStatus" :options="statusOptions" placeholder="状态" clearable style="width:120px" @update:value="handleFilter" />
        <n-button @click="handleFilter">搜索</n-button>
      </div>
    </div>

    <div class="admin-table-card">
      <n-data-table
        :columns="columns"
        :data="adminStore.smsRecords"
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
          :item-count="adminStore.smsRecordsTotal"
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
  NButton, NDataTable, NPagination, NInput, NSelect, NSpace,
  NTag, useMessage, useDialog
} from 'naive-ui'
import { useAdminStore } from '@/stores/admin'

const adminStore = useAdminStore()
const message = useMessage()
const dialog = useDialog()

const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const selectedKeys = ref([])
const filterPhone = ref('')
const filterKeyword = ref('')
const filterSource = ref(null)
const filterStatus = ref(null)

const sourceOptions = [
  { label: '免费接码', value: 'free' },
  { label: 'isCode 接码', value: 'iscode' },
]

const statusOptions = [
  { label: '等待中', value: 'waiting' },
  { label: '已收到', value: 'received' },
  { label: '超时', value: 'timeout' },
  { label: '失败', value: 'failed' },
]

const statusMap = { waiting: 'warning', received: 'success', timeout: 'default', failed: 'error' }

const columns = [
  { type: 'selection' },
  { title: 'ID', key: 'id', width: 60 },
  { title: '手机号', key: 'phone', width: 130 },
  { title: '验证码', key: 'verifyCode', width: 100 },
  {
    title: '来源', key: 'source', width: 100,
    render: (row) => h(NTag, { type: row.source === 'iscode' ? 'info' : 'success', size: 'small' }, () => row.source === 'iscode' ? 'isCode' : '免费')
  },
  {
    title: '状态', key: 'status', width: 100,
    render: (row) => h(NTag, { type: statusMap[row.status] || 'default', size: 'small' }, () => row.status)
  },
  { title: '关键词', key: 'keyword' },
  { title: '创建时间', key: 'createdAt', width: 170 },
]

function handleBatchDelete() {
  dialog.warning({
    title: '批量删除',
    content: `确定删除选中的 ${selectedKeys.value.length} 条记录吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try { await adminStore.batchDeleteSmsRecords(selectedKeys.value); message.success('批量删除成功'); selectedKeys.value = []; loadData() }
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
    if (filterPhone.value) params.phone = filterPhone.value
    if (filterKeyword.value) params.keyword = filterKeyword.value
    if (filterSource.value) params.source = filterSource.value
    if (filterStatus.value) params.status = filterStatus.value
    await adminStore.fetchSmsRecords(params)
  } finally { loading.value = false }
}

onMounted(() => loadData())
</script>
