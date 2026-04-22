<template>
  <div class="product-detail-view">
    <!-- 返回按钮（浮动） -->
    <n-button text class="back-btn" @click="goHome">
      <template #icon>
        <n-icon :size="24"><arrow-back-outline></arrow-back-outline></n-icon>
      </template>
    </n-button>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <n-spin size="large" />
      <p>加载中...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-state">
      <n-icon :size="64" color="#CBD5E1"><alert-circle-outline></alert-circle-outline></n-icon>
      <p>{{ error }}</p>
      <n-button type="primary" size="large" @click="goHome">返回首页</n-button>
    </div>

    <!-- 商品详情 -->
    <template v-else-if="product">
      <div class="detail-container">
        <!-- 封面 Hero 区 -->
        <div class="product-hero">
          <div class="hero-cover" :style="coverStyle">
            <div v-if="!product.image && !product.coverImage" class="cover-placeholder">
              <n-icon :size="80" color="#E2E8F0"><cube-outline></cube-outline></n-icon>
            </div>
          </div>

          <!-- 标签 -->
          <div class="hero-badges">
            <n-tag v-if="isSmsProduct" size="small" :bordered="false" round class="badge-sms">
              <template #icon><n-icon><phone-portrait-outline></phone-portrait-outline></n-icon></template>
              接码登录
            </n-tag>
            <n-tag v-if="product.warranty" size="small" :bordered="false" round type="info">
              <template #icon><n-icon><shield-checkmark-outline></shield-checkmark-outline></n-icon></template>
              {{ product.warranty }}
            </n-tag>
            <n-tag v-if="product.credit" size="small" :bordered="false" round type="warning">
              <template #icon><n-icon><wallet-outline></wallet-outline></n-icon></template>
              {{ product.credit }}积分
            </n-tag>
          </div>

          <!-- 名称 + 价格（叠在封面上） -->
          <div class="hero-overlay">
            <h1 class="hero-name">{{ product.name }}</h1>
            <div class="hero-price">
              <span class="price-symbol">¥</span>
              <span class="price-amount">{{ product.price }}</span>
            </div>
          </div>
        </div>

        <!-- Bento Grid 布局 -->
        <div class="bento-grid">
          <!-- 商品描述卡片 -->
          <div class="bento-card bento-span-2">
            <div class="card-title">
              <n-icon :size="18" color="#3B82F6"><document-text-outline></document-text-outline></n-icon>
              <span>商品描述</span>
            </div>
            <p class="card-text">{{ product.description || '特惠渠道，无质保，且用且珍惜' }}</p>
            <!-- 特点标签 -->
            <div class="features-inline">
              <div class="feature-tag">
                <n-icon :size="12" color="#3B82F6"><PricetagOutline></PricetagOutline></n-icon>
                <span>特惠价格</span>
              </div>
              <div class="feature-tag">
                <n-icon :size="12" color="#EC4899"><DiamondOutline></DiamondOutline></n-icon>
                <span>渠道专享</span>
              </div>
              <div class="feature-tag">
                <n-icon :size="12" color="#F59E0B"><FlashOutline></FlashOutline></n-icon>
                <span>即开即用</span>
              </div>
              <div class="feature-tag">
                <n-icon :size="12" color="#06B6D4"><RocketOutline></RocketOutline></n-icon>
                <span>快速激活</span>
              </div>
              <div class="feature-tag">
                <n-icon :size="12" color="#22C55E"><ShieldCheckmarkOutline></ShieldCheckmarkOutline></n-icon>
                <span>{{ product.warranty || '无质保' }}</span>
              </div>
              <div class="feature-tag">
                <n-icon :size="12" color="#8B5CF6"><LogInOutline></LogInOutline></n-icon>
                <span>首登</span>
              </div>
            </div>

            <!-- 商品特有注意事项 -->
            <div v-if="product.tips" class="inline-tips">
              <n-icon :size="14" color="#DC2626"><warning-outline></warning-outline></n-icon>
              <span>{{ product.tips }}</span>
            </div>

            <!-- 温馨提示（PC端显示，移动端隐藏） -->
            <div class="notice-section notice-section-inline">
              <div class="notice-title-inline">
                <n-icon :size="16" color="#F59E0B"><information-circle-outline></information-circle-outline></n-icon>
                <span>温馨提示</span>
              </div>
              <p class="notice-text-inline">
                <template v-if="isSmsProduct">
                  本商品需要接码登录，购买成功后会分配登录号码，请通过接码获取验证码完成登录。请妥善保管号码和验证码信息。
                </template>
                <template v-else-if="product.warranty">
                  本产品提供质保服务，质保时间：{{ product.warranty }}。质保期内如遇问题可联系客服处理。
                </template>
                <template v-else>
                  本产品为特惠渠道商品，不提供质保服务。购买前请仔细了解产品特性，确认符合您的需求。
                </template>
              </p>
              <div class="notice-contact-inline">
                <n-icon :size="16" color="#D97706"><chatbubble-ellipses-outline></chatbubble-ellipses-outline></n-icon>
                <span>客服联系：bitlesu</span>
              </div>
            </div>
          </div>

          <!-- 购买操作卡片 -->
          <div class="bento-card bento-span-2 purchase-section">
            <!-- 未完成购买 -->
            <div v-if="!actionResult">
              <!-- 联系方式 -->
              <div class="contact-section">
                <div class="contact-header">
                  <n-icon :size="16" color="#3B82F6"><call-outline></call-outline></n-icon>
                  <span class="contact-title">联系方式</span>
                  <span class="contact-desc">用于订单查询</span>
                </div>
                <n-input
                  v-model:value="contact"
                  placeholder="手机号 / QQ / 邮箱"
                  size="large"
                  :input-props="{ autocomplete: 'off', inputmode: 'tel' }"
                />
              </div>

              <!-- 方式切换 -->
              <div class="method-tabs">
                <div
                  class="method-tab"
                  :class="{ active: payMethod === 'alipay' }"
                  @click="payMethod = 'alipay'"
                >
                  <div class="tab-icon-wrap">
                    <n-icon :size="20"><logo-alipay></logo-alipay></n-icon>
                    <span>支付宝购买</span>
                    <span class="recommend-badge">推荐</span>
                  </div>
                </div>
                <div
                  class="method-tab"
                  :class="{ active: payMethod === 'card' }"
                  @click="payMethod = 'card'"
                >
                  <div class="tab-icon-wrap">
                    <n-icon :size="20"><key-outline></key-outline></n-icon>
                    <span>卡密兑换</span>
                  </div>
                </div>
              </div>

              <!-- 支付宝购买 -->
              <div v-if="payMethod === 'alipay'" class="method-content">
                <p class="method-hint">
                  <n-icon :size="14" color="#64748B"><information-circle-outline></information-circle-outline></n-icon>
                  扫码支付，自动发放{{ isSmsProduct ? '登录号码' : '兑换码' }}
                </p>
                <n-button
                  type="primary"
                  size="large"
                  block
                  :loading="payLoading"
                  @click="startAlipayPay"
                >
                  <template #icon>
                    <n-icon><logo-alipay></logo-alipay></n-icon>
                  </template>
                  立即购买 ¥{{ product.price }}
                </n-button>
              </div>

              <!-- 卡密兑换 -->
              <div v-else class="method-content">
                <p class="method-hint">
                  <n-icon :size="14" color="#64748B"><information-circle-outline></information-circle-outline></n-icon>
                  旧卡密也可以在这里查询兑换
                </p>
                <n-input
                  v-model:value="redeemCode"
                  placeholder="请输入卡密"
                  size="large"
                  :input-props="{ autocomplete: 'off' }"
                  @keyup.enter="handleRedeem"
                />
                <n-button
                  type="primary"
                  size="large"
                  block
                  :loading="redeeming"
                  @click="handleRedeem"
                >
                  兑换
                </n-button>
                <a href="https://68n.cn/xZSmW" target="_blank" class="buy-link">
                  <n-icon :size="14"><cart-outline></cart-outline></n-icon>
                  没有卡密？点击购买
                </a>
              </div>
            </div>

            <!-- 非接码产品：成功 -->
            <div v-else-if="actionResult && !isSmsProduct" class="success-content">
              <div class="success-icon">
                <n-icon :size="56" color="#22C55E"><checkmark-circle-outline></checkmark-circle-outline></n-icon>
              </div>
              <h3 class="success-title">{{ actionResult.type === 'alipay' ? '支付成功' : '兑换成功' }}</h3>
              <p class="success-desc">请复制兑换码前往网站完成兑换</p>

              <div class="result-box">
                <div class="result-label">兑换码 (CDK)</div>
                <n-space>
                  <n-input :value="actionResult.CDK" readonly style="flex: 1" />
                  <n-button @click="copyText(actionResult.CDK, '兑换码已复制')">
                    <template #icon><n-icon><copy-outline></copy-outline></n-icon></template>
                    复制
                  </n-button>
                </n-space>
              </div>

              <n-space vertical>
                <n-button type="primary" size="large" block @click="goToRedeem">
                  <template #icon><n-icon><open-outline></open-outline></n-icon></template>
                  前往兑换
                </n-button>
                <n-button size="large" block @click="copyText(redeemUrl, '网址已复制')">
                  <template #icon><n-icon><copy-outline></copy-outline></n-icon></template>
                  复制兑换网址
                </n-button>
              </n-space>
            </div>

            <!-- 接码产品：成功 + 获取验证码 -->
            <div v-else-if="actionResult && isSmsProduct" class="success-content">
              <div class="success-icon">
                <n-icon :size="56" color="#22C55E"><checkmark-circle-outline></checkmark-circle-outline></n-icon>
              </div>
              <h3 class="success-title">{{ actionResult.type === 'alipay' ? '支付成功' : '兑换成功' }}</h3>

              <div class="result-box">
                <div class="result-label">登录号码</div>
                <n-space>
                  <n-input :value="actionResult.CDK" readonly style="flex: 1" />
                  <n-button @click="copyText(actionResult.CDK, '号码已复制')">
                    <template #icon><n-icon><copy-outline></copy-outline></n-icon></template>
                    复制
                  </n-button>
                </n-space>
              </div>

              <!-- 接码区域 -->
              <div class="sms-area">
                <div class="sms-area-title">
                  <n-icon :size="16"><chatbubbles-outline></chatbubbles-outline></n-icon>
                  接码登录
                </div>

                <!-- 未获取验证码 -->
                <div v-if="!smsCode" class="sms-pending">
                  <n-button
                    type="primary"
                    size="large"
                    block
                    :loading="smsLoading"
                    :disabled="needSmsPayment"
                    @click="getSmsCode"
                  >
                    <template #icon>
                      <n-icon><paper-plane-outline></paper-plane-outline></n-icon>
                    </template>
                    {{ smsLoading ? '获取中...' : '获取验证码' }}
                  </n-button>
                  <p v-if="smsError" class="sms-error">
                    <n-icon :size="14" color="#EF4444"><alert-circle-outline></alert-circle-outline></n-icon>
                    {{ smsError }}
                  </p>
                  <n-button
                    v-if="needSmsPayment"
                    type="primary"
                    size="large"
                    block
                    :loading="smsQrLoading"
                    @click="startSmsServicePay"
                  >
                    <template #icon><n-icon><logo-alipay></logo-alipay></n-icon></template>
                    支付接码服务费 ¥{{ smsPriceText }}
                  </n-button>
                </div>

                <!-- 已获取验证码 -->
                <div v-else class="sms-success">
                  <div class="result-box">
                    <div class="result-label">验证码</div>
                    <n-space>
                      <n-input :value="smsCode" readonly style="flex: 1" />
                      <n-button @click="copyText(smsCode, '验证码已复制')">
                        <template #icon><n-icon><copy-outline></copy-outline></n-icon></template>
                        复制
                      </n-button>
                    </n-space>
                  </div>
                  <n-alert type="success" :show-icon="false">
                    接码成功，请使用号码和验证码登录
                  </n-alert>
                </div>
              </div>
            </div>
          </div>

          <!-- 温馨提示（移动端独立卡片，PC端隐藏） -->
          <div class="bento-card bento-span-2 notice-card-mobile">
            <div class="notice-title">
              <n-icon :size="18" color="#F59E0B"><information-circle-outline></information-circle-outline></n-icon>
              <span>温馨提示</span>
            </div>
            <div class="notice-content">
              <p class="notice-text">
                <template v-if="isSmsProduct">
                  本商品需要接码登录，购买成功后会分配登录号码，请通过接码获取验证码完成登录。请妥善保管号码和验证码信息。
                </template>
                <template v-else-if="product.warranty">
                  本产品提供质保服务，质保时间：{{ product.warranty }}。质保期内如遇问题可联系客服处理。
                </template>
                <template v-else>
                  本产品为特惠渠道商品，不提供质保服务。购买前请仔细了解产品特性，确认符合您的需求。
                </template>
              </p>
              <div class="notice-contact">
                <n-icon :size="18" color="#D97706"><chatbubble-ellipses-outline></chatbubble-ellipses-outline></n-icon>
                <span>客服联系：bitlesu</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部安全区 -->
        <div class="bottom-safe"></div>
      </div>
    </template>

    <!-- 支付宝二维码弹窗 -->
    <n-modal v-model:show="showQrModal" :mask-closable="true" preset="card" title="支付宝扫码支付" class="pay-modal" :style="{ maxWidth: '400px', width: '90vw' }">
      <!-- 加载中 -->
      <div v-if="qrLoading" class="modal-state">
        <n-spin size="medium" />
        <p>正在创建支付订单...</p>
      </div>

      <!-- 错误 -->
      <div v-else-if="qrError" class="modal-state modal-error">
        <n-icon :size="56" color="#EF4444"><close-circle-outline></close-circle-outline></n-icon>
        <p>{{ qrError }}</p>
        <n-button type="primary" @click="closeQrModal">关闭</n-button>
      </div>

      <!-- 二维码 -->
      <div v-else-if="payStatus !== 'paid'" class="qr-content">
        <div class="pay-info">
          <span class="pay-name">{{ product.name }}</span>
          <span class="pay-amount">¥{{ payAmount }}</span>
        </div>

        <!-- 移动端：打开支付宝 -->
        <n-button
          v-if="isMobile && payUrl"
          type="primary"
          size="large"
          block
          style="margin-bottom: 16px;"
          @click="openAlipay"
        >
          <template #icon><n-icon><logo-alipay></logo-alipay></n-icon></template>
          打开支付宝支付
        </n-button>

        <div class="qr-wrap">
          <img v-if="qrImageUrl" :src="qrImageUrl" alt="支付宝二维码" />
        </div>
        <p class="qr-tip">二维码30分钟内有效，请尽快支付</p>
        <div class="countdown" :class="{ expired: countdown <= 0 }">
          <template v-if="countdown > 0">
            <n-icon :size="14"><time-outline></time-outline></n-icon>
            剩余 {{ countdownText }}
          </template>
          <template v-else>
            <n-icon :size="14"><time-outline></time-outline></n-icon>
            二维码已过期
          </template>
        </div>
      </div>

      <!-- 支付成功 -->
      <div v-else class="modal-state modal-success">
        <n-icon :size="56" color="#22C55E"><checkmark-circle-outline></checkmark-circle-outline></n-icon>
        <p class="success-title">支付成功</p>
        <p v-if="isSmsProduct">
          <n-spin size="small" /> 正在加载接码流程...
        </p>
        <p v-else>{{ product.name }}</p>
      </div>
    </n-modal>

    <!-- 接码服务支付弹窗 -->
    <n-modal v-model:show="showSmsPayModal" :mask-closable="true" preset="card" title="支付接码服务费" class="pay-modal" :style="{ maxWidth: '400px', width: '90vw' }">
      <!-- 加载中 -->
      <div v-if="smsQrLoading" class="modal-state">
        <n-spin size="medium" />
        <p>正在创建支付订单...</p>
      </div>

      <!-- 错误 -->
      <div v-else-if="smsQrError" class="modal-state modal-error">
        <n-icon :size="56" color="#EF4444"><close-circle-outline></close-circle-outline></n-icon>
        <p>{{ smsQrError }}</p>
        <n-button type="primary" @click="closeSmsPayModal">关闭</n-button>
      </div>

      <!-- 二维码 -->
      <div v-else-if="smsPayStatus !== 'paid'" class="qr-content">
        <div class="pay-info">
          <span class="pay-name">接码服务费</span>
          <span class="pay-amount">¥{{ smsPayAmount }}</span>
        </div>

        <!-- 移动端：打开支付宝 -->
        <n-button
          v-if="isMobile && smsPayUrl"
          type="primary"
          size="large"
          block
          style="margin-bottom: 16px;"
          @click="openSmsAlipay"
        >
          <template #icon><n-icon><logo-alipay></logo-alipay></n-icon></template>
          打开支付宝支付
        </n-button>

        <div class="qr-wrap">
          <img v-if="smsQrImageUrl" :src="smsQrImageUrl" alt="支付宝二维码" />
        </div>
        <p class="qr-tip">扫码支付后即可接码</p>
      </div>

      <!-- 支付成功 -->
      <div v-else class="modal-state modal-success">
        <n-icon :size="56" color="#22C55E"><checkmark-circle-outline></checkmark-circle-outline></n-icon>
        <p class="success-title">支付成功</p>
        <p>正在获取验证码...</p>
      </div>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import {
  NIcon, NSpin, NButton, NInput, NModal, NTag, NSpace, NAlert, NButtonGroup
} from 'naive-ui'
import {
  ArrowBackOutline, AlertCircleOutline, CubeOutline, PhonePortraitOutline,
  ShieldCheckmarkOutline, WalletOutline, WarningOutline, DocumentTextOutline,
  SparklesOutline, PricetagOutline, FlashOutline, BagHandleOutline, CallOutline,
  LogoAlipay, KeyOutline, CartOutline, CopyOutline, OpenOutline,
  CheckmarkCircleOutline, ChatbubblesOutline, PaperPlaneOutline,
  TimeOutline, CloseCircleOutline, InformationCircleOutline,
  ChatbubbleEllipsesOutline, LogInOutline, DiamondOutline, RocketOutline
} from '@vicons/ionicons5'
import { productApi, pickupApi, paymentApi } from '@/api'
import { useUserStore } from '@/stores/user'
import QRCode from 'qrcode'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const userStore = useUserStore()

