<template>
  <div class="logs-view">
    <div class="admin-page-header">
      <h2 class="admin-page-title">日志管理</h2>
      <div class="admin-page-actions">
        <n-button @click="showCleanup = true">清理旧日志</n-button>
      </div>
    </div>

    <!-- 日志统计卡片 -->
    <div class="log-stats-grid">
      <div
        v-for="(stat, type) in adminStore.logStats"
        :key="type"
        :class="['log-stat-card', { active: activeType === type }]"
        @click="activeType = type; loadFiles()"
      >
        <span class="log-stat-label">{{ typeLabels[type] || type }}</span>
        <span class="log-stat-info">{{ stat.fileCount || 0 }} 个文件 · {{ formatSize(stat.totalSize) }}</span>
      </div>
    </div>

    <div class="admin-table-card" style="margin-top:16px;">
      <!-- 文件选择 + 筛选 -->
      <div class="admin-filter-bar">
        <n-select v-model:value="selectedFile" :options="fileOptions" placeholder="选择日志文件" style="min-width:200px" @update:value="loadContent" />
        <n-select v-model:value="filterLevel" :options="levelOptions" placeholder="级别筛选" clearable style="width:120px" @update:value="loadContent" />
        <n-input v-model:value="filterKeyword" placeholder="关键词搜索" clearable style="width:200px" @keyup.enter="loadContent" />
      </div>

      <!-- 日志内容 -->
      <n-data-table
        :columns="contentColumns"
        :data="logRows"
        :bordered="false"
        :loading="contentLoading"
        size="small"
        :pagination="{ pageSize: 30 }"
        :row-key="(row, i) => i"
      />
    </div>

    <!-- 清理弹窗 -->
    <n-modal v-model:show="showCleanup" preset="card" title="清理旧日志" style="max-width:400px;">
      <n-form label-placement="left" label-width="80">
        <n-form-item label="日志类型">
          <n-select v-model:value="cleanupType" :options="typeOptions" />
        </n-form-item>
        <n-form-item label="保留天数">
          <n-input-number v-model:value="cleanupDays" :min="1" style="width:100%" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showCleanup = false">取消</n-button>
          <n-button type="warning" :loading="cleaning" @click="handleCleanup">确定清理</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, h, onMounted } from 'vue'
import {
  NButton, NSelect, NInput, NInputNumber, NDataTable, NModal,
  NForm, NFormItem, NSpace, NTag, useMessage
} from 'naive-ui'
import { useAdminStore } from '@/stores/admin'

const adminStore = useAdminStore()
const message = useMessage()

const activeType = ref('system')
const selectedFile = ref(null)
const filterLevel = ref(null)
const filterKeyword = ref('')
const contentLoading = ref(false)
const logRows = ref([])

const showCleanup = ref(false)
const cleanupType = ref('system')
const cleanupDays = ref(30)
const cleaning = ref(false)

const typeLabels = { access: '访问日志', business: '业务日志', action: '操作日志', system: '系统日志' }
const typeOptions = Object.entries(typeLabels).map(([v, l]) => ({ label: l, value: v }))

const levelOptions = [
  { label: 'error', value: 'error' },
  { label: 'warn', value: 'warn' },
  { label: 'success', value: 'success' },
  { label: 'info', value: 'info' },
]

const fileOptions = computed(() =>
  adminStore.logFiles.map(f => ({ label: f.filename, value: f.filename }))
)

const contentColumns = [
  { title: '时间', key: 'timestamp', width: 180 },
  { title: '级别', key: 'level', width: 80, render: (row) => {
    const typeMap = { error: 'error', warn: 'warning', success: 'success', info: 'info', debug: 'default' }
    return h(NTag, { type: typeMap[row.level] || 'default', size: 'small' }, () => row.level)
  }},
  { title: '消息', key: 'message', ellipsis: { tooltip: true } },
]

function formatSize(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
  return `${size.toFixed(1)} ${units[i]}`
}

async function loadFiles() {
  try {
    await adminStore.fetchLogFiles({ type: activeType.value })
    if (adminStore.logFiles.length) {
      selectedFile.value = adminStore.logFiles[0].filename
      loadContent()
    } else {
      selectedFile.value = null
      logRows.value = []
    }
  } catch {}
}

async function loadContent() {
  if (!selectedFile.value) return
  contentLoading.value = true
  try {
    const res = await adminStore.fetchLogContent({
      type: activeType.value,
      filename: selectedFile.value,
      level: filterLevel.value || undefined,
      keyword: filterKeyword.value || undefined,
      page: 1,
      pageSize: 200,
    })
    logRows.value = res.logs || []
  } catch {
    logRows.value = []
  } finally {
    contentLoading.value = false
  }
}

async function handleCleanup() {
  cleaning.value = true
  try {
    await adminStore.cleanupLogs({ type: cleanupType.value, days: cleanupDays.value })
    message.success('清理完成')
    showCleanup.value = false
    adminStore.fetchLogStats()
    loadFiles()
  } catch (e) {
    message.error(e.response?.data?.error || '清理失败')
  } finally {
    cleaning.value = false
  }
}

onMounted(async () => {
  await adminStore.fetchLogStats()
  loadFiles()
})
</script>

<style scoped>
/* 日志统计卡片网格 */
.log-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.log-stat-card {
  background: #0F172A;
  border-radius: 10px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.log-stat-card:hover {
  border-color: rgba(59, 130, 246, 0.3);
}

.log-stat-card.active {
  border-color: #3B82F6;
  background: rgba(59, 130, 246, 0.1);
}

.log-stat-label {
  color: #F1F5F9;
  font-weight: 600;
  font-size: 14px;
}

.log-stat-info {
  color: #94A3B8;
  font-size: 12px;
}

@media (max-width: 767px) {
  .log-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .log-stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
