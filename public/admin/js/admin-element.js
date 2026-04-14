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
    const openMenus = ref(['manage', 'system']);

    // ===== Element Plus 消息提示 =====
    const ElMsg = {
      success: function(msg) { ElementPlus.ElMessage.success(msg); },
      error: function(msg) { ElementPlus.ElMessage.error(msg); },
      warning: function(msg) { ElementPlus.ElMessage.warning(msg); },
      info: function(msg) { ElementPlus.ElMessage.info(msg); },
    };

    // ===== Element Plus 确认弹窗 =====
    var confirmAction = function(message, title) {
      title = title || '确认操作';
      return ElementPlus.ElMessageBox.confirm(message, title, {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }).then(function() { return true; }).catch(function() { return false; });
    };

    // ===== 页面标题 =====
    var pageTitle = computed(function() {
      var map = {
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
    var userName = computed(function() {
      var info = adminInfo.value;
      if (info && info.nickname) return info.nickname;
      if (info && info.username) return info.username;
      return '管理员';
    });

    var userInitial = computed(function() {
      return userName.value.charAt(0).toUpperCase();
    });

    // ===== 商品名查找 =====
    var getProductName = function(productId) {
      var list = products.value;
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === productId) return list[i].name;
      }
      return productId;
    };

    var getProductLabel = function(p) {
      return p.name + ' (ID:' + p.id + ')';
    };

    var getProductTypeTag = function(type) {
      if (type === 'ai') return 'primary';
      if (type === 'remote') return 'warning';
      return 'success';
    };

    // ===== 顶部下拉菜单 =====
    var handleHeaderCommand = function(command) {
      if (command === 'password') {
        showPasswordModal.value = true;
      } else if (command === 'logout') {
        logout();
      }
    };

    // ===== 菜单切换 =====
    var handleMenuSelect = function(index) {
      currentPage.value = index;
    };

    // ===== 刷新当前页面数据 =====
    var refreshCurrentPage = function() {
      var page = currentPage.value;
      if (page === 'dashboard') loadStats();
      else if (page === 'products') loadProducts();
      else if (page === 'cardkeys') { loadProducts(); loadCardKeys(); }
      else if (page === 'orders') loadOrders();
      else if (page === 'users') loadUsers();
      else if (page === 'admins') loadAdmins();
      else if (page === 'smsrecords') loadSmsRecords();
      ElMsg.success('数据已刷新');
    };

    // ===== 仪表盘 =====
    var stats = ref({});
    var statCards = computed(function() {
      var s = stats.value;
      return [
        { label: '商品总数', value: s.productCount || 0, iconEl: 'Goods', bg: '#EFF6FF', color: '#3B82F6' },
        { label: '可用卡密', value: s.cardKeyUnused || 0, iconEl: 'Key', bg: '#F0FDF4', color: '#22C55E' },
        { label: '已用卡密', value: s.cardKeyUsed || 0, iconEl: 'Key', bg: '#F8FAFC', color: '#64748B' },
        { label: '用户总数', value: s.userCount || 0, iconEl: 'User', bg: '#FFF7ED', color: '#F97316' },
        { label: '订单总数', value: s.orderCount || 0, iconEl: 'Document', bg: '#FAF5FF', color: '#A855F7' },
        { label: '近7天订单', value: s.recentOrders || 0, iconEl: 'TrendCharts', bg: '#FEF2F2', color: '#EF4444' },
      ];
    });

    var loadStats = async function() {
      try {
        stats.value = await AdminAPI.getStats();
      } catch (e) {
        ElMsg.error('加载统计失败');
      }
    };

    // ===== 商品管理 =====
    var products = ref([]);
    var productsLoading = ref(false);
    var productModalVisible = ref(false);
    var editingProduct = ref({});

    var loadProducts = async function() {
      productsLoading.value = true;
      try {
        products.value = await AdminAPI.getProducts();
      } catch (e) {
        ElMsg.error('加载商品失败');
      } finally {
        productsLoading.value = false;
      }
    };

    var openProductModal = function(product) {
      if (product) {
        editingProduct.value = Object.assign({}, product);
      } else {
        editingProduct.value = { name: '', price: '', description: '', type: 'ai', sales: 0, isCode: 0, smKeyWord: '', addr: '', credit: 0, tips: '', show: 1 };
      }
      productModalVisible.value = true;
    };

    var handleSaveProduct = async function() {
      var p = editingProduct.value;
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

    var handleDeleteProduct = async function(id) {
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

    var productTypeLabel = function(type) {
      var map = { ai: 'AI账号', remote: '远程服务', sms: '接码服务' };
      return map[type] || type || '未分类';
    };

    // ===== 卡密管理 =====
    var cardKeys = ref([]);
    var cardKeysLoading = ref(false);
    var cardKeyTotal = ref(0);
    var cardKeyFilter = ref({ productId: '', status: '', page: 1, pageSize: 20 });
    var cardKeyModalVisible = ref(false);
    var cardKeyForm = ref({ productId: '', mode: 'auto', prefix: '', count: 10, cdkText: '', manualKeys: '' });
    var cardPrefixes = ref({});
    var editCDKModalVisible = ref(false);
    var editingCDK = ref({});
    var selectedCardKeyIds = ref([]);

    var prefixList = computed(function() {
      var result = [];
      var obj = cardPrefixes.value;
      var keys = Object.keys(obj);
      for (var i = 0; i < keys.length; i++) {
        result.push({ key: keys[i], label: obj[keys[i]] });
      }
      return result;
    });

    var manualKeyCount = computed(function() {
      var text = cardKeyForm.value.manualKeys || '';
      var lines = text.trim().split('\n');
      var count = 0;
      for (var i = 0; i < lines.length; i++) {
        if (lines[i].trim()) count++;
      }
      return count;
    });

    var loadCardKeys = async function() {
      cardKeysLoading.value = true;
      selectedCardKeyIds.value = [];
      try {
        var result = await AdminAPI.getCardKeys(cardKeyFilter.value);
        cardKeys.value = result.items;
        cardKeyTotal.value = result.total;
      } catch (e) {
        ElMsg.error('加载卡密失败');
      } finally {
        cardKeysLoading.value = false;
      }
    };

    var loadCardPrefixes = async function() {
      try {
        cardPrefixes.value = await AdminAPI.getCardPrefixes();
      } catch (e) { }
    };

    var openCardKeyModal = function() {
      cardKeyForm.value = { productId: '', mode: 'auto', prefix: '', count: 10, cdkText: '', manualKeys: '' };
      cardKeyModalVisible.value = true;
    };

    var openEditCDKModal = function(ck) {
      editingCDK.value = Object.assign({}, ck);
      editCDKModalVisible.value = true;
    };

    var handleCardKeySelectionChange = function(selection) {
      selectedCardKeyIds.value = selection.map(function(item) { return item.id; });
    };

    var handleGenerateCardKeys = async function() {
      var f = cardKeyForm.value;
      if (!f.productId) return ElMsg.warning('请选择商品');

      if (f.mode === 'manual') {
        var keys = f.manualKeys.trim().split('\n').map(function(s) { return s.trim(); }).filter(Boolean);
        if (keys.length === 0) return ElMsg.warning('请输入至少一个卡密');

        var cdkList = [];
        if (f.cdkText.trim()) {
          cdkList = f.cdkText.trim().split('\n').map(function(s) { return s.trim(); }).filter(Boolean);
        }

        saving.value = true;
        try {
          var result = await AdminAPI.manualAddCardKeys({ productId: f.productId, keys: keys, cdkList: cdkList });
          ElMsg.success('成功添加 ' + result.length + ' 个卡密');
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

        var cdkList2 = [];
        if (f.cdkText.trim()) {
          cdkList2 = f.cdkText.trim().split('\n').map(function(s) { return s.trim(); }).filter(Boolean);
        }

        saving.value = true;
        try {
          var result2 = await AdminAPI.generateCardKeys({ productId: f.productId, prefix: f.prefix, count: f.count, cdkList: cdkList2 });
          ElMsg.success('成功生成 ' + result2.length + ' 个卡密');
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

    var handleSaveCDK = async function() {
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

    var handleDeleteCardKey = async function(id) {
      if (!await confirmAction('确定要删除该卡密吗？')) return;
      try {
        await AdminAPI.deleteCardKey(id);
        ElMsg.success('删除成功');
        loadCardKeys();
      } catch (e) {
        ElMsg.error('删除失败');
      }
    };

    var handleBatchDeleteCardKeys = async function() {
      if (selectedCardKeyIds.value.length === 0) return;
      var msg = '确定要删除选中的 ' + selectedCardKeyIds.value.length + ' 条卡密吗？此操作不可恢复！';
      if (!await confirmAction(msg)) return;
      try {
        var res = await AdminAPI.batchDeleteCardKeys(selectedCardKeyIds.value);
        ElMsg.success(res.message || '删除成功');
        selectedCardKeyIds.value = [];
        loadCardKeys();
        loadStats();
      } catch (e) {
        ElMsg.error(e.message || '批量删除失败');
      }
    };

    var cardStatusType = function(s) {
      var map = { unused: 'success', used: 'info', expired: 'danger' };
      return map[s] || 'info';
    };
    var cardStatusLabel = function(s) {
      var map = { unused: '未使用', used: '已使用', expired: '已过期' };
      return map[s] || s;
    };

    // ===== 订单管理 =====
    var orders = ref([]);
    var ordersLoading = ref(false);
    var orderTotal = ref(0);
    var orderFilter = ref({ status: '', page: 1, pageSize: 20 });

    var loadOrders = async function() {
      ordersLoading.value = true;
      try {
        var result = await AdminAPI.getOrders(orderFilter.value);
        orders.value = result.items;
        orderTotal.value = result.total;
      } catch (e) {
        ElMsg.error('加载订单失败');
      } finally {
        ordersLoading.value = false;
      }
    };

    var handleDeleteOrder = async function(id) {
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

    var orderStatusType = function(s) {
      var map = { pending: 'warning', completed: 'success', failed: 'danger' };
      return map[s] || 'info';
    };
    var orderStatusLabel = function(s) {
      var map = { pending: '待处理', completed: '已完成', failed: '失败' };
      return map[s] || s;
    };

    // ===== 用户管理 =====
    var users = ref([]);
    var usersLoading = ref(false);

    var loadUsers = async function() {
      usersLoading.value = true;
      try {
        users.value = await AdminAPI.getUsers();
      } catch (e) {
        ElMsg.error('加载用户失败');
      } finally {
        usersLoading.value = false;
      }
    };

    var handleToggleUser = async function(id) {
      try {
        await AdminAPI.toggleUserActive(id);
        ElMsg.success('操作成功');
        loadUsers();
      } catch (e) {
        ElMsg.error(e.message);
      }
    };

    var handleDeleteUser = async function(id) {
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
    var admins = ref([]);
    var adminsLoading = ref(false);
    var adminModalVisible = ref(false);
    var adminForm = ref({ username: '', password: '', nickname: '', role: 'admin' });

    var loadAdmins = async function() {
      adminsLoading.value = true;
      try {
        admins.value = await AdminAPI.getAdmins();
      } catch (e) {
        ElMsg.error('加载管理员列表失败');
      } finally {
        adminsLoading.value = false;
      }
    };

    var openAdminModal = function() {
      adminForm.value = { username: '', password: '', nickname: '', role: 'admin' };
      adminModalVisible.value = true;
    };

    var handleCreateAdmin = async function() {
      var f = adminForm.value;
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

    var handleDeleteAdmin = async function(id, role) {
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
    var smsRecords = ref([]);
    var smsRecordTotal = ref(0);
    var smsRecordLoading = ref(false);
    var smsRecordFilter = ref({ status: '', phone: '', keyword: '', source: '', page: 1, pageSize: 20 });

    var loadSmsRecords = async function() {
      smsRecordLoading.value = true;
      try {
        var result = await AdminAPI.getSmsRecords(smsRecordFilter.value);
        smsRecords.value = result.items;
        smsRecordTotal.value = result.total;
      } catch (e) {
        ElMsg.error('加载接码记录失败');
      } finally {
        smsRecordLoading.value = false;
      }
    };

    var smsStatusType = function(s) {
      var map = { active: 'primary', completed: 'success', released: 'info', blocked: 'danger' };
      return map[s] || 'info';
    };
    var smsStatusLabel = function(s) {
      var map = { active: '使用中', completed: '已完成', released: '已释放', blocked: '已拉黑' };
      return map[s] || s;
    };
    var smsSourceLabel = function(s) {
      var map = { free: '免费接码', iscode: 'isCode商品' };
      return map[s] || s || '免费接码';
    };
    var smsSourceType = function(s) {
      var map = { free: 'info', iscode: 'success' };
      return map[s] || 'info';
    };

    // ===== 修改密码 =====
    var showPasswordModal = ref(false);
    var passwordForm = ref({ oldPassword: '', newPassword: '', confirmPassword: '' });

    var handleChangePassword = async function() {
      var f = passwordForm.value;
      if (!f.oldPassword) return ElMsg.warning('请输入原密码');
      if (!f.newPassword || f.newPassword.length < 6) return ElMsg.warning('新密码至少6位');
      if (f.newPassword !== f.confirmPassword) return ElMsg.warning('两次密码不一致');

      saving.value = true;
      try {
        await AdminAPI.changePassword(f.oldPassword, f.newPassword);
        ElMsg.success('密码修改成功，请重新登录');
        showPasswordModal.value = false;
        setTimeout(function() { logout(); }, 1000);
      } catch (e) {
        ElMsg.error(e.message);
      } finally {
        saving.value = false;
      }
    };

    // ===== 通用 =====
    // Element 版本跳转到 Element 登录页
    var ELEMENT_LOGIN = '/admin/login-element';

    var logout = function() {
      AdminAPI.clearToken();
      window.location.href = ELEMENT_LOGIN;
    };

    // 页面切换时加载数据
    watch(currentPage, function(page) {
      if (page === 'dashboard') loadStats();
      else if (page === 'products') loadProducts();
      else if (page === 'cardkeys') { loadProducts(); loadCardKeys(); loadCardPrefixes(); }
      else if (page === 'orders') loadOrders();
      else if (page === 'users') loadUsers();
      else if (page === 'admins') loadAdmins();
      else if (page === 'smsrecords') loadSmsRecords();
    });

    onMounted(async function() {
      var token = AdminAPI.getToken();
      if (!token) {
        window.location.href = ELEMENT_LOGIN;
        return;
      }
      try {
        var admin = await AdminAPI.check();
        AdminAPI.setAdminInfo(admin);
      } catch (e) {
        AdminAPI.clearToken();
        window.location.href = ELEMENT_LOGIN;
        return;
      }
      adminInfo.value = AdminAPI.getAdminInfo();
      await loadStats();
      pageLoading.value = false;
    });

    return {
      currentPage: currentPage,
      adminInfo: adminInfo,
      saving: saving,
      pageLoading: pageLoading,
      isCollapsed: isCollapsed,
      openMenus: openMenus,
      pageTitle: pageTitle,
      handleMenuSelect: handleMenuSelect,
      refreshCurrentPage: refreshCurrentPage,
      logout: logout,
      formatDate: formatDate,
      userName: userName,
      userInitial: userInitial,
      getProductName: getProductName,
      getProductLabel: getProductLabel,
      getProductTypeTag: getProductTypeTag,
      handleHeaderCommand: handleHeaderCommand,
      // 仪表盘
      stats: stats,
      statCards: statCards,
      // 商品
      products: products,
      productsLoading: productsLoading,
      productModalVisible: productModalVisible,
      editingProduct: editingProduct,
      loadProducts: loadProducts,
      openProductModal: openProductModal,
      handleSaveProduct: handleSaveProduct,
      handleDeleteProduct: handleDeleteProduct,
      productTypeLabel: productTypeLabel,
      // 卡密
      cardKeys: cardKeys,
      cardKeysLoading: cardKeysLoading,
      cardKeyTotal: cardKeyTotal,
      cardKeyFilter: cardKeyFilter,
      cardKeyModalVisible: cardKeyModalVisible,
      cardKeyForm: cardKeyForm,
      cardPrefixes: cardPrefixes,
      prefixList: prefixList,
      manualKeyCount: manualKeyCount,
      editCDKModalVisible: editCDKModalVisible,
      editingCDK: editingCDK,
      selectedCardKeyIds: selectedCardKeyIds,
      loadCardKeys: loadCardKeys,
      openCardKeyModal: openCardKeyModal,
      openEditCDKModal: openEditCDKModal,
      handleGenerateCardKeys: handleGenerateCardKeys,
      handleSaveCDK: handleSaveCDK,
      handleDeleteCardKey: handleDeleteCardKey,
      handleCardKeySelectionChange: handleCardKeySelectionChange,
      handleBatchDeleteCardKeys: handleBatchDeleteCardKeys,
      cardStatusType: cardStatusType,
      cardStatusLabel: cardStatusLabel,
      // 订单
      orders: orders,
      ordersLoading: ordersLoading,
      orderTotal: orderTotal,
      orderFilter: orderFilter,
      loadOrders: loadOrders,
      handleDeleteOrder: handleDeleteOrder,
      orderStatusType: orderStatusType,
      orderStatusLabel: orderStatusLabel,
      // 用户
      users: users,
      usersLoading: usersLoading,
      loadUsers: loadUsers,
      handleToggleUser: handleToggleUser,
      handleDeleteUser: handleDeleteUser,
      // 管理员
      admins: admins,
      adminsLoading: adminsLoading,
      adminModalVisible: adminModalVisible,
      adminForm: adminForm,
      loadAdmins: loadAdmins,
      openAdminModal: openAdminModal,
      handleCreateAdmin: handleCreateAdmin,
      handleDeleteAdmin: handleDeleteAdmin,
      // 修改密码
      showPasswordModal: showPasswordModal,
      passwordForm: passwordForm,
      handleChangePassword: handleChangePassword,
      // 接码记录
      smsRecords: smsRecords,
      smsRecordTotal: smsRecordTotal,
      smsRecordLoading: smsRecordLoading,
      smsRecordFilter: smsRecordFilter,
      loadSmsRecords: loadSmsRecords,
      smsStatusType: smsStatusType,
      smsStatusLabel: smsStatusLabel,
      smsSourceLabel: smsSourceLabel,
      smsSourceType: smsSourceType,
      // 搜索图标（供 el-input :prefix-icon 使用）
      Search: ElementPlusIconsVue.Search,
    };
  },
});

// 注册 Element Plus
app.use(ElementPlus);

// 覆盖 401 跳转到 Element 版登录页
// 重新创建 axios 实例，替换默认拦截器
AdminAPI._http = null; // 清除旧实例
AdminAPI.getHttp = function() {
  if (!this._http) {
    this._http = axios.create({
      baseURL: '/api/admin',
      timeout: 15000,
    });
    var self = this;
    // 请求拦截器
    this._http.interceptors.request.use(function(config) {
      var token = self.getToken();
      if (token) {
        config.headers.Authorization = 'Bearer ' + token;
      }
      return config;
    });
    // 响应拦截器 - 401 跳转 Element 登录页
    this._http.interceptors.response.use(
      function(response) { return response.data; },
      function(error) {
        if (error.response) {
          var status = error.response.status;
          var data = error.response.data;
          if (status === 401) {
            self.clearToken();
            window.location.href = '/admin/login-element';
            throw new Error('登录已过期');
          }
          throw new Error((data && data.error) || '请求失败');
        }
        throw new Error('网络连接失败');
      }
    );
  }
  return this._http;
};

// 注册所有 Element Plus Icons
for (var key in ElementPlusIconsVue) {
  if (ElementPlusIconsVue.hasOwnProperty(key)) {
    app.component(key, ElementPlusIconsVue[key]);
  }
}

app.mount('#app');