import { defineStore } from 'pinia'
import { ref } from 'vue'
import { adminApi } from '@/api'

export const useAdminStore = defineStore('admin', () => {
  const adminInfo = ref(null)
  const isLoggedIn = ref(false)

  // ===== 认证 =====
  async function login(username, password, turnstileToken) {
    const res = await adminApi.login(username, password, turnstileToken)
    adminInfo.value = res.admin
    isLoggedIn.value = true
    return res
  }

  async function checkAuth() {
    try {
      const res = await adminApi.check()
      adminInfo.value = res
      isLoggedIn.value = true
      return true
    } catch {
      logout()
      return false
    }
  }

  async function logout() {
    try {
      await adminApi.logout()
    } catch (e) {
      console.warn('管理员退出请求失败:', e?.message)
    }
    adminInfo.value = null
    isLoggedIn.value = false
  }

  // ===== 仪表盘 =====
  const stats = ref(null)
  async function fetchStats() {
    stats.value = await adminApi.getStats()
    return stats.value
  }

  // ===== 商品 =====
  const products = ref([])
  const productsTotal = ref(0)
  async function fetchProducts(params = {}) {
    const res = await adminApi.getProducts(params)
    if (Array.isArray(res)) {
      products.value = res
      productsTotal.value = res.length
    } else {
      products.value = res.items || res
      productsTotal.value = res.total || res.length
    }
    return res
  }

  async function createProduct(data) {
    return await adminApi.createProduct(data)
  }

  async function updateProduct(id, data) {
    return await adminApi.updateProduct(id, data)
  }

  async function deleteProduct(id) {
    return await adminApi.deleteProduct(id)
  }

  async function batchDeleteProducts(ids) {
    return await adminApi.batchDeleteProducts(ids)
  }

  // ===== 类别 =====
  const categories = ref([])
  async function fetchCategories() {
    const res = await adminApi.getCategories()
    categories.value = Array.isArray(res) ? res : (res.items || [])
    return res
  }

  async function createCategory(data) {
    return await adminApi.createCategory(data)
  }

  async function updateCategory(id, data) {
    return await adminApi.updateCategory(id, data)
  }

  async function deleteCategory(id) {
    return await adminApi.deleteCategory(id)
  }

  async function batchDeleteCategories(ids) {
    return await adminApi.batchDeleteCategories(ids)
  }

  // ===== 卡密 =====
  const cardKeys = ref([])
  const cardKeysTotal = ref(0)
  async function fetchCardKeys(params = {}) {
    const res = await adminApi.getCardKeys(params)
    if (Array.isArray(res)) {
      cardKeys.value = res
      cardKeysTotal.value = res.length
    } else {
      cardKeys.value = res.items || res
      cardKeysTotal.value = res.total || res.length
    }
    return res
  }

  async function generateCardKeys(data) {
    return await adminApi.generateCardKeys(data)
  }

  async function manualAddCardKeys(data) {
    return await adminApi.manualAddCardKeys(data)
  }

  async function deleteCardKey(id) {
    return await adminApi.deleteCardKey(id)
  }

  async function batchDeleteCardKeys(ids) {
    return await adminApi.batchDeleteCardKeys(ids)
  }

  // ===== 订单 =====
  const orders = ref([])
  const ordersTotal = ref(0)
  async function fetchOrders(params = {}) {
    const res = await adminApi.getOrders(params)
    if (Array.isArray(res)) {
      orders.value = res
      ordersTotal.value = res.length
    } else {
      orders.value = res.items || res
      ordersTotal.value = res.total || res.length
    }
    return res
  }

  async function deleteOrder(id) {
    return await adminApi.deleteOrder(id)
  }

  async function batchDeleteOrders(ids) {
    return await adminApi.batchDeleteOrders(ids)
  }

  // ===== 用户 =====
  const users = ref([])
  const usersTotal = ref(0)
  async function fetchUsers(params = {}) {
    const res = await adminApi.getUsers(params)
    if (Array.isArray(res)) {
      users.value = res
      usersTotal.value = res.length
    } else {
      users.value = res.items || res
      usersTotal.value = res.total || res.length
    }
    return res
  }

  async function toggleUserActive(id) {
    return await adminApi.toggleUserActive(id)
  }

  async function resetUserPassword(id, newPassword) {
    return await adminApi.resetUserPassword(id, newPassword)
  }

  async function deleteUser(id) {
    return await adminApi.deleteUser(id)
  }

  async function batchDeleteUsers(ids) {
    return await adminApi.batchDeleteUsers(ids)
  }

  // ===== 管理员 =====
  const admins = ref([])
  async function fetchAdmins(params = {}) {
    const res = await adminApi.getAdmins(params)
    admins.value = Array.isArray(res) ? res : (res.items || [])
    return res
  }

  async function createAdmin(data) {
    return await adminApi.createAdmin(data)
  }

  async function deleteAdmin(id) {
    return await adminApi.deleteAdmin(id)
  }

  // ===== 接码记录 =====
  const smsRecords = ref([])
  const smsRecordsTotal = ref(0)
  async function fetchSmsRecords(params = {}) {
    const res = await adminApi.getSmsRecords(params)
    if (Array.isArray(res)) {
      smsRecords.value = res
      smsRecordsTotal.value = res.length
    } else {
      smsRecords.value = res.items || res
      smsRecordsTotal.value = res.total || res.length
    }
    return res
  }

  async function batchDeleteSmsRecords(ids) {
    return await adminApi.batchDeleteSmsRecords(ids)
  }

  // ===== 日志 =====
  const logStats = ref(null)
  async function fetchLogStats() {
    logStats.value = await adminApi.getLogStats()
    return logStats.value
  }

  const logFiles = ref([])
  async function fetchLogFiles(params = {}) {
    logFiles.value = await adminApi.getLogFiles(params)
    return logFiles.value
  }

  const logContent = ref({ logs: [], total: 0 })
  async function fetchLogContent(params = {}) {
    logContent.value = await adminApi.getLogContent(params)
    return logContent.value
  }

  async function cleanupLogs(data) {
    return await adminApi.cleanupLogs(data)
  }

  // ===== 速率限制 =====
  const rateLimits = ref([])
  async function fetchRateLimits() {
    rateLimits.value = await adminApi.getRateLimits()
    return rateLimits.value
  }

  async function updateRateLimit(key, data) {
    return await adminApi.updateRateLimit(key, data)
  }

  async function resetRateLimits() {
    return await adminApi.resetRateLimits()
  }

  // ===== 公告 =====
  const announcements = ref([])
  const announcementsTotal = ref(0)
  async function fetchAnnouncements(params = {}) {
    const res = await adminApi.getAnnouncements(params)
    if (Array.isArray(res)) {
      announcements.value = res
      announcementsTotal.value = res.length
    } else {
      announcements.value = res.items || res
      announcementsTotal.value = res.total || res.length
    }
    return res
  }

  async function createAnnouncement(data) {
    return await adminApi.createAnnouncement(data)
  }

  async function updateAnnouncement(id, data) {
    return await adminApi.updateAnnouncement(id, data)
  }

  async function deleteAnnouncement(id) {
    return await adminApi.deleteAnnouncement(id)
  }

  async function batchDeleteAnnouncements(ids) {
    return await adminApi.batchDeleteAnnouncements(ids)
  }

  return {
    // 认证
    adminInfo, isLoggedIn,
    login, checkAuth, logout,
    // 仪表盘
    stats, fetchStats,
    // 商品
    products, productsTotal, fetchProducts, createProduct, updateProduct, deleteProduct, batchDeleteProducts,
    // 类别
    categories, fetchCategories, createCategory, updateCategory, deleteCategory, batchDeleteCategories,
    // 卡密
    cardKeys, cardKeysTotal, fetchCardKeys, generateCardKeys, manualAddCardKeys, deleteCardKey, batchDeleteCardKeys,
    // 订单
    orders, ordersTotal, fetchOrders, deleteOrder, batchDeleteOrders,
    // 用户
    users, usersTotal, fetchUsers, toggleUserActive, resetUserPassword, deleteUser, batchDeleteUsers,
    // 管理员
    admins, fetchAdmins, createAdmin, deleteAdmin,
    // 接码记录
    smsRecords, smsRecordsTotal, fetchSmsRecords, batchDeleteSmsRecords,
    // 日志
    logStats, logFiles, logContent, fetchLogStats, fetchLogFiles, fetchLogContent, cleanupLogs,
    // 速率限制
    rateLimits, fetchRateLimits, updateRateLimit, resetRateLimits,
    // 公告
    announcements, announcementsTotal, fetchAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement, batchDeleteAnnouncements,
  }
})
