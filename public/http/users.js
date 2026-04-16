const usersApi = {
  list: () => http.get('/users'),
  get: (id) => http.get(`/users/${id}`),
  login: (email, password) => http.post('/users/login', { email, password }),
  register: (data) => http.post('/users/register', data),
  update: (id, data) => http.put(`/users/${id}`, data),
  delete: (id) => http.delete(`/users/${id}`),
};
