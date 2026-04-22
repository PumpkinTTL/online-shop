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
  // 弹窗冷却：用户手动关闭弹窗后的短暂保护（0 = 无冷却，关了可以立刻再弹）
  const cooldownUntil = ref(0)
  // 等待验证码通过的 Promise resolve/reject 函数队列
  const resolvers = []
  const rejecters = []
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
   * 返回一个 Promise：
   *   - 验证通过 → resolve → 拦截器重试请求
   *   - 用户关闭弹窗 → reject → 拦截器放弃重试，返回原始错误
   *
   * cooldown 期间不拒绝，而是等 cooldown 结束后再弹窗
   */
  async function waitForCaptcha() {
    // 刚通过验证码的重试请求如果又 429，不再弹窗（防循环）
    if (isJustResolved()) {
      return Promise.reject(new Error('RATE_LIMIT_JUST_RESOLVED'))
    }

    // cooldown 期间：等 cooldown 结束再弹窗（而不是直接 reject）
    if (isInCooldown()) {
      const waitMs = cooldownUntil.value - Date.now()
      await new Promise(resolve => setTimeout(resolve, waitMs))
      // cooldown 结束后继续走下面的正常弹窗逻辑
    }

    // 如果弹窗已经开着，直接加入等待队列
    if (required.value) {
      return new Promise((resolve, reject) => {
        resolvers.push(resolve)
        rejecters.push(reject)
      })
    }

    // 首次触发：弹窗 + 获取验证码
    required.value = true
    fetchCaptcha()

    return new Promise((resolve, reject) => {
      resolvers.push(resolve)
      rejecters.push(reject)
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
      const pendingRejecters = [...rejecters]
      resolvers.length = 0
      rejecters.length = 0

      // 延迟 300ms 再 resolve，给后端 resetAllKeys 生效的时间
      setTimeout(() => {
        pendingResolvers.forEach(resolve => resolve())
        pendingRejecters.length = 0
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
    // 无冷却——关了就关了，下次 429 立刻再弹

    // reject 所有等待中的 Promise → 拦截器放弃重试 → 返回原始错误给调用者
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
