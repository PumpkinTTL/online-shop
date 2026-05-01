<template>
  <div class="announcements-view">
    <div class="admin-page-header">
      <h2 class="admin-page-title">公告管理</h2>
      <div class="admin-page-actions">
        <n-select v-model:value="filterType" :options="typeFilterOptions" placeholder="类型" clearable size="small" style="width:100px" />
        <n-select v-model:value="filterStatus" :options="statusFilterOptions" placeholder="状态" clearable size="small" style="width:100px" />
        <n-button type="primary" size="small" @click="handleFilter">
          <template #icon><n-icon><SearchOutline /></n-icon></template>
          筛选
        </n-button>
        <n-button type="primary" size="small" @click="openModal(null)">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          创建公告
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
        :data="adminStore.announcements"
        :bordered="false"
        :loading="loading"
        :row-key="row => row.id"
        v-model:checked-row-keys="selectedIds"
      />
      <div class="admin-pagination">
        <n-pagination
          v-model:page="currentPage"
          v-model:page-size="pageSize"
          :item-count="adminStore.announcementsTotal"
          :page-sizes="[10, 20, 30, 50]"
          show-size-picker
          @update:page="loadData"
          @update:page-size="handlePageSizeChange"
        />
      </div>
    </div>

    <!-- 创建/编辑弹窗 -->
    <n-modal v-model:show="showModal" preset="card" :title="editingId ? '编辑公告' : '创建公告'" style="max-width:560px;">
      <n-form :model="form" label-placement="left" label-width="80">
        <n-form-item label="标题" required>
          <n-input v-model:value="form.title" placeholder="公告标题" maxlength="200" show-count />
        </n-form-item>
        <n-form-item label="内容" required>
          <n-input v-model:value="form.content" type="textarea" placeholder="公告内容" :rows="4" />
        </n-form-item>
        <n-form-item label="类型">
          <n-select v-model:value="form.type" :options="typeOptions" />
        </n-form-item>
        <n-form-item label="启用">
          <n-switch v-model:value="form.isActive" />
        </n-form-item>
        <n-form-item label="置顶">
          <n-switch v-model:value="form.isPinned" />
        </n-form-item>
        <n-form-item label="开始时间">
          <n-date-picker v-model:value="form.startTime" type="datetime" style="width:100%" clearable placeholder="留空=立即生效" />
        </n-form-item>
        <n-form-item label="结束时间">
          <n-date-picker v-model:value="form.endTime" type="datetime" style="width:100%" clearable placeholder="留空=永不过期" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showModal = false">取消</n-button>
          <n-button type="primary" :loading="saving" @click="handleSave">{{ editingId ? '保存' : '创建' }}</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, h, onMounted } from 'vue'
import {
  NButton, NIcon, NDataTable, NPagination, NModal, NForm, NFormItem,
  NInput, NSelect, NSpace, NSwitch, NTag, NDatePicker,
  useMessage, useDialog
} from 'naive-ui'
import { AddOutline, TrashOutline, CreateOutline, SearchOutline, PinOutline } from '@vicons/ionicons5'
import { useAdminStore } from '@/stores/admin'

const adminStore = useAdminStore()
const message = useMessage()
const dialog = useDialog()

const loading = ref(false)
const selectedIds = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const filterType = ref(null)
const filterStatus = ref(null)

const typeFilterOptions = [
  { label: '通知', value: 'info' },
  { label: '警告', value: 'warning' },
  { label: '错误', value: 'error' },
  { label: '成功', value: 'success' },
]

const statusFilterOptions = [
  { label: '已启用', value: 'true' },
  { label: '已禁用', value: 'false' },
]

const typeOptions = [
  { label: '通知 (蓝色)', value: 'info' },
  { label: '警告 (橙色)', value: 'warning' },
  { label: '错误 (红色)', value: 'error' },
  { label: '成功 (绿色)', value: 'success' },
]

const typeTagMap = { info: 'info', warning: 'warning', error: 'error', success: 'success' }
const typeLabelMap = { info: '通知', warning: '警告', error: '错误', success: '成功' }

// 弹窗
const showModal = ref(false)
const saving = ref(false)
const editingId = ref(null)
const emptyForm = () => ({
  title: '', content: '', type: 'info',
  isActive: true, isPinned: false,
  startTime: null, endTime: null,
})
const form = ref(emptyForm())

