<template>
  <div class="coupons-view">
    <div class="admin-page-header">
      <h2 class="admin-page-title">优惠码管理</h2>
      <div class="admin-page-actions">
        <n-select v-model:value="filterStatus" :options="statusFilterOptions" placeholder="按状态筛选" clearable style="width:140px" @update:value="handleFilter" />
        <n-button type="primary" @click="openCreateModal">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          创建优惠码
        </n-button>
        <n-button @click="openBatchModal">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          批量生成
        </n-button>
        <n-button type="error" size="small" :disabled="!selectedIds.length" @click="handleBatchDelete">
          <template #icon><n-icon><TrashOutline /></n-icon></template>
          批量删除 ({{ selectedIds.length }})
        </n-button>
        <n-button size="small" :disabled="!selectedIds.length" @click="handleExport">
          <template #icon><n-icon><DownloadOutline /></n-icon></template>
          导出选中 ({{ selectedIds.length }})
        </n-button>
      </div>
    </div>

    <div class="admin-table-card">
      <n-data-table
        :columns="columns"
        :data="coupons"
        :bordered="false"
        :loading="loading"
        :row-key="row => row.id"
        v-model:checked-row-keys="selectedIds"
      />
      <div class="admin-pagination">
        <n-pagination
          v-model:page="currentPage"
          v-model:page-size="pageSize"
          :item-count="total"
          :page-sizes="[10, 20, 30, 50]"
          show-size-picker
          @update:page="loadData"
          @update:page-size="handlePageSizeChange"
        />
      </div>
    </div>

    <!-- 创建优惠码弹窗 -->
    <n-modal v-model:show="showCreateModal" preset="card" title="创建优惠码" style="max-width:520px;">
      <n-form :model="createForm" label-placement="left" label-width="100">
        <n-form-item label="优惠码">
          <n-input v-model:value="createForm.code" placeholder="留空则自动生成" />
        </n-form-item>
        <n-form-item label="适用商品">
          <n-select v-model:value="createForm.productId" :options="productOptions" placeholder="全部商品" clearable />
        </n-form-item>
        <n-form-item label="使用者">
          <n-select v-model:value="createForm.userId" :options="userOptions" placeholder="不限" clearable filterable />
        </n-form-item>
        <n-form-item label="IP">
          <n-input v-model:value="createForm.bindIp" placeholder="不限" clearable />
        </n-form-item>
        <n-form-item label="折扣类型">
          <n-radio-group v-model:value="createForm.discountType">
            <n-radio-button value="percent">百分比折扣</n-radio-button>
            <n-radio-button value="fixed">固定抵扣</n-radio-button>
          </n-radio-group>
        </n-form-item>
        <n-form-item v-if="createForm.discountType === 'percent'" label="折扣比例">
          <n-input-number v-model:value="createForm.discount" :min="1" :max="99" :precision="1" style="width:100%" placeholder="如 10 表示9折" />
          <template #feedback>
            <span style="color:var(--text-light);font-size:12px">填10表示减10%（9折），填20表示8折</span>
          </template>
        </n-form-item>
        <n-form-item v-if="createForm.discountType === 'fixed'" label="抵扣金额">
          <n-input-number v-model:value="createForm.deduction" :min="0.01" :precision="2" style="width:100%" placeholder="如 5.00 表示减5元" />
        </n-form-item>
        <n-form-item label="最大使用次数">
          <n-input-number v-model:value="createForm.maxUses" :min="1" style="width:100%" placeholder="留空=不限次数" clearable />
        </n-form-item>
        <n-form-item label="生效时间">
          <n-date-picker v-model:value="createForm.validFrom" type="datetime" style="width:100%" clearable placeholder="留空=立即生效" />
        </n-form-item>
        <n-form-item label="过期时间">
          <n-date-picker v-model:value="createForm.validTo" type="datetime" style="width:100%" clearable placeholder="留空=永不过期" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showCreateModal = false">取消</n-button>
          <n-button type="primary" :loading="saving" @click="handleCreate">创建</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 批量生成弹窗 -->
    <n-modal v-model:show="showBatchModal" preset="card" title="批量生成优惠码" style="max-width:520px;">
      <n-form :model="batchForm" label-placement="left" label-width="100">
        <n-form-item label="前缀">
          <n-input v-model:value="batchForm.prefix" placeholder="CPN" />
        </n-form-item>
        <n-form-item label="生成数量">
          <n-input-number v-model:value="batchForm.count" :min="1" :max="100" style="width:100%" />
        </n-form-item>
        <n-form-item label="适用商品">
          <n-select v-model:value="batchForm.productId" :options="productOptions" placeholder="全部商品" clearable />
        </n-form-item>
        <n-form-item label="使用者">
          <n-select v-model:value="batchForm.userId" :options="userOptions" placeholder="不限" clearable filterable />
        </n-form-item>
        <n-form-item label="IP">
          <n-input v-model:value="batchForm.bindIp" placeholder="不限" clearable />
        </n-form-item>
        <n-form-item label="折扣类型">
          <n-radio-group v-model:value="batchForm.discountType">
            <n-radio-button value="percent">百分比折扣</n-radio-button>
            <n-radio-button value="fixed">固定抵扣</n-radio-button>
          </n-radio-group>
        </n-form-item>
        <n-form-item v-if="batchForm.discountType === 'percent'" label="折扣比例">
          <n-input-number v-model:value="batchForm.discount" :min="1" :max="99" :precision="1" style="width:100%" placeholder="如 10 表示9折" />
        </n-form-item>
        <n-form-item v-if="batchForm.discountType === 'fixed'" label="抵扣金额">
          <n-input-number v-model:value="batchForm.deduction" :min="0.01" :precision="2" style="width:100%" placeholder="如 5.00" />
        </n-form-item>
        <n-form-item label="最大使用次数">
          <n-input-number v-model:value="batchForm.maxUses" :min="1" style="width:100%" placeholder="留空=不限次数" clearable />
        </n-form-item>
        <n-form-item label="生效时间">
          <n-date-picker v-model:value="batchForm.validFrom" type="datetime" style="width:100%" clearable placeholder="留空=立即生效" />
        </n-form-item>
        <n-form-item label="过期时间">
          <n-date-picker v-model:value="batchForm.validTo" type="datetime" style="width:100%" clearable placeholder="留空=永不过期" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showBatchModal = false">取消</n-button>
          <n-button type="primary" :loading="saving" @click="handleBatchGenerate">生成</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 编辑优惠码弹窗 -->
    <n-modal v-model:show="showEditModal" preset="card" title="编辑优惠码" style="max-width:520px;">
      <n-form :model="editForm" label-placement="left" label-width="100">
        <n-form-item label="优惠码">
          <n-input :value="editForm.code" disabled />
        </n-form-item>
        <n-form-item label="状态">
          <n-select v-model:value="editForm.status" :options="editStatusOptions" />
        </n-form-item>
        <n-form-item label="适用商品">
          <n-select v-model:value="editForm.productId" :options="productOptions" placeholder="全部商品" clearable />
        </n-form-item>
        <n-form-item label="使用者">
          <n-select v-model:value="editForm.userId" :options="userOptions" placeholder="不限" clearable filterable />
        </n-form-item>
        <n-form-item label="IP">
          <n-input v-model:value="editForm.bindIp" placeholder="不限" clearable />
        </n-form-item>
        <n-form-item label="折扣类型">
          <n-radio-group v-model:value="editForm.discountType">
            <n-radio-button value="percent">百分比折扣</n-radio-button>
            <n-radio-button value="fixed">固定抵扣</n-radio-button>
          </n-radio-group>
        </n-form-item>
        <n-form-item v-if="editForm.discountType === 'percent'" label="折扣比例">
          <n-input-number v-model:value="editForm.discount" :min="1" :max="99" :precision="1" style="width:100%" />
        </n-form-item>
        <n-form-item v-if="editForm.discountType === 'fixed'" label="抵扣金额">
          <n-input-number v-model:value="editForm.deduction" :min="0.01" :precision="2" style="width:100%" />
        </n-form-item>
        <n-form-item label="最大使用次数">
          <n-input-number v-model:value="editForm.maxUses" :min="1" style="width:100%" placeholder="留空=不限次数" clearable />
        </n-form-item>
        <n-form-item label="生效时间">
          <n-date-picker v-model:value="editForm.validFrom" type="datetime" style="width:100%" clearable placeholder="留空=立即生效" />
        </n-form-item>
        <n-form-item label="过期时间">
          <n-date-picker v-model:value="editForm.validTo" type="datetime" style="width:100%" clearable placeholder="留空=永不过期" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showEditModal = false">取消</n-button>
          <n-button type="primary" :loading="saving" @click="handleEdit">保存</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, h, onMounted, computed } from 'vue'
