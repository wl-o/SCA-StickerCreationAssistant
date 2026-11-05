<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import AISettings from '@/components/settings/AISettings.vue'
import ImageSettingsPanel from '@/components/settings/ImageSettings.vue'
import { useSettingsStore } from '@/stores/settings'

const settingsStore = useSettingsStore()

const aiModel = computed({
  get: () => settingsStore.ai,
  set: (value) => {
    void settingsStore.updateAI(value)
  },
})

async function testConnection() {
  await settingsStore.testConnection()
  if (settingsStore.connectionStatus === 'success') {
    ElMessage.success('连接测试完成，配置已写入 SQLite')
  } else {
    ElMessage.error(settingsStore.connectionMessage || '连接失败')
  }
}
</script>

<template>
  <div class="settings-page">
    <div class="header">
      <h1 class="page-title">设置</h1>
      <p class="page-desc">配置 AI 模型与配图图库，数据持久化到本地 SQLite。</p>
    </div>

    <AISettings
      v-model="aiModel"
      :status="settingsStore.connectionStatus"
      :message="settingsStore.connectionMessage"
      @test="testConnection"
    />

    <ImageSettingsPanel />
  </div>
</template>

<style scoped>
.settings-page {
  max-width: 920px;
}

.header {
  margin-bottom: 16px;
}
</style>