function openModal(row) {
  if (row) {
    editingId.value = row.id
    form.value = {
      title: row.title,
      content: row.content,
      type: row.type,
      isActive: row.isActive,
      isPinned: row.isPinned,
      startTime: row.startTime ? new Date(row.startTime).getTime() : null,
      endTime: row.endTime ? new Date(row.endTime).getTime() : null,
    }
  } else {
    editingId.value = null
    form.value = emptyForm()
  }
  showModal.value = true
}

async function handleSave() {
  if (!form.value.title.trim()) { message.warning('请填写标题'); return }
  if (!form.value.content.trim()) { message.warning('请填写内容'); return }

  saving.value = true
  try {
    const data = {
      title: form.value.title.trim(),
      content: form.value.content.trim(),
      type: form.value.type,
      isActive: form.value.isActive,
      isPinned: form.value.isPinned,
      startTime: form.value.startTime ? new Date(form.value.startTime).toISOString() : null,
      endTime: form.value.endTime ? new Date(form.value.endTime).toISOString() : null,
    }
    if (editingId.value) {
      await adminStore.updateAnnouncement(editingId.value, data)
      message.success('保存成功')
    } else {
      await adminStore.createAnnouncement(data)
      message.success('创建成功')
    }
    showModal.value = false
    loadData()
  } catch (e) {
    message.error(e.response?.data?.error || '操作失败')
  } finally {
    saving.value = false
  }
}

// 表格列
const columns = [
  { type: 'selection' },
  { title: 'ID', key: 'id', width: 60, sorter: (a, b) => a.id - b.id },
  { title: '标题', key: 'title', minWidth: 150 },
  {
    title: '类型', key: 'type', width: 80, align: 'center',
    render: (row) => h(NTag, { type: typeTagMap[row.type] || 'info', size: 'small' }, () => typeLabelMap[row.type] || row.type),
  },
  {
    title: '状态', key: 'isActive', width: 80, align: 'center',
    render: (row) => h(NTag, { type: row.isActive ? 'success' : 'default', size: 'small' }, () => row.isActive ? '启用' : '禁用'),
  },
  {
    title: '置顶', key: 'isPinned', width: 70, align: 'center',
    render: (row) => row.isPinned
      ? h(NIcon, { size: 16, color: '#F59E0B' }, () => h(PinOutline))
      : h('span', { style: 'color:#94A3B8' }, '-'),
  },
  {
    title: '有效期', key: 'validity', width: 200,
    render: (row) => {
      if (!row.startTime && !row.endTime) return h('span', { style: 'color:#94A3B8' }, '永久')
      return h('span', { style: 'font-size:12px;color:#64748B' }, [
        row.startTime ? formatDate(row.startTime) : '...',
        ' ~ ',
        row.endTime ? formatDate(row.endTime) : '...',
      ])
    },
  },
  {
    title: '创建时间', key: 'createdAt', width: 145, sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    render: (row) => formatDate(row.createdAt),
  },
  {
    title: '操作', key: 'actions', width: 130, fixed: 'right',
    render: (row) => h(NSpace, { size: 4, wrap: false }, () => [
      h(NButton, { size: 'small', tertiary: true, type: 'primary', onClick: () => openModal(row) }, { icon: () => h(NIcon, { size: 14 }, () => h(CreateOutline)), default: () => '编辑' }),
      h(NButton, { size: 'small', type: 'error', tertiary: true, onClick: () => handleDelete(row) }, { icon: () => h(NIcon, { size: 14 }, () => h(TrashOutline)), default: () => '删除' }),
    ]),
  },
]

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function handleDelete(row) {
  dialog.warning({
    title: '确认删除',
    content: `确定删除公告「${row.title}」吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await adminStore.deleteAnnouncement(row.id)
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
    content: `确定删除选中的 ${selectedIds.value.length} 条公告吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await adminStore.batchDeleteAnnouncements(selectedIds.value)
        message.success('批量删除成功')
        selectedIds.value = []
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
    if (filterType.value) params.type = filterType.value
    if (filterStatus.value) params.isActive = filterStatus.value
    await adminStore.fetchAnnouncements(params)
  } finally {
    loading.value = false
  }
}

onMounted(() => loadData())
</script>