import {
  NButton, NIcon, NDataTable, NPagination,
  NModal, NForm, NFormItem, NInput, NInputNumber, NSelect,
  NSpace, NTag, NRadioButton, NRadioGroup, NDatePicker,
  useMessage, useDialog
} from 'naive-ui'
import { AddOutline, TrashOutline, CreateOutline, DownloadOutline, PricetagsOutline, WalletOutline } from '@vicons/ionicons5'
import { adminApi } from '@/api'

const message = useMessage()
const dialog = useDialog()

// ===== 列表数据 =====
const loading = ref(false)
const coupons = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const selectedIds = ref([])
const filterStatus = ref(null)
const allProducts = ref([])
const allUsers = ref([])
const productOptions = computed(() => allProducts.value.map(p => ({ label: p.name, value: p.id })))
const userOptions = computed(() => allUsers.value.map(u => ({ label: u.username || u.contact || `#${u.id}`, value: u.id })))

const statusFilterOptions = [
  { label: '可用', value: 'active' },
  { label: '已禁用', value: 'disabled' },
  { label: '已过期', value: 'expired' },
]

const editStatusOptions = [
  { label: '可用', value: 'active' },
  { label: '已禁用', value: 'disabled' },
  { label: '已过期', value: 'expired' },
]

const couponStatusMap = { active: 'success', disabled: 'warning', expired: 'error' }
const couponStatusLabel = { active: '可用', disabled: '已禁用', expired: '已过期' }

