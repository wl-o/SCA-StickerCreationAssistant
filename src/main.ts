import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

import App from './App.vue'
import router from './router'
import { useContentStore } from './stores/content'
import { usePersonaStore } from './stores/persona'
import { useSettingsStore } from './stores/settings'
import { useTemplateStore } from './stores/template'
import './style.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(ElementPlus, { locale: zhCn })

async function bootstrap() {
  const settingsStore = useSettingsStore()
  const personaStore = usePersonaStore()
  const templateStore = useTemplateStore()
  const contentStore = useContentStore()

  try {
    await Promise.all([
      settingsStore.loadSettings(),
      personaStore.loadPersonas(),
      templateStore.loadTemplates(),
      contentStore.loadContents(),
    ])
  } catch (error) {
    console.error('初始化数据失败，请确认后端已启动', error)
  }

  app.mount('#app')
}

void bootstrap()
