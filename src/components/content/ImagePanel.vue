<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { attachImage, detachImage, searchImages } from '@/services/image'
import { suggestImageQueriesWithAI } from '@/services/image/suggestKeywords'
import { useSettingsStore } from '@/stores/settings'
import type { Content, ContentCoverImage, ImageCandidate } from '@/types'
import { downloadAllImages } from '@/utils/downloadImage'
import { suggestImageQueries, type ImageQuerySuggestion } from '@/utils/imageQuery'

const props = defineProps<{
  content: Content
  /** 配图前确保内容已入库（如改写草稿） */
  ensureContent?: () => Promise<void>
}>()

const emit = defineEmits<{
  updated: [images: ContentCoverImage[], query: string]
}>()

const settingsStore = useSettingsStore()

const query = ref('')
const page = ref(1)
const loading = ref(false)
const attaching = ref(false)
const downloading = ref(false)
const suggesting = ref(false)
const candidates = ref<ImageCandidate[]>([])
const selectedImages = ref<ContentCoverImage[]>([])
const suggestions = ref<ImageQuerySuggestion[]>([])
const previewVisible = ref(false)
const previewItem = ref<ImageCandidate | null>(null)

watch(
  () => props.content.id,
  () => {
    suggestions.value = suggestImageQueries(props.content)
    query.value = props.content.imageQuery || suggestions.value[0]?.query || ''
    selectedImages.value = props.content.images?.length
      ? [...props.content.images]
      : props.content.coverImage
        ? [props.content.coverImage]
        : []
    candidates.value = []
    page.value = 1
    void refreshSuggestions()
  },
  { immediate: true },
)

async function refreshSuggestions() {
  suggesting.value = true
  try {
    const next = await suggestImageQueriesWithAI(settingsStore.ai, props.content)
    suggestions.value = next
    if (!props.content.imageQuery && next[0]) {
      query.value = next[0].query
    }
  } finally {
    suggesting.value = false
  }
}

function pickSuggestion(item: ImageQuerySuggestion) {
  query.value = item.query
  void handleSearch(true)
}

async function handleSearch(resetPage = true) {
  if (!query.value.trim()) {
    ElMessage.warning('请选择或输入配图关键词')
    return
  }
  if (resetPage) page.value = 1
  loading.value = true
  try {
    const result = await searchImages(query.value.trim(), page.value)
    candidates.value = result.items
    if (!result.items.length) ElMessage.info('没有搜到合适的图，换个词试试')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '搜图失败')
  } finally {
    loading.value = false
  }
}

function openPreview(item: ImageCandidate) {
  previewItem.value = item
  previewVisible.value = true
}

async function prepareContent() {
  if (props.ensureContent) await props.ensureContent()
}

async function confirmAttach() {
  if (!previewItem.value) return
  attaching.value = true
  try {
    await prepareContent()
    const result = await attachImage({
      contentId: props.content.id,
      query: query.value.trim(),
      candidate: previewItem.value,
    })
    selectedImages.value = result.images
    emit('updated', result.images, query.value.trim())
    previewVisible.value = false
    ElMessage.success(`已添加配图（共 ${result.images.length} 张）`)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '配图失败')
  } finally {
    attaching.value = false
  }
}

async function removeOne(image: ContentCoverImage) {
  try {
    await prepareContent()
    const result = await detachImage(props.content.id, image.id)
    selectedImages.value = result.images || []
    emit('updated', selectedImages.value, query.value.trim())
    ElMessage.success('已移除该配图')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '移除失败')
  }
}

async function handleDownloadAll() {
  if (!selectedImages.value.length) {
    ElMessage.warning('暂无配图可下载')
    return
  }
  downloading.value = true
  try {
    const count = await downloadAllImages(
      selectedImages.value,
      props.content.title || props.content.keyword || '配图',
    )
    ElMessage.success(`已开始下载 ${count} 张配图`)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '下载失败')
  } finally {
    downloading.value = false
  }
}

async function nextPage() {
  page.value += 1
  await handleSearch(false)
}
</script>

