<template>
  <div class="categories-view">
    <div class="admin-page-header">
      <h2 class="admin-page-title">类别管理</h2>
      <div class="admin-page-actions">
        <n-button type="primary" @click="showForm = true; editingCategory = null; resetForm()">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          新增类别
        </n-button>
      </div>
    </div>

    <div class="admin-table-card">
      <n-data-table
        :columns="columns"
        :data="adminStore.categories"
        :bordered="false"
        :loading="loading"
        :row-key="row => row.id"
      />
    </div>

    <!-- 新增/编辑弹窗 -->
    <n-modal v-model:show="showForm" preset="card" :title="editingCategory ? '编辑类别' : '新增类别'" style="max-width:600px;">
      <n-form ref="formRef" :model="form" :rules="formRules" label-placement="left" label-width="100">
        <n-form-item label="类别名称" path="name">
          <n-input v-model:value="form.name" placeholder="类别名称" />
        </n-form-item>
        <n-form-item label="类别代码" path="code">
          <n-input v-model:value="form.code" placeholder="类别代码（如 SMS）" />
        </n-form-item>
        <n-form-item label="排序" path="sort">
          <n-input-number v-model:value="form.sort" :min="0" style="width:100%" />
        </n-form-item>
        <n-form-item label="显示" path="show">
          <n-switch v-model:value="form.show" />
        </n-form-item>
        <n-divider>接码配置</n-divider>
        <n-form-item label="需要接码" path="smsEnabled">
          <n-switch v-model:value="form.smsEnabled" />
        </n-form-item>
        <n-form-item v-if="form.smsEnabled" label="接码价格" path="smsPrice">
          <n-input-number v-model:value="form.smsPrice" :min="0" :precision="2" style="width:100%" placeholder="0.00" />
        </n-form-item>
        <n-form-item v-if="form.smsEnabled" label="支付名称" path="smsPaymentName">
          <n-input v-model:value="form.smsPaymentName" placeholder="接码服务支付显示名称" />
        </n-form-item>
        <n-form-item v-if="form.smsEnabled" label="关键词" path="smKeyWord">
          <n-input v-model:value="form.smKeyWord" placeholder="MAAPI 关键词" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showForm = false">取消</n-button>
          <n-button type="primary" :loading="submitting" @click="handleSubmit">确定</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, h, onMounted } from 'vue'
import {
  NButton, NIcon, NDataTable, NModal, NForm, NFormItem,
  NInput, NInputNumber, NSwitch, NDivider, NSpace, NTag, useMessage, useDialog
} from 'naive-ui'
import { AddOutline } from '@vicons/ionicons5'
import { useAdminStore } from '@/stores/admin'

const adminStore = useAdminStore()
const message = useMessage()
const dialog = useDialog()

const loading = ref(false)
const showForm = ref(false)
const editingCategory = ref(null)
const submitting = ref(false)
const formRef = ref(null)

const defaultForm = { name: '', code: '', sort: 0, show: true, smsEnabled: false, smsPrice: 0, smsPaymentName: '', smKeyWord: '' }
const form = ref({ ...defaultForm })

const formRules = {
  name: [{ required: true, message: '请输入类别名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入类别代码', trigger: 'blur' }],
}

const columns = [
  { title: 'ID', key: 'id', width: 60 },
  { title: '名称', key: 'name' },
  { title: '代码', key: 'code', width: 100 },
  { title: '排序', key: 'sort', width: 60 },
  {
    title: '显示', key: 'show', width: 80,
    render: (row) => h(NTag, { type: row.show ? 'success' : 'default', size: 'small' }, () => row.show ? '显示' : '隐藏')
  },
  {
    title: '接码', key: 'smsEnabled', width: 80,
    render: (row) => h(NTag, { type: row.smsEnabled ? 'info' : 'default', size: 'small' }, () => row.smsEnabled ? '需要' : '不需要')
  },
  {
    title: '接码价格', key: 'smsPrice', width: 100,
    render: (row) => row.smsEnabled ? `¥${row.smsPrice || 0}` : '-'
  },
  {
    title: '操作', key: 'actions', width: 140, fixed: 'right',
    render: (row) => h(NSpace, { size: 'small' }, () => [
      h(NButton, { size: 'small', tertiary: true, onClick: () => handleEdit(row) }, () => '编辑'),
      h(NButton, { size: 'small', type: 'error', tertiary: true, onClick: () => handleDelete(row) }, () => '删除'),
    ])
  },
]

function resetForm() {
  form.value = { ...defaultForm }
}

function handleEdit(row) {
  editingCategory.value = row
  form.value = {
    name: row.name,
    code: row.code || '',
    sort: row.sort || 0,
    show: row.show !== 0 && row.show !== false,
    smsEnabled: row.smsEnabled === 1 || row.smsEnabled === true,
    smsPrice: row.smsPrice || 0,
    smsPaymentName: row.smsPaymentName || '',
    smKeyWord: row.smKeyWord || '',
  }
  showForm.value = true
}

async function handleSubmit() {
  try { await formRef.value?.validate() } catch { return }
  submitting.value = true
  try {
    const data = {
      ...form.value,
      show: form.value.show ? 1 : 0,
      smsEnabled: form.value.smsEnabled ? 1 : 0,
    }
    if (editingCategory.value) {
      await adminStore.updateCategory(editingCategory.value.id, data)
      message.success('更新成功')
    } else {
      await adminStore.createCategory(data)
      message.success('创建成功')
    }
    showForm.value = false
    loadData()
  } catch (e) {
    message.error(e.response?.data?.error || '操作失败')
  } finally {
    submitting.value = false
  }
}

function handleDelete(row) {
  dialog.warning({
    title: '确认删除',
    content: `确定删除类别「${row.name}」吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await adminStore.deleteCategory(row.id)
        message.success('删除成功')
        loadData()
      } catch (e) {
        message.error(e.response?.data?.error || '删除失败')
      }
    },
  })
}

async function loadData() {
  loading.value = true
  try {
    await adminStore.fetchCategories()
  } finally {
    loading.value = false
  }
}

onMounted(() => loadData())
</script>