// 基础状态
const product = ref(null)
const loading = ref(true)
const error = ref('')
const contact = ref(localStorage.getItem('lastContact') || '')
const payMethod = ref('alipay')
const redeemCode = ref('')
const redeeming = ref(false)
const actionResult = ref(null)

// 计算属性
const isSmsProduct = computed(() => product.value?.category?.smsEnabled === 1)
const redeemUrl = computed(() => product.value?.addr || 'https://aisub.vip/')
const smsPriceText = computed(() => {
  const value = product.value?.category?.smsPrice
  return value || product.value?.smsPrice || '0.01'
})

// 移动端检测
const isMobile = computed(() => {
  const ua = navigator.userAgent.toLowerCase()
  return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua)
})

// 支付流程状态
const showQrModal = ref(false)
const qrLoading = ref(false)
const qrError = ref('')
const qrImageUrl = ref('')
const payAmount = ref('')
const payStatus = ref('pending')
const orderNo = ref('')
const cdKey = ref('')
const countdown = ref(0)
const payLoading = ref(false)
const payUrl = ref('')

// 接码流程状态
const smsCode = ref('')
const smsLoading = ref(false)
const smsError = ref('')
const needSmsPayment = ref(false)

// 接码服务支付状态
const showSmsPayModal = ref(false)
const smsQrLoading = ref(false)
const smsQrError = ref('')
const smsQrImageUrl = ref('')
const smsPayAmount = ref('')
const smsPayStatus = ref('pending')
const smsOrderNo = ref('')
const smsPayUrl = ref('')

