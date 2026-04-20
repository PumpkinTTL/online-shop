<template>
  <div class="orders-view">
    <!-- 页面标题 -->
    <section class="orders-header">
      <div class="section-container">
        <div class="header-title-group">
          <span class="title-bar"></span>
          <h1 class="page-title">我的订单</h1>
        </div>
        <span v-if="searched" class="result-count">共 {{ orderStore.total }} 条</span>
      </div>
    </section>

    <!-- 搜索筛选区 -->
    <section class="filter-section">
      <div class="section-container">
        <div class="filter-card">
          <!-- 已登录提示 -->
          <div v-if="userStore.isLoggedIn" class="logged-in-hint">
            <n-icon :size="14" color="#22C55E"><checkmark-circle-outline></checkmark-circle-outline></n-icon>
            <span class="hint-text">已登录，直接查询您的订单</span>
            <span class="username-badge">{{ userStore.user?.username }}</span>
          </div>

          <!-- 搜索输入 -->
          <div class="search-row">
            <div class="search-input-wrap" :class="{ focused: searchFocused }">
              <n-icon :size="15" color="#94A3B8"><search-outline></search-outline></n-icon>
              <input
                v-model="keyword"
                type="text"
                class="search-input"
                placeholder="输入联系方式、订单号或手机号"
                @focus="searchFocused = true"
                @blur="searchFocused = false"
                @keyup.enter="doSearch"
                :disabled="orderStore.loading"
              />
              <transition name="clear-fade">
                <button v-if="keyword" class="search-clear" @click="keyword = ''">
                  <n-icon :size="12"><close-outline></close-outline></n-icon>
                </button>
              </transition>
            </div>
            <button
              class="btn-search"
              @click="doSearch"
              :disabled="orderStore.loading || (!userStore.isLoggedIn && !keyword.trim())"
            >
              <n-icon v-if="orderStore.loading" :size="14" class="spin-icon">
                <reload-outline></reload-outline>
              </n-icon>
              <n-icon v-else :size="14"><search-outline></search-outline></n-icon>
              查询
            </button>
          </div>

          <!-- 状态筛选 -->
          <div class="status-filters">
            <button
              v-for="f in statusFilters"
              :key="f.value"
              :class="['status-chip', { active: statusFilter === f.value }]"
              @click="statusFilter = f.value"
            >
              {{ f.label }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- 订单列表 -->
    <section class="orders-section">
      <div class="section-container">
        <n-spin :show="orderStore.loading">
          <!-- 有结果 -->
          <div v-if="searched && orderStore.orders.length > 0" class="order-list">
            <div v-for="order in orderStore.orders" :key="order.id" class="order-card">
              <!-- 卡片头部：订单号 + 状态 -->
              <div class="order-card-header">
                <div class="order-no-wrap">
                  <n-icon :size="13" color="#94A3B8"><receipt-outline></receipt-outline></n-icon>
                  <span class="order-no">{{ order.orderNo }}</span>
                </div>
                <div class="order-header-right">
                  <span v-if="order.payMethod" :class="['pay-tag', order.payMethod === 'alipay' ? 'alipay' : 'redeem']">
                    {{ order.payMethod === 'alipay' ? '支付宝' : '卡密兑换' }}
                  </span>
                  <span :class="['status-badge', order.status]">
                    {{ statusText(order.status) }}
                  </span>
                </div>
              </div>

              <!-- 卡片主体 -->
              <div class="order-card-body">
                <div class="info-row">
                  <span class="info-label">商品</span>
                  <span class="info-value product-name">{{ order.productName || '-' }}</span>
                </div>
                <div v-if="order.productPrice" class="info-row">
                  <span class="info-label">价格</span>
                  <span class="info-value price-value">¥{{ order.productPrice }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">联系方式</span>
                  <span class="info-value">{{ order.contact || '-' }}</span>
                </div>
                <div v-if="order.phone" class="info-row">
                  <span class="info-label">手机号</span>
                  <span class="info-value">{{ order.phone }}</span>
                </div>
                <div v-if="order.verifyCode" class="info-row">
                  <span class="info-label">验证码</span>
                  <span class="info-value copyable">
                    <code class="code-value">{{ order.verifyCode }}</code>
                    <button class="btn-copy" :class="{ copied: copiedId === 'vcode-' + order.id }" @click="copyText(order.verifyCode, 'vcode-' + order.id)">
                      <n-icon :size="13">
                        <checkmark-outline v-if="copiedId === 'vcode-' + order.id"></checkmark-outline>
                        <copy-outline v-else></copy-outline>
                      </n-icon>
                    </button>
                  </span>
                </div>

                <!-- 凭证信息 -->
                <div v-if="order.cardCDK || order.cardCode" class="credential-box">
                  <div class="credential-header">
                    <n-icon :size="13" color="#3B82F6"><shield-checkmark-outline></shield-checkmark-outline></n-icon>
                    凭证信息
                  </div>
                  <div class="credential-tip">
                    <n-icon :size="12" color="#94A3B8"><information-circle-outline></information-circle-outline></n-icon>
                    卡密用于查询，兑换码(CDK)用于充值账号
                  </div>

                  <div v-if="order.cardCDK" class="credential-item cdk">
                    <span class="credential-label">CDK 兑换码</span>
                    <div class="credential-value-wrap">
                      <code class="credential-code">{{ order.cardCDK }}</code>
                      <button class="btn-copy" :class="{ copied: copiedId === 'cdk-' + order.id }" @click="copyText(order.cardCDK, 'cdk-' + order.id)">
                        <n-icon :size="13">
                          <checkmark-outline v-if="copiedId === 'cdk-' + order.id"></checkmark-outline>
                          <copy-outline v-else></copy-outline>
                        </n-icon>
                      </button>
                    </div>
                  </div>

                  <div v-if="order.cardCode" class="credential-item card">
                    <span class="credential-label">卡密</span>
                    <div class="credential-value-wrap">
                      <code class="credential-code">{{ order.cardCode }}</code>
                      <button class="btn-copy" :class="{ copied: copiedId === 'card-' + order.id }" @click="copyText(order.cardCode, 'card-' + order.id)">
                        <n-icon :size="13">
                          <checkmark-outline v-if="copiedId === 'card-' + order.id"></checkmark-outline>
                          <copy-outline v-else></copy-outline>
                        </n-icon>
                      </button>
                    </div>
                  </div>

                  <div v-if="order.cardKeyword" class="info-row credential-row">
                    <span class="info-label">接码项目</span>
                    <span class="info-value">{{ order.cardKeyword }}</span>
                  </div>
                </div>

                <!-- 时间信息 -->
                <div class="order-times">
                  <span class="time-item">
                    <n-icon :size="11" color="#94A3B8"><time-outline></time-outline></n-icon>
                    {{ formatTime(order.createdAt) }}
                  </span>
                  <span v-if="order.completedAt" class="time-item completed">
                    <n-icon :size="11" color="#22C55E"><checkmark-done-outline></checkmark-done-outline></n-icon>
                    {{ formatTime(order.completedAt) }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 空结果 -->
          <div v-else-if="searched && !orderStore.loading" class="empty-state">
            <n-icon :size="48" color="#E2E8F0"><receipt-outline></receipt-outline></n-icon>
            <p>未找到相关订单</p>
          </div>

          <!-- 首次进入（未搜索） -->
          <div v-else-if="!searched && !autoSearching" class="empty-state initial">
            <n-icon :size="48" color="#E2E8F0"><search-outline></search-outline></n-icon>
            <p>输入联系方式、订单号或手机号查询您的订单</p>
          </div>
        </n-spin>

        <!-- 自动加载中 -->
        <div v-if="!searched && autoSearching" class="auto-loading">
          <n-icon :size="24" color="#3B82F6" class="spin-icon"><reload-outline></reload-outline></n-icon>
          <p>正在查询您的订单...</p>
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

    <!-- 移动端底部安全距离 -->
    <div class="bottom-spacer"></div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { NSpin, NIcon, useMessage } from 'naive-ui'
import {
  SearchOutline, CloseOutline, ReceiptOutline,
  CheckmarkCircleOutline, CheckmarkOutline, CheckmarkDoneOutline,
  CopyOutline, ShieldCheckmarkOutline, InformationCircleOutline,
  TimeOutline, ReloadOutline,
  ChevronBackOutline, ChevronForwardOutline
} from '@vicons/ionicons5'
import { useOrderStore } from '@/stores/order'
import { useUserStore } from '@/stores/user'

const orderStore = useOrderStore()
const userStore = useUserStore()
const message = useMessage()

// 搜索状态
const keyword = ref('')
const searchFocused = ref(false)
const searched = ref(false)
const autoSearching = ref(false)
const statusFilter = ref('')
const copiedId = ref('')

// 分页
const currentPage = ref(1)
const pageSize = 10

const totalPages = computed(() => Math.max(1, Math.ceil(orderStore.total / pageSize)))

// 状态筛选配置
const statusFilters = [
  { label: '全部', value: '' },
  { label: '已完成', value: 'completed' },
  { label: '待处理', value: 'pending' },
  { label: '失败', value: 'failed' },
]

// 切换状态筛选时重新搜索
watch(statusFilter, () => {
  if (searched.value) doSearch()
})

const statusText = (s) => {
  const map = { completed: '已完成', pending: '待处理', failed: '失败' }
  return map[s] || s
}

const formatTime = (t) => {
  if (!t) return ''
  const d = new Date(t)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function doSearch() {
  let searchKeyword = keyword.value.trim()
  const useUserIdSearch = userStore.isLoggedIn && !searchKeyword && userStore.user?.id

  if (!useUserIdSearch && !searchKeyword) {
    message.warning('请输入查询关键词')
    return
  }

  currentPage.value = 1
  await loadOrders()
}

async function loadOrders() {
  let searchKeyword = keyword.value.trim()
  const useUserIdSearch = userStore.isLoggedIn && !searchKeyword && userStore.user?.id

  const params = { page: currentPage.value, pageSize }

  if (useUserIdSearch) {
    params.userId = userStore.user.id
  } else {
    params.keyword = searchKeyword
  }

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
  // 滚动到顶部
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function copyText(text, id) {
  try {
    await navigator.clipboard.writeText(text)
    copiedId.value = id
    message.success('已复制到剪贴板')
    setTimeout(() => { if (copiedId.value === id) copiedId.value = '' }, 2000)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.cssText = 'position:fixed;opacity:0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    copiedId.value = id
    message.success('已复制到剪贴板')
    setTimeout(() => { if (copiedId.value === id) copiedId.value = '' }, 2000)
  }
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
/* ===== 页面标题区 ===== */
.orders-header {
  padding: 16px 0 0;
}

.section-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
}

.header-title-group {
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

.page-title {
  font-family: 'Poppins', sans-serif;
  font-size: 17px;
  font-weight: 700;
  color: #0F172A;
  line-height: 1;
}

.orders-header .section-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.result-count {
  font-size: 11px;
  color: #94A3B8;
  font-weight: 500;
  background: #F1F5F9;
  padding: 3px 10px;
  border-radius: 10px;
}

/* ===== 搜索筛选区 ===== */
.filter-section {
  padding: 12px 0 0;
}

.filter-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: white;
  border-radius: 14px;
  padding: 14px;
  border: 1px solid #F1F5F9;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

/* 已登录提示 */
.logged-in-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: linear-gradient(135deg, #F0FDF4, #ECFDF5);
  border-radius: 8px;
  font-size: 12px;
  color: #166534;
}

.hint-text {
  flex: 1;
  font-weight: 500;
}

.username-badge {
  font-weight: 600;
  color: #22C55E;
  font-family: 'Poppins', sans-serif;
}

/* 搜索行 */
.search-row {
  display: flex;
  gap: 8px;
}

.search-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  height: 40px;
  background: #F8FAFC;
  border-radius: 10px;
  border: 1.5px solid transparent;
  transition: all 0.25s ease-out;
}

.search-input-wrap.focused {
  background: white;
  border-color: rgba(59, 130, 246, 0.35);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.08);
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 13px;
  font-family: 'Open Sans', sans-serif;
  color: #1E293B;
  background: transparent;
}

.search-input::placeholder {
  color: #94A3B8;
  font-size: 12px;
}

.search-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
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
}

.btn-search {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 18px;
  height: 40px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #3B82F6, #2563EB);
  color: white;
  font-size: 13px;
  font-weight: 600;
  font-family: 'Open Sans', sans-serif;
  cursor: pointer;
  transition: all 0.2s ease-out;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
}

.btn-search:hover:not(:disabled) {
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);
  transform: translateY(-1px);
}

.btn-search:active:not(:disabled) {
  transform: translateY(0);
}

.btn-search:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 旋转动画 */
.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 清除按钮淡入淡出 */
.clear-fade-enter-active,
.clear-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.clear-fade-enter-from,
.clear-fade-leave-to {
  opacity: 0;
  transform: scale(0.6);
}

/* 状态筛选 */
.status-filters {
  display: flex;
  gap: 6px;
}

.status-chip {
  padding: 5px 14px;
  border-radius: 16px;
  border: 1.5px solid #E2E8F0;
  background: white;
  font-size: 11px;
  font-weight: 500;
  color: #64748B;
  cursor: pointer;
  transition: all 0.2s ease-out;
  font-family: 'Open Sans', sans-serif;
  -webkit-tap-highlight-color: transparent;
}

.status-chip:hover {
  border-color: #93C5FD;
  color: #3B82F6;
}

.status-chip.active {
  background: #EFF6FF;
  border-color: #3B82F6;
  color: #3B82F6;
  font-weight: 600;
}

/* ===== 订单列表 ===== */
.orders-section {
  padding: 12px 0 0;
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 订单卡片 */
.order-card {
  background: white;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid #F1F5F9;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.25s ease-out;
}

.order-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  border-color: rgba(59, 130, 246, 0.1);
}

/* 卡片头部 */
.order-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;
  background: linear-gradient(135deg, #F8FAFC, #F1F5F9);
  border-bottom: 1px solid #F1F5F9;
}

.order-no-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.order-no {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  font-family: 'Poppins', monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-header-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.pay-tag {
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
}

.pay-tag.alipay {
  background: #EFF6FF;
  color: #2563EB;
}

.pay-tag.redeem {
  background: #F0FDF4;
  color: #16A34A;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
}

.status-badge.completed {
  background: linear-gradient(135deg, #DCFCE7, #BBF7D0);
  color: #166534;
}

.status-badge.pending {
  background: linear-gradient(135deg, #FEF3C7, #FDE68A);
  color: #92400E;
}

.status-badge.failed {
  background: linear-gradient(135deg, #FEE2E2, #FECACA);
  color: #991B1B;
}

/* 卡片主体 */
.order-card-body {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 4px 0;
  font-size: 12px;
  line-height: 1.6;
}

.info-label {
  flex-shrink: 0;
  width: 56px;
  color: #94A3B8;
  font-weight: 500;
  font-size: 11px;
  padding-top: 1px;
}

.info-value {
  color: #334155;
  font-weight: 400;
  word-break: break-all;
}

.info-value.product-name {
  font-weight: 600;
  color: #1E293B;
}

.info-value.price-value {
  color: #EF4444;
  font-weight: 700;
  font-family: 'Poppins', sans-serif;
}

.info-value.copyable {
  display: flex;
  align-items: center;
  gap: 6px;
}

.code-value {
  font-size: 12px;
  padding: 2px 6px;
  background: #F1F5F9;
  border-radius: 4px;
  color: #1E293B;
  font-family: 'Poppins', monospace;
}

.btn-copy {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: #F1F5F9;
  color: #64748B;
  cursor: pointer;
  transition: all 0.2s ease-out;
  flex-shrink: 0;
}

.btn-copy:hover {
  background: #E2E8F0;
  color: #3B82F6;
}

.btn-copy.copied {
  background: #DCFCE7;
  color: #22C55E;
}

/* 凭证信息 */
.credential-box {
  margin-top: 8px;
  padding: 10px 12px;
  background: linear-gradient(135deg, #F8FAFC, #F1F5F9);
  border-radius: 10px;
  border: 1px solid #E2E8F0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.credential-header {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 700;
  color: #1E293B;
}

.credential-tip {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: #94A3B8;
  line-height: 1.4;
}

.credential-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  border-radius: 8px;
}

.credential-item.cdk {
  background: linear-gradient(135deg, #EFF6FF, #DBEAFE);
  border: 1px solid rgba(59, 130, 246, 0.15);
}

.credential-item.card {
  background: linear-gradient(135deg, #F0FDF4, #DCFCE7);
  border: 1px solid rgba(34, 197, 94, 0.15);
}

.credential-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.credential-item.cdk .credential-label {
  color: #2563EB;
}

.credential-item.card .credential-label {
  color: #16A34A;
}

.credential-value-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.credential-code {
  flex: 1;
  font-size: 12px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 6px;
  color: #1E293B;
  font-family: 'Poppins', monospace;
  word-break: break-all;
  line-height: 1.5;
}

.credential-row {
  margin-top: 2px;
}

/* 时间信息 */
.order-times {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #F1F5F9;
}

.time-item {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: #94A3B8;
}

.time-item.completed {
  color: #22C55E;
}

/* ===== 空状态 ===== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  color: #94A3B8;
  font-size: 13px;
  gap: 8px;
  text-align: center;
}

.empty-state.initial {
  padding: 64px 20px;
}

/* ===== 自动加载 ===== */
.auto-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  gap: 10px;
  color: #64748B;
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
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1.5px solid #E2E8F0;
  background: white;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease-out;
}

.page-btn:hover:not(:disabled) {
  border-color: #3B82F6;
  color: #3B82F6;
  background: #EFF6FF;
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-info {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  font-family: 'Poppins', sans-serif;
}

/* ===== 底部间距 ===== */
.bottom-spacer {
  height: 68px;
}

/* ===== 桌面端响应式 ===== */
@media (min-width: 768px) {
  .orders-header {
    padding: 20px 0 0;
  }

  .section-container {
    padding: 0 24px;
  }

  .page-title {
    font-size: 19px;
  }

  .title-bar {
    height: 18px;
  }

  .filter-section {
    padding: 16px 0 0;
  }

  .filter-card {
    padding: 16px 18px;
  }

  .search-row {
    max-width: 560px;
  }

  .search-input-wrap {
    height: 44px;
  }

  .search-input {
    font-size: 14px;
  }

  .search-input::placeholder {
    font-size: 13px;
  }

  .btn-search {
    height: 44px;
    padding: 0 24px;
    font-size: 14px;
  }

  .status-chip {
    padding: 6px 16px;
    font-size: 12px;
  }

  .orders-section {
    padding: 16px 0 0;
  }

  .order-list {
    gap: 14px;
  }

  .order-card-body {
    padding: 14px 18px;
  }

  .order-card-header {
    padding: 12px 18px;
  }

  .info-row {
    font-size: 13px;
  }

  .info-label {
    font-size: 12px;
    width: 64px;
  }

  .bottom-spacer {
    height: 24px;
  }

  .result-count {
    font-size: 12px;
  }
}

@media (min-width: 1024px) {
  .page-title {
    font-size: 21px;
  }

  .order-card {
    border-radius: 16px;
  }

  .order-card-body {
    padding: 16px 20px;
    gap: 4px;
  }

  .order-card-header {
    padding: 12px 20px;
  }

  .order-list {
    gap: 16px;
  }
}

/* ===== 减少动画偏好 ===== */
@media (prefers-reduced-motion: reduce) {
  .order-card,
  .btn-search,
  .status-chip,
  .search-input-wrap {
    transition: none;
  }

  .btn-search:hover:not(:disabled) {
    transform: none;
  }

  .spin-icon {
    animation: none;
  }
}
</style>
