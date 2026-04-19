<template>
  <div class="card-keys-view">
    <div class="admin-page-header">
      <h2 class="admin-page-title">卡密管理</h2>
      <div class="admin-page-actions">
        <n-select v-model:value="filterProduct" :options="productOptions" placeholder="按商品筛选" clearable style="width:180px" @update:value="handleFilter" />
        <n-select v-model:value="filterStatus" :options="statusOptions" placeholder="按状态筛选" clearable style="width:140px" @update:value="handleFilter" />
        <n-button type="primary" @click="openGenerateModal">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          生成卡密
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
        :data="adminStore.cardKeys"
        :bordered="false"
        :loading="loading"
        :row-key="row => row.id"
        v-model:checked-row-keys="selectedKeys"
      />
      <div class="admin-pagination">
        <n-pagination
          v-model:page="currentPage"
          v-model:page-size="pageSize"
          :item-count="adminStore.cardKeysTotal"
          :page-sizes="[10, 20, 30, 50]"
          show-size-picker
          @update:page="loadData"
          @update:page-size="handlePageSizeChange"
        />
      </div>
    </div>

    <!-- 生成/录入卡密弹窗（合并，用 radio 切换模式） -->
    <n-modal v-model:show="showGenerateModal" preset="card" title="添加卡密" style="max-width:560px;">
      <n-form :model="cardKeyForm" label-placement="left" label-width="100">
        <n-form-item label="选择商品" required>
          <n-select v-model:value="cardKeyForm.productId" :options="productOptions" placeholder="请选择商品" />
        </n-form-item>
        <n-form-item label="录入方式">
          <n-radio-group v-model:value="cardKeyForm.mode">
            <n-radio-button value="auto">自动生成</n-radio-button>
            <n-radio-button value="manual">手动录入</n-radio-button>
          </n-radio-group>
        </n-form-item>
        <template v-if="cardKeyForm.mode === 'auto'">
          <n-form-item label="卡密前缀">
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;width:100%">
              <n-button v-for="item in prefixList" :key="item.key" size="small"
                :type="cardKeyForm.prefix === item.key ? 'primary' : 'default'"
                @click="cardKeyForm.prefix = item.key">
                {{ item.label + ' (' + item.key + ')' }}
              </n-button>
            </div>
            <n-input v-model:value="cardKeyForm.prefix" placeholder="或自定义前缀" style="width:100%" />
            <span style="color:var(--text-light);font-size:12px;">生成格式：前缀 + XXXXX-XXXXX（10位）</span>
          </n-form-item>
          <n-form-item label="生成数量">
            <n-input-number v-model:value="cardKeyForm.count" :min="1" :max="100" style="width:100%" />
          </n-form-item>
        </template>
        <template v-if="cardKeyForm.mode === 'manual'">
          <n-form-item label="卡密列表">
            <n-input v-model:value="cardKeyForm.manualKeys" type="textarea" :rows="4" placeholder="每行输入一个卡密" />
            <span style="color:var(--text-light);font-size:12px;">已输入 <strong>{{ manualKeyCount }}</strong> 个卡密</span>
          </n-form-item>
        </template>
        <n-form-item label="CDK 列表">
          <n-input v-model:value="cardKeyForm.cdkText" type="textarea" :rows="3" placeholder="每行输入一个CDK（可选）" />
          <span style="color:var(--text-light);font-size:12px;">留空则不关联CDK，行数应与卡密数量一致</span>
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showGenerateModal = false">取消</n-button>
          <n-button type="primary" :loading="generating" @click="handleGenerate">提交</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 编辑CDK弹窗 -->
    <n-modal v-model:show="showEditCDK" preset="card" title="编辑 CDK" style="max-width:450px;">
      <n-form label-placement="left" label-width="100">
        <n-form-item label="卡密">
          <n-input :value="editingCDK.code" disabled />
        </n-form-item>
        <n-form-item label="CDK 兑换码">
          <n-input v-model:value="editingCDK.CDK" placeholder="输入CDK兑换码" />
        </n-form-item>
        <n-form-item label="状态">
          <n-select v-model:value="editingCDK.status" :options="editStatusOptions" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showEditCDK = false">取消</n-button>
          <n-button type="primary" :loading="generating" @click="handleSaveCDK">保存</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, h, onMounted, computed } from 'vue'