// ===== 弹窗 =====
const showCreateModal = ref(false)
const showBatchModal = ref(false)
const showEditModal = ref(false)
const saving = ref(false)

const emptyForm = () => ({
  code: '',
  productId: null,
  userId: null,
  bindIp: '',
  discountType: 'percent',
  discount: null,
  deduction: null,
  maxUses: null,
  validFrom: null,
  validTo: null,
})
const createForm = ref(emptyForm())
const batchForm = ref({ ...emptyForm(), prefix: 'CPN', count: 10 })
const editForm = ref(emptyForm())

// ===== 表格列 =====
const columns = [
  { type: 'selection' },
  { title: 'ID', key: 'id', width: 60, sorter: (a, b) => a.id - b.id },
  {
    title: '优惠码', key: 'code', minWidth: 160,
    render: (row) => h('code', { style: 'color:#3B82F6;font-weight:500' }, row.code),
  },
  {
    title: '折扣', key: 'discount', width: 120,
    render: (row) => {
      if (row.deduction) {
        return h(NTag, { type: 'warning', size: 'small', round: true }, {
          icon: () => h(NIcon, { size: 13 }, () => h(WalletOutline)),
          default: () => `减¥${parseFloat(row.deduction).toFixed(2)}`,
        })
      }
      if (row.discount) {
        const d = parseFloat(row.discount)
        const fold = (10 - d / 10).toFixed(1).replace(/\.0$/, '')
        return h(NTag, { type: 'success', size: 'small', round: true }, {
          icon: () => h(NIcon, { size: 13 }, () => h(PricetagsOutline)),
          default: () => `${fold}折`,
        })
      }
      return h('span', { style: 'color:#94A3B8' }, '-')
    },
  },
  {
    title: '适用商品', key: 'productId', width: 140,
    render: (row) => {
      if (!row.productId) return h('span', { style: 'color:#F59E0B;font-weight:500' }, '全部商品')
      const p = allProducts.value.find(p => p.id === row.productId)
      return h('span', { style: 'color:#64748B' }, p?.name || `商品#${row.productId}`)
    },
  },
  {
    title: '使用者', key: 'userId', width: 110,
    render: (row) => {
      if (!row.userId) return h('span', { style: 'color:#94A3B8' }, '-')
      const u = allUsers.value.find(u => u.id === row.userId)
      return h('span', { style: 'color:#64748B' }, u ? (u.username || u.contact || `#${row.userId}`) : `用户#${row.userId}`)
    },
  },
  {
    title: 'IP', key: 'bindIp', width: 130,
    render: (row) => {
      if (!row.bindIp) return h('span', { style: 'color:#94A3B8' }, '-')
      return h('code', { style: 'font-size:12px;color:#64748B' }, row.bindIp)
    },
  },
  {
    title: '使用情况', key: 'usage', width: 110,
    render: (row) => {
      const used = row.usedCount || 0
      const max = row.maxUses
      return h('span', {}, [
        `${used}`,
        max ? h('span', { style: 'color:#94A3B8' }, ` / ${max}`) : null,
      ])
    },
  },
  {
    title: '有效期', key: 'validity', width: 200,
    render: (row) => {
      if (!row.validFrom && !row.validTo) return h('span', { style: 'color:#94A3B8' }, '永久有效')
      return h('span', { style: 'font-size:12px;color:#64748B' }, [
        row.validFrom ? formatDate(row.validFrom) : '...',
        ' ~ ',
        row.validTo ? formatDate(row.validTo) : '...',
      ])
    },
  },
  {
    title: '状态', key: 'status', width: 90,
    render: (row) => h(NTag, { type: couponStatusMap[row.status] || 'info', size: 'small' }, () => couponStatusLabel[row.status] || row.status),
  },
  {
    title: '创建时间', key: 'createdAt', width: 160, sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    render: (row) => formatDate(row.createdAt),
  },
  {
    title: '操作', key: 'actions', width: 160, fixed: 'right',
    render: (row) => h(NSpace, { size: 4, wrap: false }, () => [
      h(NButton, { size: 'small', tertiary: true, type: 'primary', onClick: () => openEditModal(row) }, { icon: () => h(NIcon, { size: 14 }, () => h(CreateOutline)), default: () => '编辑' }),
      h(NButton, { size: 'small', type: 'error', tertiary: true, onClick: () => handleDelete(row.id) }, { icon: () => h(NIcon, { size: 14 }, () => h(TrashOutline)), default: () => '删除' }),
    ]),
  },
]

