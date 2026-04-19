<template>
  <div class="orders-view">
    <div class="admin-page-header">
      <h2 class="admin-page-title">订单管理</h2>
      <div class="admin-page-actions">
        <n-select v-model:value="filterStatus" :options="statusOptions" placeholder="按状态筛选" clearable style="width:140px" @update:value="handleFilter" />
        <n-button type="error" size="small" :disabled="!selectedKeys.length" @click="handleBatchDelete">
          <template #icon><n-icon><TrashOutline /></n-icon></template>
          批量删除 ({{ selectedKeys.length }})
        </n-button>
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
        <n-pagination
          v-model:page="currentPage"
          v-model:page-size="pageSize"
          :item-count="adminStore.ordersTotal"
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
import {
  NButton, NDataTable, NPagination, NSelect,
  NSpace, NTag, NPopover, NTooltip, NIcon,
  useMessage, useDialog
} from 'naive-ui'
import { CopyOutline, PhonePortraitOutline, WalletOutline, SwapHorizontalOutline, TrashOutline, EyeOutline, EyeOffOutline } from '@vicons/ionicons5'
import { useAdminStore } from '@/stores/admin'

const adminStore = useAdminStore()
const message = useMessage()
const dialog = useDialog()

const loading = ref(false)
const revealedKeys = ref(new Set())
const currentPage = ref(1)
const pageSize = ref(20)
const selectedKeys = ref([])
const filterStatus = ref(null)

const statusOptions = [
  { label: '待处理', value: 'pending' },
  { label: '已完成', value: 'completed' },
  { label: '失败', value: 'failed' },
]

const statusMap = { pending: 'warning', completed: 'success', failed: 'error' }
const statusLabel = { pending: '待处理', completed: '已完成', failed: '失败' }

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function copyText(text, label) {
  try {
    await navigator.clipboard.writeText(text)
    message.success(`${label || '内容'}已复制`)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    message.success(`${label || '内容'}已复制`)
  }
}

