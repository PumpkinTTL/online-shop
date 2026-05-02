<template>
  <div v-if="content" class="product-tutorial">
    <!-- 标题栏（可折叠） -->
    <div class="tutorial-header" @click="collapsed = !collapsed">
      <div class="header-left">
        <n-icon :size="18" color="#3B82F6"><BookOutline /></n-icon>
        <span class="title">使用教程</span>
        <span class="subtitle">({{ stepCount }}个步骤)</span>
      </div>
      <n-icon :size="16" class="collapse-icon" :class="{ expanded: !collapsed }">
        <ChevronDownOutline />
      </n-icon>
    </div>

    <!-- 教程内容 -->
    <n-collapse-transition :show="!collapsed">
      <div class="tutorial-content">
        <div v-html="processedContent" class="rich-content"></div>
      </div>
    </n-collapse-transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { NCollapseTransition, NIcon } from 'naive-ui'
import { BookOutline, ChevronDownOutline } from '@vicons/ionicons5'

const props = defineProps({
  content: {
    type: String,
    default: ''
  }
})

const collapsed = ref(false)

// 处理内容，识别步骤和格式
const processedContent = computed(() => {
  if (!props.content) return ''

  let html = props.content

  // 识别步骤模式：步骤1: 或 1. 或 第一步
  html = html.replace(/^(\s*)(步骤)?(\d+)[：:.]\s*/gm, '$1<div class="step-item"><span class="step-number">步骤$3</span> ')
  html = html.replace(/^(第[一二三四五六七八九十]+步)[：:]\s*/gm, '<div class="step-item"><span class="step-number">$1</span> ')
  html = html.replace(/^(\d+)\.\s*/gm, '<div class="step-item"><span class="step-num">$1.</span> ')

  // 闭合步骤 div（在每个换行后）
  html = html.replace(/(<div class="step-item">[\s\S]*?)(?=\n<div class="step-item">|\n*$)/g, '$1</div>')

  // 识别视频链接（B站、YouTube等）
  html = html.replace(/(https?:\/\/(?:www\.)?(bilibili\.com\/video\/|youtu\.be\/|youtube\.com\/watch\?v=)[\w\-?=&]+)/gi,
    '<div class="video-link"><a href="$1" target="_blank" rel="noopener">🎥 观看视频教程</a></div>')

  // 识别普通链接
  html = html.replace(/(?<!href=")(https?:\/\/[^\s<]+)/gi, '<a href="$1" target="_blank" rel="noopener">$1</a>')

  // 保留换行
  html = html.replace(/\n/g, '<br>')

  return html
})

// 统计步骤数量
const stepCount = computed(() => {
  if (!props.content) return 0
  const matches = props.content.match(/(?:步骤)?\d+[：:.]|第[一二三四五六七八九十]+步|^\d+\./gm)
  return matches ? matches.length : 0
})
</script>

<style scoped>
.product-tutorial {
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  overflow: hidden;
  margin: 16px 0;
}

.tutorial-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}

.tutorial-header:hover {
  background: #F1F5F9;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title {
  font-weight: 600;
  font-size: 14px;
  color: #1E293B;
}

.subtitle {
  font-size: 12px;
  color: #94A3B8;
}

.collapse-icon {
  color: #94A3B8;
  transition: transform 0.3s;
}

.collapse-icon.expanded {
  transform: rotate(180deg);
}

.tutorial-content {
  padding: 0 16px 16px;
}

.rich-content {
  font-size: 13px;
  line-height: 1.8;
  color: #475569;
}

/* 步骤样式 */
.step-item {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  align-items: flex-start;
}

.step-number,
.step-num {
  flex-shrink: 0;
  background: linear-gradient(135deg, #3B82F6, #8B5CF6);
  color: white;
  padding: 2px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

/* 链接样式 */
.rich-content :deep(a) {
  color: #3B82F6;
  text-decoration: none;
  border-bottom: 1px dashed #3B82F6;
}

.rich-content :deep(a:hover) {
  color: #2563EB;
  border-bottom-style: solid;
}

/* 视频链接 */
.video-link {
  margin: 8px 0;
}

.video-link a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, #F97316, #EF4444);
  color: white !important;
  padding: 8px 16px;
  border-radius: 8px;
  text-decoration: none !important;
  border: none !important;
  font-weight: 500;
}

.video-link a:hover {
  background: linear-gradient(135deg, #EA580C, #DC2626);
}

/* 图片样式 */
.rich-content :deep(img) {
  max-width: 100%;
  border-radius: 8px;
  margin: 8px 0;
  border: 1px solid #E2E8F0;
}
</style>
