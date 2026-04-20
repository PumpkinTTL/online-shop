<template>
  <div class="activation-codes-view">
    <div class="admin-page-header">
      <h2 class="admin-page-title">激活码管理</h2>
      <div class="admin-page-actions">
        <n-button type="primary" @click="showGenerate = true">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          生成激活码
        </n-button>
        <n-button type="error" :disabled="!selectedIds.length" @click="handleBatchDelete">
          <template #icon><n-icon><TrashOutline /></n-icon></template>
          批量删除 ({{ selectedIds.length }})
        </n-button>
      </div>
    </div>

    <div class="filter-bar">
      <n-select v-model:value="filterType" :options="typeOptions" placeholder="按类型筛选" clearable class="filter-select" @update:value="loadData" />
      <n-select v-model:value="filterStatus" :options="statusOptions" placeholder="按状态筛选" clearable class="filter-select" @update:value="loadData" />
    </div>

    <div class="admin-table-card">
      <n-data-table
        :columns="columns"
        :data="items"
        :bordered="false"
        :loading="loading"
        :row-key="row => row.id"
        v-model:checked-row-keys="selectedIds"
        :scroll-x="900"
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

    <!-- 生成弹窗 -->
    <n-modal v-model:show="showGenerate" preset="card" title="生成激活码" style="max-width:460px;">
      <n-form label-placement="left" label-width="80">
        <n-form-item label="类型">
          <n-select v-model:value="genForm.type" :options="genTypeOptions" />
        </n-form-item>
        <n-form-item label="数量">
          <n-input-number v-model:value="genForm.count" :min="1" :max="100" style="width: 100%" />
        </n-form-item>
        <n-form-item label="前缀">
          <n-input v-model:value="genForm.prefix" placeholder="可选，如 INV" />
        </n-form-item>
        <n-form-item label="备注">
          <n-input v-model:value="genForm.remark" placeholder="可选" />
        </n-form-item>
        <n-form-item label="过期时间">
          <n-date-picker v-model:value="genForm.expiredAt" type="datetime" clearable style="width: 100%" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showGenerate = false">取消</n-button>
          <n-button type="primary" :loading="generating" @click="handleGenerate">生成</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 生成结果弹窗 -->
    <n-modal v-model:show="showResult" preset="card" title="生成结果" style="max-width:500px;">
      <n-alert type="success" :title="`成功生成 ${generatedCodes.length} 个激活码`" style="margin-bottom: 12px" />
      <n-input type="textarea" :value="generatedCodesText" readonly :autosize="{ minRows: 4, maxRows: 12 }" style="font-family: monospace" />
      <template #footer>
        <n-space justify="end">
          <n-button @click="handleCopyAll">复制全部</n-button>
          <n-button type="primary" @click="showResult = false">确定</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 编辑弹窗 -->
    <n-modal v-model:show="showEdit" preset="card" title="编辑激活码" style="max-width:450px;">
      <n-form label-placement="left" label-width="80">
        <n-form-item label="激活码">
          <n-input :value="editForm.code" disabled />
        </n-form-item>
        <n-form-item label="类型">
          <n-select v-model:value="editForm.type" :options="genTypeOptions" />
        </n-form-item>
        <n-form-item label="状态">
          <n-select v-model:value="editForm.status" :options="editStatusOptions" />
        </n-form-item>
        <n-form-item label="备注">
          <n-input v-model:value="editForm.remark" placeholder="可选" />
        </n-form-item>
        <n-form-item label="过期时间">
          <n-date-picker v-model:value="editForm.expiredAt" type="datetime" clearable style="width: 100%" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showEdit = false">取消</n-button>
          <n-button type="primary" :loading="saving" @click="handleSave">保存</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, h, onMounted } from 'vue'
import {
  NButton, NIcon, NDataTable, NPagination,
  NModal, NForm, NFormItem, NInput, NInputNumber, NSelect,
  NSpace, NTag, NDatePicker, NAlert,
  useMessage, useDialog
} from 'naive-ui'
import { AddOutline, TrashOutline, CopyOutline, CreateOutline } from '@vicons/ionicons5'
import { adminApi } from '@/api'

const message = useMessage()
const dialog = useDialog()

const loading = ref(false)
const items = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const selectedIds = ref([])
const filterType = ref(null)
const filterStatus = ref(null)
const showGenerate = ref(false)
const showResult = ref(false)
const showEdit = ref(false)
const generating = ref(false)
const saving = ref(false)
const generatedCodes = ref([])
const generatedCodesText = ref('')
const editForm = ref({ id: null, code: '', type: 'invite', status: 'unused', remark: '', expiredAt: null })

const typeOptions = [
  { label: '邀请码', value: 'invite' },
  { label: '优惠券', value: 'coupon' },
]
const statusOptions = [
  { label: '未使用', value: 'unused' },
  { label: '已使用', value: 'used' },
  { label: '已过期', value: 'expired' },
]
const genTypeOptions = [
  { label: '邀请码 (invite)', value: 'invite' },
  { label: '优惠券 (coupon)', value: 'coupon' },
]
const editStatusOptions = [
  { label: '未使用', value: 'unused' },
  { label: '已使用', value: 'used' },
  { label: '已过期', value: 'expired' },
]

const genForm = ref({ type: 'invite', count: 10, prefix: '', remark: '', expiredAt: null })

