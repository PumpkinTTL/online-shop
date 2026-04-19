<template>
  <div class="products-view">
    <div class="admin-page-header">
      <h2 class="admin-page-title">商品管理</h2>
      <div class="admin-page-actions">
        <n-select v-model:value="filterCategory" :options="categoryOptions" placeholder="按类别筛选" clearable style="width:160px" @update:value="handleFilter" />
        <n-button type="primary" @click="showForm = true; editingProduct = null; resetForm()">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          新增商品
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
        v-model:checked-row-keys="selectedKeys"
        @update:checked-row-keys="keys => selectedKeys = keys"
      />

      <div class="admin-pagination">
        <n-button type="error" size="small" :disabled="!selectedKeys.length" @click="handleBatchDelete">
          批量删除 ({{ selectedKeys.length }})
        </n-button>
        <n-pagination
          v-model:page="currentPage"
          v-model:page-size="pageSize"
          :item-count="adminStore.productsTotal"
          :page-sizes="[10, 20, 50]"
          show-size-picker
          @update:page="loadData"
          @update:page-size="handlePageSizeChange"
        />
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <n-modal v-model:show="showForm" preset="card" :title="editingProduct ? '编辑商品' : '新增商品'" style="max-width:600px;">
      <n-form ref="formRef" :model="form" :rules="formRules" label-placement="left" label-width="80">
        <n-form-item label="名称" path="name">
          <n-input v-model:value="form.name" placeholder="商品名称" />
        </n-form-item>
        <n-form-item label="类别" path="categoryId">
          <n-select v-model:value="form.categoryId" :options="categoryOptions" placeholder="选择类别" />
        </n-form-item>
        <n-form-item label="价格" path="price">
          <n-input-number v-model:value="form.price" :min="0" :precision="2" style="width:100%" placeholder="0.00" />
        </n-form-item>
        <n-form-item label="封面图" path="coverImage">
          <n-input v-model:value="form.coverImage" placeholder="图片URL" />
        </n-form-item>
        <n-form-item label="描述" path="description">
          <n-input v-model:value="form.description" type="textarea" :rows="3" placeholder="商品描述" />
        </n-form-item>
        <n-form-item label="关键词" path="keyword">
          <n-input v-model:value="form.keyword" placeholder="MAAPI 关键词（接码类商品必填）" />
        </n-form-item>
        <n-form-item label="排序" path="sort">
          <n-input-number v-model:value="form.sort" :min="0" style="width:100%" />
        </n-form-item>
        <n-form-item label="显示" path="show">
          <n-switch v-model:value="form.show" />
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
import { ref, h, onMounted, computed } from 'vue'
import {
  NButton, NIcon, NDataTable, NPagination,
  NModal, NForm, NFormItem, NInput, NInputNumber, NSelect, NSwitch,
  NSpace, NTag, useMessage, useDialog
} from 'naive-ui'
import { AddOutline } from '@vicons/ionicons5'
import { useAdminStore } from '@/stores/admin'

const adminStore = useAdminStore()
const message = useMessage()
const dialog = useDialog()

const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const selectedKeys = ref([])
const filterCategory = ref(null)

const showForm = ref(false)
const editingProduct = ref(null)
const submitting = ref(false)
const formRef = ref(null)

const defaultForm = { name: '', categoryId: null, price: 0, coverImage: '', description: '', keyword: '', sort: 0, show: true }
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
  { title: 'ID', key: 'id', width: 60 },
  { title: '名称', key: 'name', ellipsis: { tooltip: true } },
  {
    title: '类别', key: 'categoryName', width: 120,
    render: (row) => {
      const cat = adminStore.categories.find(c => c.id === row.categoryId)
      return cat?.name || '-'
    }
  },
  { title: '价格', key: 'price', width: 100, render: (row) => `¥${row.price}` },
  {
    title: '显示', key: 'show', width: 80,
    render: (row) => h(NTag, { type: row.show ? 'success' : 'default', size: 'small' }, () => row.show ? '显示' : '隐藏')
  },
  { title: '排序', key: 'sort', width: 60 },
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
  editingProduct.value = row
  form.value = {
    name: row.name,
    categoryId: row.categoryId,
    price: row.price,
    coverImage: row.coverImage || '',
    description: row.description || '',
    keyword: row.keyword || '',
    sort: row.sort || 0,
    show: row.show !== 0 && row.show !== false,
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
