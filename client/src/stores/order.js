import { defineStore } from 'pinia'
import { ref } from 'vue'
import { pickupApi } from '@/api'

export const useOrderStore = defineStore('order', () => {
  const orders = ref([])
  const total = ref(0)
  const loading = ref(false)

  async function fetchOrders(params) {
    loading.value = true
    try {
      const query = typeof params === 'object' ? params : { userId: params }
      const res = await pickupApi.getOrders(query)
      if (Array.isArray(res)) {
        orders.value = res
        total.value = res.length
      } else {
        orders.value = res.items || []
        total.value = res.total || 0
      }
      return res
    } finally {
      loading.value = false
    }
  }

  return { orders, total, loading, fetchOrders }
})