const typeLabel = { invite: '邀请码', coupon: '优惠券' }
const typeColor = { invite: 'info', coupon: 'warning' }
const statusLabel = { unused: '未使用', used: '已使用', expired: '已过期' }
const statusColor = { unused: 'success', used: 'default', expired: 'error' }

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function copyCode(code) {
  try { await navigator.clipboard.writeText(code); message.success('已复制') }
  catch { message.error('复制失败') }
}

function openEditModal(row) {
  editForm.value = {
    id: row.id, code: row.code, type: row.type, status: row.status,
    remark: row.remark || '', expiredAt: row.expiredAt ? new Date(row.expiredAt).getTime() : null,
  }
  showEdit.value = true
}

async function handleSave() {
  saving.value = true
  try {
    await adminApi.updateActivationCode(editForm.value.id, {
      type: editForm.value.type, status: editForm.value.status,
      remark: editForm.value.remark,
      expiredAt: editForm.value.expiredAt ? new Date(editForm.value.expiredAt).toISOString() : null,
    })
    message.success('保存成功')
    showEdit.value = false
    loadData()
  } catch (err) {
    message.error(err.response?.data?.error || '保存失败')
  } finally {
    saving.value = false
  }
}

const columns = [
  { type: 'selection' },
  { title: 'ID', key: 'id', width: 60, sorter: (a, b) => a.id - b.id },
  {
    title: '激活码', key: 'code', minWidth: 200,
    render: (row) => h('div', { style: 'display:flex;align-items:center;gap:4px;white-space:nowrap' }, [
      h('code', {}, row.code),
      h(NIcon, { size: 14, style: 'cursor:pointer;opacity:0.5;flex-shrink:0', onClick: () => copyCode(row.code) }, () => h(CopyOutline)),
    ]),
  },
  {
    title: '类型', key: 'type', width: 100,
    render: (row) => h(NTag, { size: 'small', type: typeColor[row.type] || 'default' }, () => typeLabel[row.type] || row.type),
  },
  {
    title: '状态', key: 'status', width: 90,
    render: (row) => h(NTag, { size: 'small', type: statusColor[row.status] || 'default' }, () => statusLabel[row.status] || row.status),
  },
  { title: '使用者', key: 'usedBy', width: 80, render: (row) => row.usedBy || '-' },
  { title: '备注', key: 'remark', width: 120, ellipsis: { tooltip: true }, render: (row) => row.remark || '-' },
  { title: '创建时间', key: 'createdAt', width: 160, sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt), render: (row) => formatDate(row.createdAt) },
  {
    title: '操作', key: 'actions', width: 160,
    render: (row) => h(NSpace, { size: 4, wrap: false }, () => [
      h(NButton, { size: 'small', tertiary: true, onClick: () => openEditModal(row) }, { icon: () => h(NIcon, { size: 14 }, () => h(CreateOutline)), default: () => '编辑' }),
      h(NButton, { size: 'small', type: 'error', tertiary: true, onClick: () => handleDelete(row) }, { icon: () => h(NIcon, { size: 14 }, () => h(TrashOutline)), default: () => '删除' }),
    ]),
  },
]

async function loadData() {
  loading.value = true
  try {
    const res = await adminApi.getActivationCodes({
      page: currentPage.value, pageSize: pageSize.value,
      type: filterType.value || '', status: filterStatus.value || '',
    })
    items.value = res.items
    total.value = res.total
  } catch { message.error('加载失败') }
  finally { loading.value = false }
}

function handlePageSizeChange() { currentPage.value = 1; loadData() }

async function handleGenerate() {
  generating.value = true
  try {
    const res = await adminApi.generateActivationCodes({
      type: genForm.value.type, count: genForm.value.count,
      prefix: genForm.value.prefix || '', remark: genForm.value.remark || '',
      expiredAt: genForm.value.expiredAt ? new Date(genForm.value.expiredAt).toISOString() : null,
    })
    generatedCodes.value = res.codes
    generatedCodesText.value = res.codes.map(c => c.code).join('\n')
    showGenerate.value = false
    showResult.value = true
    loadData()
  } catch (err) { message.error(err.response?.data?.error || '生成失败') }
  finally { generating.value = false }
}

async function handleCopyAll() {
  try { await navigator.clipboard.writeText(generatedCodesText.value); message.success('已复制到剪贴板') }
  catch { message.error('复制失败') }
}

function handleDelete(row) {
  dialog.warning({
    title: '确认删除', content: `确定删除激活码 ${row.code}？`,
    positiveText: '删除', negativeText: '取消',
    onPositiveClick: async () => {
      try { await adminApi.deleteActivationCode(row.id); message.success('删除成功'); loadData() }
      catch { message.error('删除失败') }
    },
  })
}

function handleBatchDelete() {
  dialog.warning({
    title: '批量删除', content: `确定删除选中的 ${selectedIds.value.length} 个激活码？`,
    positiveText: '删除', negativeText: '取消',
    onPositiveClick: async () => {
      try { await adminApi.batchDeleteActivationCodes(selectedIds.value); message.success('删除成功'); selectedIds.value = []; loadData() }
      catch { message.error('删除失败') }
    },
  })
}

onMounted(loadData)
</script>

<style scoped>
.activation-codes-view { padding: 0; }
.filter-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
.filter-select { flex: 1; }
</style>
