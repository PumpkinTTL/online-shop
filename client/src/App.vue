<template>
  <n-config-provider :theme="naiveTheme" :theme-overrides="themeOverrides" :locale="zhCN" :date-locale="dateZhCN">
    <n-message-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <router-view></router-view>
        </n-notification-provider>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { NConfigProvider, NMessageProvider, NDialogProvider, NNotificationProvider, darkTheme, zhCN, dateZhCN } from 'naive-ui'
import { useTheme } from '@/composables/useTheme'

const route = useRoute()
const { isDark } = useTheme()

// Admin 路由根据 isDark 切换主题，前台始终浅色
const naiveTheme = computed(() => {
  if (!route.path.startsWith('/admin')) return null
  return isDark.value ? darkTheme : null
})

// 主题定制
const themeOverrides = computed(() => {
  const base = {
    common: {
      primaryColor: '#3B82F6',
      primaryColorHover: '#60A5FA',
      primaryColorPressed: '#2563EB',
      primaryColorSuppl: '#3B82F6',
      borderRadius: '8px',
      fontFamily: 'Open Sans, Poppins, sans-serif',
    },
    Button: {
      borderRadiusMedium: '8px',
    },
    Card: {
      borderRadius: '12px',
    },
  }

  // 深色模式：把所有 Naive UI 组件背景统一到 Slate 色系
  if (isDark.value && route.path.startsWith('/admin')) {
    base.common = {
      ...base.common,
      bodyColor: '#1E293B',          // 页面/弹窗背景 → Slate-800
      cardColor: '#0F172A',          // 卡片/表格容器背景 → Slate-900
      modalColor: '#1E293B',         // 弹窗背景
      popoverColor: '#0F172A',       // 下拉弹出层背景
      drawerColor: '#0F172A',        // 抽屉背景
      inputColor: '#0F172A',         // 输入框背景
      actionColor: '#0F172A',        // 表格操作列等背景
      tableColor: '#0F172A',         // 表格主体背景
      hoverColor: 'rgba(59,130,246,0.08)',  // hover 行背景
      textColor1: '#F1F5F9',         // 主文字 → Slate-100
      textColor2: '#CBD5E1',         // 次要文字 → Slate-300
      textColor3: '#94A3B8',         // 辅助文字 → Slate-400
      borderColor: 'rgba(255,255,255,0.06)', // 统一边框
      dividerColor: 'rgba(255,255,255,0.06)',
    }
    base.DataTable = {
      tdColor: '#0F172A',            // 表格单元格背景
      tdColorHover: 'rgba(59,130,246,0.08)',
      thColor: '#0F172A',            // 表头背景
      thColorHover: 'rgba(59,130,246,0.08)',
      borderColor: 'rgba(255,255,255,0.06)',
      thTextColor: '#94A3B8',
      tdTextColor: '#CBD5E1',
    }
    base.Card = {
      ...base.Card,
      color: '#0F172A',
      borderColor: 'rgba(255,255,255,0.06)',
    }
    base.Input = {
      colorFocus: '#0F172A',
      borderFocus: '1px solid #3B82F6',
      borderHover: '1px solid #60A5FA',
    }
    base.InternalSelectMenu = {
      color: '#0F172A',
    }
    base.Select = {
      peers: {
        InternalSelection: {
          color: '#0F172A',
          borderFocus: '1px solid #3B82F6',
          borderHover: '1px solid #60A5FA',
        },
      },
    }
    base.Dialog = {
      color: '#1E293B',
    }
    base.Form = {
      labelTextColor: '#CBD5E1',
      feedbackTextColor: '#94A3B8',
    }
    base.Tag = {
      peers: {
        InternalSelection: {},
      },
    }
    base.Menu = {
      color: '#0F172A',
      itemTextColor: '#94A3B8',
      itemTextColorHover: '#F1F5F9',
      itemTextColorActive: '#60A5FA',
      itemColorActive: 'rgba(59,130,246,0.12)',
      itemColorHover: 'rgba(59,130,246,0.08)',
      borderColorHorizontal: 'rgba(255,255,255,0.06)',
    }
    base.Layout = {
      siderColor: '#0F172A',
      headerColor: '#1E293B',
      color: '#1E293B',
    }
    base.PageHeader = {
      color: '#1E293B',
    }
  }

  return base
})
</script>