<template>
  <div class="image-panel">
    <div class="head">
      <span class="title">配图</span>
      <span class="hint">支持多图 · 点选推荐词 · 大图确认后加入</span>
      <el-button
        v-if="selectedImages.length"
        size="small"
        type="primary"
        plain
        class="download-all"
        :loading="downloading"
        @click="handleDownloadAll"
      >
        下载全部配图
      </el-button>
    </div>

    <div v-if="selectedImages.length" class="selected-list">
      <div v-for="(image, index) in selectedImages" :key="image.id" class="selected-item">
        <div class="badge">图{{ index + 1 }}</div>
        <img :src="image.previewUrl" :alt="image.attribution" />
        <div class="meta">
          <div class="attr">{{ image.attribution || image.photographer }}</div>
          <a
            v-if="image.sourcePageUrl"
            :href="image.sourcePageUrl"
            target="_blank"
            rel="noreferrer"
          >
            查看来源
          </a>
          <el-button size="small" text type="danger" @click="removeOne(image)">移除</el-button>
        </div>
      </div>
    </div>

    <div class="suggest-block">
      <div class="suggest-label-row">
        <div class="suggest-label">根据正文推荐（点选）</div>
        <el-button size="small" text type="primary" :loading="suggesting" @click="refreshSuggestions">
          重新分析正文
        </el-button>
      </div>
      <div v-loading="suggesting" class="suggest-row">
        <button
          v-for="item in suggestions"
          :key="`${item.label}-${item.query}`"
          type="button"
          class="chip"
          :class="{ 'is-active': query === item.query }"
          @click="pickSuggestion(item)"
        >
          {{ item.label }}
        </button>
      </div>
    </div>

    <div class="search-row">
      <el-input
        v-model="query"
        placeholder="也可手输英文关键词，如 night running"
        clearable
        @keyup.enter="handleSearch()"
      />
      <el-button type="primary" :loading="loading" @click="handleSearch()">搜图</el-button>
    </div>

    <div v-loading="loading || attaching" class="grid">
      <button
        v-for="item in candidates"
        :key="`${item.provider}-${item.providerId}`"
        type="button"
        class="card"
        @click="openPreview(item)"
      >
        <img :src="item.thumbUrl" :alt="item.attribution" loading="lazy" />
        <div class="card-meta">{{ item.photographer }} · 点击预览</div>
      </button>
    </div>

    <div v-if="candidates.length" class="more">
      <el-button text :loading="loading" @click="nextPage">换一批</el-button>
    </div>

    <el-dialog
      v-model="previewVisible"
      title="大图预览"
      width="92vw"
      top="4vh"
      align-center
      destroy-on-close
      class="image-preview-dialog"
    >
      <div v-if="previewItem" class="preview-body">
        <img :src="previewItem.previewUrl" :alt="previewItem.attribution" />
        <div class="preview-meta">
          <div>{{ previewItem.attribution }}</div>
          <div class="size">
            {{ previewItem.width }} × {{ previewItem.height }}
          </div>
          <a
            v-if="previewItem.sourcePageUrl"
            :href="previewItem.sourcePageUrl"
            target="_blank"
            rel="noreferrer"
          >
            在 Unsplash 查看原图
          </a>
        </div>
      </div>
      <template #footer>
        <el-button @click="previewVisible = false">取消</el-button>
        <el-button type="primary" :loading="attaching" @click="confirmAttach">
          加入本文配图
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.image-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}

.title {
  font-size: 14px;
  font-weight: 600;
}

.hint {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.download-all {
  margin-left: auto;
}

.selected-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.selected-item {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 14px;
  align-items: start;
  position: relative;
}

.badge {
  position: absolute;
  left: 8px;
  top: 8px;
  z-index: 1;
  background: rgba(31, 35, 41, 0.75);
  color: #fff;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
}

.selected-item img {
  width: 220px;
  height: 280px;
  object-fit: contain;
  background: #f3f4f6;
  border-radius: 10px;
  border: 1px solid var(--color-border);
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 12px;
  color: var(--color-text-secondary);
  padding-top: 4px;
}

.meta a {
  color: var(--color-primary);
  text-decoration: none;
  width: fit-content;
}

.suggest-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.suggest-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.suggest-label {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.suggest-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 28px;
}

.search-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.search-row .el-input {
  flex: 1;
  min-width: 220px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  min-height: 40px;
}

.card {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  overflow: hidden;
  padding: 0;
  background: #fff;
  cursor: pointer;
  text-align: left;
}

.card:hover {
  border-color: var(--color-primary);
}

.card img {
  display: block;
  width: 100%;
  height: 180px;
  object-fit: cover;
  background: #f3f4f6;
}

.card-meta {
  padding: 8px 10px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.more {
  display: flex;
  justify-content: center;
}

.preview-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-body img {
  width: 100%;
  max-height: calc(100vh - 220px);
  object-fit: contain;
  background: #111;
  border-radius: 10px;
}

.preview-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.preview-meta a {
  color: var(--color-primary);
  width: fit-content;
}

.size {
  font-size: 12px;
}

@media (max-width: 900px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .selected-item {
    grid-template-columns: 1fr;
  }

  .selected-item img {
    width: 100%;
    height: 260px;
  }
}
</style>