// ===== 工具函数 =====
function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ===== 数据加载 =====
async function loadData() {
  loading.value = true
  try {
    const params = { page: currentPage.value, pageSize: pageSize.value }
    if (filterStatus.value) params.status = filterStatus.value
    const res = await adminApi.getCoupons(params)
    if (res.items) {
      coupons.value = res.items
      total.value = res.total
    } else {
      coupons.value = Array.isArray(res) ? res : []
      total.value = coupons.value.length
    }
  } catch (e) {
    message.error(e.response?.data?.error || '加载失败')
  } finally {
    loading.value = false
  }
}

// ===== 创建 =====
function openCreateModal() {
  createForm.value = emptyForm()
  showCreateModal.value = true
}

async function handleCreate() {
  const f = createForm.value
  if (f.discountType === 'percent' && !f.discount) { message.warning('请填写折扣比例'); return }
  if (f.discountType === 'fixed' && !f.deduction) { message.warning('请填写抵扣金额'); return }

  saving.value = true
  try {
    const data = {
      code: f.code || undefined,
      productId: f.productId || undefined,
      userId: f.userId || undefined,
      bindIp: f.bindIp || undefined,
      discount: f.discountType === 'percent' ? f.discount : undefined,
      deduction: f.discountType === 'fixed' ? f.deduction : undefined,
      maxUses: f.maxUses || undefined,
      validFrom: f.validFrom ? new Date(f.validFrom).toISOString() : undefined,
      validTo: f.validTo ? new Date(f.validTo).toISOString() : undefined,
    }
    await adminApi.createCoupon(data)
    message.success('创建成功')
    showCreateModal.value = false
    loadData()
  } catch (e) {
    message.error(e.response?.data?.error || '创建失败')
  } finally {
    saving.value = false
  }
}

// ===== 批量生成 =====
function openBatchModal() {
  batchForm.value = { ...emptyForm(), prefix: 'CPN', count: 10 }
  showBatchModal.value = true
}

async function handleBatchGenerate() {
  const f = batchForm.value
  if (f.discountType === 'percent' && !f.discount) { message.warning('请填写折扣比例'); return }
  if (f.discountType === 'fixed' && !f.deduction) { message.warning('请填写抵扣金额'); return }

  saving.value = true
  try {
    const data = {
      prefix: f.prefix || 'CPN',
      count: f.count,
      productId: f.productId || undefined,
      userId: f.userId || undefined,
      bindIp: f.bindIp || undefined,
      discount: f.discountType === 'percent' ? f.discount : undefined,
      deduction: f.discountType === 'fixed' ? f.deduction : undefined,
      maxUses: f.maxUses || undefined,
      validFrom: f.validFrom ? new Date(f.validFrom).toISOString() : undefined,
      validTo: f.validTo ? new Date(f.validTo).toISOString() : undefined,
    }
    const res = await adminApi.generateCoupons(data)
    message.success(`成功生成 ${res.count || 0} 个优惠码`)
    showBatchModal.value = false
    loadData()
  } catch (e) {
    message.error(e.response?.data?.error || '生成失败')
  } finally {
    saving.value = false
  }
}

