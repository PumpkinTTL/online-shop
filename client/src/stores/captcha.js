import { defineStore } from 'pinia'
import { ref } from 'vue'
import { captchaApi } from '@/api'

export const useCaptchaStore = defineStore('captcha', () => {
  // 是否需要显示验证码弹窗
  const required = ref(false)
  // 验证码相关
  const captchaId = ref('')
  const question = ref('')
  const loading = ref(false)
  // 弹窗冷却：用户手动关闭弹窗后 N 毫秒内不再弹（防止关闭→立即又弹的闪烁）
  const cooldownUntil = ref(0)
  // 等待验证码通过的 Promise resolve 函数队列
  const resolvers = []
  // 刚通过验证码的标记——resolve 后的重试请求如果又 429，不弹窗直接返回错误
  // 只防重试请求的循环，不阻断新的独立请求
  let justResolvedUntil = 0

  /** 是否在冷却期（用户手动关闭弹窗后的短暂保护） */
  function isInCooldown() {
    return Date.now() < cooldownUntil.value
  }

  /** 刚通过验证码（重试请求的 429 不应该再弹窗，防循环） */
  function isJustResolved() {
    return Date.now() < justResolvedUntil
  }

  /**
   * 触发验证码流程（由 axios 429 拦截器调用）
   * 返回一个 Promise，验证码通过后 resolve → 拦截器重新发请求
   */
  function waitForCaptcha() {
    // 刚通过验证码的重试请求如果又 429，不再弹窗（防循环）
    // 这个标记 2 秒后过期，新请求可以正常弹窗
    if (isJustResolved()) {
      return Promise.reject(new Error('RATE_LIMIT_JUST_RESOLVED'))
    }

    // 冷却期内不再弹窗（用户手动关闭弹窗后的保护）
    if (isInCooldown()) {
      return Promise.reject(new Error('RATE_LIMIT_COOLDOWN'))
    }

    // 如果弹窗已经开着，直接加入等待队列
    if (required.value) {
      return new Promise((resolve) => {
        resolvers.push(resolve)
      })
    }

    // 首次触发：弹窗 + 获取验证码
    required.value = true
    fetchCaptcha()

    return new Promise((resolve) => {
      resolvers.push(resolve)
    })
  }

  /** 获取新验证码 */
  async function fetchCaptcha() {
    loading.value = true
    try {
      const data = await captchaApi.fetch()
      captchaId.value = data.captchaId
      question.value = data.question
    } catch {
      // 获取失败也保留弹窗，用户可手动刷新
    } finally {
      loading.value = false
    }
  }

  /** 提交验证码 */
  async function submitCaptcha(answer) {
    if (!answer.trim()) return false
    loading.value = true
    try {
      await captchaApi.verify(captchaId.value, answer.trim())
      // 验证通过：关闭弹窗，resolve 所有等待的请求
      required.value = false
      // 只设 justResolved 标记（2 秒），防重试请求的循环弹窗
      // 不设 cooldown！验证成功后应该允许新请求正常弹窗
      justResolvedUntil = Date.now() + 2000

      const pendingResolvers = [...resolvers]
      resolvers.length = 0

      // 延迟 300ms 再 resolve，给后端 resetAllKeys 生效的时间
      setTimeout(() => {
        pendingResolvers.forEach(resolve => resolve())
      }, 300)

      return true
    } catch {
      // 验证码错误，刷新新的验证码
      await fetchCaptcha()
      return false
    } finally {
      loading.value = false
    }
  }

  /** 关闭弹窗（用户手动关闭） */
  function dismiss() {
    required.value = false
    // 手动关闭后设短冷却期（3 秒），防止关闭→立即又弹的闪烁
    cooldownUntil.value = Date.now() + 3000
    // 清空等待队列（用户放弃了，不再重试这些请求）
    resolvers.length = 0
  }

  return {
    required, captchaId, question, loading,
    waitForCaptcha, fetchCaptcha, submitCaptcha, dismiss,
  }
})