import {
  NButton, NIcon, NDataTable, NPagination,
  NModal, NForm, NFormItem, NInput, NInputNumber, NSelect,
  NSpace, NTag, NRadioButton, NRadioGroup,
  useMessage, useDialog
} from 'naive-ui'
import { AddOutline, TrashOutline, CreateOutline, EyeOffOutline, EyeOutline } from '@vicons/ionicons5'
import { useAdminStore } from '@/stores/admin'
import { adminApi } from '@/api'

const adminStore = useAdminStore()
const message = useMessage()
const dialog = useDialog()

const loading = ref(false)
const revealedKeys = ref(new Set())
const currentPage = ref(1)
const pageSize = ref(20)
const selectedKeys = ref([])
const filterProduct = ref(null)
const filterStatus = ref(null)

const showGenerateModal = ref(false)
const showEditCDK = ref(false)
const generating = ref(false)

const cardKeyForm = ref({ productId: null, mode: 'auto', prefix: '', count: 10, cdkText: '', manualKeys: '' })
const editingCDK = ref({ id: null, code: '', CDK: '', status: 'unused' })

const allProducts = ref([])
const productOptions = computed(() => allProducts.value.map(p => ({ label: p.name, value: p.id })))

const statusOptions = [
  { label: '未使用', value: 'unused' },
  { label: '已使用', value: 'used' },
  { label: '已过期', value: 'expired' },
]

const editStatusOptions = [
  { label: '未使用', value: 'unused' },
  { label: '已使用', value: 'used' },
  { label: '已过期', value: 'expired' },
]

// 前缀列表（从API加载）
const cardPrefixes = ref({})
const prefixList = computed(() => {
  const result = []
  const obj = cardPrefixes.value
  for (const key in obj) {
    result.push({ key, label: obj[key] })
  }
  return result
})

const manualKeyCount = computed(() => {
  const text = cardKeyForm.value.manualKeys || ''
  return text.trim().split('\n').filter(l => l.trim()).length
})

const cardStatusMap = { unused: 'success', used: 'info', expired: 'error' }
const cardStatusLabel = { unused: '未使用', used: '已使用', expired: '已过期' }

const columns = [
  { type: 'selection' },
  { title: 'ID', key: 'id', width: 60, sorter: (a, b) => a.id - b.id },
  {
    title: '卡密', key: 'code', minWidth: 160,
    render: (row) => {
      const revealed = revealedKeys.value.has(`code-${row.id}`)
      return h('div', { style: 'display:flex;align-items:center;gap:4px' }, [
        h('code', {}, revealed ? row.code : '••••••••'),
        h(NIcon, {
          size: 14,
          style: 'cursor:pointer;opacity:0.5;flex-shrink:0',
          onClick: () => {
            const s = new Set(revealedKeys.value)
            const k = `code-${row.id}`
            revealed ? s.delete(k) : s.add(k)
            revealedKeys.value = s
          },
        }, () => h(revealed ? EyeOutline : EyeOffOutline)),
      ])
    },
  },
  {
    title: 'CDK', key: 'CDK', minWidth: 160,
    render: (row) => {
      if (!row.CDK) return h('span', { style: 'color:#94A3B8' }, '-')
      const revealed = revealedKeys.value.has(`cdk-${row.id}`)
      return h('div', { style: 'display:flex;align-items:center;gap:4px' }, [
        h('code', { style: 'color:#22C55E' }, revealed ? (row.CDK.length > 16 ? row.CDK.substring(0, 16) + '…' : row.CDK) : '••••-••••-••••'),
        h(NIcon, {
          size: 14,
          style: 'cursor:pointer;opacity:0.5;flex-shrink:0',
          onClick: () => {
            const s = new Set(revealedKeys.value)
            const k = `cdk-${row.id}`
            revealed ? s.delete(k) : s.add(k)
            revealedKeys.value = s
          },
        }, () => h(revealed ? EyeOutline : EyeOffOutline)),
      ])
    },
  },
  {
    title: '商品', key: 'productName', width: 140,
    render: (row) => {
      const p = allProducts.value.find(p => p.id === row.productId)
      return p?.name || '-'
    }
  },
  {
    title: '状态', key: 'status', width: 90,
    render: (row) => h(NTag, { type: cardStatusMap[row.status] || 'info', size: 'small' }, () => cardStatusLabel[row.status] || row.status),
  },
  {
    title: '手机号', key: 'phone', width: 140,
    render: (row) => {
      if (!row.phone) return h('span', { style: 'color:#94A3B8' }, '-')
      const revealed = revealedKeys.value.has(`phone-${row.id}`)
      return h('div', { style: 'display:flex;align-items:center;gap:4px' }, [
        h('span', {}, revealed ? row.phone : row.phone.substring(0, 3) + '****' + row.phone.substring(7)),
        h(NIcon, {
          size: 14,
          style: 'cursor:pointer;opacity:0.5;flex-shrink:0',
          onClick: () => {
            const s = new Set(revealedKeys.value)
            const k = `phone-${row.id}`
            revealed ? s.delete(k) : s.add(k)
            revealedKeys.value = s
          },
        }, () => h(revealed ? EyeOutline : EyeOffOutline)),
      ])
    },
  },
  {
    title: '创建时间', key: 'createdAt', width: 160, sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    render: (row) => formatDate(row.createdAt),
  },
  {
    title: '操作', key: 'actions', width: 160, fixed: 'right',
    render: (row) => h(NSpace, { size: 4, wrap: false }, () => [
      h(NButton, { size: 'small', tertiary: true, onClick: () => openEditCDKModal(row) }, { icon: () => h(NIcon, { size: 14 }, () => h(CreateOutline)), default: () => '编辑' }),
      h(NButton, { size: 'small', type: 'error', tertiary: true, onClick: () => handleDeleteCardKey(row) }, { icon: () => h(NIcon, { size: 14 }, () => h(TrashOutline)), default: () => '删除' }),
    ]),
  },
]

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function openGenerateModal() {
  cardKeyForm.value = { productId: null, mode: 'auto', prefix: '', count: 10, cdkText: '', manualKeys: '' }
  showGenerateModal.value = true
}

