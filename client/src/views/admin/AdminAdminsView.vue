<template>
  <div class="admins-view">
    <div class="admin-page-header">
      <h2 class="admin-page-title">管理员管理</h2>
      <div class="admin-page-actions">
        <n-button type="primary" @click="showForm = true; editingAdmin = null; resetForm()">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          新增管理员
        </n-button>
      </div>
    </div>

    <div class="admin-table-card">
      <n-data-table :columns="columns" :data="adminStore.admins" :bordered="false" :loading="loading" :row-key="row => row.id" />
    </div>

    <!-- 新增弹窗 -->
    <n-modal v-model:show="showForm" preset="card" title="新增管理员" style="max-width:450px;">
      <n-form ref="formRef" :model="form" :rules="formRules" label-placement="left" label-width="80">
        <n-form-item label="用户名" path="username">
          <n-input v-model:value="form.username" placeholder="管理员用户名" />
        </n-form-item>
        <n-form-item label="密码" path="password">
          <n-input v-model:value="form.password" type="password" placeholder="至少6位" show-password-on="click" />
        </n-form-item>
        <n-form-item label="昵称" path="nickname">
          <n-input v-model:value="form.nickname" placeholder="显示昵称" />
        </n-form-item>
        <n-form-item label="角色" path="role">
          <n-select v-model:value="form.role" :options="[{ label: '超级管理员', value: 'super' }, { label: '管理员', value: 'admin' }]" />
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
  NInput, NSelect, NSpace, NTag, useMessage, useDialog
} from 'naive-ui'
import { AddOutline } from '@vicons/ionicons5'
import { useAdminStore } from '@/stores/admin'

const adminStore = useAdminStore()
const message = useMessage()
const dialog = useDialog()

const loading = ref(false)
const showForm = ref(false)
const editingAdmin = ref(null)
const submitting = ref(false)
const formRef = ref(null)

const defaultForm = { username: '', password: '', nickname: '', role: 'admin' }
const form = ref({ ...defaultForm })

const formRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, min: 6, message: '密码至少6位', trigger: 'blur' }],
}

const columns = [
  { title: 'ID', key: 'id', width: 60 },
  { title: '用户名', key: 'username' },
  { title: '昵称', key: 'nickname' },
  { title: '角色', key: 'role', render: (row) => h(NTag, { type: row.role === 'super' ? 'warning' : 'info', size: 'small' }, () => row.role === 'super' ? '超级管理员' : '管理员') },
  {
    title: '状态', key: 'isActive', width: 100,
    render: (row) => h(NTag, { type: row.isActive ? 'success' : 'error', size: 'small' }, () => row.isActive ? '启用' : '禁用')
  },
  {
    title: '操作', key: 'actions', width: 80, fixed: 'right',
    render: (row) => h(NButton, { size: 'small', type: 'error', tertiary: true, onClick: () => handleDelete(row) }, () => '删除')
  },
]

function resetForm() { form.value = { ...defaultForm } }

async function handleSubmit() {
  try { await formRef.value?.validate() } catch { return }
  submitting.value = true
  try {
    await adminStore.createAdmin(form.value)
    message.success('创建成功')
    showForm.value = false
    loadData()
  } catch (e) {
    message.error(e.response?.data?.error || '创建失败')
  } finally { submitting.value = false }
}

function handleDelete(row) {
  dialog.warning({
    title: '确认删除',
    content: `确定删除管理员「${row.username}」吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try { await adminStore.deleteAdmin(row.id); message.success('删除成功'); loadData() }
      catch (e) { message.error(e.response?.data?.error || '删除失败') }
    },
  })
}

async function loadData() {
  loading.value = true
  try { await adminStore.fetchAdmins() }
  finally { loading.value = false }
}

onMounted(() => loadData())
</script>
