<template>
  <div class="product-detail-view">
    <!-- 返回按钮（浮动） -->
    <n-button text class="back-btn" @click="goHome">
      <template #icon>
        <n-icon :size="24"><arrow-back-outline></arrow-back-outline></n-icon>
      </template>
    </n-button>

    <!-- 弹窗通知（进入商品详情页时弹出） -->
    <ProductPopupNotice
      v-if="product"
      :content="product.popupNotice"
      :product-id="product.id"
      type="warning"
    />

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
        <!-- 左侧/上方 封面区 -->
        <div class="product-cover-card">
          <div class="cover-wrap">
            <img v-if="product.image || product.coverImage" :src="coverSrc" alt="封面" class="cover-img" />
            <div v-else class="cover-placeholder">
              <n-icon :size="64" color="#CBD5E1"><cube-outline></cube-outline></n-icon>
            </div>
          </div>
          <!-- 标签在封面下方 -->
          <div class="cover-badges">
            <n-tag v-if="isSmsProduct" size="small" :bordered="false" round class="badge-sms">
              <template #icon><n-icon color="#fff"><log-in-outline></log-in-outline></n-icon></template>
              验证登录
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
          <!-- 商品注意事项无缝衔接封面下方 -->
          <div v-if="product.tips" class="cover-tips">
            <n-icon :size="14" color="#DC2626"><warning-outline></warning-outline></n-icon>
            <span>{{ product.tips }}</span>
          </div>
        </div>

        <!-- 右侧/下方 信息区 -->
        <div class="product-info-card">
          <!-- 名称 + 价格 -->
          <div class="info-header">
            <h1 class="product-name">{{ product.name }}</h1>
            <div class="product-price">
              <span class="price-symbol">¥</span>
              <span class="price-amount">{{ product.price }}</span>
            </div>
          </div>

          <!-- 商品描述 + 特点标签 -->
          <div class="info-section">
            <p class="product-desc">{{ product.description || '特惠渠道，无质保，且用且珍惜' }}</p>
            <div class="feature-tags">
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
          </div>

          <!-- 使用教程（如果有） -->
          <ProductTutorial v-if="product.tutorial" :content="product.tutorial" />

          <div class="info-divider"></div>

          <!-- 购买操作区 -->
          <div class="info-section">
            <!-- 未完成购买 -->
            <div v-if="!actionResult">
              <!-- 联系方式 -->
              <div class="contact-row">
                <div class="contact-label">
                  <n-icon :size="15" color="#3B82F6"><call-outline></call-outline></n-icon>
                  <span>联系方式</span>
                  <span class="contact-hint">用于订单查询</span>
                </div>
                <n-input
                  v-model:value="contact"
                  placeholder="手机号 / QQ / 邮箱"
                  size="large"
                  :input-props="{ autocomplete: 'off', inputmode: 'tel' }"
                />
                <div v-if="userStore.isLoggedIn" class="contact-logged-in">
                  已登录，默认使用账号名作为联系方式，也可修改
                </div>
              </div>

              <!-- 方式切换 -->
              <div class="method-tabs">
                <div
                  class="method-tab"
                  :class="{ active: payMethod === 'alipay' }"
                  @click="payMethod = 'alipay'"
                >
                  <n-icon :size="18"><logo-alipay></logo-alipay></n-icon>
                  <span>支付宝购买</span>
                  <span class="recommend-badge">推荐</span>
                </div>
                <div
                  class="method-tab"
                  :class="{ active: payMethod === 'card' }"
                  @click="payMethod = 'card'"
                >
                  <n-icon :size="18"><key-outline></key-outline></n-icon>
                  <span>卡密兑换</span>
                </div>
              </div>

              <!-- 支付宝购买 -->
              <div v-if="payMethod === 'alipay'" class="method-content">
                <p class="method-hint">
                  <n-icon :size="14" color="#64748B"><information-circle-outline></information-circle-outline></n-icon>
                  扫码支付，自动发放{{ isSmsProduct ? '登录号码' : '兑换码' }}
                </p>
                <!-- 优惠码输入 -->
                <div class="coupon-row">
                  <n-input
                    v-model:value="couponCode"
                    placeholder="优惠码（选填）"
                    size="large"
                    :input-props="{ autocomplete: 'off' }"
                    :disabled="couponValidating || hasValidCoupon"
                    :status="couponError ? 'error' : hasValidCoupon ? 'success' : undefined"
                    @keyup.enter="validateCoupon"
                  >
                    <template #prefix>
                      <n-icon :size="16" :color="hasValidCoupon ? '#22C55E' : '#94A3B8'"><pricetag-outline></pricetag-outline></n-icon>
                    </template>
                  </n-input>
                  <n-button
                    v-if="!hasValidCoupon"
                    size="large"
                    :loading="couponValidating"
                    @click="validateCoupon"
                  >
                    验证
                  </n-button>
                  <n-button
                    v-else
                    size="large"
                    type="success"
                    ghost
                    @click="clearCoupon"
                  >
                    取消
                  </n-button>
                </div>
                <!-- 优惠码验证结果 -->
                <transition name="coupon-msg">
                  <div v-if="couponError" class="coupon-error">
                    <n-icon :size="14" color="#EF4444"><alert-circle-outline></alert-circle-outline></n-icon>
                    {{ couponError }}
                  </div>
                </transition>
                <transition name="coupon-msg">
                  <div v-if="hasValidCoupon" class="coupon-success-card">
                    <div class="coupon-success-card__left">
                      <n-icon :size="14" color="#16A34A"><checkmark-circle-outline></checkmark-circle-outline></n-icon>
                      <span>{{ couponResult.description }}</span>
                    </div>
                    <div class="coupon-success-card__right">
                      省 ¥{{ savedAmount }}
                    </div>
                  </div>
                </transition>
                <!-- 价格展示 -->
                <div class="price-display">
                  <span v-if="hasValidCoupon" class="price-original">¥{{ product.price }}</span>
                  <span class="price-final" :class="{ 'price-discounted': hasValidCoupon }">¥{{ finalPrice }}</span>
                </div>
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
                  立即购买 ¥{{ finalPrice }}
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
                <!-- Cloudflare Turnstile 验证码 -->
                <div v-if="payMethod === 'card'" ref="redeemTurnstileRef" class="turnstile-container"></div>
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
              <div class="success-badge">
                <div class="success-badge-ring">
                  <n-icon :size="32" color="#22C55E"><checkmark-circle-outline></checkmark-circle-outline></n-icon>
                </div>
              </div>
              <h3 class="success-title">{{ actionResult.type === 'alipay' ? '支付成功' : '兑换成功' }}</h3>
              <p class="success-desc">请妥善保存以下信息</p>
              <div class="info-card">
                <div v-if="actionResult.orderNo" class="info-row">
                  <span class="info-dot"></span>
                  <span class="info-key">订单号</span>
                  <span class="info-val mono">{{ actionResult.orderNo }}</span>
                  <button class="info-copy" title="复制" @click="copyText(actionResult.orderNo, '已复制')"><n-icon :size="13"><copy-outline></copy-outline></n-icon></button>
                </div>
                <div v-if="actionResult.cardCode" class="info-row">
                  <span class="info-ddot"></span>
                  <span class="info-key">卡密</span>
                  <span class="info-val mono">{{ actionResult.cardCode }}</span>
                  <button class="info-copy" title="复制" @click="copyText(actionResult.cardCode, '已复制')"><n-icon :size="13"><copy-outline></copy-outline></n-icon></button>
                </div>
                <div v-if="actionResult.CDK" class="info-row">
                  <span class="info-dddot"></span>
                  <span class="info-key">CDK</span>
                  <span class="info-val mono">{{ actionResult.CDK }}</span>
                  <button class="info-copy" title="复制" @click="copyText(actionResult.CDK, '已复制')"><n-icon :size="13"><copy-outline></copy-outline></n-icon></button>
                </div>
                <div v-if="actionResult.deliveryInfo" class="info-row info-row-block">
                  <span class="info-ddddot"></span>
                  <span class="info-key">凭证</span>
                  <button class="info-copy" title="复制" @click="copyText(actionResult.deliveryInfo, '已复制')"><n-icon :size="13"><copy-outline></copy-outline></n-icon></button>
                  <div class="info-block-text">{{ actionResult.deliveryInfo }}</div>
                </div>
              </div>
              <n-space v-if="actionResult.CDK && redeemUrl" vertical>
                <div class="result-box">
                  <div class="result-label">兑换网址</div>
                  <n-input :value="redeemUrl" readonly style="flex:1">
                    <template #suffix>
                      <n-button text size="tiny" @click="copyText(redeemUrl, '网址已复制')">
                        <template #icon><n-icon size="14"><copy-outline></copy-outline></n-icon></template>
                        复制
                      </n-button>
                    </template>
                  </n-input>
                </div>
                <n-button type="primary" size="large" block @click="goToRedeem">
                  <template #icon><n-icon><open-outline></open-outline></n-icon></template>
                  前往兑换
                </n-button>
              </n-space>
              <n-button size="large" block @click="resetAction" style="margin-top:12px">
                <template #icon><n-icon><cart-outline></cart-outline></n-icon></template>
                重新购买
              </n-button>
            </div>

            <!-- 接码产品：成功 + 获取验证码 -->
            <div v-else-if="actionResult && isSmsProduct" class="success-content">
              <div class="success-icon">
                <n-icon :size="48" color="#22C55E"><checkmark-circle-outline></checkmark-circle-outline></n-icon>
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
                <div v-if="!smsCode" class="sms-pending">
                  <n-button
                    type="primary"
                    size="large"
                    block
                    :loading="smsLoading"
                    :disabled="needSmsPayment"
                    @click="getSmsCode"
                  >
                    <template #icon><n-icon><paper-plane-outline></paper-plane-outline></n-icon></template>
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
                    :loading="smsPayBtnLoading"
                    @click="startSmsServicePay"
                  >
                    <template #icon><n-icon><logo-alipay></logo-alipay></n-icon></template>
                    支付接码服务费 ¥{{ smsPriceText }}
                  </n-button>
                </div>
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
              <n-button size="large" block @click="resetAction" style="margin-top:12px">
                <template #icon><n-icon><cart-outline></cart-outline></n-icon></template>
                重新购买
              </n-button>
            </div>
          </div>

          <div class="info-divider"></div>

          <!-- 温馨提示 -->
          <div class="info-section info-notice">
            <div class="notice-header">
              <n-icon :size="16" color="#F59E0B"><information-circle-outline></information-circle-outline></n-icon>
              <span>温馨提示</span>
            </div>
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
              <n-icon :size="14" color="#D97706"><chatbubble-ellipses-outline></chatbubble-ellipses-outline></n-icon>
              <span>客服联系：bitlesu</span>
            </div>
          </div>
        </div>

        <!-- 底部安全区 -->
        <div class="bottom-safe"></div>
      </div>
    </template>

    <!-- 支付宝二维码弹窗 -->
    <n-modal v-model:show="showQrModal" :mask-closable="false" class="pay-modal" :style="{ maxWidth: '420px', width: '90vw' }" @after-leave="onQrModalClosed">
      <div class="cashier">
        <!-- 顶栏 -->
        <div class="cashier-bar">
          <div class="cashier-bar-left">
            <n-icon :size="20" color="#1677FF"><logo-alipay></logo-alipay></n-icon>
            <span>扫码支付</span>
          </div>
          <button class="cashier-close" @click="closeQrModal">
            <n-icon :size="18" color="#999"><close-circle-outline></close-circle-outline></n-icon>
          </button>
        </div>

        <!-- 错误 -->
        <div v-if="qrError" class="cashier-body">
          <div class="cashier-err">
            <n-icon :size="40" color="#FF4D4F"><close-circle-outline></close-circle-outline></n-icon>
            <p>{{ qrError }}</p>
          </div>
        </div>

        <!-- 二维码 -->
        <div v-else-if="payStatus !== 'paid'" class="cashier-body">
          <div class="cashier-amount">
            <span class="cashier-currency">¥</span>
            <span class="cashier-num">{{ payAmount }}</span>
          </div>
          <div class="cashier-qr">
            <img v-if="qrImageUrl" :src="qrImageUrl" alt="支付宝二维码" />
          </div>
          <p class="cashier-hint">请使用支付宝扫描二维码完成支付</p>
          <n-button
            v-if="isMobile && payUrl"
            type="primary"
            size="large"
            block
            @click="openAlipay"
          >
            <template #icon><n-icon><logo-alipay></logo-alipay></n-icon></template>
            打开支付宝支付
          </n-button>
          <div class="cashier-footer">
            <div class="countdown" :class="{ expired: countdown <= 0 }">
              <template v-if="countdown > 0">
                <n-icon :size="13"><time-outline></time-outline></n-icon>
                {{ countdownText }}
              </template>
              <template v-else>
                <n-icon :size="13"><time-outline></time-outline></n-icon>
                已过期
              </template>
            </div>
            <span class="cashier-dot">|</span>
            <span class="cashier-tip">{{ product.name }}</span>
          </div>
        </div>

        <!-- 支付成功 -->
        <div v-else class="cashier-body cashier-ok">
          <n-icon :size="52" color="#52C41A"><checkmark-circle-outline></checkmark-circle-outline></n-icon>
          <p class="ok-title">支付成功</p>
          <p v-if="isSmsProduct" class="ok-desc"><n-spin size="small" /> 正在加载接码流程...</p>
          <p v-else class="ok-desc">{{ product.name }}</p>
        </div>
      </div>
    </n-modal>

    <!-- 接码服务支付弹窗 -->
    <n-modal v-model:show="showSmsPayModal" :mask-closable="false" class="pay-modal" :style="{ maxWidth: '420px', width: '90vw' }" @after-leave="onSmsPayModalClosed">
      <div class="cashier">
        <div class="cashier-bar">
          <div class="cashier-bar-left">
            <n-icon :size="20" color="#1677FF"><logo-alipay></logo-alipay></n-icon>
            <span>扫码支付</span>
          </div>
          <button class="cashier-close" @click="closeSmsPayModal">
            <n-icon :size="18" color="#999"><close-circle-outline></close-circle-outline></n-icon>
          </button>
        </div>

        <div v-if="smsQrError" class="cashier-body">
          <div class="cashier-err">
            <n-icon :size="40" color="#FF4D4F"><close-circle-outline></close-circle-outline></n-icon>
            <p>{{ smsQrError }}</p>
          </div>
        </div>

        <div v-else-if="smsPayStatus !== 'paid'" class="cashier-body">
          <div class="cashier-amount">
            <span class="cashier-currency">¥</span>
            <span class="cashier-num">{{ smsPayAmount }}</span>
          </div>
          <div class="cashier-qr">
            <img v-if="smsQrImageUrl" :src="smsQrImageUrl" alt="支付宝二维码" />
          </div>
          <p class="cashier-hint">请使用支付宝扫描二维码完成支付</p>
          <n-button
            v-if="isMobile && smsPayUrl"
            type="primary"
            size="large"
            block
            @click="openSmsAlipay"
          >
            <template #icon><n-icon><logo-alipay></logo-alipay></n-icon></template>
            打开支付宝支付
          </n-button>
          <div class="cashier-footer">
            <span class="cashier-tip">接码服务费 · 支付后即可接码</span>
          </div>
        </div>

        <div v-else class="cashier-body cashier-ok">
          <n-icon :size="52" color="#52C41A"><checkmark-circle-outline></checkmark-circle-outline></n-icon>
          <p class="ok-title">支付成功</p>
          <p class="ok-desc">正在获取验证码...</p>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import {
  NIcon, NSpin, NButton, NInput, NModal, NTag, NSpace, NAlert, NButtonGroup
} from 'naive-ui'
import {
  ArrowBackOutline, AlertCircleOutline, CubeOutline, PhonePortraitOutline,
  ShieldCheckmarkOutline, WalletOutline, WarningOutline,
  PricetagOutline, FlashOutline, CallOutline,
  LogoAlipay, KeyOutline, CartOutline, CopyOutline, OpenOutline,
  CheckmarkCircleOutline, ChatbubblesOutline, PaperPlaneOutline,
  TimeOutline, CloseCircleOutline, InformationCircleOutline,
  ChatbubbleEllipsesOutline, LogInOutline, DiamondOutline, RocketOutline
} from '@vicons/ionicons5'
import { productApi, pickupApi, paymentApi, couponApi } from '@/api'
import { useUserStore } from '@/stores/user'
import QRCode from 'qrcode'
import ProductTutorial from '@/components/ProductTutorial.vue'
import ProductPopupNotice from '@/components/ProductPopupNotice.vue'

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

