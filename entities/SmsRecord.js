const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'SmsRecord',
  tableName: 'sms_records',
  columns: {
    id: {
      type: 'int',
      primary: true,
      generated: true,
    },
    phone: {
      type: 'varchar',
      length: 20,
      comment: '获取的手机号',
    },
    keyword: {
      type: 'varchar',
      length: 100,
      nullable: true,
      comment: '短信关键词',
    },
    cardType: {
      type: 'varchar',
      length: 20,
      nullable: true,
      default: '全部',
      comment: '卡类型：实卡/虚卡/全部',
    },
    smsContent: {
      type: 'text',
      nullable: true,
      comment: '短信原文内容',
    },
    verifyCode: {
      type: 'varchar',
      length: 20,
      nullable: true,
      comment: '提取的验证码',
    },
    status: {
      type: 'varchar',
      length: 20,
      default: 'active',
      comment: '状态：active-使用中/completed-已完成/released-已释放/blocked-已拉黑',
    },
    ip: {
      type: 'varchar',
      length: 45,
      nullable: true,
      comment: '请求者IP',
    },
    source: {
      type: 'varchar',
      length: 20,
      default: 'free',
      comment: '来源：free-免费接码 / iscode-isCode商品',
    },
    cardKeyId: {
      type: 'int',
      nullable: true,
      comment: '关联卡密ID（isCode商品时有值）',
    },
    productId: {
      type: 'int',
      nullable: true,
      comment: '关联商品ID（isCode商品时有值）',
    },
    createdAt: {
      type: 'datetime',
      createDate: true,
    },
    updatedAt: {
      type: 'datetime',
      updateDate: true,
    },
  },
});