// ===== 编辑 =====
function openEditModal(row) {
  editForm.value = {
    id: row.id,
    code: row.code,
    status: row.status,
    productId: row.productId || null,
    userId: row.userId || null,
    bindIp: row.bindIp || '',
    discountType: row.deduction ? 'fixed' : 'percent',
    discount: row.discount ? parseFloat(row.discount) : null,
    deduction: row.deduction ? parseFloat(row.deduction) : null,
    maxUses: row.maxUses || null,
    validFrom: row.validFrom ? new Date(row.validFrom).getTime() : null,
    validTo: row.validTo ? new Date(row.validTo).getTime() : null,
  }
  showEditModal.value = true
}

async function handleEdit() {
  const f = editForm.value
  saving.value = true
  try {
    const data = {
      status: f.status,
      productId: f.productId || undefined,
      userId: f.userId || undefined,
      bindIp: f.bindIp || undefined,
      discount: f.discountType === 'percent' ? f.discount : undefined,
      deduction: f.discountType === 'fixed' ? f.deduction : undefined,
      maxUses: f.maxUses || undefined,
      validFrom: f.validFrom ? new Date(f.validFrom).toISOString() : undefined,
      validTo: f.validTo ? new Date(f.validTo).toISOString() : undefined,
    }
    await adminApi.updateCoupon(f.id, data)
    message.success('保存成功')
    showEditModal.value = false
    loadData()
  } catch (e) {
    message.error(e.response?.data?.error || '保存失败')
  } finally {
    saving.value = false
  }
}

// ===== 删除 =====
function handleDelete(id) {
  dialog.warning({
    title: '确认删除',
    content: '确定删除该优惠码吗？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await adminApi.deleteCoupon(id)
        message.success('删除成功')
        loadData()
      } catch (e) {
        message.error(e.response?.data?.error || '删除失败')
      }
    },
  })
}

function handleBatchDelete() {
  dialog.warning({
    title: '批量删除',
    content: `确定删除选中的 ${selectedIds.value.length} 个优惠码吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await adminApi.batchDeleteCoupons(selectedIds.value)
        message.success('批量删除成功')
        selectedIds.value = []
        loadData()
      } catch (e) {
        message.error(e.response?.data?.error || '删除失败')
      }
    },
  })
}

// ===== 导出 =====
function handleExport() {
  const selected = coupons.value.filter(c => selectedIds.value.includes(c.id))
  if (!selected.length) { message.warning('请先选择要导出的优惠码'); return }

  const headers = ['优惠码', '折扣', '适用商品ID', '使用者ID', 'IP', '最大使用次数', '已使用次数', '状态', '生效时间', '过期时间', '创建时间']
  const rows = selected.map(c => [
    c.code,
    c.deduction ? `抵扣¥${c.deduction}` : (c.discount ? `${c.discount}%` : ''),
    c.productId || '',
    c.userId || '',
    c.bindIp || '',
    c.maxUses || '',
    c.usedCount || 0,
    couponStatusLabel[c.status] || c.status,
    c.validFrom ? formatDate(c.validFrom) : '',
    c.validTo ? formatDate(c.validTo) : '',
    c.createdAt ? formatDate(c.createdAt) : '',
  ])

  const csv = '\uFEFF' + [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `优惠码_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
  message.success(`已导出 ${selected.length} 个优惠码`)
}

// ===== 筛选/分页 =====
function handleFilter() { currentPage.value = 1; loadData() }
function handlePageSizeChange(size) { pageSize.value = size; currentPage.value = 1; loadData() }

// ===== 初始化 =====
onMounted(async () => {
  try {
    const res = await adminApi.getProducts({ pageSize: 0 })
    allProducts.value = Array.isArray(res) ? res : (res.items || [])
  } catch {}
  try {
    const res = await adminApi.getUsers({ pageSize: 0 })
    allUsers.value = Array.isArray(res) ? res : (res.items || [])
  } catch {}
  loadData()
})
</script>
