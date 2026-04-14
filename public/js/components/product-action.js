/**
 * product-action 组件 — 商品购买操作面板
 *
 * Props:
 *   product  Object   商品对象（必须包含 id, name, price, isCode）
 *
 * Events:
 *   @success  成功完成（兑换/支付+接码）
 *
 * 依赖:
 *   - Vue 3 (CDN)
 *   - http (api.js 封装的 axios 实例，自动带 cookie)
 *   - QRCode (CDN: cdn.jsdelivr.net/npm/qrcode)
 *   - Toast (toast.js)
 *   - Font Awesome 图标
 */
function registerProductAction(app) {
  app.component('product-action', {
    props: {
      product: { type: Object, required: true },
    },
    template: `
      <div class="purchase-card" v-if="!actionResult">
        <div class="card-header">
          <i class="fa-solid fa-bag-shopping"></i>
          <span>购买方式</span>
        </div>
        <div class="card-body">
          <!-- 联系方式 -->
          <div class="contact-field">
            <label class="field-label">
              <i class="fa-solid fa-phone"></i> 联系方式
              <span class="field-hint">用于订单查询，请妥善填写</span>
            </label>
            <input type="text" class="form-input" v-model="contact" placeholder="手机号 / QQ / 邮箱">
          </div>

          <!-- 方式切换 -->
          <div class="method-tabs">
            <div class="method-tab" :class="{ active: payMethod === 'alipay' }" @click="payMethod = 'alipay'">
              <i class="fa-brands fa-alipay"></i>
              <span>支付宝购买</span>
              <span class="recommend-tag">推荐</span>
            </div>
            <div class="method-tab" :class="{ active: payMethod === 'card' }" @click="payMethod = 'card'">
              <i class="fa-solid fa-key"></i>
              <span>卡密兑换</span>
            </div>
          </div>

          <!-- 支付宝购买区域 -->
          <div class="method-content" v-if="payMethod === 'alipay'">
            <div class="alipay-info">
              <i class="fa-brands fa-alipay"></i>
              <span>扫码支付，自动发放{{ product.isCode ? '登录号码' : '兑换码' }}</span>
            </div>
            <button class="btn btn-alipay" @click="startAlipayPay" :disabled="payLoading">
              <i class="fa-solid fa-spinner fa-spin" v-if="payLoading"></i>
              <i class="fa-brands fa-alipay" v-else></i>
              立即购买 ¥{{ product.price }}
            </button>
          </div>

          <!-- 卡密兑换区域 -->
          <div class="method-content" v-if="payMethod === 'card'">
            <div class="input-group">
              <input type="text" class="form-input" v-model="redeemCode" placeholder="请输入卡密"
                @keyup.enter="handleRedeem">
              <button class="btn btn-primary" @click="handleRedeem" :disabled="redeeming">
                <i class="fa-solid fa-check" v-if="!redeeming"></i>
                <i class="fa-solid fa-spinner fa-spin" v-else></i>
                {{ redeeming ? '兑换中' : '兑换' }}
              </button>
            </div>
            <a href="https://68n.cn/xZSmW" target="_blank" class="buy-link">
              <i class="fa-solid fa-shopping-cart"></i>
              没有卡密？点击购买
            </a>
          </div>
        </div>

        <!-- 支付宝二维码弹窗 -->
        <div class="pay-modal-overlay" v-if="showQrModal" @click.self="closeQrModal">
          <div class="pay-modal">
            <div class="pay-modal-header">
              <span><i class="fa-brands fa-alipay"></i> 支付宝扫码支付</span>
              <button class="pay-modal-close" @click="closeQrModal"><i class="fa-solid fa-xmark"></i></button>
            </div>

            <!-- 加载中 -->
            <div class="pay-modal-body" v-if="qrLoading">
              <div class="pay-loading">
                <i class="fa-solid fa-circle-notch"></i>
                <p>正在创建支付订单...</p>
              </div>
            </div>

            <!-- 错误 -->
            <div class="pay-modal-body" v-else-if="qrError">
              <div class="pay-error">
                <i class="fa-solid fa-circle-xmark"></i>
                <p>{{ qrError }}</p>
                <button class="btn btn-primary" @click="closeQrModal">关闭</button>
              </div>
            </div>

            <!-- 二维码 -->
            <div class="pay-modal-body" v-else-if="payStatus !== 'paid'">
              <div class="pay-product-info">
                <span class="pay-product-name">{{ product.name }}</span>
                <span class="pay-product-amount">¥{{ payAmount }}</span>
              </div>
              <div class="pay-qr">
                <div class="qr-canvas-wrap">
                  <img v-if="qrImageUrl" :src="qrImageUrl" alt="支付宝二维码" style="width:200px;height:200px;" />
                </div>
                <div class="pay-qr-tip">二维码30分钟内有效，请尽快支付</div>
                <div class="pay-countdown" :class="{ expired: countdown <= 0 }">
                  <template v-if="countdown > 0">
                    <i class="fa-solid fa-clock"></i> 剩余 {{ countdownText }}
                  </template>
                  <template v-else>
                    <i class="fa-solid fa-clock"></i> 二维码已过期
                  </template>
                </div>
              </div>
            </div>

            <!-- 支付成功 -->
            <div class="pay-modal-body" v-else>
              <div class="pay-success">
                <div class="pay-success-icon">
                  <i class="fa-solid fa-check"></i>
                </div>
                <div class="pay-success-title">支付成功</div>
                <div class="pay-success-desc" v-if="product.isCode">
                  <i class="fa-solid fa-spinner fa-spin"></i> 正在加载接码流程...
                </div>
                <div class="pay-success-desc" v-else>{{ product.name }}</div>

                <!-- isCode=0: 显示CDK -->
                <template v-if="!product.isCode">
                  <div class="cdk-card" v-if="cdKey">
                    <div class="cdk-card-label">
                      <i class="fa-solid fa-key"></i> 兑换码 (CDK)
                    </div>
                    <div class="cdk-card-value">
                      <input type="text" :value="cdKey" readonly>
                      <button class="btn-copy" @click="copyText(cdKey, '兑换码已复制')">
                        <i class="fa-solid fa-copy"></i> 复制
                      </button>
                    </div>
                    <button class="cdk-go-btn" @click="goToRedeem">
                      <i class="fa-solid fa-arrow-up-right-from-square"></i> 前往兑换
                    </button>
                  </div>
                  <div class="no-cdk" v-else>
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <p>兑换码暂时缺货，请联系客服获取</p>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 兑换成功（卡密兑换 isCode=0 的情况） -->
      <div class="success-card" v-else-if="actionResult && !product.isCode">
        <div class="success-header">
          <div class="success-icon">
            <i class="fa-solid fa-circle-check"></i>
          </div>
          <h3 class="success-title">{{ actionResult.type === 'alipay' ? '支付成功' : '兑换成功' }}</h3>
          <p class="success-desc">请复制兑换码前往网站完成兑换</p>
        </div>
        <div class="cdk-box">
          <div class="cdk-label">兑换码 (CDK)</div>
          <div class="cdk-row">
            <input type="text" class="cdk-input" :value="actionResult.CDK" readonly>
            <button class="btn btn-primary btn-copy" @click="copyText(actionResult.CDK, '兑换码已复制')">
              <i class="fa-solid fa-copy"></i> 复制
            </button>
          </div>
        </div>
        <div class="success-actions">
          <button class="btn btn-primary btn-go" @click="goToRedeem">
            <i class="fa-solid fa-arrow-up-right-from-square"></i> 前往兑换
          </button>
          <div class="redeem-url-box">
            <input type="text" class="redeem-url-input" :value="product.addr || 'https://aisub.vip/'" readonly>
            <button class="btn btn-ghost btn-copy-url" @click="copyText(product.addr || 'https://aisub.vip/', '网址已复制')">
              <i class="fa-solid fa-copy"></i> 复制网址
            </button>
          </div>
          <p class="success-tip">
            <i class="fa-solid fa-info-circle"></i>
            若无法跳转，请复制网址到浏览器打开，兑换码仅可使用一次
          </p>
        </div>
      </div>

      <!-- 成功 + isCode=1: 显示号码+接码（支付宝或卡密兑换） -->
      <div class="success-card" v-else-if="actionResult && product.isCode">
        <div class="success-header">
          <div class="success-icon">
            <i class="fa-solid fa-circle-check"></i>
          </div>
          <h3 class="success-title">{{ actionResult.type === 'alipay' ? '支付成功' : '兑换成功' }}</h3>
          <p class="success-desc">请使用登录号码进行接码登录</p>
        </div>

        <div class="cdk-box">
          <div class="cdk-label">登录号码</div>
          <div class="cdk-row">
            <input type="text" class="cdk-input" :value="actionResult.CDK" readonly>
            <button class="btn btn-primary btn-copy" @click="copyText(actionResult.CDK, '号码已复制')">
              <i class="fa-solid fa-copy"></i> 复制
            </button>
          </div>
        </div>

        <!-- 接码区域 -->
        <div class="sms-section" style="margin-top:12px;">
          <div class="sms-section-header">
            <i class="fa-solid fa-message"></i> 接码登录
          </div>

          <!-- 显示号码 -->
          <div class="sms-phone-display" style="margin-bottom:12px;">
            <span style="font-size:12px;color:#666;margin-right:6px;">号码</span>
            <span class="sms-phone-number">{{ actionResult.CDK }}</span>
          </div>

          <!-- 未获取验证码 -->
          <div class="sms-step" v-if="!smsCode">
            <button class="btn btn-primary sms-btn" @click="getSmsCode" :disabled="smsLoading || needSmsPayment">
              <i class="fa-solid fa-spinner fa-spin" v-if="smsLoading"></i>
              <i class="fa-solid fa-paper-plane" v-else></i>
              {{ smsLoading ? '获取中...' : '获取验证码' }}
            </button>
            <p class="sms-step-desc" style="margin-top:8px;" v-if="smsError">
              <i class="fa-solid fa-circle-exclamation" style="color:#ff4d4f;margin-right:4px;"></i>
              {{ smsError }}
            </p>
            <!-- 需要支付接码服务费时显示支付按钮 -->
            <button class="btn btn-alipay sms-btn" style="margin-top:8px;width:100%;" v-if="needSmsPayment" @click="startSmsServicePay" :disabled="smsQrLoading">
              <i class="fa-brands fa-alipay"></i>
              支付接码服务费 ¥{{ product.smsPrice || '0.01' }}
            </button>
          </div>

          <!-- 接码成功 -->
          <div class="sms-step sms-step-success" v-else>
            <div class="cdk-card">
              <div class="cdk-card-label">
                <i class="fa-solid fa-lock-open"></i> 验证码
              </div>
              <div class="cdk-card-value">
                <input type="text" :value="smsCode" readonly>
                <button class="btn-copy" @click="copyText(smsCode, '验证码已复制')">
                  <i class="fa-solid fa-copy"></i> 复制
                </button>
              </div>
            </div>
            <p class="sms-step-tip">
              <i class="fa-solid fa-circle-check"></i> 接码成功，请使用号码和验证码登录
            </p>
          </div>
        </div>

        <!-- 接码服务支付弹窗 -->
        <div class="pay-modal-overlay" v-if="showSmsPayModal" @click.self="closeSmsPayModal">
          <div class="pay-modal">
            <div class="pay-modal-header">
              <span><i class="fa-brands fa-alipay"></i> 支付接码服务费</span>
              <button class="pay-modal-close" @click="closeSmsPayModal"><i class="fa-solid fa-xmark"></i></button>
            </div>

            <!-- 加载中 -->
            <div class="pay-modal-body" v-if="smsQrLoading">
              <div class="pay-loading">
                <i class="fa-solid fa-circle-notch"></i>
                <p>正在创建支付订单...</p>
              </div>
            </div>

            <!-- 错误 -->
            <div class="pay-modal-body" v-else-if="smsQrError">
              <div class="pay-error">
                <i class="fa-solid fa-circle-xmark"></i>
                <p>{{ smsQrError }}</p>
                <button class="btn btn-primary" @click="closeSmsPayModal">关闭</button>
              </div>
            </div>

            <!-- 二维码 -->
            <div class="pay-modal-body" v-else-if="smsPayStatus !== 'paid'">
              <div class="pay-product-info">
                <span class="pay-product-name">接码服务费</span>
                <span class="pay-product-amount">¥{{ smsPayAmount }}</span>
              </div>
              <div class="pay-qr">
                <div class="qr-canvas-wrap">
                  <img v-if="smsQrImageUrl" :src="smsQrImageUrl" alt="支付宝二维码" style="width:200px;height:200px;" />
                </div>
                <div class="pay-qr-tip">扫码支付后即可接码</div>
              </div>
            </div>

            <!-- 支付成功 -->
            <div class="pay-modal-body" v-else>
              <div class="pay-success">
                <div class="pay-success-icon">
                  <i class="fa-solid fa-check"></i>
                </div>
                <div class="pay-success-title">支付成功</div>
                <div class="pay-success-desc">正在获取验证码...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `,
    setup(props, { emit }) {
      const { ref, computed, onUnmounted, watch } = Vue;
      // --- 基础状态 ---
      const contact = ref(localStorage.getItem('lastContact') || '');
      const payMethod = ref('alipay');

      // 已登录时自动填入用户名作为联系方式
      const checkAndPrefillContact = async () => {
        const raw = localStorage.getItem('user');
        const user = raw && raw !== 'undefined' ? JSON.parse(raw) : null;
        if (user) {
          try {
            const res = await userApi.getMe();
            if (res && !contact.value.trim()) {
              contact.value = res.username;
              localStorage.setItem('lastContact', res.username);
            }
          } catch (e) { /* 未登录，不影响 */ }
        }
      };
      checkAndPrefillContact();
      const redeemCode = ref('');
      const redeeming = ref(false);
      const actionResult = ref(null); // { type: 'redeem'|'alipay', CDK, ... }

      // --- 支付宝弹窗状态 ---
      const showQrModal = ref(false);
      const qrLoading = ref(false);
      const qrError = ref('');
      const qrImageUrl = ref('');
      const payAmount = ref('');
      const payStatus = ref('pending'); // pending / paid / expired
      const orderNo = ref('');
      const cdKey = ref('');
      const countdown = ref(0);
      const payLoading = ref(false);

      let pollTimer = null;
      let countdownTimer = null;

      // --- 接码状态 ---
      const smsCode = ref('');
      const smsLoading = ref(false);
      const smsError = ref('');
      const needSmsPayment = ref(false); // 需要支付接码服务费

      // --- 接码服务支付弹窗状态 ---
      const showSmsPayModal = ref(false);
      const smsQrLoading = ref(false);
      const smsQrError = ref('');
      const smsQrImageUrl = ref('');
      const smsPayAmount = ref('');
      const smsPayStatus = ref('pending');
      const smsOrderNo = ref('');

      let smsPollTimer = null;

      // --- 倒计时文本 ---
      const countdownText = computed(() => {
        const m = Math.floor(countdown.value / 60);
        const s = countdown.value % 60;
        return `${m}分${s.toString().padStart(2, '0')}秒`;
      });

      // --- 卡密兑换 ---
      const handleRedeem = async () => {
        if (!contact.value.trim()) {
          Toast.warning('请先填写联系方式');
          return;
        }
        if (!redeemCode.value.trim()) {
          Toast.warning('请输入卡密');
          return;
        }
        redeeming.value = true;
        try {
          const response = await pickupApi.redeem(redeemCode.value.trim(), props.product.id, contact.value.trim());
          localStorage.setItem('lastContact', contact.value.trim());
          actionResult.value = { type: 'redeem', CDK: response.CDK, cardKeyId: response.id };

          Toast.success('兑换成功！');
          emit('success', actionResult.value);
        } catch (err) {
          Toast.error(err.response?.data?.error || '兑换失败');
        } finally {
          redeeming.value = false;
        }
      };

      // --- 支付宝支付 ---
      const startAlipayPay = async () => {
        if (!contact.value.trim()) {
          Toast.warning('请先填写联系方式');
          return;
        }
        localStorage.setItem('lastContact', contact.value.trim());
        payLoading.value = true;
        showQrModal.value = true;
        qrLoading.value = true;
        qrError.value = '';
        payStatus.value = 'pending';
        cdKey.value = '';
        qrImageUrl.value = '';

        try {
          const res = await paymentApi.create(props.product.id, contact.value.trim());
          orderNo.value = res.orderNo;
          payAmount.value = res.amount;

          // 生成二维码图片
          await generateQR(res.qrCode);

          // 设置倒计时
          const expiredAt = new Date(res.expiredAt);
          countdown.value = Math.max(0, Math.floor((expiredAt - Date.now()) / 1000));
          startCountdown();
          startPolling();
        } catch (err) {
          console.error('[Payment/Create] Error:', err);
          qrError.value = err.response?.data?.error || err.message || '创建支付订单失败';
        } finally {
          qrLoading.value = false;
          payLoading.value = false;
        }
      };

      // 生成二维码
      const generateQR = (text) => {
        return new Promise((resolve) => {
          QRCode.toDataURL(text, {
            width: 200,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' }
          }, function (err, url) {
            if (err) {
              console.error('二维码生成失败:', err);
              resolve(false);
            } else {
              qrImageUrl.value = url;
              resolve(true);
            }
          });
        });
      };

      // 轮询支付状态
      const startPolling = () => {
        stopPolling();
        pollTimer = setInterval(async () => {
          if (!orderNo.value || payStatus.value === 'paid') return;
          try {
            const res = await paymentApi.getStatus(orderNo.value);
            if (res.status === 'paid') {
              payStatus.value = 'paid';
              cdKey.value = res.cdKey;
              stopPolling();
              Toast.success('支付成功！');

              // 设置 actionResult，让主界面切换到结果视图
              actionResult.value = { type: 'alipay', CDK: res.cdKey, cardKeyId: res.cardKeyId || null };

              // 关闭弹窗，在主界面显示结果/接码
              setTimeout(() => {
                showQrModal.value = false;
                if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
              }, 800);
            }
          } catch (e) {
            // 静默
          }
        }, 3000);
      };

      const stopPolling = () => {
        if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      };

      // 倒计时
      const startCountdown = () => {
        if (countdownTimer) clearInterval(countdownTimer);
        countdownTimer = setInterval(() => {
          if (countdown.value > 0) {
            countdown.value--;
            if (countdown.value <= 0) {
              payStatus.value = 'expired';
              stopPolling();
            }
          }
        }, 1000);
      };

      // 关闭弹窗
      const closeQrModal = () => {
        showQrModal.value = false;
        stopPolling();
        if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
      };

      // --- 接码逻辑 ---
      // 检查号码是否已有接码记录（非首次登录，isCode 专用接口）
      const checkPhoneRecord = async (phone, cardKeyId) => {
        try {
          const res = await pickupApi.iscodeCheckStatus(phone, cardKeyId || undefined);
          isRepeatPhone.value = res.exists;
        } catch (e) {
          // 静默，不影响流程
        }
      };

      // isCode=1 时，号码已固定为 CDK，通过 isCode 专用接口获取验证码
      const getSmsCode = async () => {
        smsLoading.value = true;
        smsError.value = '';
        try {
          const res = await pickupApi.iscodeGetVerifyCode(
            actionResult.value.CDK,
            props.product.smKeyWord || '',
            actionResult.value.cardKeyId || null,
            props.product.id,
          );
          if (res.received && res.code) {
            smsCode.value = res.code;
            needSmsPayment.value = false;
            Toast.success('验证码已获取！');
            emit('success', { type: 'sms', phone: actionResult.value.CDK, code: smsCode.value });
          } else {
            smsError.value = '暂未收到验证码，请稍后重试';
          }
        } catch (err) {
          const errMsg = err.response?.data?.error || '获取验证码失败';
          if (errMsg === 'NEED_PURCHASE') {
            // 需要支付接码服务费
            smsError.value = '本次接码需要支付服务费，请点击下方按钮完成支付';
            needSmsPayment.value = true;
          } else {
            smsError.value = errMsg;
          }
        } finally {
          smsLoading.value = false;
        }
      };

      // --- 接码服务支付流程 ---
      const startSmsServicePay = async () => {
        needSmsPayment.value = false;
        smsError.value = '';
        if (!contact.value.trim()) {
          Toast.warning('请先填写联系方式');
          return;
        }
        if (!actionResult.value.cardKeyId) {
          Toast.error('缺少卡密信息，无法创建接码订单');
          return;
        }

        showSmsPayModal.value = true;
        smsQrLoading.value = true;
        smsQrError.value = '';
        smsPayStatus.value = 'pending';
        smsQrImageUrl.value = '';

        try {
          const smsPrice = props.product.smsPrice || 0.01;
          const res = await paymentApi.createSms(
            actionResult.value.cardKeyId,
            props.product.id,
            smsPrice,
            contact.value.trim(),
          );
          smsOrderNo.value = res.orderNo;
          smsPayAmount.value = res.amount;

          // 生成二维码
          await new Promise((resolve) => {
            QRCode.toDataURL(res.qrCode, {
              width: 200, margin: 2,
              color: { dark: '#000000', light: '#ffffff' },
            }, function (err, url) {
              if (err) { console.error('二维码生成失败:', err); resolve(false); }
              else { smsQrImageUrl.value = url; resolve(true); }
            });
          });

          // 开始轮询
          startSmsPolling();
        } catch (err) {
          smsQrError.value = err.response?.data?.error || err.message || '创建支付订单失败';
        } finally {
          smsQrLoading.value = false;
        }
      };

      const startSmsPolling = () => {
        stopSmsPolling();
        smsPollTimer = setInterval(async () => {
          if (!smsOrderNo.value || smsPayStatus.value === 'paid') return;
          try {
            const res = await paymentApi.getStatus(smsOrderNo.value);
            if (res.status === 'paid') {
              smsPayStatus.value = 'paid';
              stopSmsPolling();
              Toast.success('接码服务费支付成功！');

              // 关闭弹窗，自动获取验证码
              setTimeout(async () => {
                showSmsPayModal.value = false;
                // 自动获取验证码
                await getSmsCode();
              }, 800);
            }
          } catch (e) { /* 静默 */ }
        }, 3000);
      };

      const stopSmsPolling = () => {
        if (smsPollTimer) { clearInterval(smsPollTimer); smsPollTimer = null; }
      };

      const closeSmsPayModal = () => {
        showSmsPayModal.value = false;
        stopSmsPolling();
      };

      // --- 工具方法 ---
      const copyText = (text, msg) => {
        navigator.clipboard.writeText(text).then(() => {
          Toast.success(msg || '已复制');
        }).catch(() => {
          // fallback
          const ta = document.createElement('textarea');
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          Toast.success(msg || '已复制');
        });
      };

      const goToRedeem = () => {
        const url = props.product.addr || 'https://aisub.vip/';
        window.open(url, '_blank');
      };

      // 清理
      onUnmounted(() => {
        stopPolling();
        stopSmsPolling();
        if (countdownTimer) clearInterval(countdownTimer);
      });

      return {
        contact, payMethod, redeemCode, redeeming, actionResult,
        showQrModal, qrLoading, qrError, qrImageUrl, payAmount,
        payStatus, orderNo, cdKey, countdown, countdownText, payLoading,
        smsCode, smsLoading, smsError, needSmsPayment,
        showSmsPayModal, smsQrLoading, smsQrError, smsQrImageUrl,
        smsPayAmount, smsPayStatus,
        handleRedeem, startAlipayPay, closeQrModal,
        getSmsCode, startSmsServicePay, closeSmsPayModal,
        copyText, goToRedeem,
      };
    },
  });
}
