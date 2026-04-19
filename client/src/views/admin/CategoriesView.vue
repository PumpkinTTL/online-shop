<template>
  <div class="categories-view">
    <div class="admin-page-header">
      <h2 class="admin-page-title">类别管理</h2>
      <div class="admin-page-actions">
        <n-button type="primary" @click="openForm(null)">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          新增类别
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
        :data="adminStore.categories"
        :bordered="false"
        :loading="loading"
        :row-key="row => row.id"
        v-model:checked-row-keys="selectedKeys"
        @update:checked-row-keys="keys => selectedKeys = keys"
      />
    </div>

    <!-- 新增/编辑弹窗 -->
    <n-modal v-model:show="showForm" preset="card" :title="editingCategory ? '编辑类别' : '新增类别'" style="max-width:660px;">
      <n-form ref="formRef" :model="form" :rules="formRules" label-placement="left" label-width="90">
        <n-grid :cols="2" :x-gap="16" responsive="screen" item-responsive>
          <n-gi span="2 m:1">
            <n-form-item label="类别名称" path="name">
              <n-input v-model:value="form.name" placeholder="如：AI绘画" />
            </n-form-item>
          </n-gi>
          <n-gi span="2 m:1">
            <n-form-item label="类别代码" path="code">
              <n-input v-model:value="form.code" placeholder="如：AI" />
            </n-form-item>
          </n-gi>
        </n-grid>
        <n-form-item label="说明">
          <n-input v-model:value="form.description" type="textarea" :rows="2" placeholder="类别说明（可选）" />
        </n-form-item>
        <n-grid :cols="2" :x-gap="16" responsive="screen" item-responsive>
          <n-gi span="2 m:1">
            <n-form-item label="排序">
              <n-input-number v-model:value="form.sort" :min="0" style="width:100%" />
            </n-form-item>
          </n-gi>
          <n-gi span="2 m:1">
            <n-form-item label="上架">
              <n-switch v-model:value="form.show" />
            </n-form-item>
          </n-gi>
        </n-grid>
        <n-divider>接码配置</n-divider>
        <n-form-item label="需要接码" path="smsEnabled">
          <n-switch v-model:value="form.smsEnabled" @update:value="handleSmsToggle" />
        </n-form-item>
        <template v-if="form.smsEnabled">
          <n-grid :cols="2" :x-gap="16" responsive="screen" item-responsive>
            <n-gi span="2 m:1">
              <n-form-item label="接码价格" path="smsPrice">
                <n-input-number v-model:value="form.smsPrice" :min="0" :precision="2" style="width:100%" placeholder="0.00" />
              </n-form-item>
            </n-gi>
            <n-gi span="2 m:1">
              <n-form-item label="支付名称" path="smsPaymentName">
                <n-input v-model:value="form.smsPaymentName" placeholder="支付显示名称" />
              </n-form-item>
            </n-gi>
          </n-grid>
          <n-form-item label="关键词" path="smKeyWord">
            <n-input v-model:value="form.smKeyWord" placeholder="MAAPI 关键词" />
          </n-form-item>
        </template>
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
  NInput, NInputNumber, NSwitch, NDivider, NSpace, NTag, NPopover,
  NGrid, NGi, useMessage, useDialog
} from 'naive-ui'
import { AddOutline, TrashOutline, CreateOutline } from '@vicons/ionicons5'
import { useAdminStore } from '@/stores/admin'

const adminStore = useAdminStore()
const message = useMessage()
const dialog = useDialog()

const loading = ref(false)
const showForm = ref(false)
const editingCategory = ref(null)
const submitting = ref(false)
const formRef = ref(null)
const selectedKeys = ref([])

const defaultForm = { name: '', code: '', description: '', sort: 0, show: true, smsEnabled: false, smsPrice: 0, smsPaymentName: '', smKeyWord: '' }
const form = ref({ ...defaultForm })

const formRules = {
  name: [{ required: true, message: '请输入类别名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入类别代码', trigger: 'blur' }],
}

