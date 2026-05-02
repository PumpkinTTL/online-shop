<template>
  <div class="home-view">
    <!-- 搜索 + 分类 一体区 -->
    <section class="filter-section">
      <div class="section-container">
        <div class="filter-card">
          <!-- 搜索框 -->
          <div class="search-box" :class="{ 'search-focused': searchFocused }">
            <div class="search-icon-wrap">
              <n-icon :size="16"><search-outline></search-outline></n-icon>
            </div>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索商品名称、描述..."
              class="search-input"
              @focus="searchFocused = true"
              @blur="searchFocused = false"
            />
            <transition name="clear-fade">
              <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">
                <n-icon :size="12"><close-outline></close-outline></n-icon>
              </button>
            </transition>
          </div>

          <!-- 分类标签 -->
          <div class="category-row">
            <button
              class="category-chip"
              :class="{ active: activeCategory === null }"
              @click="activeCategory = null"
            >
              <n-icon :size="13"><apps-outline></apps-outline></n-icon>
              全部
            </button>
            <button
              v-for="cat in productStore.categories"
              :key="cat.id"
              class="category-chip"
              :class="{ active: activeCategory === cat.id }"
              @click="activeCategory = cat.id"
            >
              {{ cat.name }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- 商品列表 -->
    <section class="products-section">
      <div class="section-container">
        <div class="section-header">
          <div class="section-title-group">
            <span class="title-bar"></span>
            <h2 class="section-title">
              {{ activeCategory ? getCategoryName(activeCategory) : '全部商品' }}
            </h2>
          </div>
          <span class="product-count">{{ filteredProducts.length }} 件</span>
        </div>

        <n-spin :show="productStore.loading">
          <div v-if="filteredProducts.length > 0" class="product-grid">
            <div
              v-for="product in filteredProducts"
              :key="product.id"
              :class="['product-card', { 'card-sold-out': product.stock === 0 }]"
              @click="goToProduct(product.id)"
            >
              <div class="card-cover" :style="coverStyle(product)">
                <div v-if="!product.image && !product.coverImage" class="cover-placeholder">
                  <n-icon :size="28" color="#CBD5E1"><cube-outline></cube-outline></n-icon>
                </div>
                <!-- 售罄斜角丝带 -->
                <div v-if="product.stock === 0" class="sold-out-ribbon">售罄</div>
              </div>
              <div class="card-body">
                <h3 class="card-title">{{ product.name }}</h3>
                <p v-if="product.description" class="card-desc">{{ product.description }}</p>
                <!-- 标签区 -->
                <div class="card-tags">
                  <span v-if="product.credit" class="tag tag-credit">
                    <n-icon :size="11"><wallet-outline></wallet-outline></n-icon>
                    {{ product.credit }}积分
                  </span>
                  <span v-if="product.warranty" class="tag tag-warranty">
                    <n-icon :size="11"><shield-checkmark-outline></shield-checkmark-outline></n-icon>
                    {{ product.warranty }}
                  </span>
                  <span v-if="product.category && product.category.smsEnabled === 1" class="tag tag-sms">
                    <n-icon :size="11"><phone-portrait-outline></phone-portrait-outline></n-icon>
                    接码
                  </span>
                  <span v-if="product.stock > 0 && product.stock <= 5" class="tag tag-low">
                    仅剩{{ product.stock }}
                  </span>
                </div>
                <!-- Meta 行 -->
                <div class="card-meta">
                  <span v-if="product.sales" class="meta-item">
                    <n-icon :size="12" color="#94A3B8"><trending-up-outline></trending-up-outline></n-icon>
                    已售{{ product.sales }}
                  </span>
                  <span v-if="product.stock > 5" class="meta-item meta-stock">
                    <n-icon :size="12" color="#22C55E"><checkmark-circle-outline></checkmark-circle-outline></n-icon>
                    有货
                  </span>
                </div>
                <div class="card-footer">
                  <span class="card-price">
                    <span class="price-symbol">¥</span>{{ product.price }}
                  </span>
                  <span class="card-action">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div v-else-if="!productStore.loading" class="empty-state">
            <n-icon :size="48" color="#E2E8F0"><cube-outline></cube-outline></n-icon>
            <p>{{ searchQuery ? '没有找到匹配的商品' : '暂无商品' }}</p>
          </div>
        </n-spin>
      </div>
    </section>

    <!-- 移动端底部安全距离 -->
    <div class="bottom-spacer"></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { NSpin, NIcon } from 'naive-ui'
import {
  SearchOutline, CloseOutline, CubeOutline,
  WalletOutline, ShieldCheckmarkOutline, PhonePortraitOutline,
  TrendingUpOutline, CheckmarkCircleOutline,
  AppsOutline
} from '@vicons/ionicons5'
import { useProductStore } from '@/stores/product'

const router = useRouter()
const productStore = useProductStore()

const searchQuery = ref('')
const searchFocused = ref(false)
const activeCategory = ref(null)

const debouncedQuery = ref('')
let debounceTimer = null
watch(searchQuery, (val) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => { debouncedQuery.value = val }, 200)
})

