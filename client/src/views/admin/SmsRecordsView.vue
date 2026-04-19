<template>
  <div class="sms-records-view">
    <div class="admin-page-header">
      <h2 class="admin-page-title">接码记录</h2>
      <div class="admin-page-actions">
        <n-input v-model:value="filterPhone" placeholder="手机号搜索" clearable style="width:140px" @keyup.enter="handleFilter" />
        <n-select v-model:value="filterSource" :options="sourceOptions" placeholder="来源" clearable style="width:130px" @update:value="handleFilter" />
        <n-select v-model:value="filterStatus" :options="statusOptions" placeholder="状态" clearable style="width:120px" @update:value="handleFilter" />
        <n-button @click="handleFilter">搜索</n-button>
        <n-button type="error" size="small" :disabled="!selectedKeys.length" @click="handleBatchDelete">
          <template #icon><n-icon><TrashOutline /></n-icon></template>
          批量删除 ({{ selectedKeys.length }})
        </n-button>
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
        <n-pagination
          v-model:page="currentPage"
          v-model:page-size="pageSize"
          :item-count="adminStore.smsRecordsTotal"
          :page-sizes="[10, 20, 30, 50]"
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
import { TrashOutline, EyeOffOutline, EyeOutline } from '@vicons/ionicons5'
import {
  NButton, NDataTable, NPagination, NInput, NSelect, NIcon, NSpace,
  NTag, useMessage, useDialog
} from 'naive-ui'
import { useAdminStore } from '@/stores/admin'

const adminStore = useAdminStore()
const message = useMessage()
const dialog = useDialog()

const loading = ref(false)
const revealedKeys = ref(new Set())
const currentPage = ref(1)
const pageSize = ref(10)
const selectedKeys = ref([])
const filterPhone = ref('')
const filterSource = ref(null)
const filterStatus = ref(null)

const sourceOptions = [
  { label: '免费接码', value: 'free' },
  { label: 'isCode 商品', value: 'iscode' },
]

// 与后端 SmsRecord 状态一致
const statusOptions = [
  { label: '使用中', value: 'active' },
  { label: '已完成', value: 'completed' },
  { label: '已释放', value: 'released' },
  { label: '已拉黑', value: 'blocked' },
]

const statusMap = { active: 'primary', completed: 'success', released: 'default', blocked: 'error' }
const statusLabelMap = { active: '使用中', completed: '已完成', released: '已释放', blocked: '已拉黑' }

const sourceLabelMap = { free: '免费接码', iscode: 'isCode' }
const sourceTagMap = { free: 'info', iscode: 'success' }

const columns = [
  { type: 'selection' },
  { title: 'ID', key: 'id', width: 60, sorter: (a, b) => a.id - b.id },
  {
    title: '手机号', key: 'phone', minWidth: 120,
    render: (row) => {
      const revealed = !revealedKeys.value.has(`phone-${row.id}`)
      return h('div', { style: 'display:flex;align-items:center;gap:4px' }, [
        h('code', {}, revealed ? row.phone : (row.phone ? row.phone.substring(0, 3) + '****' + row.phone.substring(7) : '-')),
        h(NIcon, {
          size: 14,
          style: 'cursor:pointer;opacity:0.5;flex-shrink:0',
          onClick: () => { const s = new Set(revealedKeys.value); const k = `phone-${row.id}`; revealed ? s.add(k) : s.delete(k); revealedKeys.value = s },
        }, () => h(revealed ? EyeOutline : EyeOffOutline)),
      ])
    },
  },
  {
    title: '来源', key: 'source', width: 110,
    render: (row) => h(NTag, { type: sourceTagMap[row.source] || 'info', size: 'small' }, () => sourceLabelMap[row.source] || row.source || '-'),
  },
  {
    title: '关键词', key: 'keyword', width: 100,
    render: (row) => row.keyword || '-',
  },
  {
    title: '卡类型', key: 'cardType', minWidth: 70,
    render: (row) => row.cardType || '全部',
  },
  {
    title: '验证码', key: 'verifyCode', width: 120,
    render: (row) => {
      if (!row.verifyCode) return h('span', { style: 'color:#94A3B8' }, '-')
      const revealed = !revealedKeys.value.has(`vcode-${row.id}`)
      return h('div', { style: 'display:flex;align-items:center;gap:4px' }, [
        h('code', { style: 'color:#22C55E' }, revealed ? row.verifyCode : '******'),
        h(NIcon, {
          size: 14,
          style: 'cursor:pointer;opacity:0.5;flex-shrink:0',
          onClick: () => { const s = new Set(revealedKeys.value); const k = `vcode-${row.id}`; revealed ? s.add(k) : s.delete(k); revealedKeys.value = s },
        }, () => h(revealed ? EyeOutline : EyeOffOutline)),
      ])
    },
  },
  {
    title: '状态', key: 'status', minWidth: 70,
    render: (row) => h(NTag, { type: statusMap[row.status] || 'default', size: 'small' }, () => statusLabelMap[row.status] || row.status),
  },
  {
    title: 'IP', key: 'ip', width: 130,
    render: (row) => h('span', { style: 'color:var(--text-light);font-size:12px' }, row.ip || '-'),
  },
  {
    title: '创建时间', key: 'createdAt', width: 160, sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    render: (row) => formatDate(row.createdAt),
  },
  {
    title: '更新时间', key: 'updatedAt', width: 160, sorter: (a, b) => new Date(a.updatedAt) - new Date(b.updatedAt),
    render: (row) => formatDate(row.updatedAt),
  },
]

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

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
    if (filterSource.value) params.source = filterSource.value
    if (filterStatus.value) params.status = filterStatus.value
    await adminStore.fetchSmsRecords(params)
  } finally { loading.value = false }
}

onMounted(() => loadData())
</script>