// 倒计时文本
const countdownText = computed(() => {
  const m = Math.floor(countdown.value / 60)
  const s = countdown.value % 60
  return `${m}分${String(s).padStart(2, '0')}秒`
})

// 封面样式
const coverStyle = computed(() => {
  const src = product.value?.image ? `/images/${product.value.image}` : (product.value?.coverImage || '')
  if (src) {
    return { background: `url('${src}') center/cover no-repeat` }
  }
  return { background: 'linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%)' }
})

// 定时器
let pollTimer = null
let countdownTimer = null
let smsPollTimer = null

// 加载商品
const loadProduct = async () => {
  const productId = route.params.id
  if (!productId) {
    error.value = '商品不存在'
    loading.value = false
    return
  }
  try {
    product.value = await productApi.getProduct(productId)
    if (!product.value) {
      error.value = '商品不存在'
    } else {
      document.title = `${product.value.name} - 工具商店`
    }
  } catch (err) {
    error.value = '加载失败'
    console.error(err)
  } finally {
    loading.value = false
  }
}

// 自动填充联系方式
const checkAndPrefillContact = async () => {
  if (userStore.isLoggedIn && !contact.value.trim()) {
    try {
      await userStore.fetchMe()
      if (userStore.user) {
        contact.value = userStore.user.username
        localStorage.setItem('lastContact', userStore.user.username)
      }
    } catch (e) {
      // 未登录，不影响
    }
  }
}