// Turnstile 验证码（兑换）
const redeemTurnstileRef = ref(null)
const redeemTurnstileWidgetId = ref(null)
const redeemTurnstileToken = ref(null)
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'

// 计算属性
const isSmsProduct = computed(() => product.value?.category?.smsEnabled === 1)
const redeemUrl = computed(() => product.value?.addr || '')
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
const smsPayBtnLoading = ref(false)

// 优惠码相关状态
const couponCode = ref('')
const couponValidating = ref(false)
const couponResult = ref(null) // { valid, originalPrice, finalAmount, discount, deduction, description }
const couponError = ref('')

// 倒计时文本
const countdownText = computed(() => {
  const m = Math.floor(countdown.value / 60)
  const s = countdown.value % 60
  return `${m}分${String(s).padStart(2, '0')}秒`
})

// 封面图片地址
const coverSrc = computed(() => {
  if (product.value?.image) {
    return product.value.image.startsWith('http') ? product.value.image : `/images/${product.value.image}`
  }
  return product.value?.coverImage || ''
})

// 最终价格（考虑优惠码）
const finalPrice = computed(() => {
  if (couponResult.value?.valid) return couponResult.value.finalAmount
  return product.value?.price || 0
})

// 是否有有效优惠码
const hasValidCoupon = computed(() => couponResult.value?.valid === true)

