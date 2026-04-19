import { ref, watch } from 'vue'

const STORAGE_KEY = 'admin-theme'

// 全局共享状态，所有组件实例共用
const isDark = ref(localStorage.getItem(STORAGE_KEY) !== 'light')

watch(isDark, (val) => {
  localStorage.setItem(STORAGE_KEY, val ? 'dark' : 'light')
  document.documentElement.setAttribute('data-theme', val ? 'dark' : 'light')
})

// 初始化时设置
document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')

export function useTheme() {
  function toggleTheme() {
    isDark.value = !isDark.value
  }

  return { isDark, toggleTheme }
}
