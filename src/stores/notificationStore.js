import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref([])

  const addNotification = (message, type = 'success', timeout = 3000) => {
    const id = Date.now()
    notifications.value.push({ id, message, type })

    // remove the notification after the specified timeout
    setTimeout(() => {
      removeNotification(id)
    }, timeout)
  }

  const removeNotification = (id) => {
    notifications.value = notifications.value.filter((n) => n.id !== id)
  }

  return {
    notifications,
    addNotification,
    removeNotification,
  }
})