// 卡密兑换
const handleRedeem = async () => {
  if (!contact.value.trim()) {
    message.warning('请先填写联系方式')
    return
  }
  if (!redeemCode.value.trim()) {
    message.warning('请输入卡密')
    return
  }
  redeeming.value = true
  try {
    const response = await pickupApi.redeem(redeemCode.value.trim(), product.value.id, contact.value.trim())
    localStorage.setItem('lastContact', contact.value.trim())
    actionResult.value = { type: 'redeem', CDK: response.CDK, cardKeyId: response.id }
    message.success('兑换成功！')
  } catch (err) {
    message.error(err.response?.data?.error || '兑换失败')
  } finally {
    redeeming.value = false
  }
}

// 支付宝支付
const startAlipayPay = async () => {
  if (!contact.value.trim()) {
    message.warning('请先填写联系方式')
    return
  }
  localStorage.setItem('lastContact', contact.value.trim())
  payLoading.value = true
  showQrModal.value = true
  qrLoading.value = true
  qrError.value = ''
  payStatus.value = 'pending'
  cdKey.value = ''
  qrImageUrl.value = ''

  try {
    const res = await paymentApi.create(product.value.id, contact.value.trim())
    orderNo.value = res.orderNo
    payAmount.value = res.amount
    payUrl.value = res.payUrl || ''

    await generateQR(res.qrCode)

    const expiredAt = new Date(res.expiredAt)
    countdown.value = Math.max(0, Math.floor((expiredAt - Date.now()) / 1000))
    startCountdown()
    startPolling()
  } catch (err) {
    console.error('[Payment/Create] Error:', err)
    qrError.value = err.response?.data?.error || err.message || '创建支付订单失败'
  } finally {
    qrLoading.value = false
    payLoading.value = false
  }
}

