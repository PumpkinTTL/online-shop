<template>
  <div class="products-view">
    <div class="admin-page-header">
      <h2 class="admin-page-title">商品管理</h2>
      <div class="admin-page-actions">
        <n-select v-model:value="filterCategory" :options="categoryOptions" placeholder="按类别筛选" clearable style="width:160px" @update:value="handleFilter" />
        <n-button type="primary" @click="openForm(null)">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          新增商品
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
        :data="adminStore.products"
        :bordered="false"
        :loading="loading"
        :row-key="row => row.id"
        :scroll-x="1400"
        v-model:checked-row-keys="selectedKeys"
        @update:checked-row-keys="keys => selectedKeys = keys"
      />

      <div class="admin-pagination">
        <n-pagination
          v-model:page="currentPage"
          v-model:page-size="pageSize"
          :item-count="adminStore.productsTotal"
          :page-sizes="[10, 20, 30, 50]"
          show-size-picker
          @update:page="loadData"
          @update:page-size="handlePageSizeChange"
        />
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <n-modal v-model:show="showForm" preset="card" :title="editingProduct ? '编辑商品' : '新增商品'" style="width:680px;max-height:85vh;">
      <div style="max-height:calc(85vh - 140px);overflow-y:auto;padding-right:8px;">
        <n-form ref="formRef" :model="form" :rules="formRules" label-placement="left" label-width="80">
          <n-form-item label="商品名称" path="name">
            <n-input v-model:value="form.name" placeholder="请输入商品名称" />
          </n-form-item>
          <n-grid :cols="2" :x-gap="16" responsive="screen" item-responsive>
            <n-gi span="2 m:1">
              <n-form-item label="价格" path="price">
                <n-input-number v-model:value="form.price" :min="0" :precision="2" :step="0.01" style="width:100%" placeholder="0.00" />
              </n-form-item>
            </n-gi>
            <n-gi span="2 m:1">
              <n-form-item label="类别" path="categoryId">
                <n-select v-model:value="form.categoryId" :options="categoryOptions" placeholder="选择类别" />
              </n-form-item>
            </n-gi>
          </n-grid>
          <n-grid :cols="2" :x-gap="16" responsive="screen" item-responsive>
            <n-gi span="2 m:1">
              <n-form-item label="商品代号" path="code">
                <n-input v-model:value="form.code" placeholder="支付订单显示（可选）" />
              </n-form-item>
            </n-gi>
            <n-gi span="2 m:1">
              <n-form-item label="兑换地址">
                <n-input v-model:value="form.addr" placeholder="CDK兑换网址（可选）" />
              </n-form-item>
            </n-gi>
          </n-grid>
          <n-form-item label="描述">
            <n-input v-model:value="form.description" type="textarea" :rows="1" placeholder="商品描述（可选）" />
          </n-form-item>
          <n-grid :cols="3" :x-gap="16" responsive="screen" item-responsive>
            <n-gi span="2 s:1">
              <n-form-item label="库存">
                <n-input :value="String(form.stock || 0)" disabled />
              </n-form-item>
            </n-gi>
            <n-gi span="2 s:1">
              <n-form-item label="销量">
                <n-input-number v-model:value="form.sales" :min="0" style="width:100%" />
              </n-form-item>
            </n-gi>
            <n-gi span="2 s:1">
              <n-form-item label="排序">
                <n-input-number v-model:value="form.sort" :min="0" style="width:100%" />
              </n-form-item>
            </n-gi>
          </n-grid>
          <n-grid :cols="3" :x-gap="16" responsive="screen" item-responsive>
            <n-gi span="2 s:1">
              <n-form-item label="质保时间">
                <n-input v-model:value="form.warranty" placeholder="如30天、永久" />
              </n-form-item>
            </n-gi>
            <n-gi span="2 s:1">
              <n-form-item label="积分额度">
                <n-input-number v-model:value="form.credit" :min="0" style="width:100%" placeholder="0" />
              </n-form-item>
            </n-gi>
            <n-gi span="2 s:1">
              <n-form-item label="上架">
                <n-switch v-model:value="form.show" />
              </n-form-item>
            </n-gi>
          </n-grid>
          <n-grid :cols="2" :x-gap="16" responsive="screen" item-responsive>
            <n-gi span="2 m:1">
              <n-form-item label="注意事项">
                <n-input v-model:value="form.tips" type="textarea" :rows="1" placeholder="购买页红色警告（可选）" />
              </n-form-item>
            </n-gi>
            <n-gi span="2 m:1">
              <n-form-item label="封面图">
                <n-input v-model:value="form.image" placeholder="图片URL（可选）" />
              </n-form-item>
            </n-gi>
          </n-grid>
          <n-divider style="margin: 12px 0 8px;">扩展功能</n-divider>
          <n-form-item label="弹窗通知">
            <n-input v-model:value="form.popupNotice" type="textarea" :rows="2" placeholder="进入商品详情页时弹出的重要提醒（可选）" />
            <template #feedback>
              <span class="text-tip">💡 用户首次进入商品页时弹出，支持"不再提示"选项</span>
            </template>
          </n-form-item>
          <n-form-item label="使用教程">
            <n-input v-model:value="form.tutorial" type="textarea" :rows="4" placeholder="支持HTML格式的使用教程（可选）" />
            <template #feedback>
              <span class="text-tip">💡 支持HTML：&lt;p&gt;段落&lt;/p&gt;、&lt;br&gt;换行、&lt;img&gt;图片、&lt;a&gt;链接、视频URL自动识别</span>
            </template>
          </n-form-item>
        </n-form>
      </div>
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
import { ref, h, onMounted, computed } from 'vue'
import {
  NButton, NIcon, NDataTable, NPagination,
  NModal, NForm, NFormItem, NInput, NInputNumber, NSelect, NSwitch,
  NSpace, NTag, NTooltip, NGrid, NGi, useMessage, useDialog
} from 'naive-ui'
import { AddOutline, TrashOutline, CreateOutline } from '@vicons/ionicons5'
import { useAdminStore } from '@/stores/admin'

