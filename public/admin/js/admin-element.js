// Element Plus 版后台管理 - 逻辑层
// 复用 AdminAPI（admin-api.js）和 AdminAuth（admin-common.js）

const { createApp, ref, computed, onMounted, watch } = Vue;

const app = createApp({
  setup() {
    const currentPage = ref('dashboard');
    const adminInfo = ref(AdminAPI.getAdminInfo());
    const saving = ref(false);
    const pageLoading = ref(true);
    const isCollapsed = ref(false);

    // ===== Element Plus 消息提示 =====
    const ElMsg = {
      success: (msg) => ElementPlus.ElMessage.success(msg),
      error: (msg) => ElementPlus.ElMessage.error(msg),
      warning: (msg) => ElementPlus.ElMessage.warning(msg),
      info: (msg) => ElementPlus.ElMessage.info(msg),
    };

    // ===== Element Plus 确认弹窗 =====
    const confirmAction = (message, title = '确认操作') => {
      return ElementPlus.ElMessageBox.confirm(message, title, {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }).then(() => true).catch(() => false);
    };

    // ===== 页面标题 =====
    const pageTitle = computed(() => {
      const map = {
        dashboard: '仪表盘',
        products: '商品管理',
        cardkeys: '卡密管理',
        orders: '订单管理',
        users: '用户管理',
        admins: '管理员管理',
        smsrecords: '接码记录',
      };
      return map[currentPage.value] || '仪表盘';
    });

    // ===== 用户信息展示 =====
    const userName = computed(() => {
      const info = adminInfo.value;
      return (info && info.nickname) || (info && info.username) || '管理员';
    });

    const userInitial = computed(() => {
      const name = userName.value;
      return name.charAt(0).toUpperCase();
    });

    // ===== 商品名查找 =====
    const getProductName = (productId) => {
      const p = products.value.find(item => item.id === productId);
      return p ? p.name : productId;
    };

    // ===== 顶部下拉菜单 =====
    const handleHeaderCommand = (command) => {
      if (command === 'password') {
        showPasswordModal.value = true;
      } else if (command === 'logout') {
        logout();
      }
    };

    // ===== 菜单切换 =====
    const handleMenuSelect = (index) => {
      currentPage.value = index;
    };

    // ===== 仪表盘 =====
    const stats = ref({});
    const statCards = computed(() => [
      { label: '商品总数', value: stats.value.productCount || 0, iconEl: 'Goods', bg: '#dbeafe', color: '#3b82f6' },
      { label: '可用卡密', value: stats.value.cardKeyUnused || 0, iconEl: 'Key', bg: '#dcfce7', color: '#22c55e' },
      { label: '已用卡密', value: stats.value.cardKeyUsed || 0, iconEl: 'Key', bg: '#f3f4f6', color: '#6b7280' },
      { label: '用户总数', value: stats.value.userCount || 0, iconEl: 'User', bg: '#ffedd5', color: '#f97316' },
      { label: '订单总数', value: stats.value.orderCount || 0, iconEl: 'Document', bg: '#f3e8ff', color: '#a855f7' },
      { label: '近7天订单', value: stats.value.recentOrders || 0, iconEl: 'TrendCharts', bg: '#fee2e2', color: '#ef4444' },
    ]);

    const loadStats = async () => {
      try {
        stats.value = await AdminAPI.getStats();
      } catch (e) {
        ElMsg.error('加载统计失败');
      }
    };

    // ===== 商品管理 =====
    const products = ref([]);
    const productsLoading = ref(false);
    const productModalVisible = ref(false);
    const editingProduct = ref({});

    const loadProducts = async () => {
      productsLoading.value = true;
      try {
        products.value = await AdminAPI.getProducts();
      } catch (e) {
        ElMsg.error('加载商品失败');
      } finally {
        productsLoading.value = false;
      }
    };

    const openProductModal = (product = null) => {
      editingProduct.value = product
        ? { ...product }
        : { name: '', price: '', description: '', type: 'ai', sales: 0, isCode: 0, smKeyWord: '' };
      productModalVisible.value = true;
    };

    const handleSaveProduct = async () => {
      const p = editingProduct.value;
      if (!p.name) return ElMsg.warning('请输入商品名称');
      if (!p.price) return ElMsg.warning('请输入价格');

      saving.value = true;
      try {
        if (p.id) {
          await AdminAPI.updateProduct(p.id, p);
          ElMsg.success('更新成功');
        } else {
          await AdminAPI.createProduct(p);
          ElMsg.success('添加成功');
        }
        productModalVisible.value = false;
        loadProducts();
        loadStats();
      } catch (e) {
        ElMsg.error(e.message);
      } finally {
        saving.value = false;
      }
    };

    const handleDeleteProduct = async (id) => {
      if (!await confirmAction('确定要删除该商品吗？')) return;
      try {
        await AdminAPI.deleteProduct(id);
        ElMsg.success('删除成功');
        loadProducts();
        loadStats();
      } catch (e) {
        ElMsg.error(e.message);
      }
    };

    const productTypeLabel = (type) => {
      const map = { ai: 'AI账号', remote: '远程服务', sms: '接码服务' };
      return map[type] || type || '未分类';
    };

    // ===== 卡密管理 =====
    const cardKeys = ref([]);
    const cardKeysLoading = ref(false);
    const cardKeyTotal = ref(0);
    const cardKeyFilter = ref({ productId: '', status: '', page: 1, pageSize: 20 });
    const cardKeyModalVisible = ref(false);
    const cardKeyForm = ref({ productId: '', mode: 'auto', prefix: '', count: 10, cdkText: '', manualKeys: '' });
    const cardPrefixes = ref({});
    const editCDKModalVisible = ref(false);
    const editingCDK = ref({});
    const selectedCardKeyIds = ref([]);

    const manualKeyCount = computed(() => {
      const text = cardKeyForm.value.manualKeys || '';
      return text.trim().split('\n').map(s => s.trim()).filter(Boolean).length;
    });

    const loadCardKeys = async () => {
      cardKeysLoading.value = true;
      selectedCardKeyIds.value = [];
      try {
        const result = await AdminAPI.getCardKeys(cardKeyFilter.value);
        cardKeys.value = result.items;
        cardKeyTotal.value = result.total;
      } catch (e) {
        ElMsg.error('加载卡密失败');
      } finally {
        cardKeysLoading.value = false;
      }
    };

    const loadCardPrefixes = async () => {
      try {
        cardPrefixes.value = await AdminAPI.getCardPrefixes();
      } catch (e) { }
    };

    const openCardKeyModal = () => {
      cardKeyForm.value = { productId: '', mode: 'auto', prefix: '', count: 10, cdkText: '', manualKeys: '' };
      cardKeyModalVisible.value = true;
    };

    const openEditCDKModal = (ck) => {
      editingCDK.value = { ...ck };
      editCDKModalVisible.value = true;
    };

    const handleCardKeySelectionChange = (selection) => {
      selectedCardKeyIds.value = selection.map(item => item.id);
    };

    const handleGenerateCardKeys = async () => {
      const f = cardKeyForm.value;
      if (!f.productId) return ElMsg.warning('请选择商品');

      if (f.mode === 'manual') {
        const keys = f.manualKeys.trim().split('\n').map(s => s.trim()).filter(Boolean);
        if (keys.length === 0) return ElMsg.warning('请输入至少一个卡密');

        let cdkList = [];
        if (f.cdkText.trim()) {
          cdkList = f.cdkText.trim().split('\n').map(s => s.trim()).filter(Boolean);
        }

        saving.value = true;
        try {
          const result = await AdminAPI.manualAddCardKeys({ productId: f.productId, keys, cdkList });
          ElMsg.success(`成功添加 ${result.length} 个卡密`);
          cardKeyModalVisible.value = false;
          loadCardKeys();
          loadStats();
        } catch (e) {
          ElMsg.error(e.message);
        } finally {
          saving.value = false;
        }
      } else {
        if (!f.count || f.count < 1 || f.count > 100) return ElMsg.warning('数量1-100');

        let cdkList = [];
        if (f.cdkText.trim()) {
          cdkList = f.cdkText.trim().split('\n').map(s => s.trim()).filter(Boolean);
        }

        saving.value = true;
        try {
          const result = await AdminAPI.generateCardKeys({ productId: f.productId, prefix: f.prefix, count: f.count, cdkList });
          ElMsg.success(`成功生成 ${result.length} 个卡密`);
          cardKeyModalVisible.value = false;
          loadCardKeys();
          loadStats();
        } catch (e) {
          ElMsg.error(e.message);
        } finally {
          saving.value = false;
        }
      }
    };

    const handleSaveCDK = async () => {
      saving.value = true;
      try {
        await AdminAPI.updateCardKey(editingCDK.value.id, { CDK: editingCDK.value.CDK, status: editingCDK.value.status });
        ElMsg.success('保存成功');
        editCDKModalVisible.value = false;
        loadCardKeys();
      } catch (e) {
        ElMsg.error(e.message);
      } finally {
        saving.value = false;
      }
    };

    const handleDeleteCardKey = async (id) => {
      if (!await confirmAction('确定要删除该卡密吗？')) return;
      try {
        await AdminAPI.deleteCardKey(id);
        ElMsg.success('删除成功');
        loadCardKeys();
      } catch (e) {
        ElMsg.error('删除失败');
      }
    };

    const handleBatchDeleteCardKeys = async () => {
      if (selectedCardKeyIds.value.length === 0) return;
      if (!await confirmAction(`确定要删除选中的 ${selectedCardKeyIds.value.length} 条卡密吗？此操作不可恢复！`)) return;
      try {
        const res = await AdminAPI.batchDeleteCardKeys(selectedCardKeyIds.value);
        ElMsg.success(res.message || '删除成功');
        selectedCardKeyIds.value = [];
        loadCardKeys();
        loadStats();
      } catch (e) {
        ElMsg.error(e.message || '批量删除失败');
      }
    };

    // 卡密状态映射
    const cardStatusType = (s) => ({ unused: 'success', used: 'info', expired: 'danger' }[s] || 'info');
    const cardStatusLabel = (s) => ({ unused: '未使用', used: '已使用', expired: '已过期' }[s] || s);

    // ===== 订单管理 =====
    const orders = ref([]);
    const ordersLoading = ref(false);
    const orderTotal = ref(0);
    const orderFilter = ref({ status: '', page: 1, pageSize: 20 });

    const loadOrders = async () => {
      ordersLoading.value = true;
      try {
        const result = await AdminAPI.getOrders(orderFilter.value);
        orders.value = result.items;
        orderTotal.value = result.total;
      } catch (e) {
        ElMsg.error('加载订单失败');
      } finally {
        ordersLoading.value = false;
      }
    };

    const handleDeleteOrder = async (id) => {
      if (!await confirmAction('确定要删除该订单吗？')) return;
      try {
        await AdminAPI.deleteOrder(id);
        ElMsg.success('删除成功');
        loadOrders();
        loadStats();
      } catch (e) {
        ElMsg.error(e.message);
      }
    };

    const orderStatusType = (s) => ({ pending: 'warning', completed: 'success', failed: 'danger' }[s] || 'info');
    const orderStatusLabel = (s) => ({ pending: '待处理', completed: '已完成', failed: '失败' }[s] || s);

    // ===== 用户管理 =====
    const users = ref([]);
    const usersLoading = ref(false);

    const loadUsers = async () => {
      usersLoading.value = true;
      try {
        users.value = await AdminAPI.getUsers();
      } catch (e) {
        ElMsg.error('加载用户失败');
      } finally {
        usersLoading.value = false;
      }
    };

    const handleToggleUser = async (id) => {
      try {
        await AdminAPI.toggleUserActive(id);
        ElMsg.success('操作成功');
        loadUsers();
      } catch (e) {
        ElMsg.error(e.message);
      }
    };

    const handleDeleteUser = async (id) => {
      if (!await confirmAction('确定要删除该用户吗？此操作不可恢复！')) return;
      try {
        await AdminAPI.deleteUser(id);
        ElMsg.success('删除成功');
        loadUsers();
        loadStats();
      } catch (e) {
        ElMsg.error(e.message);
      }
    };

    // ===== 管理员管理 =====
    const admins = ref([]);
    const adminsLoading = ref(false);
    const adminModalVisible = ref(false);
    const adminForm = ref({ username: '', password: '', nickname: '', role: 'admin' });

    const loadAdmins = async () => {
      adminsLoading.value = true;
      try {
        admins.value = await AdminAPI.getAdmins();
      } catch (e) {
        ElMsg.error('加载管理员列表失败');
      } finally {
        adminsLoading.value = false;
      }
    };

    const openAdminModal = () => {
      adminForm.value = { username: '', password: '', nickname: '', role: 'admin' };
      adminModalVisible.value = true;
    };

    const handleCreateAdmin = async () => {
      const f = adminForm.value;
      if (!f.username || f.username.length < 3) return ElMsg.warning('用户名至少3位');
      if (!f.password || f.password.length < 6) return ElMsg.warning('密码至少6位');

      saving.value = true;
      try {
        await AdminAPI.createAdmin(f);
        ElMsg.success('创建成功');
        adminModalVisible.value = false;
        loadAdmins();
      } catch (e) {
        ElMsg.error(e.message);
      } finally {
        saving.value = false;
      }
    };

    const handleDeleteAdmin = async (id, role) => {
      if (role === 'super') return ElMsg.warning('不能删除超级管理员');
      if (!await confirmAction('确定要删除该管理员吗？')) return;
      try {
        await AdminAPI.deleteAdmin(id);
        ElMsg.success('删除成功');
        loadAdmins();
      } catch (e) {
        ElMsg.error(e.message);
      }
    };

    // ===== 接码记录管理 =====
    const smsRecords = ref([]);
    const smsRecordTotal = ref(0);
    const smsRecordLoading = ref(false);
    const smsRecordFilter = ref({ status: '', phone: '', keyword: '', page: 1, pageSize: 20 });

    const loadSmsRecords = async () => {
      smsRecordLoading.value = true;
      try {
        const result = await AdminAPI.getSmsRecords(smsRecordFilter.value);
        smsRecords.value = result.items;
        smsRecordTotal.value = result.total;
      } catch (e) {
        ElMsg.error('加载接码记录失败');
      } finally {
        smsRecordLoading.value = false;
      }
    };

    const smsStatusType = (s) => ({ active: 'primary', completed: 'success', released: 'info', blocked: 'danger' }[s] || 'info');
    const smsStatusLabel = (s) => ({ active: '使用中', completed: '已完成', released: '已释放', blocked: '已拉黑' }[s] || s);

    // ===== 修改密码 =====
    const showPasswordModal = ref(false);
    const passwordForm = ref({ oldPassword: '', newPassword: '', confirmPassword: '' });

    const handleChangePassword = async () => {
      const f = passwordForm.value;
      if (!f.oldPassword) return ElMsg.warning('请输入原密码');
      if (!f.newPassword || f.newPassword.length < 6) return ElMsg.warning('新密码至少6位');
      if (f.newPassword !== f.confirmPassword) return ElMsg.warning('两次密码不一致');

      saving.value = true;
      try {
        await AdminAPI.changePassword(f.oldPassword, f.newPassword);
        ElMsg.success('密码修改成功，请重新登录');
        showPasswordModal.value = false;
        setTimeout(() => logout(), 1000);
      } catch (e) {
        ElMsg.error(e.message);
      } finally {
        saving.value = false;
      }
    };

    // ===== 通用 =====
    const logout = () => {
      AdminAuth.logout();
    };

    // 页面切换时加载数据
    watch(currentPage, (page) => {
      if (page === 'dashboard') loadStats();
      else if (page === 'products') loadProducts();
      else if (page === 'cardkeys') { loadProducts(); loadCardKeys(); loadCardPrefixes(); }
      else if (page === 'orders') loadOrders();
      else if (page === 'users') loadUsers();
      else if (page === 'admins') loadAdmins();
      else if (page === 'smsrecords') loadSmsRecords();
    });

    onMounted(async () => {
      const ok = await AdminAuth.check();
      if (!ok) return;
      adminInfo.value = AdminAPI.getAdminInfo();
      await loadStats();
      pageLoading.value = false;
    });

    return {
      currentPage, adminInfo, saving, pageLoading, isCollapsed, pageTitle, handleMenuSelect, logout,
      formatDate, userName, userInitial, getProductName, handleHeaderCommand,
      // 仪表盘
      stats, statCards,
      // 商品
      products, productsLoading, productModalVisible, editingProduct,
      loadProducts, openProductModal, handleSaveProduct, handleDeleteProduct, productTypeLabel,
      // 卡密
      cardKeys, cardKeysLoading, cardKeyTotal, cardKeyFilter, cardKeyModalVisible, cardKeyForm,
      cardPrefixes, manualKeyCount, editCDKModalVisible, editingCDK, selectedCardKeyIds,
      loadCardKeys, openCardKeyModal, openEditCDKModal,
      handleGenerateCardKeys, handleSaveCDK, handleDeleteCardKey,
      handleCardKeySelectionChange, handleBatchDeleteCardKeys,
      cardStatusType, cardStatusLabel,
      // 订单
      orders, ordersLoading, orderTotal, orderFilter,
      loadOrders, handleDeleteOrder, orderStatusType, orderStatusLabel,
      // 用户
      users, usersLoading, loadUsers, handleToggleUser, handleDeleteUser,
      // 管理员
      admins, adminsLoading, adminModalVisible, adminForm,
      loadAdmins, openAdminModal, handleCreateAdmin, handleDeleteAdmin,
      // 修改密码
      showPasswordModal, passwordForm, handleChangePassword,
      // 接码记录
      smsRecords, smsRecordTotal, smsRecordLoading, smsRecordFilter, loadSmsRecords,
      smsStatusType, smsStatusLabel,
    };
  },
});

// 注册 Element Plus
app.use(ElementPlus);

// 注册所有 Element Plus Icons
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

app.mount('#app');