const generateQR = async (text) => {
  try {
    qrImageUrl.value = await QRCode.toDataURL(text, {
      width: 200,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    })
  } catch (err) {
    console.error('二维码生成失败:', err)
  }
}

const startPolling = () => {
  stopPolling()
  pollTimer = setInterval(async () => {
    if (!orderNo.value || payStatus.value === 'paid') return
    try {
      const res = await paymentApi.queryStatus(orderNo.value)
      if (res.status === 'paid') {
        payStatus.value = 'paid'
        cdKey.value = res.cdKey
        stopPolling()
        message.success('支付成功！')

        actionResult.value = { type: 'alipay', CDK: res.cdKey, cardKeyId: res.cardKeyId || null }

        setTimeout(() => {
          showQrModal.value = false
          if (countdownTimer) {
            clearInterval(countdownTimer)
            countdownTimer = null
          }
        }, 800)
      }
    } catch (e) {
      // 静默
    }
  }, 3000)
}

const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

const startCountdown = () => {
  if (countdownTimer) clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    if (countdown.value > 0) {
      countdown.value--
      if (countdown.value <= 0) {
        payStatus.value = 'expired'
        stopPolling()
      }
    }
  }, 1000)
}

const closeQrModal = () => {
  showQrModal.value = false
  stopPolling()
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

const getSmsCode = async () => {
  smsLoading.value = true
  smsError.value = ''
  try {
    const res = await pickupApi.iscodeGetVerifyCode(
      actionResult.value.CDK,
      actionResult.value.cardKeyId || null,
      product.value.id
    )
    if (res.received && res.code) {
      smsCode.value = res.code
      needSmsPayment.value = false
      message.success('验证码已获取！')
    } else {
      smsError.value = '暂未收到验证码，请稍后重试'
    }
  } catch (err) {
    const errMsg = err.response?.data?.error || '获取验证码失败'
    if (errMsg === 'NEED_PURCHASE') {
      smsError.value = '本次接码需要支付服务费，请点击下方按钮完成支付'
      needSmsPayment.value = true
    } else {
      smsError.value = errMsg
    }
  } finally {
    smsLoading.value = false
  }
}

const startSmsServicePay = async () => {
  needSmsPayment.value = false
  smsError.value = ''
  if (!contact.value.trim()) {
    message.warning('请先填写联系方式')
    return
  }
  if (!actionResult.value.cardKeyId) {
    message.error('缺少卡密信息，无法创建接码订单')
    return
  }

  showSmsPayModal.value = true
  smsQrLoading.value = true
  smsQrError.value = ''
  smsPayStatus.value = 'pending'
  smsQrImageUrl.value = ''

  try {
    const res = await paymentApi.createSms(
      actionResult.value.cardKeyId,
      product.value.id,
      contact.value.trim()
    )
    smsOrderNo.value = res.orderNo
    smsPayAmount.value = res.amount
    smsPayUrl.value = res.payUrl || ''

    try {
      smsQrImageUrl.value = await QRCode.toDataURL(res.qrCode, {
        width: 200,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      })
    } catch (err) {
      console.error('二维码生成失败:', err)
    }

    startSmsPolling()
  } catch (err) {
    smsQrError.value = err.response?.data?.error || err.message || '创建支付订单失败'
  } finally {
    smsQrLoading.value = false
  }
}

const startSmsPolling = () => {
  stopSmsPolling()
  smsPollTimer = setInterval(async () => {
    if (!smsOrderNo.value || smsPayStatus.value === 'paid') return
    try {
      const res = await paymentApi.queryStatus(smsOrderNo.value)
      if (res.status === 'paid') {
        smsPayStatus.value = 'paid'
        stopSmsPolling()
        message.success('接码服务费支付成功！')

        setTimeout(async () => {
          showSmsPayModal.value = false
          await getSmsCode()
        }, 800)
      }
    } catch (e) {
      // 静默
    }
  }, 3000)
}

const stopSmsPolling = () => {
  if (smsPollTimer) {
    clearInterval(smsPollTimer)
    smsPollTimer = null
  }
}

const closeSmsPayModal = () => {
  showSmsPayModal.value = false
  stopSmsPolling()
}

const copyText = async (text, msg) => {
  try {
    await navigator.clipboard.writeText(text)
    message.success(msg || '已复制')
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.cssText = 'position:fixed;opacity:0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    message.success(msg || '已复制')
  }
}

const goToRedeem = () => {
  window.open(redeemUrl.value, '_blank')
}

const openAlipay = () => {
  if (!payUrl.value) {
    message.error('支付链接未生成')
    return
  }
  window.location.href = payUrl.value
  setTimeout(() => {
    message.info('如未自动跳转，请确保已安装支付宝APP')
  }, 1000)
}

const openSmsAlipay = () => {
  if (!smsPayUrl.value) {
    message.error('支付链接未生成')
    return
  }
  window.location.href = smsPayUrl.value
  setTimeout(() => {
    message.info('如未自动跳转，请确保已安装支付宝APP')
  }, 1000)
}

const goHome = () => {
  router.push({ name: 'Home' })
}

onMounted(async () => {
  await loadProduct()
  await checkAndPrefillContact()
})

onUnmounted(() => {
  stopPolling()
  stopSmsPolling()
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>

<style scoped>
/* ===== 基础容器 ===== */
.product-detail-view {
  min-height: 100vh;
  background: #F8FAFC;
  padding-bottom: 24px;
}

/* ===== 返回按钮 ===== */
.back-btn {
  position: fixed;
  top: 70px;
  left: 16px;
  z-index: 100;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

/* ===== 加载/错误状态 ===== */
.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 80px 20px;
  color: #94A3B8;
}

/* ===== 内容容器 ===== */
.detail-container {
  max-width: 640px;
  margin: 0 auto;
  padding: 16px 16px 0;
}

/* ===== Hero 封面区 ===== */
.product-hero {
  position: relative;
  margin-bottom: 16px;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}

.hero-cover {
  position: relative;
  width: 100%;
  height: 280px;
}

.cover-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.hero-badges {
  position: absolute;
  top: 16px;
  left: 16px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.badge-sms {
  background: rgba(16, 185, 129, 0.95) !important;
  color: white !important;
  border: none !important;
}

/* ===== 名称价格叠加 ===== */
.hero-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24px 20px 20px;
  background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.7) 100%);
}

.hero-name {
  font-family: 'Poppins', sans-serif;
  font-size: 24px;
  font-weight: 700;
  color: white;
  margin: 0 0 8px 0;
  line-height: 1.3;
}

.hero-price {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.price-symbol {
  font-size: 18px;
  font-weight: 600;
  color: #F59E0B;
}

.price-amount {
  font-family: 'Poppins', sans-serif;
  font-size: 36px;
  font-weight: 700;
  color: #F59E0B;
}

/* ===== Bento Grid 布局 ===== */
.bento-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.bento-span-2 {
  grid-column: span 2;
}

/* ===== Bento 卡片 ===== */
.bento-card {
  background: white;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
}

.bento-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

/* 卡片标题 */
.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #1E293B;
  margin-bottom: 12px;
}

.card-text {
  font-size: 14px;
  line-height: 1.7;
  color: #64748B;
  margin: 0;
}

/* 内联提示 */
.inline-tips {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 14px;
  padding: 12px 14px;
  background: #FEE2E2;
  border-radius: 10px;
  font-size: 13px;
  color: #991B1B;
  line-height: 1.6;
}

.inline-tips span {
  flex: 1;
  font-weight: 500;
}

/* ===== 特点小卡片 ===== */
.feature-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  margin-bottom: 10px;
  color: white;
}

