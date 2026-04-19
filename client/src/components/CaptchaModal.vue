<template>
  <n-modal v-model:show="visible" preset="card" title="安全验证" style="max-width: 360px;" :closable="true" :mask-closable="false">
    <n-p depth="3" style="margin-bottom: 12px;">请求过于频繁，请完成验证码后继续操作</n-p>
    <n-space align="center" :size="12">
      <n-tag type="info" size="large" :bordered="false" style="font-size: 16px; font-weight: 600; letter-spacing: 1px;">
        {{ question }}
      </n-tag>
      <n-input v-model:value="answer" placeholder="请输入答案" style="flex: 1;" @keyup.enter="submit" />
      <n-button quaternary circle :loading="loading" @click="refresh">
        <template #icon><n-icon><RefreshOutline /></n-icon></template>
      </n-button>
    </n-space>
    <template #footer>
      <n-button type="primary" block :loading="loading" @click="submit">提交验证码</n-button>
    </template>
  </n-modal>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { NModal, NTag, NInput, NButton, NIcon, NSpace, NP, useMessage } from 'naive-ui'
import { RefreshOutline } from '@vicons/ionicons5'
import { captchaApi } from '@/api'

const visible = ref(false)
const captchaId = ref('')
const question = ref('')
const answer = ref('')
const loading = ref(false)
const message = useMessage()

async function show() {
  visible.value = true
  await refresh()
}

async function refresh() {
  loading.value = true
  try {
    const data = await captchaApi.fetch()
    captchaId.value = data.captchaId
    question.value = data.question
    answer.value = ''
  } catch {
    message.error('获取验证码失败')
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (!answer.value.trim()) {
    message.warning('请输入验证码答案')
    return
  }
  loading.value = true
  try {
    await captchaApi.verify(captchaId.value, answer.value.trim())
    message.success('验证码通过')
    visible.value = false
    answer.value = ''
    if (window.__captchaVerified) window.__captchaVerified()
  } catch (e) {
    message.error(e.response?.data?.error || '验证码错误')
    await refresh()
  } finally {
    loading.value = false
  }
}

function handleCaptchaRequired() {
  show()
}

onMounted(() => {
  window.addEventListener('captcha-required', handleCaptchaRequired)
})

onBeforeUnmount(() => {
  window.removeEventListener('captcha-required', handleCaptchaRequired)
})
</script>