const columns = [
  { type: 'selection' },
  { title: 'ID', key: 'id', width: 60 },
  {
    title: '类别名称', key: 'name', minWidth: 100,
    render: (row) => h('span', { style: 'font-weight:600' }, row.name),
  },
  {
    title: '代号', key: 'code', minWidth: 70,
    render: (row) => h(NTag, { type: 'info', size: 'small' }, () => row.code),
  },
  {
    title: '说明', key: 'description', minWidth: 120,
    render: (row) => h('span', {
      style: 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px;display:inline-block',
      title: row.description || '-',
    }, row.description || '-'),
  },
  {
    title: '接码', key: 'smsEnabled', minWidth: 80,
    render: (row) => {
      if (row.smsEnabled === 1 || row.smsEnabled === true) {
        return h(NPopover, { trigger: 'click', placement: 'top' }, {
          trigger: () => h(NTag, { type: 'success', size: 'small', style: 'cursor:pointer' }, () => '已启用'),
          default: () => h('div', { style: 'font-size:13px;line-height:2' }, [
            h('div', {}, [`价格: ¥${row.smsPrice || 0}`]),
            h('div', {}, [`支付名: ${row.smsPaymentName || '-'}`]),
            h('div', {}, [`关键词: ${row.smKeyWord || '-'}`]),
          ]),
        })
      }
      return h(NTag, { type: 'default', size: 'small' }, () => '未启用')
    },
  },
  { title: '排序', key: 'sort', minWidth: 60 },
  {
    title: '状态', key: 'show', minWidth: 70,
    render: (row) => h(NTag, { type: row.show ? 'success' : 'default', size: 'small' }, () => row.show ? '是' : '否'),
  },
  {
    title: '操作', key: 'actions', width: 160, fixed: 'right',
    render: (row) => h(NSpace, { size: 4, wrap: false }, () => [
      h(NButton, { size: 'small', tertiary: true, onClick: () => openForm(row) }, { icon: () => h(NIcon, { size: 14 }, () => h(CreateOutline)), default: () => '编辑' }),
      h(NButton, { size: 'small', type: 'error', tertiary: true, onClick: () => handleDelete(row) }, { icon: () => h(NIcon, { size: 14 }, () => h(TrashOutline)), default: () => '删除' }),
    ]),
  },
]

// 关闭接码时清空相关字段
function handleSmsToggle(val) {
  if (!val) {
    form.value.smsPrice = 0
    form.value.smsPaymentName = ''
    form.value.smKeyWord = ''
  }
}

function openForm(row) {
  if (row) {
    editingCategory.value = row
    form.value = {
      name: row.name,
      code: row.code || '',
      description: row.description || '',
      sort: row.sort || 0,
      show: row.show !== 0 && row.show !== false,
      smsEnabled: row.smsEnabled === 1 || row.smsEnabled === true,
      smsPrice: row.smsPrice || 0,
      smsPaymentName: row.smsPaymentName || '',
      smKeyWord: row.smKeyWord || '',
    }
  } else {
    editingCategory.value = null
    form.value = { ...defaultForm }
  }
  showForm.value = true
}

async function handleSubmit() {
  try { await formRef.value?.validate() } catch { return }

  // 接码校验
  if (form.value.smsEnabled && !form.value.smsPrice && form.value.smsPrice !== 0) {
    message.warning('启用接码服务时必须设置接码价格')
    return
  }

  submitting.value = true
  try {
    const data = {
      ...form.value,
      show: form.value.show ? 1 : 0,
      smsEnabled: form.value.smsEnabled ? 1 : 0,
    }
    // 关闭接码时清空
    if (!data.smsEnabled) {
      data.smsPrice = null
      data.smsPaymentName = ''
      data.smKeyWord = ''
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

function handleBatchDelete() {
  dialog.warning({
    title: '批量删除',
    content: `确定删除选中的 ${selectedKeys.value.length} 个类别吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await adminStore.batchDeleteCategories(selectedKeys.value)
        message.success('批量删除成功')
        selectedKeys.value = []
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
