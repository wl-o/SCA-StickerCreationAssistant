<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  COVER_TEMPLATES,
  downloadCoverPng,
  ensureCoverFonts,
  renderTitleCoverAsync,
  type CoverTemplateId,
} from '@/utils/titleCover'

const props = defineProps<{
  title: string
  subtitle?: string
}>()

const templateId = ref<CoverTemplateId>('warm-paper')
const previewUrl = ref('')
const downloading = ref(false)
const rendering = ref(false)

const templates = COVER_TEMPLATES
const safeTitle = computed(() => props.title.trim() || '请先完成改写')

async function refreshPreview() {
  rendering.value = true
  try {
    await ensureCoverFonts()
    const canvas = await renderTitleCoverAsync({
      title: safeTitle.value,
      subtitle: props.subtitle,
      templateId: templateId.value,
    })
    previewUrl.value = canvas.toDataURL('image/png')
  } finally {
    rendering.value = false
  }
}

async function handleDownload() {
  if (!props.title.trim()) {
    ElMessage.warning('请先有标题再下载封面')
    return
  }
  downloading.value = true
  try {
    const canvas = await renderTitleCoverAsync({
      title: props.title.trim(),
      subtitle: props.subtitle,
      templateId: templateId.value,
    })
    const name = props.title.trim().slice(0, 20).replace(/[\\/:*?"<>|]+/g, '_')
    await downloadCoverPng(canvas, `${name || '封面'}-文字封面`)
    ElMessage.success('封面已下载')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '下载失败')
  } finally {
    downloading.value = false
  }
}

watch(
  () => [props.title, props.subtitle, templateId.value] as const,
  () => {
    void refreshPreview()
  },
  { immediate: true },
)

onMounted(() => {
  void refreshPreview()
})
</script>

<template>
  <div class="cover-panel">
    <div class="head">
      <span class="title">文字首页图</span>
      <el-button size="small" type="primary" plain :loading="downloading" @click="handleDownload">
        下载封面 PNG
      </el-button>
    </div>

    <div class="templates">
      <button
        v-for="item in templates"
        :key="item.id"
        type="button"
        class="tpl"
        :class="{ active: templateId === item.id }"
        @click="templateId = item.id"
      >
        {{ item.name }}
      </button>
    </div>

    <div v-loading="rendering" class="preview">
      <img v-if="previewUrl" :src="previewUrl" alt="标题封面预览" />
    </div>
    <p class="hint">新增古风书卷、清新薄荷、清新晴空；可切换冷暖多种底纹</p>
  </div>
</template>

<style scoped>
.cover-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.title {
  font-size: 14px;
  font-weight: 600;
}

.templates {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tpl {
  border: 1px solid var(--color-border);
  background: #fff;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
}

.tpl.active {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-soft);
}

.preview {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
  background: #111;
  width: 100%;
  max-width: none;
}

.preview img {
  display: block;
  width: 100%;
  height: auto;
}

.hint {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-secondary);
}
</style>