const filteredProducts = computed(() => {
  let list = productStore.products
  if (activeCategory.value) {
    list = list.filter(p => p.categoryId === activeCategory.value)
  }
  if (debouncedQuery.value.trim()) {
    const q = debouncedQuery.value.trim().toLowerCase()
    list = list.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    )
  }
  return list
})

function getCategoryName(id) {
  const cat = productStore.categories.find(c => c.id === id)
  return cat?.name || '商品'
}

function goToProduct(id) {
  router.push({ name: 'ProductDetail', params: { id } })
}

function coverStyle(product) {
  let src = ''
  if (product.image) {
    src = product.image.startsWith('http') ? product.image : `/images/${product.image}`
  } else {
    src = product.coverImage || ''
  }
  if (src) {
    return { background: `url('${src}') center/cover no-repeat` }
  }
  return { background: 'linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%)' }
}

onMounted(async () => {
  await productStore.fetchCategories()
  await productStore.fetchProducts()
})
</script>

<style scoped>
/* ===== 搜索筛选区 ===== */
.filter-section {
  padding: 16px 0;
}

.section-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
}

.filter-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: white;
  padding: 16px;
  border-radius: 16px;
  border: 1px solid #E2E8F0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

/* ===== 搜索框 ===== */
.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  height: 40px;
  background: white;
  border-radius: 10px;
  border: 1.5px solid #E2E8F0;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.search-box.search-focused {
  border-color: #93C5FD;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.08);
}

.search-focused .search-icon-wrap {
  color: #3B82F6;
}

.search-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94A3B8;
  transition: color 0.2s;
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

.search-input::placeholder {
  color: #94A3B8;
  font-size: 13px;
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

/* ===== 分类标签 ===== */
.category-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.category-row::-webkit-scrollbar {
  display: none;
}

.category-chip {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border-radius: 8px;
  border: 1.5px solid #E2E8F0;
  background: white;
  font-size: 12px;
  font-weight: 500;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #64748B;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  line-height: 1.4;
  -webkit-tap-highlight-color: transparent;
}

.category-chip:hover {
  border-color: #93C5FD;
  color: #3B82F6;
  background: #EFF6FF;
}

.category-chip.active {
  background: #3B82F6;
  border-color: #3B82F6;
  color: white;
}

.category-chip.active:hover {
  background: #2563EB;
  border-color: #2563EB;
}

/* ===== 商品列表 ===== */
.products-section {
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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: #0F172A;
  line-height: 1;
}

.product-count {
  font-size: 11px;
  color: #94A3B8;
  font-weight: 500;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #F1F5F9;
  padding: 3px 10px;
  border-radius: 10px;
}

/* ===== 商品卡片 ===== */
.product-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.product-card {
  background: white;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid #F1F5F9;
  cursor: pointer;
  transition: all 0.25s ease-out;
  -webkit-tap-highlight-color: transparent;
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.product-card:active {
  transform: scale(0.98);
  border-color: rgba(59, 130, 246, 0.2);
}

/* 卡片封面 */
.card-cover {
  position: relative;
  height: 110px;
  overflow: hidden;
  background: linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%);
  background-size: 100%;
  background-position: center;
  transition: background-size 0.3s ease-out;
}

.product-card:hover .card-cover {
  background-size: 105%;
}

.cover-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

/* 售罄斜角丝带 */
.sold-out-ribbon {
  position: absolute;
  top: 12px;
  right: -28px;
  width: 100px;
  padding: 4px 0;
  background: rgba(239, 68, 68, 0.88);
  color: white;
  font-size: 11px;
  font-weight: 700;
  text-align: center;
  letter-spacing: 0.1em;
  transform: rotate(45deg);
  box-shadow: 0 2px 6px rgba(239, 68, 68, 0.3);
  z-index: 2;
  pointer-events: none;
}

/* 卡片内容 */
.card-body {
  padding: 10px 12px 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  color: #1E293B;
  margin-bottom: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.4;
}

.card-desc {
  font-size: 11px;
  color: #94A3B8;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.4;
}

/* 标签区 */
.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.6;
  white-space: nowrap;
}

