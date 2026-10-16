import './assets/main.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { applyEnvironmentAttributes } from './utils/environment.js'

// No persistence plugin: every store is in-memory and the two values that must
// survive a reload (the JWT and the theme) are read from localStorage by
// `authStore` and `utils/environment.js` respectively.
const pinia = createPinia()

const app = createApp(App)
app.use(pinia)
app.use(router)

applyEnvironmentAttributes()

app.mount('#app')
