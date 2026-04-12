// 后台鉴权检查
const AdminAuth = {
  // 检查登录状态，未登录跳转到登录页
  async check() {
    const token = AdminAPI.getToken();
    if (!token) {
      window.location.href = '/admin/login';
      return false;
    }

    try {
      const admin = await AdminAPI.check();
      AdminAPI.setAdminInfo(admin);
      return true;
    } catch (e) {
      AdminAPI.clearToken();
      window.location.href = '/admin/login';
      return false;
    }
  },

  // 退出登录
  logout() {
    AdminAPI.clearToken();
    window.location.href = '/admin/login';
  },
};

// 格式化时间
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const pad = n => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 状态标签
function statusTag(status, type) {
  const map = {
    card: { unused: ['未使用', 'green'], used: ['已使用', 'gray'], expired: ['已过期', 'red'] },
    order: { pending: ['待处理', 'orange'], completed: ['已完成', 'green'], failed: ['失败', 'red'] },
  };
  const [label, color] = (map[type] && map[type][status]) || [status, 'gray'];
  return `<span class="tag tag-${color}">${label}</span>`;
}

// Toast 提示
const AdminToast = {
  show(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container') || (() => {
      const el = document.createElement('div');
      el.id = 'toast-container';
      el.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
      document.body.appendChild(el);
      return el;
    })();

    const colors = { success: '#22c55e', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };

    const toast = document.createElement('div');
    toast.style.cssText = `padding:12px 20px;border-radius:8px;background:${colors[type]};color:white;font-size:14px;display:flex;align-items:center;gap:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);animation:slideIn 0.3s ease;min-width:200px;`;
    toast.innerHTML = `<i class="fa-solid ${icons[type]}"></i><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },
  success(msg) { this.show(msg, 'success'); },
  error(msg) { this.show(msg, 'error'); },
  warning(msg) { this.show(msg, 'warning'); },
  info(msg) { this.show(msg, 'info'); },
};

// 确认对话框
function confirmAction(message) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9998;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
      <div style="background:white;border-radius:12px;padding:24px;max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
        <div style="font-size:16px;font-weight:600;margin-bottom:12px;color:#1f2937;">确认操作</div>
        <div style="font-size:14px;color:#6b7280;margin-bottom:20px;line-height:1.5;">${message}</div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button id="confirm-cancel" style="padding:8px 16px;border:1px solid #d1d5db;border-radius:6px;background:white;cursor:pointer;font-size:13px;color:#6b7280;">取消</button>
          <button id="confirm-ok" style="padding:8px 16px;border:none;border-radius:6px;background:#ef4444;color:white;cursor:pointer;font-size:13px;font-weight:600;">确定</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#confirm-cancel').onclick = () => { overlay.remove(); resolve(false); };
    overlay.querySelector('#confirm-ok').onclick = () => { overlay.remove(); resolve(true); };
  });
}