// 优惠码省了多少
const savedAmount = computed(() => {
  if (!hasValidCoupon.value || !product.value) return 0
  const original = parseFloat(product.value.price) || 0
  const final = parseFloat(finalPrice.value) || 0
  return (original - final).toFixed(2)
})

// 验证优惠码
const validateCoupon = async () => {
  if (!couponCode.value.trim()) {
    couponResult.value = null
    couponError.value = ''
    return
  }
  couponValidating.value = true
  couponError.value = ''
  try {
    const res = await couponApi.validate(couponCode.value.trim(), product.value.id)
    couponResult.value = res
    if (!res.valid) {
      couponError.value = res.error || '优惠码无效'
    }
  } catch (err) {
    couponError.value = err.response?.data?.error || '验证失败'
    couponResult.value = null
  } finally {
    couponValidating.value = false
  }
}

// 清除优惠码
const clearCoupon = () => {
  couponCode.value = ''
  couponResult.value = null
  couponError.value = ''
}

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
  } finally {
    loading.value = false
  }
}

// 自动填充联系方式
const checkAndPrefillContact = () => {
  if (userStore.isLoggedIn && userStore.user?.username) {
    contact.value = userStore.user.username
    localStorage.setItem('lastContact', userStore.user.username)
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
  if (!redeemTurnstileToken.value) {
    message.warning('请完成人机验证')
    return
  }
  redeeming.value = true
  try {
    const response = await pickupApi.redeem(redeemCode.value.trim(), product.value.id, contact.value.trim(), redeemTurnstileToken.value)
    localStorage.setItem('lastContact', contact.value.trim())
    actionResult.value = { type: 'redeem', CDK: response.CDK, deliveryInfo: response.deliveryInfo, orderNo: response.orderNo, cardCode: response.cardCode, cardKeyId: response.id }
    message.success('兑换成功！')
  } catch (err) {
    message.error(err.response?.data?.error || '兑换失败')
    // 兑换失败，重置 Turnstile
    if (window.turnstile && redeemTurnstileWidgetId.value) {
      window.turnstile.reset(redeemTurnstileWidgetId.value)
      redeemTurnstileToken.value = null
    }
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

  try {
    const res = await paymentApi.create(product.value.id, contact.value.trim(), hasValidCoupon.value ? couponCode.value.trim() : null)
    // API 成功后才开弹窗，避免 429 时弹窗卡 loading
    orderNo.value = res.orderNo
    payAmount.value = res.amount
    payUrl.value = res.payUrl || ''
    payStatus.value = 'pending'
    cdKey.value = ''
    qrError.value = ''

    await generateQR(res.qrCode)

    const expiredAt = new Date(res.expiredAt)
    countdown.value = Math.max(0, Math.floor((expiredAt - Date.now()) / 1000))

    showQrModal.value = true
    startCountdown()
    startPolling()
  } catch (err) {
    message.error(err.response?.data?.error || err.message || '创建支付订单失败')
  } finally {
    payLoading.value = false
    qrLoading.value = false
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

        actionResult.value = { type: 'alipay', CDK: res.cdKey, deliveryInfo: res.deliveryInfo, orderNo: res.orderNo, cardCode: res.cardCode, cardKeyId: res.cardKeyId || null }

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
  // 通知后端取消订单（pending 状态才需要）
  if (orderNo.value && payStatus.value !== 'paid') {
    paymentApi.cancel(orderNo.value).then(res => {
      // 竞态：关弹窗时刚好已付款，刷新页面查看结果
      if (res?.alreadyPaid) {
        message.info('订单已支付成功，请查看订单记录')
      }
    }).catch(() => {})
  }
}

/** 弹窗关闭后（不管怎么关的）清理轮询和状态 */
const onQrModalClosed = () => {
  stopPolling()
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  payLoading.value = false
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

  smsQrLoading.value = true
  smsQrError.value = ''
  smsPayStatus.value = 'pending'
  smsQrImageUrl.value = ''
  smsPayBtnLoading.value = true

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

    // API 成功后才开弹窗
    showSmsPayModal.value = true
    startSmsPolling()
  } catch (err) {
    message.error(err.response?.data?.error || err.message || '创建支付订单失败')
  } finally {
    smsQrLoading.value = false
    smsPayBtnLoading.value = false
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
  // 通知后端取消订单（pending 状态才需要）
  if (smsOrderNo.value && smsPayStatus.value !== 'paid') {
    paymentApi.cancel(smsOrderNo.value).then(res => {
      if (res?.alreadyPaid) {
        message.info('订单已支付成功，请查看订单记录')
      }
    }).catch(() => {})
  }
}

/** 接码支付弹窗关闭后清理 */
const onSmsPayModalClosed = () => {
  stopSmsPolling()
  smsPayBtnLoading.value = false
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

function resetAction() {
  actionResult.value = null
  smsCode.value = ''
  smsError.value = ''
  smsLoading.value = false
  needSmsPayment.value = false
  stopPolling()
  stopSmsPolling()
  if (window.turnstile && redeemTurnstileWidgetId.value) {
    window.turnstile.reset(redeemTurnstileWidgetId.value)
    redeemTurnstileToken.value = null
  }
}

onMounted(async () => {
  await loadProduct()
  checkAndPrefillContact()

  // 初始化 Turnstile（兑换）
  if (window.turnstile && payMethod.value === 'card') {
    initRedeemTurnstile()
  }
})

onUnmounted(() => {
  stopPolling()
  stopSmsPolling()
  if (countdownTimer) clearInterval(countdownTimer)

  // 清理 Turnstile
  if (redeemTurnstileWidgetId.value && window.turnstile) {
    window.turnstile.remove(redeemTurnstileWidgetId.value)
  }
})

// 初始化兑换 Turnstile
function initRedeemTurnstile() {
  if (!redeemTurnstileRef.value || !window.turnstile) return

  redeemTurnstileWidgetId.value = window.turnstile.render(redeemTurnstileRef.value, {
    sitekey: TURNSTILE_SITE_KEY,
    callback: (token) => {
      redeemTurnstileToken.value = token
    },
    'error-callback': () => {
      redeemTurnstileToken.value = null
      message.warning('人机验证加载失败')
    },
    'expired-callback': () => {
      redeemTurnstileToken.value = null
      message.warning('验证已过期')
    },
  })
}

// 监听支付方式切换，初始化 Turnstile
watch(payMethod, (newMethod) => {
  if (newMethod === 'card') {
    // 等待 DOM 更新后初始化
    setTimeout(() => {
      initRedeemTurnstile()
    }, 100)
  }
})
</script>

<style scoped>
/* ===== 基础容器 ===== */
.product-detail-view {
  min-height: 100vh;
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

/* ===== 封面卡片 ===== */
.product-cover-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  margin-bottom: 16px;
}

.cover-wrap {
  position: relative;
  background: linear-gradient(135deg, #F1F5F9, #E2E8F0);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
}

.cover-img {
  width: 100%;
  height: auto;
  max-height: 320px;
  object-fit: contain;
  display: block;
}

.cover-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 200px;
}

.cover-badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  padding: 10px 14px;
  background: #F8FAFC;
  border-bottom: 1px solid #F1F5F9;
}

.badge-sms {
  background: rgba(16, 185, 129, 0.95) !important;
  color: white !important;
  border: none !important;
}

/* 注意事项无缝衔接封面 */
.cover-tips {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 14px;
  background: #FEF2F2;
  font-size: 13px;
  color: #991B1B;
  line-height: 1.5;
}

.cover-tips span {
  flex: 1;
  font-weight: 500;
}

/* ===== 信息区大卡片 ===== */
.product-info-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  padding: 24px;
  margin-bottom: 16px;
}

/* ===== 名称 + 价格 ===== */
.info-header {
  margin-bottom: 20px;
}

.product-name {
  font-family: 'Poppins', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: #1E293B;
  margin: 0 0 10px 0;
  line-height: 1.4;
}

.product-price {
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
  font-size: 32px;
  font-weight: 700;
  color: #F59E0B;
  line-height: 1;
}

/* ===== 信息分区 ===== */
.info-section {
  margin-bottom: 0;
}

.info-divider {
  height: 1px;
  background: #F1F5F9;
  margin: 20px 0;
}

/* ===== 商品描述 ===== */
.product-desc {
  font-size: 14px;
  line-height: 1.7;
  color: #64748B;
  margin: 0 0 14px 0;
}

.feature-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.feature-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  background: #F1F5F9;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #475569;
}

.inline-tips {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 14px;
  background: #FEE2E2;
  border-radius: 8px;
  font-size: 13px;
  color: #991B1B;
  line-height: 1.6;
}

.inline-tips span {
  flex: 1;
  font-weight: 500;
}

/* ===== 联系方式 ===== */
.contact-row {
  margin-bottom: 18px;
}

.contact-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #1E293B;
  margin-bottom: 10px;
}

