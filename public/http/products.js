const productsApi = {
  list: () => http.get('/products'),
  get: (id) => http.get(`/products/${id}`),
  create: (data) => http.post('/products', data),
  update: (id, data) => http.put(`/products/${id}`, data),
  delete: (id) => http.delete(`/products/${id}`),
};
