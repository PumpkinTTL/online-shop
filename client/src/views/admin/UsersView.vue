<template>
  <div class="users-view">
    <div class="admin-page-header">
      <h2 class="admin-page-title">用户管理</h2>
      <div class="admin-page-actions">
        <n-button type="error" size="small" :disabled="!selectedKeys.length" @click="handleBatchDelete">
          <template #icon><n-icon><TrashOutline /></n-icon></template>
          批量删除 ({{ selectedKeys.length }})
        </n-button>
      </div>
    </div>

    <div class="admin-table-card">
      <n-data-table
        :columns="columns"
        :data="adminStore.users"
        :bordered="false"
        :loading="loading"
        :row-key="row => row.id"
        v-model:checked-row-keys="selectedKeys"
      />
      <div class="admin-pagination">
        <n-pagination
          v-model:page="currentPage"
          v-model:page-size="pageSize"
          :item-count="adminStore.usersTotal"
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
import { TrashOutline, ToggleOutline, CheckmarkOutline } from '@vicons/ionicons5'
import {
  NButton, NDataTable, NPagination, NIcon,
  NSpace, NTag, useMessage, useDialog
} from 'naive-ui'
import { useAdminStore } from '@/stores/admin'

const adminStore = useAdminStore()
const message = useMessage()
const dialog = useDialog()

const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const selectedKeys = ref([])

const columns = [
  { type: 'selection' },
  { title: 'ID', key: 'id', width: 60 },
  { title: '用户名', key: 'username' },
  { title: '昵称', key: 'nickname' },
  {
    title: '状态', key: 'isActive', width: 100,
    render: (row) => h(NTag, { type: row.isActive ? 'success' : 'error', size: 'small' }, () => row.isActive ? '启用' : '禁用')
  },
  { title: '注册时间', key: 'createdAt', width: 170 },
  {
    title: '操作', key: 'actions', width: 180, fixed: 'right',
    render: (row) => h(NSpace, { size: 4, wrap: false }, () => [
      h(NButton, { size: 'small', tertiary: true, type: row.isActive ? 'warning' : 'success', onClick: () => handleToggle(row) }, { icon: () => h(NIcon, { size: 14 }, () => h(row.isActive ? ToggleOutline : CheckmarkOutline)), default: () => row.isActive ? '禁用' : '启用' }),
      h(NButton, { size: 'small', type: 'error', tertiary: true, onClick: () => handleDelete(row) }, { icon: () => h(NIcon, { size: 14 }, () => h(TrashOutline)), default: () => '删除' }),
    ])
  },
]

async function handleToggle(row) {
  try {
    await adminStore.toggleUserActive(row.id)
    message.success('操作成功')
    loadData()
  } catch (e) {
    message.error(e.response?.data?.error || '操作失败')
  }
}

function handleDelete(row) {
  dialog.warning({
    title: '确认删除',
    content: `确定删除用户「${row.username}」吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try { await adminStore.deleteUser(row.id); message.success('删除成功'); loadData() }
      catch (e) { message.error(e.response?.data?.error || '删除失败') }
    },
  })
}

function handleBatchDelete() {
  dialog.warning({
    title: '批量删除',
    content: `确定删除选中的 ${selectedKeys.value.length} 个用户吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try { await adminStore.batchDeleteUsers(selectedKeys.value); message.success('批量删除成功'); selectedKeys.value = []; loadData() }
      catch (e) { message.error(e.response?.data?.error || '删除失败') }
    },
  })
}

function handlePageSizeChange(size) { pageSize.value = size; currentPage.value = 1; loadData() }

async function loadData() {
  loading.value = true
  try { await adminStore.fetchUsers({ page: currentPage.value, pageSize: pageSize.value }) }
  finally { loading.value = false }
}

onMounted(() => loadData())
</script>