.contact-hint {
  font-weight: 400;
  font-size: 12px;
  color: #94A3B8;
  margin-left: 4px;
}

.contact-logged-in {
  font-size: 11px;
  color: #64748B;
  background: #F1F5F9;
  padding: 4px 10px;
  border-radius: 6px;
  margin-top: 4px;
}

/* ===== 方式切换 ===== */
.method-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
}

.method-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 16px;
  border: 1.5px solid #E2E8F0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #64748B;
  font-weight: 500;
  font-size: 14px;
}

.method-tab:hover {
  background: #F8FAFC;
}

.method-tab.active {
  background: #3B82F6;
  border-color: #3B82F6;
  color: white;
}

.recommend-badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  background: #F59E0B;
  color: white;
  font-size: 10px;
  font-weight: 600;
  border-radius: 6px;
  flex-shrink: 0;
}

.method-tab.active .recommend-badge {
  background: rgba(255, 255, 255, 0.25);
}

/* ===== 方式内容 ===== */
.method-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ===== 优惠码 ===== */
.coupon-row {
  display: flex;
  gap: 8px;
}

.coupon-row .n-input {
  flex: 1;
}

.coupon-error {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #EF4444;
  padding: 2px 0;
}

.coupon-success-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  background: #F0FDF4;
  border: 1px solid #BBF7D0;
  border-radius: 8px;
  font-size: 13px;
}