.tag-credit {
  background: linear-gradient(135deg, #FEF3C7, #FDE68A);
  color: #92400E;
}

.tag-warranty {
  background: linear-gradient(135deg, #DBEAFE, #BFDBFE);
  color: #1D4ED8;
}

.tag-sms {
  background: linear-gradient(135deg, #D1FAE5, #A7F3D0);
  color: #047857;
}

.tag-low {
  background: linear-gradient(135deg, #FEF3C7, #FDE68A);
  color: #B45309;
}

/* Meta 行 */
.card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 10px;
  color: #94A3B8;
  font-weight: 500;
}

.meta-stock {
  color: #22C55E;
}

/* 底部价格和操作 */
.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
}

.card-price {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #EF4444;
  transition: color 0.2s ease;
}

.product-card:hover .card-price {
  color: #DC2626;
}

.price-symbol {
  font-size: 11px;
  font-weight: 600;
}

.card-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: rgba(59, 130, 246, 0.06);
  color: #3B82F6;
  transition: all 0.2s ease-out;
}

.product-card:hover .card-action {
  background: #3B82F6;
  color: white;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
  transform: translateX(2px);
}

/* 售罄卡片降饱和 */
.card-sold-out {
  filter: saturate(0.35);
  opacity: 0.85;
}

.card-sold-out:hover {
  filter: saturate(0.6);
  opacity: 1;
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
}

/* ===== 底部间距 ===== */
.bottom-spacer {
  height: 68px;
}

/* ===== 桌面端响应式 ===== */
@media (min-width: 768px) {
  .filter-section {
    padding: 20px 0;
  }

  .section-container {
    padding: 0 24px;
  }

  .filter-card {
    flex-direction: row;
    align-items: center;
    gap: 16px;
  }

  .search-box {
    width: 280px;
    flex-shrink: 0;
    height: 40px;
  }

  .search-input {
    font-size: 13px;
  }

  .category-row {
    flex: 1;
    min-width: 0;
  }

  .category-chip {
    padding: 6px 16px;
    font-size: 13px;
  }

  .products-section {
    padding: 20px 0 0;
  }

  .product-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }

  .card-cover {
    height: 150px;
  }

  .product-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 25px rgba(59, 130, 246, 0.1), 0 2px 8px rgba(0, 0, 0, 0.04);
    border-color: rgba(59, 130, 246, 0.12);
  }

  .card-body {
    padding: 14px 16px 16px;
  }

  .card-title {
    font-size: 14px;
  }

  .card-desc {
    font-size: 12px;
  }

  .card-price {
    font-size: 18px;
  }

  .tag {
    font-size: 11px;
    padding: 2px 8px;
  }

  .section-title {
    font-size: 16px;
  }

  .title-bar {
    height: 18px;
  }

  .product-count {
    font-size: 12px;
  }

  .bottom-spacer {
    height: 24px;
  }
}

@media (min-width: 1024px) {
  .product-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
  }

  .section-title {
    font-size: 17px;
  }
}

/* ===== 减少动画偏好 ===== */
@media (prefers-reduced-motion: reduce) {
  .product-card {
    transition: none;
  }
  .product-card:hover {
    transform: none;
  }
  .product-card:hover .card-cover {
    background-size: 100%;
  }
  .category-chip {
    transition: none;
  }
  .search-box {
    transition: none;
  }
}
</style>
