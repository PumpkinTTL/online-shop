<template>
  <div class="client-layout">
    <AppHeader />
    <main class="client-main">
      <router-view></router-view>
    </main>
    <CaptchaModal></CaptchaModal>
  </div>
</template>

<script setup>
import AppHeader from '@/components/AppHeader.vue'
import CaptchaModal from '@/components/CaptchaModal.vue'
</script>

<style scoped>
.client-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.client-main {
  flex: 1;
}
</style>