const adminStore = useAdminStore()
const message = useMessage()
const dialog = useDialog()

const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const selectedKeys = ref([])
const filterCategory = ref(null)

const showForm = ref(false)
const editingProduct = ref(null)
const submitting = ref(false)
const formRef = ref(null)

const defaultForm = {
  name: '', code: '', price: 0, categoryId: null, description: '',
  stock: 0, sales: 0, warranty: '', credit: null, tips: '',
  addr: '', image: '', sort: 0, show: true,
  popupNotice: '', tutorial: '',
}
const form = ref({ ...defaultForm })

const formRules = {
  name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  categoryId: [{ required: true, type: 'number', message: '请选择类别', trigger: 'change' }],
  price: [{ required: true, type: 'number', message: '请输入价格', trigger: 'blur' }],
}

const categoryOptions = computed(() =>
  adminStore.categories.map(c => ({ label: c.name, value: c.id }))
)

const columns = [
  { type: 'selection' },
  { title: 'ID', key: 'id', width: 60, sorter: (a, b) => a.id - b.id },
  {
    title: '名称', key: 'name', minWidth: 160,
    render: (row) => h('span', { style: 'font-weight:600' }, row.name),
    ellipsis: { tooltip: true },
  },
  {
    title: '分类', key: 'categoryName', minWidth: 90,
    render: (row) => {
      const cat = adminStore.categories.find(c => c.id === row.categoryId)
      if (!cat) return '-'
      const typeMap = { AI: 'info', SMS: 'success' }
      const tagType = cat.smsEnabled ? 'success' : (typeMap[cat.code] || 'warning')
      return h(NTag, { type: tagType, size: 'small' }, () => cat.name)
    }
  },
  {
    title: '价格', key: 'price', minWidth: 80, sorter: (a, b) => a.price - b.price,
    render: (row) => h('span', { style: 'color:#EF4444;font-weight:600' }, `¥${row.price}`),
  },
  {
    title: '库存', key: 'stock', minWidth: 70, sorter: (a, b) => (a.stock || 0) - (b.stock || 0),
    render: (row) => h(NTag, {
      type: row.stock > 0 ? 'success' : 'error', size: 'small'
    }, () => row.stock || 0),
  },
  {
    title: '销量', key: 'sales', minWidth: 70, sorter: (a, b) => (a.sales || 0) - (b.sales || 0),
    render: (row) => h('span', { style: 'font-weight:600;color:#6366F1' }, row.sales || 0),
  },
  {
    title: '质保', key: 'warranty', minWidth: 80,
    render: (row) => row.warranty || '-',
  },
  {
    title: '接码', key: 'isCode', minWidth: 70,
    render: (row) => h(NTag, {
      type: row.isCode ? 'success' : 'default', size: 'small'
    }, () => row.isCode ? '需要' : '否'),
  },
  {
    title: '关键词', key: 'smKeyWord', minWidth: 80,
    render: (row) => row.smKeyWord || '-',
  },
  {
    title: '注意事项', key: 'tips', width: 120,
    render: (row) => row.tips
      ? h(NTooltip, {}, { trigger: () => h('span', { style: 'cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:110px;display:inline-block' }, row.tips), default: () => row.tips })
      : h('span', { style: 'color:#94A3B8' }, '-'),
  },
  {
    title: '积分', key: 'credit', width: 80, align: 'center',
    render: (row) => row.credit
      ? h(NTag, { type: 'warning', size: 'small' }, () => row.credit)
      : h('span', { style: 'color:#94A3B8' }, '-'),
  },
  {
    title: '兑换地址', key: 'addr', width: 180,
    render: (row) => row.addr
      ? h(NTooltip, {}, {
          trigger: () => h('a', {
            href: row.addr, target: '_blank',
            style: 'color:#3B82F6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px;display:inline-block;vertical-align:bottom'
          }, row.addr),
          default: () => row.addr
        })
      : h('span', { style: 'color:#94A3B8' }, '-'),
  },
  {
    title: '上架', key: 'show', minWidth: 70,
    render: (row) => h(NTag, { type: row.show ? 'success' : 'default', size: 'small' }, () => row.show ? '是' : '否'),
  },
  {
    title: '创建时间', key: 'createdAt', width: 160, sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    render: (row) => formatDate(row.createdAt),
  },
  {
    title: '操作', key: 'actions', width: 160, fixed: 'right',
    render: (row) => h(NSpace, { size: 4, wrap: false }, () => [
      h(NButton, { size: 'small', tertiary: true, onClick: () => openForm(row) }, { icon: () => h(NIcon, { size: 14 }, () => h(CreateOutline)), default: () => '编辑' }),
      h(NButton, { size: 'small', type: 'error', tertiary: true, onClick: () => handleDelete(row) }, { icon: () => h(NIcon, { size: 14 }, () => h(TrashOutline)), default: () => '删除' }),
    ])
  },
]

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function openForm(row) {
  if (row) {
    editingProduct.value = row
    form.value = {
      name: row.name || '',
      code: row.code || '',
      price: Number(row.price) || 0,
      categoryId: row.categoryId || null,
      description: row.description || '',
      stock: row.stock || 0,
      sales: Number(row.sales) || 0,
      warranty: row.warranty || '',
      credit: row.credit != null ? Number(row.credit) : null,
      tips: row.tips || '',
      addr: row.addr || '',
      image: row.image || '',
      sort: Number(row.sort) || 0,
      show: row.show !== 0 && row.show !== false,
      popupNotice: row.popupNotice || '',
      tutorial: row.tutorial || '',
    }
  } else {
    editingProduct.value = null
    form.value = { ...defaultForm }
  }
  showForm.value = true
}

async function handleSubmit() {
  try { await formRef.value?.validate() } catch { return }
  submitting.value = true
  try {
    const data = { ...form.value, show: form.value.show ? 1 : 0 }
    if (editingProduct.value) {
      await adminStore.updateProduct(editingProduct.value.id, data)
      message.success('更新成功')
    } else {
      await adminStore.createProduct(data)
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
    content: `确定删除商品「${row.name}」吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await adminStore.deleteProduct(row.id)
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
    content: `确定删除选中的 ${selectedKeys.value.length} 个商品吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await adminStore.batchDeleteProducts(selectedKeys.value)
        message.success('批量删除成功')
        selectedKeys.value = []
        loadData()
      } catch (e) {
        message.error(e.response?.data?.error || '删除失败')
      }
    },
  })
}

function handleFilter() {
  currentPage.value = 1
  loadData()
}

function handlePageSizeChange(size) {
  pageSize.value = size
  currentPage.value = 1
  loadData()
}

async function loadData() {
  loading.value = true
  try {
    const params = { page: currentPage.value, pageSize: pageSize.value }
    if (filterCategory.value) params.categoryId = filterCategory.value
    await adminStore.fetchProducts(params)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await adminStore.fetchCategories()
  await loadData()
})
</script>
