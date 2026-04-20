<template>
  <div class="activation-codes-view">
    <div class="admin-page-header">
      <h2 class="admin-page-title">激活码管理</h2>
      <div class="admin-page-actions">
        <n-select v-model:value="filterType" :options="typeOptions" placeholder="类型筛选" clearable style="width: 130px" @update:value="loadData" />
        <n-select v-model:value="filterStatus" :options="statusOptions" placeholder="状态筛选" clearable style="width: 120px" @update:value="loadData" />
        <n-button type="primary" @click="showGenerate = true">
          生成激活码
        </n-button>
      </div>
    </div>

    <div class="admin-table-card">
      <n-data-table
        :columns="columns"
        :data="items"
        :bordered="false"
        :loading="loading"
        :row-key="row => row.id"
        :remote
        :pagination="pagination"
        @update:page="handlePageChange"
      />
    </div>

    <!-- 生成弹窗 -->
    <n-modal v-model:show="showGenerate" preset="card" title="生成激活码" :style="{ maxWidth: '460px', width: '90vw' }">
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
    <n-modal v-model:show="showResult" preset="card" title="生成结果" :style="{ maxWidth: '500px', width: '90vw' }">
      <n-alert type="success" :title="`成功生成 ${generatedCodes.length} 个激活码`" style="margin-bottom: 12px" />
      <n-input
        type="textarea"
        :value="generatedCodesText"
        readonly
        :autosize="{ minRows: 4, maxRows: 12 }"
        style="font-family: monospace"
      />
      <template #footer>
        <n-space justify="end">
          <n-button @click="handleCopyAll">复制全部</n-button>
          <n-button type="primary" @click="showResult = false">确定</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, h, onMounted } from 'vue'
import {
  NButton, NDataTable, NModal, NForm, NFormItem, NInput, NInputNumber,
  NSelect, NSpace, NTag, NDatePicker, NAlert, useMessage, useDialog
} from 'naive-ui'
import { adminApi } from '@/api'

const message = useMessage()
const dialog = useDialog()

const loading = ref(false)
const items = ref([])
const filterType = ref(null)
const filterStatus = ref(null)
const showGenerate = ref(false)
const showResult = ref(false)
const generating = ref(false)
const generatedCodes = ref([])
const generatedCodesText = ref('')

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

const genForm = ref({
  type: 'invite',
  count: 10,
  prefix: '',
  remark: '',
  expiredAt: null,
})

const pagination = ref({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: false,
})

const typeLabel = { invite: '邀请码', coupon: '优惠券' }
const typeColor = { invite: 'info', coupon: 'warning' }
const statusLabel = { unused: '未使用', used: '已使用', expired: '已过期' }
const statusColor = { unused: 'success', used: 'default', expired: 'error' }

const columns = [
  { title: 'ID', key: 'id', width: 60 },
  { title: '激活码', key: 'code', ellipsis: { tooltip: true } },
  {
    title: '类型', key: 'type', width: 100,
    render: (row) => h(NTag, { size: 'small', type: typeColor[row.type] || 'default', bordered: false }, () => typeLabel[row.type] || row.type),
  },
  {
    title: '状态', key: 'status', width: 90,
    render: (row) => h(NTag, { size: 'small', type: statusColor[row.status] || 'default', bordered: false }, () => statusLabel[row.status] || row.status),
  },
  { title: '使用者ID', key: 'usedBy', width: 80, render: (row) => row.usedBy || '-' },
  { title: '备注', key: 'remark', width: 120, ellipsis: { tooltip: true }, render: (row) => row.remark || '-' },
  { title: '创建时间', key: 'createdAt', width: 160, render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleString() : '-' },
  {
    title: '操作', key: 'actions', width: 80,
    render: (row) => h(NButton, {
      size: 'small', type: 'error', quaternary: true,
      onClick: () => handleDelete(row),
    }, () => '删除'),
  },
]

async function loadData() {
  loading.value = true
  try {
    const res = await adminApi.getActivationCodes({
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
      type: filterType.value || '',
      status: filterStatus.value || '',
    })
    items.value = res.items
    pagination.value.itemCount = res.total
  } catch (err) {
    message.error('加载失败')
  } finally {
    loading.value = false
  }
}

function handlePageChange(page) {
  pagination.value.page = page
  loadData()
}

async function handleGenerate() {
  generating.value = true
  try {
    const res = await adminApi.generateActivationCodes({
      type: genForm.value.type,
      count: genForm.value.count,
      prefix: genForm.value.prefix || '',
      remark: genForm.value.remark || '',
      expiredAt: genForm.value.expiredAt ? new Date(genForm.value.expiredAt).toISOString() : null,
    })
    generatedCodes.value = res.codes
    generatedCodesText.value = res.codes.map(c => c.code).join('\n')
    showGenerate.value = false
    showResult.value = true
    loadData()
  } catch (err) {
    message.error(err.response?.data?.error || '生成失败')
  } finally {
    generating.value = false
  }
}

async function handleCopyAll() {
  try {
    await navigator.clipboard.writeText(generatedCodesText.value)
    message.success('已复制到剪贴板')
  } catch {
    message.error('复制失败')
  }
}

function handleDelete(row) {
  dialog.warning({
    title: '确认删除',
    content: `确定删除激活码 ${row.code}？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await adminApi.deleteActivationCode(row.id)
        message.success('删除成功')
        loadData()
      } catch (err) {
        message.error('删除失败')
      }
    },
  })
}

onMounted(loadData)
</script>

<style scoped>
.activation-codes-view {
  padding: 0;
}
</style>
