<template>
  <div class="admins-view">
    <div class="admin-page-header">
      <h2 class="admin-page-title">管理员管理</h2>
      <div class="admin-page-actions">
        <n-button type="primary" @click="openForm">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          新增管理员
        </n-button>
        <n-button type="error" size="small" :disabled="!selectedKeys.length" @click="handleBatchDelete">
          <template #icon><n-icon><TrashOutline /></n-icon></template>
          批量删除 ({{ selectedKeys.length }})
        </n-button>
      </div>
    </div>

    <div class="admin-table-card">
      <n-data-table
        :columns="columns"
        :data="admins"
        :bordered="false"
        :loading="loading"
        :row-key="row => row.id"
        v-model:checked-row-keys="selectedKeys"
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

    <!-- 新增弹窗 -->
    <n-modal v-model:show="showForm" preset="card" title="新增管理员" style="max-width:450px;">
      <n-form ref="formRef" :model="form" :rules="formRules" label-placement="left" label-width="80">
        <n-form-item label="用户名" path="username">
          <n-input v-model:value="form.username" placeholder="3-20位英文、数字、下划线" />
        </n-form-item>
        <n-form-item label="密码" path="password">
          <n-input v-model:value="form.password" type="password" placeholder="至少6位" show-password-on="click" />
        </n-form-item>
        <n-form-item label="昵称">
          <n-input v-model:value="form.nickname" placeholder="显示名称（可选）" />
        </n-form-item>
        <n-form-item label="角色">
          <n-select v-model:value="form.role" :options="roleOptions" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showForm = false">取消</n-button>
          <n-button type="primary" :loading="submitting" @click="handleSubmit">创建</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, h, onMounted } from 'vue'
import {
  NButton, NIcon, NDataTable, NModal, NForm, NFormItem,
  NInput, NSelect, NSpace, NTag, NPagination, NTooltip,
  useMessage, useDialog
} from 'naive-ui'
import { AddOutline, TrashOutline, CreateOutline } from '@vicons/ionicons5'
import { useAdminStore } from '@/stores/admin'
import { useTheme } from '@/composables/useTheme'

const adminStore = useAdminStore()
const { adminInfo } = adminStore
const message = useMessage()
const dialog = useDialog()

const loading = ref(false)
const showForm = ref(false)
const submitting = ref(false)
const formRef = ref(null)
const selectedKeys = ref([])

const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const admins = ref([])

const defaultForm = { username: '', password: '', nickname: '', role: 'admin' }
const form = ref({ ...defaultForm })

const roleOptions = [
  { label: '超级管理员', value: 'super' },
  { label: '管理员', value: 'admin' },
]

const formRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, min: 6, message: '密码至少6位', trigger: 'blur' }],
}

const columns = [
  { type: 'selection' },
  { title: 'ID', key: 'id', width: 60, sorter: (a, b) => a.id - b.id },
  {
    title: '用户名', key: 'username',
    render: (row) => h('span', { style: 'font-weight:600' }, row.username),
  },
  { title: '昵称', key: 'nickname', render: (row) => row.nickname || '-' },
  {
    title: '角色', key: 'role', width: 110,
    render: (row) => h(NTag, { type: row.role === 'super' ? 'primary' : 'info', size: 'small' }, () => row.role === 'super' ? '超级管理员' : '管理员'),
  },
  {
    title: '状态', key: 'isActive', minWidth: 70,
    render: (row) => h(NTag, { type: row.isActive ? 'success' : 'error', size: 'small' }, () => row.isActive ? '正常' : '禁用'),
  },
  {
    title: '创建时间', key: 'createdAt', width: 160, sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    render: (row) => formatDate(row.createdAt),
  },
  {
    title: '操作', key: 'actions', width: 90, fixed: 'right',
    render: (row) => {
      if (row.role === 'super') {
        return h(NTooltip, {}, {
          trigger: () => h(NButton, { size: 'small', type: 'error', tertiary: true, disabled: true }, { icon: () => h(NIcon, { size: 14 }, () => h(TrashOutline)), default: () => '删除' }),
          default: () => '不能删除超级管理员',
        })
      }
      return h(NButton, { size: 'small', type: 'error', tertiary: true, onClick: () => handleDelete(row) }, { icon: () => h(NIcon, { size: 14 }, () => h(TrashOutline)), default: () => '删除' })
    },
  },
]

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function openForm() {
  form.value = { ...defaultForm }
  showForm.value = true
}

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

function handleBatchDelete() {
  // 过滤掉超管
  const deletable = selectedKeys.value.filter(id => {
    const admin = admins.value.find(a => a.id === id)
    return admin && admin.role !== 'super'
  })
  if (!deletable.length) {
    message.warning('没有可删除的管理员（超管不可删除）')
    return
  }
  dialog.warning({
    title: '批量删除',
    content: `确定删除选中的 ${deletable.length} 个管理员吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        for (const id of deletable) {
          await adminStore.deleteAdmin(id)
        }
        message.success('批量删除成功')
        selectedKeys.value = []
        loadData()
      } catch (e) {
        message.error(e.response?.data?.error || '删除失败')
      }
    },
  })
}

function handlePageSizeChange(size) { pageSize.value = size; currentPage.value = 1; loadData() }

async function loadData() {
  loading.value = true
  try {
    const res = await adminStore.fetchAdmins({ page: currentPage.value, pageSize: pageSize.value })
    if (Array.isArray(res)) {
      admins.value = res
      total.value = res.length
    } else {
      admins.value = res.items || []
      total.value = res.total || 0
    }
  } finally { loading.value = false }
}

onMounted(() => loadData())
</script>
