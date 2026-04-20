<template>
  <div class="orders-view">
    <!-- 搜索筛选区 -->
    <section class="filter-section">
      <div class="section-container">
        <div class="filter-card">
          <!-- 搜索框 + 按钮 -->
          <div class="search-row">
            <div class="search-box" :class="{ 'search-focused': searchFocused }">
              <n-icon :size="15" color="#94A3B8"><search-outline></search-outline></n-icon>
              <input
                v-model="keyword"
                type="text"
                placeholder="输入联系方式、订单号或手机号"
                class="search-input"
                @focus="searchFocused = true"
                @blur="searchFocused = false"
                @keyup.enter="doSearch"
                :disabled="orderStore.loading"
              />
              <transition name="clear-fade">
                <button v-if="keyword" class="search-clear" @click="keyword = ''">
                  <n-icon :size="11"><close-outline></close-outline></n-icon>
                </button>
              </transition>
            </div>
            <button class="search-btn" :disabled="!userStore.isLoggedIn && !keyword.trim()" @click="doSearch">
              <n-icon :size="14"><search-outline></search-outline></n-icon>
              <span>查询</span>
            </button>
          </div>

          <!-- 状态筛选 -->
          <div class="status-scroll-wrap">
            <div class="status-scroll">
              <button
                v-for="f in statusFilters"
                :key="f.value"
                :class="['status-chip', { active: statusFilter === f.value }]"
                @click="statusFilter = f.value"
              >
                <span class="chip-dot" :class="f.value || 'all'"></span>
                {{ f.label }}
              </button>
              <div v-if="userStore.isLoggedIn" class="login-chip">
                <n-icon :size="11" color="#22C55E"><checkmark-circle-outline></checkmark-circle-outline></n-icon>
                {{ userStore.user?.username }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 订单列表 -->
    <section class="orders-section">
      <div class="section-container">
        <!-- 标题栏 -->
        <div class="section-header">
          <div class="section-title-group">
            <span class="title-bar"></span>
            <h2 class="section-title">我的订单</h2>
          </div>
          <span v-if="searched" class="order-count">{{ orderStore.total }} 条结果</span>
        </div>

        <!-- 订单卡片 -->
        <template v-if="searched && orderStore.orders.length > 0">
          <div class="orders-grid">
            <div
              v-for="order in orderStore.orders"
              :key="order.id"
              class="order-card"
            >
              <!-- 第1行：商品名 + 金额 + 状态 -->
              <div class="card-row-top">
                <h3 class="card-product-name">{{ order.productName || '未知商品' }}</h3>
                <span v-if="order.productPrice" class="card-price">¥{{ order.productPrice }}</span>
                <span class="card-status" :class="order.status">
                  <i class="status-dot"></i>
                  {{ statusText(order.status) }}
                </span>
              </div>

              <!-- 第2行：标签 -->
              <div v-if="order.cardKeyword || order.payMethod" class="card-row-tags">
                <n-tag v-if="order.cardKeyword" size="tiny" :bordered="false" round class="card-kw-tag">
                  <template #icon><n-icon :size="10"><pricetag-outline></pricetag-outline></n-icon></template>
                  {{ order.cardKeyword }}
                </n-tag>
                <span v-if="order.payMethod" class="card-pay-tag">
                  <n-icon :size="9"><wallet-outline></wallet-outline></n-icon>
                  {{ order.payMethod === 'alipay' ? '支付宝' : '卡密兑换' }}
                </span>
              </div>

              <!-- 第3行：联系信息 -->
              <div class="card-row-info" v-if="order.contact || order.phone">
                <span v-if="order.contact" class="info-item">
                  <n-icon :size="11" color="#94A3B8"><call-outline></call-outline></n-icon>
                  <span class="info-key">联系方式</span>
                  <span class="info-val">{{ order.contact }}</span>
                </span>
                <span v-if="order.phone" class="info-item">
                  <n-icon :size="11" color="#94A3B8"><phone-portrait-outline></phone-portrait-outline></n-icon>
                  <span class="info-key">手机号</span>
                  <span class="info-val">{{ order.phone }}</span>
                </span>
              </div>

              <!-- 第4行：验证码 -->
              <div v-if="order.verifyCode" class="card-row-code">
                <n-icon :size="11" color="#3B82F6"><shield-checkmark-outline></shield-checkmark-outline></n-icon>
                <span class="code-key">验证码</span>
                <code class="code-val">{{ order.verifyCode }}</code>
                <button class="copy-btn" :class="{ copied: copiedId === 'v-' + order.id }" @click="copyText(order.verifyCode, 'v-' + order.id)">
                  <n-icon :size="11"><checkmark-outline v-if="copiedId === 'v-' + order.id"></checkmark-outline><copy-outline v-else></copy-outline></n-icon>
                </button>
              </div>

              <!-- 第5行：凭证 -->
              <div v-if="order.cardCDK || order.cardCode" class="card-row-creds">
                <div v-if="order.cardCDK" class="cred-line cdk">
                  <span class="cred-key"><n-icon :size="9"><key-outline></key-outline></n-icon> CDK</span>
                  <code class="cred-val">{{ order.cardCDK }}</code>
                  <button class="copy-btn" :class="{ copied: copiedId === 'c-' + order.id }" @click="copyText(order.cardCDK, 'c-' + order.id)">
                    <n-icon :size="11"><checkmark-outline v-if="copiedId === 'c-' + order.id"></checkmark-outline><copy-outline v-else></copy-outline></n-icon>
                  </button>
                </div>
                <div v-if="order.cardCode" class="cred-line card">
                  <span class="cred-key"><n-icon :size="9"><wallet-outline></wallet-outline></n-icon> 卡密</span>
                  <code class="cred-val">{{ order.cardCode }}</code>
                  <button class="copy-btn" :class="{ copied: copiedId === 'k-' + order.id }" @click="copyText(order.cardCode, 'k-' + order.id)">
                    <n-icon :size="11"><checkmark-outline v-if="copiedId === 'k-' + order.id"></checkmark-outline><copy-outline v-else></copy-outline></n-icon>
                  </button>
                </div>
              </div>

              <!-- 底部：订单号 + 时间 -->
              <div class="card-row-bottom">
                <span class="card-order-no">{{ order.orderNo }}</span>
                <span class="card-time"><n-icon :size="10"><time-outline></time-outline></n-icon> {{ formatTime(order.createdAt) }}</span>
              </div>
            </div>
          </div>
        </template>

        <!-- 加载中 -->
        <div v-if="orderStore.loading && !searched" class="state-block">
          <n-spin size="medium" />
          <p>正在查询...</p>
        </div>

        <!-- 空结果 -->
        <div v-else-if="searched && orderStore.orders.length === 0 && !orderStore.loading" class="state-block">
          <n-icon :size="36" color="#CBD5E1"><receipt-outline></receipt-outline></n-icon>
          <p>未找到相关订单</p>
        </div>

        <!-- 首次 -->
        <div v-else-if="!searched && !autoSearching" class="state-block">
          <n-icon :size="36" color="#CBD5E1"><search-outline></search-outline></n-icon>
          <p>输入关键词查询您的订单</p>
        </div>

        <!-- 分页 -->
        <div v-if="totalPages > 1" class="pagination">
          <button class="page-btn" :disabled="currentPage <= 1" @click="goPage(currentPage - 1)">
            <n-icon :size="14"><chevron-back-outline></chevron-back-outline></n-icon>
          </button>
          <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
          <button class="page-btn" :disabled="currentPage >= totalPages" @click="goPage(currentPage + 1)">
            <n-icon :size="14"><chevron-forward-outline></chevron-forward-outline></n-icon>
          </button>
        </div>
      </div>
    </section>

    <div class="bottom-spacer"></div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { NIcon, NTag, NSpin, useMessage } from 'naive-ui'
import {
  SearchOutline, CloseOutline, ReceiptOutline,
  CheckmarkCircleOutline, CheckmarkOutline,
  CopyOutline, TimeOutline, CallOutline,
  PhonePortraitOutline, KeyOutline, WalletOutline,
  ShieldCheckmarkOutline, PricetagOutline,
  ChevronBackOutline, ChevronForwardOutline
} from '@vicons/ionicons5'
import { useOrderStore } from '@/stores/order'
import { useUserStore } from '@/stores/user'

const orderStore = useOrderStore()
const userStore = useUserStore()
const message = useMessage()

const keyword = ref('')
const searchFocused = ref(false)
const searched = ref(false)
const autoSearching = ref(false)
const statusFilter = ref('')
const copiedId = ref('')
const currentPage = ref(1)
const pageSize = 10

const totalPages = computed(() => Math.max(1, Math.ceil(orderStore.total / pageSize)))

const statusFilters = [
  { label: '全部', value: '' },
  { label: '已完成', value: 'completed' },
  { label: '待处理', value: 'pending' },
  { label: '失败', value: 'failed' },
]

watch(statusFilter, () => { if (searched.value) doSearch() })

const statusText = (s) => ({ completed: '已完成', pending: '待处理', failed: '失败' }[s] || s)

const formatTime = (t) => {
  if (!t) return ''
  const d = new Date(t)
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

async function doSearch() {
  const kw = keyword.value.trim()
  const useUserId = userStore.isLoggedIn && !kw && userStore.user?.id
  if (!useUserId && !kw) { message.warning('请输入查询关键词'); return }
  currentPage.value = 1
  await loadOrders()
}

async function loadOrders() {
  const kw = keyword.value.trim()
  const useUserId = userStore.isLoggedIn && !kw && userStore.user?.id
  const params = { page: currentPage.value, pageSize }
  if (useUserId) params.userId = userStore.user.id
  else params.keyword = kw
  if (statusFilter.value) params.status = statusFilter.value
  try {
    await orderStore.fetchOrders(params)
    searched.value = true
  } catch (err) {
    message.error(err.response?.data?.error || '查询失败')
  }
}

function goPage(p) {
  currentPage.value = p
  loadOrders()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function copyText(text, id) {
  try { await navigator.clipboard.writeText(text) }
  catch {
    const ta = document.createElement('textarea')
    ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
  }
  copiedId.value = id
  message.success('已复制')
  setTimeout(() => { if (copiedId.value === id) copiedId.value = '' }, 1500)
}

onMounted(async () => {
  if (userStore.isLoggedIn && userStore.user?.id) {
    autoSearching.value = true
    await loadOrders()
    autoSearching.value = false
  }
})
</script>

<style scoped>
/* ===== 版心 - 与 HomeView 一致 ===== */
.section-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
}

/* ===== 搜索筛选区 ===== */
.filter-section {
  padding: 12px 0 0;
}

.filter-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 搜索行：输入框 + 按钮 */
.search-row {
  display: flex;
  gap: 8px;
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  height: 40px;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 12px;
  border: 1.5px solid transparent;
  transition: all 0.25s ease-out;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.search-box.search-focused {
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(59, 130, 246, 0.35);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.08), 0 2px 8px rgba(59, 130, 246, 0.06);
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 13px;
  font-family: 'Open Sans', sans-serif;
  color: #1E293B;
  background: transparent;
  line-height: 1;
}

.search-input::placeholder {
  color: #94A3B8;
}

.search-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: #E2E8F0;
  color: #64748B;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.search-clear:hover {
  background: #CBD5E1;
  color: #475569;
}

.clear-fade-enter-active,
.clear-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.clear-fade-enter-from,
.clear-fade-leave-to {
  opacity: 0;
  transform: scale(0.6);
}

/* 查询按钮 */
.search-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 16px;
  height: 40px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #3B82F6, #2563EB);
  color: white;
  font-size: 13px;
  font-weight: 600;
  font-family: 'Open Sans', sans-serif;
  cursor: pointer;
  transition: all 0.2s ease-out;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);
  -webkit-tap-highlight-color: transparent;
}

