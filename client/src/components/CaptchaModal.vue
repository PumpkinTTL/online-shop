<template>
  <n-modal v-model:show="showModal" preset="card" title="安全验证" :style="{ maxWidth: '360px', width: '90vw' }" :closable="true" :mask-closable="false" @update:show="onShowChange">
    <n-p depth="3" style="margin-bottom: 12px;">请求过于频繁，请完成验证码后继续操作</n-p>
    <n-space align="center" :size="12">
      <n-tag type="info" size="large" :bordered="false" style="font-size: 16px; font-weight: 600; letter-spacing: 1px;">
        {{ captchaStore.question }}
      </n-tag>
      <n-input v-model:value="answer" placeholder="请输入答案" style="flex: 1;" @keyup.enter="submit" />
      <n-button quaternary circle :loading="captchaStore.loading" @click="captchaStore.fetchCaptcha()">
        <template #icon><n-icon><refresh-outline></refresh-outline></n-icon></template>
      </n-button>
    </n-space>
    <template #footer>
      <n-button type="primary" block :loading="captchaStore.loading" @click="submit">提交验证码</n-button>
    </template>
  </n-modal>
</template>

<script setup>
import { ref, computed } from 'vue'
import { NModal, NTag, NInput, NButton, NIcon, NSpace, NP, useMessage } from 'naive-ui'
import { RefreshOutline } from '@vicons/ionicons5'
import { useCaptchaStore } from '@/stores/captcha'

const captchaStore = useCaptchaStore()
const answer = ref('')
const message = useMessage()

const showModal = computed({
  get: () => captchaStore.required,
  set: () => {} // 由 store 控制
})

function onShowChange(val) {
  if (!val) captchaStore.dismiss()
}

async function submit() {
  if (!answer.value.trim()) {
    message.warning('请输入验证码答案')
    return
  }
  const success = await captchaStore.submitCaptcha(answer.value)
  if (success) {
    message.success('验证码通过')
    answer.value = ''
  } else {
    message.error('验证码错误')
    answer.value = ''
  }
}
</script>
