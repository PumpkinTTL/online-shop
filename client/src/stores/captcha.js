import { defineStore } from 'pinia'
import { ref } from 'vue'
import { captchaApi } from '@/api'

export const useCaptchaStore = defineStore('captcha', () => {
  const required = ref(false)
  const captchaId = ref('')
  const question = ref('')
  const loading = ref(false)
  const cooldownUntil = ref(0)
  const resolvers = []
  const rejecters = []

  function isInCooldown() {
    return Date.now() < cooldownUntil.value
  }

  /**
   * 触发验证码流程（由 axios 429 拦截器调用）
   * 验证通过 → resolve → 拦截器重试请求（后端已豁免，必定通过）
   * 用户关闭弹窗 → reject → 拦截器放弃重试
   */
  async function waitForCaptcha() {
    if (isInCooldown()) {
      const waitMs = cooldownUntil.value - Date.now()
      await new Promise(resolve => setTimeout(resolve, waitMs))
    }

    if (required.value) {
      return new Promise((resolve, reject) => {
        resolvers.push(resolve)
        rejecters.push(reject)
      })
    }

    required.value = true
    fetchCaptcha()

    return new Promise((resolve, reject) => {
      resolvers.push(resolve)
      rejecters.push(reject)
    })
  }

  async function fetchCaptcha() {
    loading.value = true
    try {
      const data = await captchaApi.fetch()
      captchaId.value = data.captchaId
      question.value = data.question
    } catch {
    } finally {
      loading.value = false
    }
  }

  async function submitCaptcha(answer) {
    if (!answer.trim()) return false
    loading.value = true
    try {
      await captchaApi.verify(captchaId.value, answer.trim())
      required.value = false

      const pendingResolvers = [...resolvers]
      const pendingRejecters = [...rejecters]
      resolvers.length = 0
      rejecters.length = 0

      pendingResolvers.forEach(resolve => resolve())
      pendingRejecters.length = 0

      return true
    } catch {
      await fetchCaptcha()
      return false
    } finally {
      loading.value = false
    }
  }

  function dismiss() {
    required.value = false
    const pendingRejecters = [...rejecters]
    resolvers.length = 0
    rejecters.length = 0
    pendingRejecters.forEach(reject => reject(new Error('CAPTCHA_DISMISSED')))
  }

  return {
    required, captchaId, question, loading,
    waitForCaptcha, fetchCaptcha, submitCaptcha, dismiss,
  }
})
