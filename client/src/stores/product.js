import { defineStore } from 'pinia'
import { ref } from 'vue'
import { productApi } from '@/api'

export const useProductStore = defineStore('product', () => {
  const products = ref([])
  const categories = ref([])
  const loading = ref(false)

  async function fetchCategories() {
    const res = await productApi.getCategories()
    categories.value = Array.isArray(res) ? res : []
    return res
  }

  async function fetchProducts(params) {
    loading.value = true
    try {
      const res = await productApi.getProducts(params)
      products.value = Array.isArray(res) ? res : []
      return res
    } finally {
      loading.value = false
    }
  }

  async function fetchProductDetail(id) {
    const res = await productApi.getProduct(id)
    return res
  }

  return { products, categories, loading, fetchCategories, fetchProducts, fetchProductDetail }
})