const columns = [
  { type: 'selection' },
  {
    title: '订单号', key: 'orderNo', minWidth: 160,
    render: (row) => h('code', { style: 'font-size:12px' }, row.orderNo),
  },
  {
    title: '商品', key: 'productName', minWidth: 130,
    render: (row) => {
      const children = [h('div', {}, row.productName || '-')]
      if (row.isSms) {
        children.push(h(NTag, { type: 'warning', size: 'small', round: true, style: 'margin-top:2px' }, {
          icon: () => h(NIcon, { size: 12 }, () => h(PhonePortraitOutline)),
          default: () => 'SMS',
        }))
      }
      return h('div', { style: 'line-height:1.7' }, children)
    }
  },
  {
    title: '凭证', key: 'voucher', minWidth: 220,
    render: (row) => {
      if (!row.cardCode && !row.cardCDK) return h('span', { style: 'color:#94A3B8' }, '-')
      const children = []
      if (row.cardCode) {
        const revealed = !revealedKeys.value.has(`code-${row.id}`)
        children.push(h('div', { style: 'display:flex;align-items:center;gap:4px' }, [
          h('span', { style: 'color:var(--text-light);font-size:11px' }, '卡密'),
          h('code', { style: 'font-size:11px;padding:2px 6px;border-radius:3px' }, revealed ? row.cardCode : '****'),
          h(NIcon, {
            size: 14,
            style: 'cursor:pointer;color:var(--text-light);opacity:0.5;transition:all 0.2s',
            onClick: () => { const s = new Set(revealedKeys.value); const k = `code-${row.id}`; revealed ? s.add(k) : s.delete(k); revealedKeys.value = s },
          }, () => h(revealed ? EyeOutline : EyeOffOutline)),
          h(NIcon, {
            size: 14,
            style: 'cursor:pointer;color:var(--text-light);opacity:0.6;transition:all 0.2s',
            onClick: () => copyText(row.cardCode, '卡密'),
          }, () => h(CopyOutline)),
        ]))
      }
      if (row.cardCDK) {
        const revealed = !revealedKeys.value.has(`cdk-${row.id}`)
        children.push(h('div', { style: 'display:flex;align-items:center;gap:4px' }, [
          h('span', { style: 'color:var(--text-light);font-size:11px' }, 'CDK'),
          h('code', {
            style: 'font-size:11px;color:#3B82F6;padding:2px 6px;border-radius:3px',
          }, revealed ? (row.cardCDK.length > 14 ? row.cardCDK.substring(0, 14) + '…' : row.cardCDK) : '****'),
          h(NIcon, {
            size: 14,
            style: 'cursor:pointer;color:#60A5FA;opacity:0.5;transition:all 0.2s',
            onClick: () => { const s = new Set(revealedKeys.value); const k = `cdk-${row.id}`; revealed ? s.add(k) : s.delete(k); revealedKeys.value = s },
          }, () => h(revealed ? EyeOutline : EyeOffOutline)),
          h(NIcon, {
            size: 14,
            style: 'cursor:pointer;color:#60A5FA;opacity:0.7;transition:all 0.2s',
            onClick: () => copyText(row.cardCDK, 'CDK'),
          }, () => h(CopyOutline)),
        ]))
      }
      return h('div', { style: 'line-height:1.9' }, children)
    }
  },
  {
    title: '金额/方式', key: 'amount', width: 115, align: 'center',
    render: (row) => {
      if (row.amount == null) return h('span', { style: 'color:#94A3B8' }, '-')
      const children = [
        h('div', { style: 'color:#EF4444;font-weight:600;font-size:13px' }, `¥${row.amount}`),
      ]
      if (row.payMethod === 'alipay') {
        const alipayIcon = () => h(NIcon, { size: 12 }, () => h(WalletOutline))
        if (row.tradeNo || row.completedAt) {
          children.push(h(NPopover, { trigger: 'click', placement: 'bottom' }, {
            trigger: () => h(NTag, { type: 'primary', size: 'small', style: 'cursor:pointer' }, { icon: alipayIcon, default: () => '支付宝' }),
            default: () => h('div', { style: 'font-size:12px;line-height:2' }, [
              row.tradeNo ? h('div', {}, [`流水号: ${row.tradeNo}`]) : null,
              row.completedAt ? h('div', {}, [`完成时间: ${formatDate(row.completedAt)}`]) : null,
              row.productPrice != null ? h('div', {}, [`商品标价: ¥${row.productPrice}`]) : null,
            ].filter(Boolean)),
          }))
        } else {
          children.push(h(NTag, { type: 'primary', size: 'small' }, { icon: alipayIcon, default: () => '支付宝' }))
        }
      } else if (row.payMethod === '兑换') {
        children.push(h(NTag, { type: 'success', size: 'small' }, { icon: () => h(NIcon, { size: 12 }, () => h(SwapHorizontalOutline)), default: () => '兑换' }))
      }
      return h('div', { style: 'display:flex;flex-direction:column;align-items:center;gap:4px;line-height:1.6' }, children)
    }
  },
  {
    title: '联系方式/用户', key: 'contact', minWidth: 140,
    render: (row) => {
      const children = [h('div', {}, row.contact || '-')]
      if (row.username) children.push(h('div', { style: 'color:var(--text-light);font-size:11px' }, `@${row.username}`))
      return h('div', {}, children)
    }
  },
  {
    title: '状态', key: 'status', width: 80, align: 'center',
    render: (row) => h(NTooltip, {}, {
      trigger: () => h(NTag, { type: statusMap[row.status] || 'default', size: 'small' }, () => statusLabel[row.status] || row.status),
      default: () => row.isSms
        ? (row.status === 'pending' ? '需支付二次接码费用' : '已完成/可接码')
        : (row.status === 'pending' ? '待处理' : '已完成'),
    })
  },
  {
    title: '创建时间', key: 'createdAt', width: 145, sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    render: (row) => formatDate(row.createdAt),
  },
  {
    title: '操作', key: 'actions', width: 90, fixed: 'right',
    render: (row) => h(NButton, { size: 'small', type: 'error', tertiary: true, onClick: () => handleDelete(row) }, { icon: () => h(NIcon, { size: 14 }, () => h(TrashOutline)), default: () => '删除' }),
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
