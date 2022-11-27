import { createApp } from 'vue'
import './index.css'
import 'uno.css'
import { Icon } from '@iconify/vue'
import App from './App.vue'
const app = createApp(App)
app.component('Icon', Icon)
app.mount('#app')