.coupon-success-card__left {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #166534;
  font-weight: 500;
}

.coupon-success-card__right {
  font-family: 'Poppins', sans-serif;
  font-weight: 700;
  color: #EF4444;
  white-space: nowrap;
}

/* 优惠码消息过渡 */
.coupon-msg-enter-active {
  transition: all 0.25s ease-out;
}

.coupon-msg-leave-active {
  transition: all 0.15s ease-in;
}

.coupon-msg-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}

.coupon-msg-leave-to {
  opacity: 0;
}

/* ===== 价格展示 ===== */
.price-display {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.price-original {
  font-size: 16px;
  color: #94A3B8;
  text-decoration: line-through;
}

.price-final {
  font-family: 'Poppins', sans-serif;
  font-size: 24px;
  font-weight: 700;
  color: #F59E0B;
}

.price-final.price-discounted {
  color: #EF4444;
}

.method-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #F8FAFC;
  border-radius: 8px;
  font-size: 13px;
  color: #475569;
  margin: 0;
}

.buy-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  width: 100%;
  font-size: 14px;
  color: #3B82F6;
  text-decoration: none;
  border-radius: 8px;
  transition: background 0.2s ease;
}

.buy-link:hover {
  background: #EFF6FF;
}

/* ===== 成功状态 ===== */
.success-content {
  text-align: center;
}

