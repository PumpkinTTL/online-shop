<template>
  <div class="home-view">
    <!-- 搜索区域 -->
    <section class="search-section">
      <div class="section-container">
        <div class="search-box">
          <n-icon :size="18" color="#94A3B8"><search-outline></search-outline></n-icon>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索商品..."
            class="search-input"
          />
          <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">
            <n-icon :size="14"><close-outline></close-outline></n-icon>
          </button>
        </div>
      </div>
    </section>

    <!-- 类别筛选 -->
    <section class="category-section">
      <div class="section-container">
        <div class="category-scroll">
          <button
            class="category-chip"
            :class="{ active: activeCategory === null }"
            @click="activeCategory = null"
          >
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
    </section>

    <!-- 商品列表 -->
    <section class="products-section">
      <div class="section-container">
        <div class="section-header">
          <h2 class="section-title">
            {{ activeCategory ? getCategoryName(activeCategory) : '全部商品' }}
          </h2>
          <span class="product-count">{{ filteredProducts.length }} 件</span>
        </div>

        <n-spin :show="productStore.loading">
          <div v-if="filteredProducts.length > 0" class="product-grid">
            <div
              v-for="product in filteredProducts"
              :key="product.id"
              class="product-card"
              @click="goToProduct(product.id)"
            >
              <div class="card-cover" :style="coverStyle(product)">
                <div v-if="!product.image && !product.coverImage" class="cover-placeholder">
                  <n-icon :size="28" color="#CBD5E1"><cube-outline></cube-outline></n-icon>
                </div>
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
                  <span v-if="product.stock === 0" class="tag tag-out">
                    <n-icon :size="11"><ban-outline></ban-outline></n-icon>
                    售罄
                  </span>
                  <span v-else-if="product.stock > 0 && product.stock <= 5" class="tag tag-low">
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { NSpin, NIcon } from 'naive-ui'
import {
  SearchOutline, CloseOutline, CubeOutline,
  WalletOutline, ShieldCheckmarkOutline, PhonePortraitOutline,
  BanOutline, TrendingUpOutline, CheckmarkCircleOutline
} from '@vicons/ionicons5'
import { useProductStore } from '@/stores/product'

const router = useRouter()
const productStore = useProductStore()

const searchQuery = ref('')
const activeCategory = ref(null)

const filteredProducts = computed(() => {
  let list = productStore.products
  if (activeCategory.value) {
    list = list.filter(p => p.categoryId === activeCategory.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
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
  const src = product.image ? `/assets/images/${product.image}` : (product.coverImage || '')
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
/* ===== 搜索区域 ===== */
.search-section {
  padding: 12px 0 0;
}

.section-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  background: #F1F5F9;
  border-radius: 10px;
  transition: all 0.2s ease;
}

.search-box:focus-within {
  background: white;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
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
}

/* ===== 类别筛选 ===== */
.category-section {
  padding: 10px 0 0;
}

.category-scroll {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 4px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.category-scroll::-webkit-scrollbar {
  display: none;
}

.category-chip {
  flex-shrink: 0;
  padding: 5px 14px;
  border-radius: 16px;
  border: 1.5px solid #E2E8F0;
  background: white;
  font-size: 12px;
  font-weight: 500;
  color: #64748B;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.category-chip:hover {
  border-color: #93C5FD;
  color: #3B82F6;
}

.category-chip.active {
  background: #3B82F6;
  border-color: #3B82F6;
  color: white;
}

/* ===== 商品列表 ===== */
.products-section {
  padding: 12px 0;
}

.section-header {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 10px;
}

.section-title {
  font-family: 'Poppins', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: #0F172A;
}

.product-count {
  font-size: 11px;
  color: #94A3B8;
}

/* ===== 商品卡片 ===== */
.product-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.product-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #F1F5F9;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.product-card:active {
  transform: scale(0.98);
}

/* 卡片封面 */
.card-cover {
  position: relative;
  height: 110px;
  overflow: hidden;
  background: linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%);
  background-size: 100%;
  background-position: center;
  transition: background-size 0.3s ease;
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

/* 卡片内容 */
.card-body {
  padding: 10px 12px 12px;
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

.tag-out {
  background: #F1F5F9;
  color: #94A3B8;
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
}

.card-price {
  font-family: 'Poppins', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #EF4444;
}

.price-symbol {
  font-size: 11px;
  font-weight: 600;
}

.card-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: rgba(59, 130, 246, 0.06);
  color: #3B82F6;
  transition: all 0.2s ease;
}

.product-card:hover .card-action {
  background: #3B82F6;
  color: white;
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
  .section-container {
    padding: 0 24px;
  }

  .search-section {
    padding: 20px 0 0;
  }

  .search-box {
    max-width: 400px;
    padding: 10px 14px;
    border-radius: 10px;
  }

  .search-input {
    font-size: 14px;
  }

  .product-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }

  .card-cover {
    height: 140px;
  }

  .product-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
    border-color: rgba(59, 130, 246, 0.08);
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
    font-size: 16px;
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
}
</style>
