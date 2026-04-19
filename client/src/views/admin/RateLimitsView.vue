<template>
  <div class="rate-limits-view">
    <div class="admin-page-header">
      <h2 class="admin-page-title">速率限制配置</h2>
      <div class="admin-page-actions">
        <n-button type="warning" @click="handleReset">重置为默认值</n-button>
      </div>
    </div>

    <div class="admin-table-card">
      <n-data-table :columns="columns" :data="adminStore.rateLimits" :bordered="false" :loading="loading" :row-key="row => row.key" />
    </div>

    <!-- 编辑弹窗 -->
    <n-modal v-model:show="showEdit" preset="card" title="编辑速率限制" style="max-width:450px;">
      <n-form label-placement="left" label-width="100">
        <n-form-item label="配置键">
          <n-input :value="editingItem?.key" disabled />
        </n-form-item>
        <n-form-item label="时间窗口(ms)">
          <n-input-number v-model:value="editForm.windowMs" :min="1000" :step="1000" style="width:100%" />
        </n-form-item>
        <n-form-item label="最大请求数">
          <n-input-number v-model:value="editForm.maxRequests" :min="1" style="width:100%" />
        </n-form-item>
        <n-form-item label="启用">
          <n-switch v-model:value="editForm.enabled" />
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
  NButton, NDataTable, NModal, NForm, NFormItem,
  NInput, NInputNumber, NSwitch, NSpace, NTag, useMessage, useDialog
} from 'naive-ui'
import { useAdminStore } from '@/stores/admin'

const adminStore = useAdminStore()
const message = useMessage()
const dialog = useDialog()

const loading = ref(false)
const showEdit = ref(false)
const editingItem = ref(null)
const saving = ref(false)
const editForm = ref({ windowMs: 60000, maxRequests: 100, enabled: true })

const columns = [
  { title: '配置键', key: 'key' },
  { title: '时间窗口', key: 'windowMs', width: 120, render: (row) => `${(row.windowMs / 1000).toFixed(0)}s` },
  { title: '最大请求数', key: 'maxRequests', width: 120 },
  {
    title: '状态', key: 'enabled', width: 100,
    render: (row) => h(NTag, { type: row.enabled ? 'success' : 'error', size: 'small' }, () => row.enabled ? '启用' : '禁用')
  },
  {
    title: '操作', key: 'actions', width: 80,
    render: (row) => h(NButton, { size: 'small', tertiary: true, onClick: () => handleEdit(row) }, () => '编辑')
  },
]

function handleEdit(row) {
  editingItem.value = row
  editForm.value = { windowMs: row.windowMs, maxRequests: row.maxRequests, enabled: row.enabled }
  showEdit.value = true
}

async function handleSave() {
  saving.value = true
  try {
    await adminStore.updateRateLimit(editingItem.value.key, editForm.value)
    message.success('保存成功，立即生效')
    showEdit.value = false
    loadData()
  } catch (e) {
    message.error(e.response?.data?.error || '保存失败')
  } finally {
    saving.value = false
  }
}

function handleReset() {
  dialog.warning({
    title: '重置确认',
    content: '确定要将所有速率限制重置为默认值吗？',
    positiveText: '重置',
    negativeText: '取消',
    onPositiveClick: async () => {
      try { await adminStore.resetRateLimits(); message.success('已重置为默认值'); loadData() }
      catch (e) { message.error(e.response?.data?.error || '重置失败') }
    },
  })
}

async function loadData() {
  loading.value = true
  try { await adminStore.fetchRateLimits() }
  finally { loading.value = false }
}

onMounted(() => loadData())
</script>
