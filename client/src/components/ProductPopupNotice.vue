<template>
  <n-modal
    v-model:show="showModal"
    :mask-closable="false"
    :closable="false"
    preset="card"
    :style="{ width: '420px', maxWidth: '90vw' }"
    class="popup-notice-modal"
  >
    <template #header>
      <div class="modal-header">
        <n-icon :size="24" :color="iconColor">
          <WarningOutline v-if="type === 'warning'" />
          <AlertCircleOutline v-else-if="type === 'error'" />
          <InformationCircleOutline v-else />
        </n-icon>
        <span class="header-title">{{ title }}</span>
      </div>
    </template>

    <div class="notice-content">
      <p class="notice-text">{{ content }}</p>
    </div>

    <template #footer>
      <div class="notice-actions">
        <n-checkbox v-model="dontShowAgain" class="dont-show-checkbox">
          不再提示
        </n-checkbox>
        <n-button type="primary" @click="handleClose" :focusable="false">
          知道了
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { NModal, NIcon, NCheckbox, NButton } from 'naive-ui'
import { WarningOutline, AlertCircleOutline, InformationCircleOutline } from '@vicons/ionicons5'

const props = defineProps({
  content: {
    type: String,
    default: ''
  },
  productId: {
    type: [Number, String],
    default: null
  },
  type: {
    type: String,
    default: 'warning', // warning | error | info
    validator: (value) => ['warning', 'error', 'info'].includes(value)
  }
})

const emit = defineEmits(['close'])

const showModal = ref(false)
const dontShowAgain = ref(false)

// 根据类型设置标题和图标颜色
const title = computed(() => {
  const titles = {
    warning: '重要提醒',
    error: '注意',
    info: '提示'
  }
  return titles[props.type] || '提示'
})

const iconColor = computed(() => {
  const colors = {
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6'
  }
  return colors[props.type] || '#3B82F6'
})

// localStorage key
const storageKey = computed(() => `popup_notice_${props.productId}`)

// 检查是否已关闭
const checkDismissed = () => {
  if (!props.productId) return false
  const dismissed = localStorage.getItem(storageKey.value)
  return dismissed === 'true'
}

// 显示弹窗
const show = () => {
  if (!props.content || checkDismissed()) {
    return
  }
  showModal.value = true
}

// 关闭弹窗
const handleClose = () => {
  if (dontShowAgain.value && props.productId) {
    localStorage.setItem(storageKey.value, 'true')
  }
  showModal.value = false
  emit('close')
}

// 监听 content 变化，自动显示
watch(() => props.content, (newContent) => {
  if (newContent && !checkDismissed()) {
    // 延迟一点显示，避免页面刚加载就弹出
    setTimeout(() => {
      show()
    }, 300)
  }
}, { immediate: true })

// 暴露方法给父组件
defineExpose({
  show,
  checkDismissed
})
</script>

<style scoped>
.modal-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: #1E293B;
}

.notice-content {
  padding: 8px 0;
}

.notice-text {
  font-size: 14px;
  line-height: 1.6;
  color: #475569;
  margin: 0;
  white-space: pre-wrap;
}

.notice-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.dont-show-checkbox {
  font-size: 13px;
}
</style>