.success-badge {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.success-badge-ring {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ECFDF5, #D1FAE5);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.08);
}

.success-title {
  font-family: 'Poppins', sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: #0F172A;
  margin: 0 0 4px 0;
}

.success-desc {
  font-size: 13px;
  color: #94A3B8;
  margin: 0 0 20px 0;
  font-weight: 500;
}

.result-box {
  text-align: left;
  margin-bottom: 14px;
}

.result-label {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 8px;
}

.info-card {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  padding: 6px 0;
  text-align: left;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 16px;
  border-bottom: 1px solid #F1F5F9;
}

.info-row:last-child {
  border-bottom: none;
}

.info-row-block {
  flex-wrap: wrap;
}

.info-dot,
.info-ddot,
.info-dddot,
.info-ddddot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.info-dot { background: #3B82F6; }
.info-ddot { background: #22C55E; }
.info-dddot { background: #8B5CF6; }
.info-ddddot { background: #F59E0B; }

.info-key {
  font-size: 11px;
  font-weight: 700;
  color: #94A3B8;
  letter-spacing: 0.3px;
  flex-shrink: 0;
  min-width: 40px;
  text-transform: uppercase;
  font-family: 'Poppins', sans-serif;
}

.info-val {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: #1E293B;
  word-break: break-all;
}

.info-val.mono {
  font-family: 'Poppins', monospace;
  font-size: 12.5px;
  letter-spacing: 0.2px;
}

.info-copy {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #CBD5E1;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s ease-out;
}

.info-copy:hover {
  background: #F0F9FF;
  color: #3B82F6;
}

.info-block-text {
  width: 100%;
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-all;
  padding: 8px 0 2px;
  background: #F8FAFC;
  border-radius: 8px;
  padding: 10px 12px;
  margin-top: 6px;
  border: 1px solid #F1F5F9;
}

/* ===== 接码区域 ===== */
.sms-area {
  margin-top: 16px;
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

/* ===== 温馨提示 ===== */
.info-notice {
  background: #FFFBEB;
  border-radius: 10px;
  padding: 14px 16px !important;
}

.notice-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #92400E;
  margin-bottom: 8px;
}

.notice-text {
  font-size: 13px;
  line-height: 1.6;
  color: #78350F;
  margin: 0 0 8px 0;
}

.notice-contact {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #92400E;
}

/* ===== 支付弹窗（支付宝收银台风格） ===== */
.pay-modal :deep(.n-card) {
  background: transparent !important;
  box-shadow: none !important;
  border: none !important;
  padding: 0 !important;
}

.pay-modal :deep(.n-card__content) {
  padding: 0 !important;
}

.cashier {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.12);
}

.cashier-bar {
  background: #fff;
  color: #333;
  font-size: 15px;
  font-weight: 600;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #F0F0F0;
}

.cashier-bar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cashier-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  border-radius: 50%;
  transition: background 0.15s;
}

.cashier-close:hover {
  background: #F5F5F5;
}

.cashier-body {
  padding: 24px 20px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.cashier-amount {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.cashier-currency {
  font-size: 18px;
  font-weight: 600;
  color: #1E293B;
}

.cashier-num {
  font-family: 'Poppins', sans-serif;
  font-size: 36px;
  font-weight: 700;
  color: #1E293B;
  letter-spacing: -0.5px;
  line-height: 1;
}

.cashier-qr {
  padding: 16px;
  border: 1px solid #F0F0F0;
  border-radius: 12px;
  background: #FAFAFA;
}

.cashier-qr img {
  display: block;
  width: 200px;
  height: 200px;
}

.cashier-hint {
  font-size: 13px;
  color: #999;
  margin: 0;
}

.cashier-footer {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cashier-dot {
  color: #E5E5E5;
  font-size: 11px;
}

.cashier-tip {
  font-size: 11px;
  color: #BFBFBF;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.countdown {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  font-weight: 500;
  color: #52C41A;
}

.countdown.expired {
  color: #FF4D4F;
}

.cashier-err {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 0;
  color: #FF4D4F;
  font-size: 13px;
}

.cashier-ok {
  padding: 36px 20px 28px;
}

.ok-title {
  font-size: 18px;
  font-weight: 600;
  color: #1E293B;
  margin: 0;
}

.ok-desc {
  font-size: 13px;
  color: #999;
  margin: 0;
}

/* ===== 底部安全区 ===== */
.bottom-safe {
  height: 24px;
}

/* ===== 移动端优化 ===== */
@media (max-width: 767px) {
  .product-name {
    font-size: 20px;
  }

  .price-amount {
    font-size: 28px;
  }

  .method-tab {
    padding: 10px 8px;
    font-size: 13px;
    gap: 4px;
  }

  .recommend-badge {
    font-size: 9px;
    padding: 1px 4px;
  }

  .product-info-card {
    padding: 18px;
  }

  .info-divider {
    margin: 16px 0;
  }
}

/* ===== PC 端响应式 ===== */
@media (min-width: 768px) {
  .detail-container {
    max-width: 1000px;
    padding: 24px 24px 0;
    display: flex;
    gap: 24px;
    align-items: flex-start;
  }

  /* 左侧封面 */
  .product-cover-card {
    flex-shrink: 0;
    width: 300px;
    margin-bottom: 0;
    position: sticky;
    top: 80px;
  }

  .cover-img {
    max-height: 400px;
  }

  /* 右侧信息大卡片 */
  .product-info-card {
    flex: 1;
    min-width: 0;
    margin-bottom: 0;
  }

  .product-name {
    font-size: 24px;
  }

  .price-amount {
    font-size: 34px;
  }

  .bottom-safe {
    height: 0;
  }
}

@media (min-width: 1024px) {
  .detail-container {
    max-width: 1200px;
  }

  .product-cover-card {
    width: 340px;
  }

  .cover-img {
    max-height: 460px;
  }
}

/* Turnstile 验证码容器 */
.turnstile-container {
  display: flex;
  justify-content: center;
  margin: 12px 0;
  min-height: 65px;
}
</style>
 
