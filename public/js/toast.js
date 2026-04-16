/**
 * Toast 轻提示组件
 * 使用: Toast.success('成功') / Toast.error('失败') / Toast.info('提示') / Toast.warning('警告')
 */
(function() {
  'use strict';

  var container = null;

  // 创建容器
  function getContainer() {
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  // 图标 SVG
  var icons = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>'
  };

  // 显示 toast
  function show(message, type, duration) {
    type = type || 'info';
    duration = duration || 2000;

    var containerEl = getContainer();
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.innerHTML = '<span class="toast-icon">' + (icons[type] || icons.info) + '</span><span class="toast-message">' + message + '</span>';

    containerEl.appendChild(toast);

    // 强制重绘，触发动画
    toast.offsetHeight;
    toast.classList.add('toast-show');

    // 自动关闭
    setTimeout(function() {
      toast.classList.remove('toast-show');
      toast.classList.add('toast-hide');
      setTimeout(function() {
        toast.remove();
      }, 300);
    }, duration);
  }

  // 挂载到全局
  window.Toast = {
    success: function(msg, duration) { show(msg, 'success', duration); },
    error: function(msg, duration) { show(msg, 'error', duration); },
    info: function(msg, duration) { show(msg, 'info', duration); },
    warning: function(msg, duration) { show(msg, 'warning', duration); },
    show: show
  };

  // 注入样式 - 亮色主题
  var style = document.createElement('style');
  style.textContent = '.toast-container{position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:99999;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none}.toast{display:flex;align-items:center;gap:8px;padding:12px 20px;background:#fff;color:#1f2937;border-radius:8px;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,.08),0 0 0 1px rgba(0,0,0,.05);pointer-events:auto;transform:translateY(-20px) scale(.9);opacity:0;transition:all .3s cubic-bezier(.34,1.56,.64,1)}.toast-show{transform:translateY(0) scale(1);opacity:1}.toast-hide{transform:translateY(-10px) scale(.9);opacity:0}.toast-icon{width:18px;height:18px;flex-shrink:0;display:flex;align-items:center;justify-content:center}.toast-icon svg{width:100%;height:100%}.toast-success .toast-icon{color:#22c55e}.toast-error .toast-icon{color:#ef4444}.toast-info .toast-icon{color:#3b82f6}.toast-warning .toast-icon{color:#f59e0b}.toast-message{line-height:1.4;white-space:nowrap}@media(max-width:480px){.toast{padding:10px 16px;font-size:13px;max-width:calc(100vw - 40px)}.toast-icon{width:16px;height:16px}}';
  document.head.appendChild(style);
})();
