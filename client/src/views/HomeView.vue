<template>
  <div class="home-view">
    <div class="container">
      <n-h2>商品列表</n-h2>
      <n-spin :show="productStore.loading">
        <n-grid :cols="4" :x-gap="16" :y-gap="16" responsive="screen" item-responsive>
          <n-gi v-for="product in productStore.products" :key="product.id" span="4 m:2 l:1">
            <n-card hoverable @click="goToProduct(product.id)" style="cursor: pointer;">
              <template #cover>
                <div class="product-cover">
                  <img v-if="product.coverImage" :src="product.coverImage" :alt="product.name" />
                  <div v-else class="cover-placeholder">
                    <n-icon size="48" color="#CBD5E1"><CubeOutline /></n-icon>
                  </div>
                </div>
              </template>
              <n-card-content>
                <n-text strong>{{ product.name }}</n-text>
                <n-text type="error" strong style="font-size: 18px; display: block; margin-top: 8px;">
                  ¥{{ product.price }}
                </n-text>
              </n-card-content>
            </n-card>
          </n-gi>
        </n-grid>
        <n-empty v-if="!productStore.loading && productStore.products.length === 0" description="暂无商品" />
      </n-spin>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { NH2, NGrid, NGi, NCard, NText, NSpin, NEmpty, NIcon } from 'naive-ui'
import { CubeOutline } from '@vicons/ionicons5'
import { useProductStore } from '@/stores/product'

const router = useRouter()
const productStore = useProductStore()

function goToProduct(id) {
  router.push({ name: 'ProductDetail', params: { id } })
}

onMounted(async () => {
  await productStore.fetchCategories()
  await productStore.fetchProducts()
})
</script>

<style scoped>
.home-view {
  padding: 24px 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.product-cover {
  height: 180px;
  overflow: hidden;
  background: #F8FAFC;
  display: flex;
  align-items: center;
  justify-content: center;
}

.product-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
</style>
