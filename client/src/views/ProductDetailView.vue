<template>
  <div class="product-detail">
    <div class="container">
      <n-spin :show="loading">
        <n-grid :cols="1" :x-gap="24" item-responsive>
          <n-gi span="1 m:8 l:6">
            <n-card>
              <div class="product-cover">
                <img v-if="product?.coverImage" :src="product.coverImage" :alt="product.name" />
                <div v-else class="cover-placeholder">
                  <n-icon size="64" color="#CBD5E1"><CubeOutline /></n-icon>
                </div>
              </div>
            </n-card>
          </n-gi>
          <n-gi span="1 m:16 l:18">
            <n-card v-if="product">
              <n-h2>{{ product.name }}</n-h2>
              <n-text type="error" strong style="font-size: 28px;">¥{{ product.price }}</n-text>
              <n-divider />
              <n-p>{{ product.description || '暂无描述' }}</n-p>
              <n-space vertical :size="12" style="margin-top: 24px;">
                <n-button type="primary" size="large" block @click="handleBuy">
                  立即购买
                </n-button>
              </n-space>
            </n-card>
          </n-gi>
        </n-grid>
      </n-spin>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { NH2, NGrid, NGi, NCard, NText, NSpin, NDivider, NP, NSpace, NButton, NIcon, useMessage } from 'naive-ui'
import { CubeOutline } from '@vicons/ionicons5'
import { productApi } from '@/api'

const route = useRoute()
const message = useMessage()

const product = ref(null)
const loading = ref(false)

async function handleBuy() {
  message.info('购买功能开发中...')
}

onMounted(async () => {
  loading.value = true
  try {
    product.value = await productApi.getProduct(route.params.id)
  } catch {
    message.error('商品不存在')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.product-detail {
  padding: 24px 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.product-cover {
  height: 320px;
  overflow: hidden;
  background: #F8FAFC;
  border-radius: 12px;
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
