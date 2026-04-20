import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { userApi } from '@/api'

export const useUserStore = defineStore('user', () => {
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))
  const isLoggedIn = computed(() => !!user.value)

  async function login(username, password) {
    const res = await userApi.login(username, password)
    user.value = res.user
    localStorage.setItem('user', JSON.stringify(res.user))
    return res
  }

  async function register(username, password, inviteCode) {
    const res = await userApi.register(username, password, inviteCode)
    user.value = res.user
    localStorage.setItem('user', JSON.stringify(res.user))
    return res
  }

  async function fetchMe() {
    try {
      const res = await userApi.getMe()
      user.value = res
      localStorage.setItem('user', JSON.stringify(res))
    } catch {
      user.value = null
      localStorage.removeItem('user')
    }
  }

  async function logout() {
    try {
      await userApi.logout()
    } catch { /* ignore */ }
    user.value = null
    localStorage.removeItem('user')
  }

  return { user, isLoggedIn, login, register, fetchMe, logout }
})
