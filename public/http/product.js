/**
 * 商品相关 API
 */

const productApi = {
  // 获取前台可见类别
  getCategories: () => http.get('/products/categories'),

  // 获取商品列表
  getList: () => http.get('/products'),

  // 获取商品详情
  getDetail: (id) => http.get(`/products/${id}`),
};

window.productApi = productApi;
