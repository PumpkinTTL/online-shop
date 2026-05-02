<template>
  <div class="orders-view">
    <!-- 搜索区 -->
    <section class="filter-section">
      <div class="section-container">
        <div class="search-row">
          <div class="search-box" :class="{ focused: searchFocused }">
            <n-icon :size="15" color="#94A3B8"><search-outline></search-outline></n-icon>
            <input
              v-model="keyword"
              type="text"
              placeholder="输入联系方式、订单号、手机号或卡密"
              class="search-input"
              @focus="searchFocused = true"
              @blur="searchFocused = false"
              @keyup.enter="doSearch"
              :disabled="orderStore.loading"
            />
            <button v-if="keyword" class="search-clear" @click="keyword = ''">
              <n-icon :size="11"><close-outline></close-outline></n-icon>
            </button>
          </div>
          <button class="search-btn" :disabled="!userStore.isLoggedIn && !keyword.trim()" @click="doSearch">
            查询
          </button>
        </div>
      </div>
    </section>

    <!-- 订单列表 -->
    <section class="orders-section">
      <div class="section-container">
        <div class="section-header">
          <h2 class="section-title">我的订单</h2>
          <span v-if="searched" class="order-count">{{ orderStore.total }} 条结果</span>
        </div>

        <template v-if="searched && orderStore.orders.length > 0">
          <div class="orders-list">
            <div v-for="order in orderStore.orders" :key="order.id" class="order-card">
              <!-- 头部：商品 + 状态 -->
              <div class="card-head">
                <div class="card-head-left">
                  <h3 class="card-name">{{ order.productName || '未知商品' }}</h3>
                  <div class="card-meta">
                    <span v-if="order.payMethod" class="meta-tag">
                      <n-icon :size="9"><wallet-outline></wallet-outline></n-icon>
                      {{ order.payMethod === 'alipay' ? '支付宝' : '兑换' }}
                    </span>
                    <span v-if="order.productPrice" class="meta-price">¥{{ order.productPrice }}</span>
                  </div>
                </div>
                <span class="card-status" :class="order.status">
                  <i class="status-dot"></i>
                  {{ statusText(order.status) }}
                </span>
              </div>

              <!-- 信息区 -->
              <div class="card-body">
                <div v-if="order.contact || order.phone" class="field-row">
                  <div v-if="order.contact" class="field">
                    <span class="field-label">联系方式</span>
                    <span class="field-value">{{ order.contact }}</span>
                  </div>
                  <div v-if="order.phone" class="field">
                    <span class="field-label">手机号</span>
                    <span class="field-value">{{ order.phone }}</span>
                  </div>
                </div>

                <div v-if="order.verifyCode" class="cred-row">
                  <span class="cred-tag blue">验证码</span>
                  <code class="cred-val">{{ order.verifyCode }}</code>
                  <button class="cred-copy" :class="{ copied: copiedId === 'v-' + order.id }" @click="copyText(order.verifyCode, 'v-' + order.id)">
                    <n-icon :size="12"><checkmark-outline v-if="copiedId === 'v-' + order.id"></checkmark-outline><copy-outline v-else></copy-outline></n-icon>
                  </button>
                </div>

                <div v-if="order.cardCDK" class="cred-row">
                  <span class="cred-tag purple">CDK</span>
                  <code class="cred-val">{{ order.cardCDK }}</code>
                  <button class="cred-copy" :class="{ copied: copiedId === 'c-' + order.id }" @click="copyText(order.cardCDK, 'c-' + order.id)">
                    <n-icon :size="12"><checkmark-outline v-if="copiedId === 'c-' + order.id"></checkmark-outline><copy-outline v-else></copy-outline></n-icon>
                  </button>
                </div>

                <div v-if="order.cardCode" class="cred-row">
                  <span class="cred-tag green">卡密</span>
                  <code class="cred-val">{{ order.cardCode }}</code>
                  <button class="cred-copy" :class="{ copied: copiedId === 'k-' + order.id }" @click="copyText(order.cardCode, 'k-' + order.id)">
                    <n-icon :size="12"><checkmark-outline v-if="copiedId === 'k-' + order.id"></checkmark-outline><copy-outline v-else></copy-outline></n-icon>
                  </button>
                </div>

                <div v-if="order.deliveryInfo" class="cred-row delivery">
                  <span class="cred-tag orange">凭证</span>
                  <span class="cred-delivery-text">{{ order.deliveryInfo }}</span>
                  <button class="cred-copy" :class="{ copied: copiedId === 'd-' + order.id }" @click="copyText(order.deliveryInfo, 'd-' + order.id)">
                    <n-icon :size="12"><checkmark-outline v-if="copiedId === 'd-' + order.id"></checkmark-outline><copy-outline v-else></copy-outline></n-icon>
                  </button>
                </div>
              </div>

              <!-- 底部：订单号 + 时间 -->
              <div class="card-foot">
                <code class="foot-no">{{ order.orderNo }}</code>
                <span class="foot-time">{{ formatTime(order.createdAt) }}</span>
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
import { ref, computed, onMounted } from 'vue'
import { NIcon, NSpin, useMessage } from 'naive-ui'
import {
  SearchOutline, CloseOutline, ReceiptOutline,
  CheckmarkOutline, CopyOutline, WalletOutline,
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
const copiedId = ref('')
const currentPage = ref(1)
const pageSize = 10

const totalPages = computed(() => Math.max(1, Math.ceil(orderStore.total / pageSize)))

const statusText = (s) => ({ completed: '已完成', pending: '待处理', failed: '失败' }[s] || s)

const formatTime = (t) => {
  if (!t) return ''
  const d = new Date(t)
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

async function doSearch() {
  const kw = keyword.value.trim()
  if (!userStore.isLoggedIn && !kw) { message.warning('请输入查询关键词'); return }
  currentPage.value = 1
  await loadOrders()
}

async function loadOrders() {
  const kw = keyword.value.trim()
  const params = { page: currentPage.value, pageSize }
  if (kw) params.keyword = kw
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
/* ===== Layout ===== */
.section-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
}

/* ===== Search ===== */
.filter-section { padding: 12px 0 0; }

.search-row { display: flex; gap: 8px; }

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

.search-box.focused {
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(59, 130, 246, 0.35);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.08), 0 2px 8px rgba(59, 130, 246, 0.06);
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 13px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #1E293B;
  background: transparent;
  line-height: 1;
}

.search-input::placeholder { color: #94A3B8; }

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

.search-clear:hover { background: #CBD5E1; color: #475569; }

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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
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

.search-btn:active:not(:disabled) { transform: translateY(0); box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25); }
.search-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ===== Section Header ===== */
.orders-section { padding: 16px 0 0; }

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid #F1F5F9;
}

.section-title {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #F1F5F9;
  padding: 3px 10px;
  border-radius: 10px;
}

/* ===== Orders List ===== */
.orders-list { display: flex; flex-direction: column; gap: 10px; }

/* ===== Order Card ===== */
.order-card {
  background: white;
  border-radius: 14px;
  border: 1px solid #F1F5F9;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease-out;
  -webkit-tap-highlight-color: transparent;
  overflow: hidden;
}

.order-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.07);
  border-color: #E2E8F0;
}