function openEditCDKModal(row) {
  editingCDK.value = { id: row.id, code: row.code, CDK: row.CDK || '', status: row.status }
  showEditCDK.value = true
}

async function handleGenerate() {
  const f = cardKeyForm.value
  if (!f.productId) { message.warning('请选择商品'); return }

  generating.value = true
  try {
    if (f.mode === 'manual') {
      const keys = f.manualKeys.trim().split('\n').map(s => s.trim()).filter(Boolean)
      if (!keys.length) { message.warning('请输入至少一个卡密'); generating.value = false; return }
      const cdkList = f.cdkText.trim() ? f.cdkText.trim().split('\n').map(s => s.trim()).filter(Boolean) : []
      const res = await adminStore.manualAddCardKeys({ productId: f.productId, keys, cdkList })
      message.success(`成功录入 ${res.count || res.length || keys.length} 个卡密`)
    } else {
      if (!f.count || f.count < 1 || f.count > 100) { message.warning('数量1-100'); generating.value = false; return }
      const cdkList = f.cdkText.trim() ? f.cdkText.trim().split('\n').map(s => s.trim()).filter(Boolean) : []
      const res = await adminStore.generateCardKeys({ productId: f.productId, prefix: f.prefix, count: f.count, cdkList })
      message.success(`成功生成 ${res.count || res.length || 0} 个卡密`)
    }
    showGenerateModal.value = false
    loadData()
  } catch (e) {
    message.error(e.response?.data?.error || '操作失败')
  } finally {
    generating.value = false
  }
}

async function handleSaveCDK() {
  generating.value = true
  try {
    await adminApi.updateCardKey(editingCDK.value.id, { CDK: editingCDK.value.CDK, status: editingCDK.value.status })
    message.success('保存成功')
    showEditCDK.value = false
    loadData()
  } catch (e) {
    message.error(e.response?.data?.error || '保存失败')
  } finally {
    generating.value = false
  }
}

function handleDeleteCardKey(row) {
  dialog.warning({
    title: '确认删除',
    content: `确定删除该卡密吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await adminStore.deleteCardKey(row.id)
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
    content: `确定删除选中的 ${selectedKeys.value.length} 条卡密吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await adminStore.batchDeleteCardKeys(selectedKeys.value)
        message.success('批量删除成功')
        selectedKeys.value = []
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
    if (filterProduct.value) params.productId = filterProduct.value
    if (filterStatus.value) params.status = filterStatus.value
    await adminStore.fetchCardKeys(params)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    const res = await adminApi.getProducts({ pageSize: 0 })
    allProducts.value = Array.isArray(res) ? res : (res.items || [])
  } catch {}
  // 加载前缀
  try {
    cardPrefixes.value = await adminApi.getCardPrefixes()
  } catch {}
  await loadData()
})
</script>
