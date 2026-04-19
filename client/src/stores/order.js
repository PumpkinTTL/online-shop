import { defineStore } from 'pinia'
import { ref } from 'vue'
import { pickupApi } from '@/api'

export const useOrderStore = defineStore('order', () => {
  const orders = ref([])
  const loading = ref(false)

  async function fetchOrders(params) {
    loading.value = true
    try {
      const res = await pickupApi.getOrders(typeof params === 'object' ? params : { userId: params })
      orders.value = Array.isArray(res) ? res : (res.items || [])
      return res
    } finally {
      loading.value = false
    }
  }

  return { orders, loading, fetchOrders }
})
