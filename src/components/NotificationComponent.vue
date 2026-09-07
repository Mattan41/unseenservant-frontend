<template>
  <div class="notifications-container">
    <div
      v-for="notification in notifications"
      :key="notification.id"
      :class="['notification', `notification-${notification.type}`]"
    >
      {{ notification.message }}
    </div>
  </div>
</template>

<script setup>
import { useNotificationStore } from '@/stores/notificationStore'
import { computed } from 'vue'

const notificationStore = useNotificationStore()

// This is crucial for reactivity
const notifications = computed(() => notificationStore.notifications)
</script>

<style scoped>
/* Container for notifications */
.notifications-container {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 8px; /* Mellanrum mellan notiser */
}

/* Basic styles for notifications */
.notification {
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-family: Arial, sans-serif;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  text-align: center;
  max-width: 300px;
  margin: 0 auto;
}

/* Specific color styles are now in main.css as semantic classes */
</style>
