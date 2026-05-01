<template>
  <transition name="bar-fade">
    <div v-if="currentAnn" class="announcement-bar" :class="`bar-${currentAnn.type}`">
      <div class="bar-icon">
        <n-icon :size="14"><MegaphoneOutline /></n-icon>
      </div>
      <div class="bar-marquee">
        <n-marquee :speed="36">
          <span class="marquee-text">
            <strong>{{ currentAnn.title }}</strong>
            <span class="bar-sep">：</span>
            {{ currentAnn.content }}
          </span>
        </n-marquee>
      </div>
      <div class="bar-close" @click="dismiss(currentAnn.id)">
        <n-icon :size="14"><CloseOutline /></n-icon>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { NIcon, NMarquee } from 'naive-ui'
import { MegaphoneOutline, CloseOutline } from '@vicons/ionicons5'
import { useRoute } from 'vue-router'
import { announcementApi } from '@/api'

const route = useRoute()
const announcements = ref([])
const dismissedIds = ref(JSON.parse(localStorage.getItem('dismissed_announcements') || '[]'))
const currentIndex = ref(0)
let timer = null

const visibleList = computed(() =>
  announcements.value.filter(a => !dismissedIds.value.includes(a.id))
)

const currentAnn = computed(() => visibleList.value[currentIndex.value] || null)

function dismiss(id) {
  dismissedIds.value.push(id)
  localStorage.setItem('dismissed_announcements', JSON.stringify(dismissedIds.value))
  if (currentIndex.value >= visibleList.value.length) {
    currentIndex.value = 0
  }
}

function startTimer() {
  stopTimer()
  timer = setInterval(() => {
    if (visibleList.value.length > 1) {
      currentIndex.value = (currentIndex.value + 1) % visibleList.value.length
    }
  }, 5000)
}

function stopTimer() {
  if (timer) { clearInterval(timer); timer = null }
}

async function fetchAnnouncements() {
  try {
    const res = await announcementApi.getActive()
    announcements.value = Array.isArray(res) ? res : []
    currentIndex.value = 0
  } catch {
    announcements.value = []
  }
}

let lastFetch = 0
function throttledFetch() {
  const now = Date.now()
  if (now - lastFetch > 5000) {
    lastFetch = now
    fetchAnnouncements()
  }
}

onMounted(() => { fetchAnnouncements(); startTimer() })
onUnmounted(() => stopTimer())
watch(() => route.path, throttledFetch)
</script>

<style scoped>
.announcement-bar {
  display: flex;
  align-items: center;
  height: 30px;
  font-size: 12px;
  overflow: hidden;
  position: relative;
  z-index: 99;
}

.bar-icon {
  flex-shrink: 0;
  padding: 0 8px 0 14px;
  display: flex;
  align-items: center;
}

.bar-marquee {
  flex: 1;
  overflow: hidden;
  min-width: 0;
}

.marquee-text {
  white-space: nowrap;
  padding-right: 40px;
}

.bar-sep {
  margin: 0 8px;
  opacity: 0.4;
}

.bar-close {
  flex-shrink: 0;
  padding: 0 10px 0 6px;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.2s;
  display: flex;
  align-items: center;
}
.bar-close:hover { opacity: 1; }

/* 切换动画 */
.bar-fade-enter-active,
.bar-fade-leave-active {
  transition: opacity 0.3s ease;
}
.bar-fade-enter-from,
.bar-fade-leave-to {
  opacity: 0;
}

/* 类型主题色 */
.bar-info {
  background: rgba(59, 130, 246, 0.08);
  color: #60A5FA;
  border-bottom: 1px solid rgba(59, 130, 246, 0.15);
}
.bar-warning {
  background: rgba(245, 158, 11, 0.08);
  color: #FBBF24;
  border-bottom: 1px solid rgba(245, 158, 11, 0.15);
}
.bar-error {
  background: rgba(239, 68, 68, 0.08);
  color: #F87171;
  border-bottom: 1px solid rgba(239, 68, 68, 0.15);
}
.bar-success {
  background: rgba(16, 185, 129, 0.08);
  color: #34D399;
  border-bottom: 1px solid rgba(16, 185, 129, 0.15);
}
</style>
