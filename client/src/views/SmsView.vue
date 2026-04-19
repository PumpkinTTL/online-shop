<template>
  <div class="sms-view">
    <div class="container">
      <n-h2>接码平台</n-h2>
      <n-card>
        <n-empty description="接码功能迁移中..." />
      </n-card>
    </div>
  </div>
</template>

<script setup>
import { NH2, NCard, NEmpty } from 'naive-ui'
</script>

<style scoped>
.sms-view {
  padding: 24px 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}
</style>
