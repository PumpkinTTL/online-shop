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
          <n-select v-model:value="createForm.productId" :options="productOptions" placeholder="全场通用" clearable />
        </n-form-item>
        <n-form-item label="折扣类型">
          <n-radio-group v-model:value="createForm.discountType">
            <n-radio-button value="percent">百分比折扣</n-radio-button>
            <n-radio-button value="fixed">固定抵扣</n-radio-button>
          </n-radio-group>
        </n-form-item>
        <n-form-item v-if="createForm.discountType === 'percent'" label="折扣比例">
          <n-input-number v-model:value="createForm.discount" :min="1" :max="99" :precision="1" style="width:100%" placeholder="如 10 表示打9折" />
          <template #feedback>
            <span style="color:var(--text-light);font-size:12px">填10表示减10%（打9折），填20表示打8折</span>
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
          <n-select v-model:value="batchForm.productId" :options="productOptions" placeholder="全场通用" clearable />
        </n-form-item>
        <n-form-item label="折扣类型">
          <n-radio-group v-model:value="batchForm.discountType">
            <n-radio-button value="percent">百分比折扣</n-radio-button>
            <n-radio-button value="fixed">固定抵扣</n-radio-button>
          </n-radio-group>
        </n-form-item>
        <n-form-item v-if="batchForm.discountType === 'percent'" label="折扣比例">
          <n-input-number v-model:value="batchForm.discount" :min="1" :max="99" :precision="1" style="width:100%" placeholder="如 10 表示打9折" />
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
import { AddOutline, TrashOutline } from '@vicons/ionicons5'
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
const productOptions = computed(() => allProducts.value.map(p => ({ label: p.name, value: p.id })))

const statusFilterOptions = [
  { label: '可用', value: 'active' },
  { label: '已禁用', value: 'disabled' },
  { label: '已过期', value: 'expired' },
]

const couponStatusMap = { active: 'success', disabled: 'warning', expired: 'error' }
const couponStatusLabel = { active: '可用', disabled: '已禁用', expired: '已过期' }

// ===== 弹窗 =====
const showCreateModal = ref(false)
const showBatchModal = ref(false)
const saving = ref(false)

const emptyForm = () => ({
  code: '',
  productId: null,
  discountType: 'percent',
  discount: null,
  deduction: null,
  maxUses: null,
  validFrom: null,
  validTo: null,
})
const createForm = ref(emptyForm())
const batchForm = ref({ ...emptyForm(), prefix: 'CPN', count: 10 })

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
      if (row.deduction) return h(NTag, { type: 'warning', size: 'small' }, () => `抵扣 ¥${row.deduction}`)
      if (row.discount) return h(NTag, { type: 'success', size: 'small' }, () => `${row.discount}% OFF`)
      return h('span', { style: 'color:#94A3B8' }, '-')
    },
  },
  {
    title: '适用商品', key: 'productId', width: 140,
    render: (row) => {
      if (!row.productId) return h('span', { style: 'color:#F59E0B;font-weight:500' }, '全场通用')
      const p = allProducts.value.find(p => p.id === row.productId)
      return h('span', { style: 'color:#64748B' }, p?.name || `商品#${row.productId}`)
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
      row.status === 'active'
        ? h(NButton, { size: 'small', tertiary: true, type: 'warning', onClick: () => handleToggleStatus(row, 'disabled') }, { default: () => '禁用' })
        : row.status === 'disabled'
          ? h(NButton, { size: 'small', tertiary: true, type: 'success', onClick: () => handleToggleStatus(row, 'active') }, { default: () => '启用' })
          : null,
      h(NButton, { size: 'small', type: 'error', tertiary: true, onClick: () => handleDelete(row.id) }, { icon: () => h(NIcon, { size: 14 }, () => h(TrashOutline)), default: () => '删除' }),
    ].filter(Boolean)),
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
  // 校验：至少填一种折扣
  if (f.discountType === 'percent' && !f.discount) { message.warning('请填写折扣比例'); return }
  if (f.discountType === 'fixed' && !f.deduction) { message.warning('请填写抵扣金额'); return }

  saving.value = true
  try {
    const data = {
      code: f.code || undefined,
      productId: f.productId || undefined,
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

// ===== 启用/禁用 =====
async function handleToggleStatus(row, newStatus) {
  try {
    await adminApi.updateCoupon(row.id, { status: newStatus })
    message.success(newStatus === 'active' ? '已启用' : '已禁用')
    loadData()
  } catch (e) {
    message.error(e.response?.data?.error || '操作失败')
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

// ===== 筛选/分页 =====
function handleFilter() { currentPage.value = 1; loadData() }
function handlePageSizeChange(size) { pageSize.value = size; currentPage.value = 1; loadData() }

// ===== 初始化 =====
onMounted(async () => {
  try {
    const res = await adminApi.getProducts({ pageSize: 0 })
    allProducts.value = Array.isArray(res) ? res : (res.items || [])
  } catch {}
  loadData()
})
</script>
