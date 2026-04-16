/**
 * ConfirmDialog 确认弹窗组件
 * 使用: const ok = await ConfirmDialog.show('确定要执行此操作吗？');
 */
(function () {
  'use strict';

  // 每次弹窗独立的状态，避免全局变量竞争
  function createConfirmDialog(message) {
    return new Promise(function (resolve) {
      try {
        var overlay = null;

        function cleanup() {
          if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
          overlay = null;
        }

        function close(result) {
          if (!overlay) return;
          // 先 resolve，再做清理动画
          resolve(result);
          // 防止重复调用
          overlay = null;

          // 执行关闭动画
          var overlayEl = document.querySelector('.confirm-overlay:last-of-type');
          if (overlayEl) {
            overlayEl.classList.remove('confirm-overlay-show');
            var dialogEl = overlayEl.querySelector('.confirm-dialog');
            if (dialogEl) dialogEl.classList.remove('confirm-dialog-show');
            overlayEl.classList.add('confirm-overlay-hide');
            setTimeout(function () {
              if (overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
            }, 200);
          }
        }

        // 检查 document.body 是否存在
        if (!document.body) {
          console.error('[ConfirmDialog] document.body 不存在');
          resolve(false);
          return;
        }

        // 创建 DOM
        overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';

        var dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';

        var iconWrap = document.createElement('div');
        iconWrap.className = 'confirm-icon';
        iconWrap.innerHTML = '<i class="fa-solid fa-circle-question"></i>';

        var msgWrap = document.createElement('div');
        msgWrap.className = 'confirm-message';
        msgWrap.textContent = message;

        var btnGroup = document.createElement('div');
        btnGroup.className = 'confirm-btn-group';

        var cancelBtn = document.createElement('button');
        cancelBtn.className = 'confirm-btn confirm-btn-cancel';
        cancelBtn.textContent = '取消';

        var okBtn = document.createElement('button');
        okBtn.className = 'confirm-btn confirm-btn-ok';
        okBtn.textContent = '确定';

        btnGroup.appendChild(cancelBtn);
        btnGroup.appendChild(okBtn);

        dialog.appendChild(iconWrap);
        dialog.appendChild(msgWrap);
        dialog.appendChild(btnGroup);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // 强制重绘触发动画
        overlay.offsetHeight;
        overlay.classList.add('confirm-overlay-show');
        dialog.classList.add('confirm-dialog-show');

        // 绑定事件
        cancelBtn.addEventListener('click', function () {
          close(false);
        });
        okBtn.addEventListener('click', function () {
          close(true);
        });
        overlay.addEventListener('click', function (e) {
          if (e.target === overlay) {
            close(false);
          }
        });

        // ESC 关闭
        var escHandler = function (e) {
          if (e.key === 'Escape') {
            close(false);
            document.removeEventListener('keydown', escHandler);
          }
        };
        document.addEventListener('keydown', escHandler);
      } catch (err) {
        console.error('[ConfirmDialog] 创建弹窗失败:', err);
        resolve(false);
      }
    });
  }

  // 注入样式（只注入一次）
  if (!document.getElementById('confirm-dialog-style')) {
    var style = document.createElement('style');
    style.id = 'confirm-dialog-style';
    style.textContent = '.confirm-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:10000;opacity:0;transition:opacity .2s ease}.confirm-overlay-show{opacity:1}.confirm-overlay-hide{opacity:0}.confirm-dialog{background:#fff;border-radius:16px;width:90%;max-width:340px;padding:28px 24px 20px;box-shadow:0 20px 40px rgba(0,0,0,.15);transform:scale(.9) translateY(10px);opacity:0;transition:all .25s cubic-bezier(.34,1.56,.64,1)}.confirm-dialog-show{transform:scale(1) translateY(0);opacity:1}.confirm-icon{text-align:center;font-size:40px;color:#1677ff;margin-bottom:16px}.confirm-message{text-align:center;font-size:15px;font-weight:500;color:#1f1f1f;line-height:1.6;margin-bottom:24px}.confirm-btn-group{display:flex;gap:10px}.confirm-btn{flex:1;padding:10px 0;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;border:none;transition:all .2s}.confirm-btn-cancel{background:#f1f5f9;color:#64748b}.confirm-btn-cancel:hover{background:#e2e8f0}.confirm-btn-ok{background:#1677ff;color:#fff;box-shadow:0 4px 12px rgba(22,119,255,.25)}.confirm-btn-ok:hover{background:#4096ff;transform:translateY(-1px)}.confirm-btn-ok:active{transform:translateY(0)}@media(max-width:480px){.confirm-dialog{padding:24px 20px 16px;max-width:300px}.confirm-icon{font-size:36px;margin-bottom:12px}.confirm-message{font-size:14px;margin-bottom:20px}}';
    document.head.appendChild(style);
  }

  // 挂载到全局
  window.ConfirmDialog = {
    show: function (message) {
      return createConfirmDialog(message);
    }
  };
})();