.feature-blue { background: linear-gradient(135deg, #3B82F6, #2563EB); }
.feature-orange { background: linear-gradient(135deg, #F59E0B, #D97706); }
.feature-green { background: linear-gradient(135deg, #22C55E, #16A34A); }
.feature-gray { background: linear-gradient(135deg, #94A3B8, #64748B); }

.feature-title {
  font-size: 14px;
  font-weight: 600;
  color: #1E293B;
  margin-bottom: 2px;
}

.feature-desc {
  font-size: 12px;
  color: #94A3B8;
}

.card-green {
  background: linear-gradient(135deg, #F0FDF4, #DCFCE7);
}

.card-gray {
  background: linear-gradient(135deg, #F8FAFC, #F1F5F9);
}

/* ===== 购买区域 ===== */
.purchase-section {
  padding: 20px;
}

.contact-section {
  margin-bottom: 20px;
}

.contact-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.contact-title {
  font-size: 15px;
  font-weight: 600;
  color: #1E293B;
}

.contact-desc {
  margin-left: auto;
  font-size: 12px;
  color: #94A3B8;
}

/* ===== 方式切换 ===== */
.method-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 20px;
}

.method-tab {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid #E2E8F0;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #64748B;
}

.method-tab:first-child {
  border-radius: 12px 0 0 12px;
}

.method-tab:last-child {
  border-radius: 0 12px 12px 0;
}

.method-tab:hover {
  background: #F8FAFC;
}

.method-tab.active {
  background: #3B82F6;
  border-color: #3B82F6;
  color: white;
}

.tab-icon-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}

.recommend-badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  background: #F59E0B;
  color: white;
  font-size: 10px;
  font-weight: 600;
  border-radius: 8px;
  margin-left: 2px;
  flex-shrink: 0;
}

.method-tab.active .recommend-badge {
  background: rgba(255, 255, 255, 0.25);
}

/* ===== 移动端优化 ===== */
@media (max-width: 767px) {
  .tab-icon-wrap {
    font-size: 13px;
    gap: 4px;
  }

  .recommend-badge {
    font-size: 9px;
    padding: 1px 4px;
  }

  .method-tab {
    padding: 12px 8px;
  }
}

/* ===== 特点标签（集成到商品描述卡片） ===== */
.features-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.feature-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: #F1F5F9;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #475569;
}

/* ===== 温馨提示（集成版 - PC端显示） ===== */
.notice-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #E5E7EB;
  display: none;
}

.notice-title-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #92400E;
  margin-bottom: 8px;
}

.notice-text-inline {
  font-size: 13px;
  line-height: 1.6;
  color: #78350F;
  margin: 0 0 10px 0;
}

.notice-contact-inline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(254, 243, 199, 0.6);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #92400E;
}

/* ===== 温馨提示（移动端独立卡片） ===== */
.notice-card-mobile {
  background: #FFFBEB;
  border: 1px solid #FDE68A;
  display: block;
}

/* ===== 方式内容 ===== */
.method-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.method-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #F8FAFC;
  border-radius: 10px;
  font-size: 14px;
  color: #475569;
  margin: 0;
}

.buy-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  width: 100%;
  font-size: 14px;
  color: #3B82F6;
  text-decoration: none;
  border-radius: 10px;
  transition: background 0.2s ease;
}

.buy-link:hover {
  background: #EFF6FF;
}

/* ===== 成功状态 ===== */
.success-content {
  text-align: center;
}

.success-icon {
  margin-bottom: 16px;
}

.success-title {
  font-family: 'Poppins', sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: #1E293B;
  margin: 0 0 8px 0;
}

.success-desc {
  font-size: 14px;
  color: #64748B;
  margin: 0 0 20px 0;
}

.result-box {
  text-align: left;
  margin-bottom: 16px;
}

.result-label {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 8px;
}

/* ===== 接码区域 ===== */
.sms-area {
  margin-top: 20px;
  text-align: left;
}

.sms-area-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #1E293B;
  margin-bottom: 12px;
}