/* Card Head */
.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 16px 10px;
}

.card-head-left { flex: 1; min-width: 0; }

.card-name {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #0F172A;
  margin: 0 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.meta-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: #64748B;
  font-weight: 500;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.meta-price {
  font-size: 13px;
  font-weight: 700;
  color: #EF4444;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.card-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  padding: 3px 10px;
  border-radius: 10px;
  flex-shrink: 0;
  white-space: nowrap;
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

/* Card Body */
.card-body {
  padding: 0 16px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Field Rows (contact/phone) */
.field-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.field {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.field-label {
  font-size: 11px;
  color: #94A3B8;
  font-weight: 500;
  flex-shrink: 0;
}

.field-value {
  font-size: 12px;
  color: #475569;
  font-weight: 500;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  word-break: break-all;
}

/* Credential Rows */
.cred-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  background: #F8FAFC;
  border-radius: 8px;
}

.cred-tag {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.5px;
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
  text-transform: uppercase;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.cred-tag.blue { background: #DBEAFE; color: #2563EB; }
.cred-tag.purple { background: #EDE9FE; color: #7C3AED; }
.cred-tag.green { background: #DCFCE7; color: #16A34A; }
.cred-tag.orange { background: #FEF3C7; color: #D97706; }

.cred-val {
  flex: 1;
  font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace;
  font-size: 12px;
  font-weight: 500;
  color: #334155;
  word-break: break-all;
  min-width: 0;
}

.cred-delivery-text {
  flex: 1;
  font-size: 12px;
  color: #334155;
  white-space: pre-wrap;
  word-break: break-all;
  min-width: 0;
  line-height: 1.5;
}

.cred-copy {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #94A3B8;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.cred-copy:hover { background: #EFF6FF; color: #3B82F6; }
.cred-copy.copied { background: #F0FDF4; color: #22C55E; }

/* Card Foot */
.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #FAFBFC;
  border-top: 1px solid #F1F5F9;
}

.foot-no {
  font-size: 11px;
  font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace;
  color: #CBD5E1;
  font-weight: 500;
}

.foot-time {
  font-size: 11px;
  color: #CBD5E1;
}

/* ===== Empty / Loading States ===== */
.state-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 48px 0;
  color: #94A3B8;
  font-size: 13px;
}

/* ===== Pagination ===== */
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

.page-btn:hover:not(:disabled) { border-color: #3B82F6; color: #3B82F6; }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.page-info {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.bottom-spacer { height: 68px; }

/* ===== Desktop ===== */
@media (min-width: 768px) {
  .section-container { padding: 0 24px; }
  .filter-section { padding: 16px 0 0; }
  .search-box { height: 44px; }
  .search-btn { height: 44px; padding: 0 20px; }
  .search-input { font-size: 14px; }
  .orders-section { padding: 20px 0 0; }
  .orders-list { flex-direction: row; flex-wrap: wrap; gap: 12px; }
  .order-card { width: calc(50% - 6px); }
  .section-title { font-size: 16px; }
  .card-name { font-size: 15px; }
  .bottom-spacer { height: 32px; }
}

@media (min-width: 1024px) {
  .section-title { font-size: 17px; }
}

@media (prefers-reduced-motion: reduce) {
  .order-card, .search-box, .search-btn, .cred-copy, .page-btn { transition: none; }
  .order-card:hover { box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04); }
  .search-btn:hover:not(:disabled) { transform: none; }
}
</style>