.search-btn:hover:not(:disabled) {
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35);
  transform: translateY(-1px);
}

.search-btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);
}

.search-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 状态筛选 */
.status-scroll-wrap {
  position: relative;
  margin: 0 -16px;
}

.status-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 2px 16px 2px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.status-scroll::-webkit-scrollbar {
  display: none;
}

.status-chip {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 14px;
  border-radius: 20px;
  border: 1.5px solid #E2E8F0;
  background: white;
  font-size: 12px;
  font-weight: 500;
  font-family: 'Open Sans', sans-serif;
  color: #64748B;
  cursor: pointer;
  transition: all 0.2s ease-out;
  white-space: nowrap;
  -webkit-tap-highlight-color: transparent;
}

.status-chip:hover {
  border-color: #93C5FD;
  color: #3B82F6;
}

.status-chip.active {
  background: linear-gradient(135deg, #3B82F6, #2563EB);
  border-color: #2563EB;
  color: white;
  box-shadow: 0 2px 10px rgba(59, 130, 246, 0.3);
}

.chip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.chip-dot.all { background: #94A3B8; }
.chip-dot.completed { background: #22C55E; }
.chip-dot.pending { background: #F59E0B; }
.chip-dot.failed { background: #EF4444; }

.status-chip.active .chip-dot { background: white; }

/* 登录提示 */
.login-chip {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  border-radius: 20px;
  border: 1.5px solid #BBF7D0;
  background: #F0FDF4;
  font-size: 11px;
  font-weight: 600;
  color: #16A34A;
  white-space: nowrap;
}

/* ===== 订单列表 ===== */
.orders-section {
  padding: 16px 0 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid #F1F5F9;
}

.section-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-bar {
  display: inline-block;
  width: 3px;
  height: 16px;
  border-radius: 2px;
  background: linear-gradient(180deg, #3B82F6, #60A5FA);
}

.section-title {
  font-family: 'Poppins', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: #0F172A;
  line-height: 1;
  margin: 0;
}

.order-count {
  font-size: 11px;
  color: #94A3B8;
  font-weight: 500;
  font-family: 'Open Sans', sans-serif;
  background: #F1F5F9;
  padding: 3px 10px;
  border-radius: 10px;
}

/* ===== 卡片网格 ===== */
.orders-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

/* ===== 订单卡片 - 干净白底 ===== */
.order-card {
  background: white;
  border-radius: 12px;
  padding: 14px 16px;
  border: 1px solid #F1F5F9;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  transition: all 0.2s ease-out;
  -webkit-tap-highlight-color: transparent;
}

.order-card:hover {
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.06);
  border-color: #E2E8F0;
}

/* 第1行：商品名 + 价格 + 状态 */
.card-row-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-product-name {
  font-size: 14px;
  font-weight: 700;
  color: #0F172A;
  margin: 0;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: 'Poppins', sans-serif;
  line-height: 1.4;
}

.card-price {
  font-size: 15px;
  font-weight: 700;
  color: #EF4444;
  font-family: 'Poppins', sans-serif;
  flex-shrink: 0;
}

.card-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  font-family: 'Open Sans', sans-serif;
  padding: 2px 8px;
  border-radius: 10px;
  flex-shrink: 0;
}

.card-status .status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  display: inline-block;
}

.card-status.completed { background: #F0FDF4; color: #16A34A; }
.card-status.completed .status-dot { background: #22C55E; }
.card-status.pending { background: #FFFBEB; color: #D97706; }
.card-status.pending .status-dot { background: #F59E0B; }
.card-status.failed { background: #FEF2F2; color: #DC2626; }
.card-status.failed .status-dot { background: #EF4444; }

/* 第2行：标签 */
.card-row-tags {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
}

.card-kw-tag {
  background: #EFF6FF !important;
  color: #3B82F6 !important;
}

.card-pay-tag {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 10px;
  color: #64748B;
  font-weight: 500;
  font-family: 'Open Sans', sans-serif;
}

/* 第3行：联系信息 */
.card-row-info {
  display: flex;
  gap: 16px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #F8FAFC;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 3px;
}

.info-key {
  font-size: 10px;
  color: #94A3B8;
  font-weight: 500;
  flex-shrink: 0;
}

.info-val {
  font-size: 12px;
  color: #475569;
  font-weight: 500;
  font-family: 'Poppins', sans-serif;
  word-break: break-all;
}

/* 第4行：验证码 */
.card-row-code {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 8px;
  padding: 6px 10px;
  background: #F8FAFC;
  border-radius: 8px;
}

.code-key {
  font-size: 10px;
  font-weight: 600;
  color: #64748B;
  flex-shrink: 0;
}

.code-val {
  flex: 1;
  font-family: 'Poppins', monospace;
  font-size: 13px;
  font-weight: 600;
  color: #1E293B;
  letter-spacing: 0.5px;
  word-break: break-all;
}

/* 第5行：凭证 */
.card-row-creds {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 6px;
}

.cred-line {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  background: #F8FAFC;
  border-radius: 8px;
}

.cred-key {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.5px;
  padding: 2px 5px;
  border-radius: 3px;
  background: #E2E8F0;
  color: #475569;
  flex-shrink: 0;
  text-transform: uppercase;
  font-family: 'Poppins', sans-serif;
}

.cdk .cred-key { background: #DBEAFE; color: #2563EB; }
.card .cred-key { background: #DCFCE7; color: #16A34A; }

.cred-val {
  flex: 1;
  font-family: 'Poppins', monospace;
  font-size: 12px;
  font-weight: 500;
  color: #334155;
  word-break: break-all;
}

/* 复制按钮 */
.copy-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: #94A3B8;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}

.copy-btn:hover {
  background: #EFF6FF;
  color: #3B82F6;
}

.copy-btn.copied {
  background: #F0FDF4;
  color: #22C55E;
}

/* 底部行 */
.card-row-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #F8FAFC;
}

.card-order-no {
  font-size: 11px;
  font-family: 'Poppins', monospace;
  color: #CBD5E1;
  font-weight: 500;
}

.card-time {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: #CBD5E1;
}

/* ===== 空状态 ===== */
.state-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 48px 0;
  color: #94A3B8;
  font-size: 13px;
}

/* ===== 分页 ===== */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px 0;
}

.page-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  background: white;
  color: #64748B;
  cursor: pointer;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  border-color: #3B82F6;
  color: #3B82F6;
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-info {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  font-family: 'Poppins', sans-serif;
}

.bottom-spacer {
  height: 68px;
}

/* ===== 桌面端 ===== */
@media (min-width: 768px) {
  .section-container {
    padding: 0 24px;
  }

  .filter-section {
    padding: 16px 0 0;
  }

  .search-box {
    height: 44px;
  }

  .search-btn {
    height: 44px;
    padding: 0 20px;
  }

  .search-input {
    font-size: 14px;
  }

  .orders-section {
    padding: 20px 0 0;
  }

  .orders-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .section-title {
    font-size: 16px;
  }

  .card-product-name {
    font-size: 15px;
  }

  .card-price {
    font-size: 16px;
  }

  .bottom-spacer {
    height: 32px;
  }
}

@media (min-width: 1024px) {
  .section-title {
    font-size: 17px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .order-card,
  .status-chip,
  .search-box,
  .search-btn,
  .copy-btn,
  .page-btn {
    transition: none;
  }
  .order-card:hover {
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  }
  .search-btn:hover:not(:disabled) {
    transform: none;
  }
}
</style>