.sms-error {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #EF4444;
  margin: 8px 0 0 0;
}

/* ===== 商品特有注意事项 ===== */
.tips-card {
  background: linear-gradient(135deg, #FEF3C7, #FDE68A);
}

.tips-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #92400E;
  margin-bottom: 10px;
}

.tips-text {
  font-size: 13px;
  line-height: 1.6;
  color: #78350F;
  margin: 0;
}

/* ===== 温馨提示 ===== */
.notice-card {
  background: #FFFBEB;
  border: 1px solid #FDE68A;
}

.notice-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #92400E;
  margin-bottom: 12px;
}

.notice-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notice-text {
  font-size: 14px;
  line-height: 1.7;
  color: #78350F;
  margin: 0;
}

.notice-contact {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  align-self: flex-start;
  padding: 10px 14px;
  background: rgba(254, 243, 199, 0.8);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #92400E;
}

/* ===== 弹窗 ===== */
.modal-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 32px 20px;
}

.modal-error {
  color: #EF4444;
}

.modal-success {
  color: #22C55E;
}

.success-title {
  font-weight: 600;
  color: #1E293B;
  margin: 0;
}

.qr-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.pay-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 12px 0;
  border-bottom: 1px solid #F1F5F9;
  margin-bottom: 16px;
}

