<template>
  <div class="card-keys-view">
    <div class="admin-page-header">
      <h2 class="admin-page-title">卡密管理</h2>
      <div class="admin-page-actions">
        <n-select v-model:value="filterProduct" :options="productOptions" placeholder="按商品筛选" clearable style="width:180px" @update:value="handleFilter" />
        <n-select v-model:value="filterStatus" :options="statusOptions" placeholder="按状态筛选" clearable style="width:120px" @update:value="handleFilter" />
        <n-button type="primary" @click="showGenerateModal = true">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          生成卡密
        </n-button>
        <n-button @click="showManualModal = true">手动录入</n-button>
      </div>
    </div>

    <div class="admin-table-card">
      <n-data-table
        :columns="columns"
        :data="adminStore.cardKeys"
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
          :item-count="adminStore.cardKeysTotal"
          :page-sizes="[10, 20, 50, 100]"
          show-size-picker
          @update:page="loadData"
          @update:page-size="handlePageSizeChange"
        />
      </div>
    </div>

    <!-- 生成卡密弹窗 -->
    <n-modal v-model:show="showGenerateModal" preset="card" title="批量生成卡密" style="max-width:500px;">
      <n-form :model="generateForm" label-placement="left" label-width="80">
        <n-form-item label="商品">
          <n-select v-model:value="generateForm.productId" :options="productOptions" placeholder="选择商品" />
        </n-form-item>
        <n-form-item label="前缀">
          <n-select v-model:value="generateForm.prefix" :options="prefixOptions" placeholder="选择前缀" clearable />
        </n-form-item>
        <n-form-item label="数量">
          <n-input-number v-model:value="generateForm.count" :min="1" :max="100" style="width:100%" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showGenerateModal = false">取消</n-button>
          <n-button type="primary" :loading="generating" @click="handleGenerate">生成</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 手动录入弹窗 -->
    <n-modal v-model:show="showManualModal" preset="card" title="手动录入卡密" style="max-width:500px;">
      <n-form :model="manualForm" label-placement="left" label-width="80">
        <n-form-item label="商品">
          <n-select v-model:value="manualForm.productId" :options="productOptions" placeholder="选择商品" />
        </n-form-item>
        <n-form-item label="卡密列表">
          <n-input v-model:value="manualForm.keysText" type="textarea" :rows="6" placeholder="每行一个卡密" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showManualModal = false">取消</n-button>
          <n-button type="primary" :loading="generating" @click="handleManualAdd">录入</n-button>
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
  NSpace, NTag, useMessage, useDialog
} from 'naive-ui'
import { AddOutline } from '@vicons/ionicons5'
import { useAdminStore } from '@/stores/admin'
import { adminApi } from '@/api'

const adminStore = useAdminStore()
const message = useMessage()
const dialog = useDialog()

const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const selectedKeys = ref([])
const filterProduct = ref(null)
const filterStatus = ref(null)

const showGenerateModal = ref(false)
const showManualModal = ref(false)
const generating = ref(false)

const generateForm = ref({ productId: null, prefix: '', count: 10 })
const manualForm = ref({ productId: null, keysText: '' })

const allProducts = ref([])
const productOptions = computed(() => allProducts.value.map(p => ({ label: p.name, value: p.id })))

const statusOptions = [
  { label: '未使用', value: 'unused' },
  { label: '已使用', value: 'used' },
]

const prefixOptions = [
  { label: 'CDK-', value: 'CDK-' },
  { label: 'KEY-', value: 'KEY-' },
  { label: 'VIP-', value: 'VIP-' },
]

const columns = [
  { type: 'selection' },
  { title: 'ID', key: 'id', width: 60 },
  { title: '卡密', key: 'code', ellipsis: { tooltip: true } },
  {
    title: '商品', key: 'productName', width: 140,
    render: (row) => {
      const p = allProducts.value.find(p => p.id === row.productId)
      return p?.name || '-'
    }
  },
  {
    title: '状态', key: 'status', width: 100,
    render: (row) => h(NTag, { type: row.status === 'used' ? 'error' : 'success', size: 'small' }, () => row.status === 'used' ? '已使用' : '未使用')
  },
  {
    title: 'CDK', key: 'CDK', width: 160,
    render: (row) => row.CDK ? h('span', { style: 'font-family:monospace;font-size:12px;' }, row.CDK) : '-'
  },
  { title: '创建时间', key: 'createdAt', width: 170 },
]

async function handleGenerate() {
  if (!generateForm.value.productId) { message.warning('请选择商品'); return }
  generating.value = true
  try {
    const res = await adminStore.generateCardKeys(generateForm.value)
    message.success(`成功生成 ${res.count || res.length || 0} 个卡密`)
    showGenerateModal.value = false
    generateForm.value = { productId: null, prefix: '', count: 10 }
    loadData()
  } catch (e) {
    message.error(e.response?.data?.error || '生成失败')
  } finally {
    generating.value = false
  }
}

async function handleManualAdd() {
  if (!manualForm.value.productId) { message.warning('请选择商品'); return }
  if (!manualForm.value.keysText.trim()) { message.warning('请输入卡密'); return }
  generating.value = true
  try {
    const keys = manualForm.value.keysText.trim().split('\n').filter(k => k.trim())
    const res = await adminStore.manualAddCardKeys({ productId: manualForm.value.productId, keys })
    message.success(`成功录入 ${res.count || keys.length} 个卡密`)
    showManualModal.value = false
    manualForm.value = { productId: null, keysText: '' }
    loadData()
  } catch (e) {
    message.error(e.response?.data?.error || '录入失败')
  } finally {
    generating.value = false
  }
}

function handleBatchDelete() {
  dialog.warning({
    title: '批量删除',
    content: `确定删除选中的 ${selectedKeys.value.length} 条卡密吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await adminStore.batchDeleteCardKeys(selectedKeys.value)
        message.success('批量删除成功')
        selectedKeys.value = []
        loadData()
      } catch (e) {
        message.error(e.response?.data?.error || '删除失败')
      }
    },
  })
}

function handleFilter() { currentPage.value = 1; loadData() }
function handlePageSizeChange(size) { pageSize.value = size; currentPage.value = 1; loadData() }

async function loadData() {
  loading.value = true
  try {
    const params = { page: currentPage.value, pageSize: pageSize.value }
    if (filterProduct.value) params.productId = filterProduct.value
    if (filterStatus.value) params.status = filterStatus.value
    await adminStore.fetchCardKeys(params)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    const res = await adminApi.getProducts({ pageSize: 0 })
    allProducts.value = Array.isArray(res) ? res : (res.items || [])
  } catch {}
  await loadData()
})
</script>
