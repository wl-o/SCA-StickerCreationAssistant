<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import ContentList from '@/components/content/ContentList.vue'
import ContentEditor from '@/components/content/ContentEditor.vue'
import GenerationProgress from '@/components/creation/GenerationProgress.vue'
import { useContentStore } from '@/stores/content'
import { useCreationStore } from '@/stores/creation'
import type { Content, ContentCoverImage } from '@/types'

const router = useRouter()
const creationStore = useCreationStore()
const contentStore = useContentStore()
const regeneratingId = ref<string | null>(null)
let editSaveTimer: ReturnType<typeof setTimeout> | null = null

const task = computed(() => creationStore.currentTask)
const contents = computed(() => task.value?.contents ?? [])
const selected = computed(() => creationStore.selectedContent)

onMounted(() => {
  if (!creationStore.currentTask) {
    router.replace('/creation')
  }
})

function goBack() {
  router.push('/creation')
}

async function saveAll() {
  const completed = contents.value.filter((item) => item.status === 'completed')
  if (!completed.length) {
    ElMessage.warning('暂无已完成内容可保存')
    return
  }
  try {
    await contentStore.saveContents(completed)
    ElMessage.success(`已同步 ${completed.length} 条到内容库`)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存失败')
  }
}

function onUpdate(patch: Partial<Content>) {
  if (!selected.value) return
  creationStore.updateContent(selected.value.id, patch)
  if (editSaveTimer) clearTimeout(editSaveTimer)
  editSaveTimer = setTimeout(() => {
    const latest = creationStore.selectedContent
    if (latest?.status === 'completed') {
      void contentStore.saveOne({ ...latest })
    }
  }, 600)
}

async function onRegenerate() {
  if (!selected.value) return
  regeneratingId.value = selected.value.id
  try {
    await creationStore.regenerateOne(selected.value.id)
    ElMessage.success('已重新生成')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '重新生成失败')
  } finally {
    regeneratingId.value = null
  }
}

async function onPolish(mode: string) {
  if (!selected.value) return
  const labels: Record<string, string> = {
    authentic: '更真实',
    emotion: '更有情绪',
    conflict: '更有冲突',
    colloquial: '更口语化',
    shorten: '更简洁',
  }
  try {
    await creationStore.polishOne(selected.value.id, mode)
    ElMessage.success(`已润色：${labels[mode] ?? mode}`)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '润色失败')
  }
}

async function retryFailed() {
  try {
    await creationStore.retryFailed()
    ElMessage.success('失败项已重新生成')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '重试失败')
  }
}

async function onFavorite() {
  if (!selected.value) return
  const next = !selected.value.favorite
  creationStore.updateContent(selected.value.id, { favorite: next })
  try {
    await contentStore.saveOne({ ...selected.value, favorite: next })
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '收藏失败')
  }
}

function onImagesUpdated(images: ContentCoverImage[], query: string) {
  if (!selected.value) return
  creationStore.updateContent(selected.value.id, {
    images,
    coverImage: images[0],
    coverImageId: images[0]?.id,
    imageQuery: query,
  })
}
</script>

<template>
  <div v-if="task" class="result-page">
    <div class="result-header">
      <button type="button" class="back" @click="goBack">← 返回创作</button>
      <div class="summary">
        已生成 {{ creationStore.completedCount }} / {{ task.total }} 条
        <span v-if="creationStore.failedCount"> · 失败 {{ creationStore.failedCount }}</span>
      </div>
      <el-button
        v-if="creationStore.failedCount"
        @click="retryFailed"
      >
        重新生成失败项
      </el-button>
      <el-button @click="saveAll">同步到内容库</el-button>
    </div>

    <GenerationProgress
      v-if="creationStore.isGenerating"
      class="progress"
      :task="task"
      :is-generating="creationStore.isGenerating"
    />

    <div class="workspace">
      <aside class="left panel">
        <ContentList
          :contents="contents"
          :selected-id="creationStore.selectedContentId"
          @select="creationStore.selectContent"
        />
      </aside>
      <section class="right">
        <ContentEditor
          :content="selected"
          :regenerating="regeneratingId === selected?.id"
          @update="onUpdate"
          @regenerate="onRegenerate"
          @polish="onPolish"
          @favorite="onFavorite"
          @images-updated="onImagesUpdated"
        />
      </section>
    </div>
  </div>
</template>

<style scoped>
.result-page {
  height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back {
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 14px;
  padding: 0;
}

.back:hover {
  color: var(--color-text);
}

.summary {
  flex: 1;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.workspace {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 12px;
}

.left {
  padding: 10px;
  overflow: auto;
}

.right {
  min-width: 0;
  overflow: auto;
}

@media (max-width: 900px) {
  .workspace {
    grid-template-columns: 1fr;
  }

  .left {
    max-height: 220px;
  }
}
</style>
