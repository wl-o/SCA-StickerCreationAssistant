<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { loadImageSettings, saveImageSettings } from '@/services/image'
import type { ImageSettings } from '@/types'

const form = reactive<ImageSettings>({
  provider: 'unsplash',
  unsplashApplicationId: '',
  unsplashAccessKey: '',
  unsplashSecretKey: '',
  pexelsApiKey: '',
  pixabayApiKey: '',
})

const saving = reactive({ loading: false })

onMounted(async () => {
  try {
    const remote = await loadImageSettings()
    form.provider = remote.provider || 'unsplash'
    form.unsplashApplicationId = remote.unsplashApplicationId || ''
    form.unsplashAccessKey = remote.unsplashAccessKey || ''
    form.unsplashSecretKey = remote.unsplashSecretKey || ''
    form.pexelsApiKey = remote.pexelsApiKey || ''
    form.pixabayApiKey = remote.pixabayApiKey || ''
  } catch {
    // ignore
  }
})

async function save() {
  saving.loading = true
  try {
    const saved = await saveImageSettings({ ...form })
    Object.assign(form, saved)
    ElMessage.success('配图设置已保存到 SQLite')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存失败')
  } finally {
    saving.loading = false
  }
}
</script>

<template>
  <div class="image-settings panel">
    <h3 class="section-title">配图图库</h3>
    <p class="section-desc">
      默认使用
      <a href="https://unsplash.com/developers" target="_blank" rel="noreferrer">Unsplash</a>
      。凭证保存在本地 SQLite（
      <code>data/app.sqlite</code>
      ），不会提交到 Git。
    </p>

    <div class="provider-row">
      <button
        type="button"
        class="chip"
        :class="{ 'is-active': form.provider === 'unsplash' }"
        @click="form.provider = 'unsplash'"
      >
        Unsplash
      </button>
      <button
        type="button"
        class="chip"
        :class="{ 'is-active': form.provider === 'pexels' }"
        @click="form.provider = 'pexels'"
      >
        Pexels
      </button>
      <button
        type="button"
        class="chip"
        :class="{ 'is-active': form.provider === 'pixabay' }"
        @click="form.provider = 'pixabay'"
      >
        Pixabay
      </button>
    </div>

    <div class="fields">
      <div class="field">
        <label>Unsplash Application ID</label>
        <el-input v-model="form.unsplashApplicationId" placeholder="Application ID" />
      </div>
      <div class="field">
        <label>Unsplash Access Key</label>
        <el-input
          v-model="form.unsplashAccessKey"
          type="password"
          show-password
          placeholder="Access Key"
        />
      </div>
      <div class="field">
        <label>Unsplash Secret Key</label>
        <el-input
          v-model="form.unsplashSecretKey"
          type="password"
          show-password
          placeholder="Secret Key"
        />
        <p class="tip">搜图使用 Access Key；Secret Key 一并本地存档备用（OAuth 场景）。</p>
      </div>
      <div class="field">
        <label>Pexels API Key（备选）</label>
        <el-input v-model="form.pexelsApiKey" type="password" show-password placeholder="可选" />
      </div>
      <div class="field">
        <label>Pixabay API Key（备选）</label>
        <el-input v-model="form.pixabayApiKey" type="password" show-password placeholder="可选" />
      </div>
    </div>

    <el-button type="primary" :loading="saving.loading" @click="save">保存配图设置</el-button>
  </div>
</template>

<style scoped>
.image-settings {
  padding: 24px;
  margin-top: 16px;
}

.section-title {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 600;
}

.section-desc {
  margin: 0 0 16px;
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.section-desc a,
.section-desc code {
  color: var(--color-primary);
}

.section-desc code {
  font-size: 12px;
  background: var(--color-bg-muted);
  padding: 1px 6px;
  border-radius: 4px;
  color: var(--color-text-secondary);
}

.provider-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
}

.tip {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-secondary);
}
</style>