.pay-name {
  font-size: 14px;
  color: #475569;
}

.pay-amount {
  font-family: 'Poppins', sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: #EF4444;
}

.qr-wrap {
  padding: 12px;
  background: white;
  border-radius: 12px;
  border: 1px solid #E2E8F0;
}

.qr-wrap img {
  display: block;
  width: 180px;
  height: 180px;
}

.qr-tip {
  font-size: 13px;
  color: #94A3B8;
  margin: 12px 0 0 0;
}

.countdown {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  color: #22C55E;
}

.countdown.expired {
  color: #EF4444;
}

/* ===== 底部安全区 ===== */
.bottom-safe {
  height: 24px;
}

/* ===== PC 端响应式 ===== */
@media (min-width: 768px) {
  .detail-container {
    max-width: 1000px;
    padding: 0 24px;
  }

  .bento-grid {
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }

  .bento-span-2 {
    grid-column: span 1;
  }

  .hero-cover {
    height: 360px;
  }

  .hero-name {
    font-size: 28px;
  }

  .price-amount {
    font-size: 42px;
  }

  /* PC端：显示集成版温馨提示，隐藏移动端独立卡片 */
  .notice-section {
    display: block;
  }

  .notice-card-mobile {
    display: none;
  }

  .bottom-safe {
    height: 0;
  }
}

@media (min-width: 1024px) {
  .detail-container {
    max-width: 1200px;
  }
}
</style>
 
