<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import ImagePanel from '@/components/content/ImagePanel.vue'
import { DIRECTION_LABEL_MAP } from '@/constants/creation'
import { useContentStore } from '@/stores/content'
import { copyText, formatBodyForCopy, formatContentForCopy, formatDate, formatDiscussionForCopy } from '@/utils/content'
import type { Content, ContentCoverImage } from '@/types'

const contentStore = useContentStore()
const active = ref<Content | null>(null)

onMounted(() => {
  void contentStore.loadContents()
})

const filters = [
  { id: 'all' as const, label: '全部' },
  { id: 'favorite' as const, label: '收藏' },
  { id: 'recent' as const, label: '最近生成' },
]

function openDetail(item: Content) {
  active.value = item
}

function syncActiveImages(images: ContentCoverImage[], query: string) {
  if (!active.value) return
  const next: Content = {
    ...active.value,
    images,
    coverImage: images[0],
    coverImageId: images[0]?.id,
    imageQuery: query,
    updatedAt: new Date().toISOString(),
  }
  active.value = next
  const index = contentStore.contents.findIndex((item) => item.id === next.id)
  if (index >= 0) contentStore.contents[index] = next
}

async function handleCopy(item: Content, mode: 'body' | 'full' | 'discussion' = 'full') {
  if (mode === 'body') {
    await copyText(formatBodyForCopy(item))
    ElMessage.success('已复制正文')
    return
  }
  if (mode === 'discussion') {
    const text = formatDiscussionForCopy(item)
    if (!text) {
      ElMessage.warning('暂无讨论引导')
      return
    }
    await copyText(text)
    ElMessage.success('已复制讨论引导')
    return
  }
  await copyText(formatContentForCopy(item, true))
  ElMessage.success('已复制内容+讨论')
}

async function handleDelete(item: Content) {
  await ElMessageBox.confirm(`确认删除「${item.title}」？`, '删除内容', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  })
  await contentStore.removeContent(item.id)
  if (active.value?.id === item.id) active.value = null
  ElMessage.success('已删除')
}
</script>

<template>
  <div class="library-page">
    <div class="header">
      <div>
        <h1 class="page-title">内容库</h1>
        <p class="page-desc">管理已生成与收藏的内容；详情里可继续搜图配图。</p>
      </div>
    </div>

    <div class="toolbar">
      <div class="filters">
        <button
          v-for="item in filters"
          :key="item.id"
          type="button"
          class="chip"
          :class="{ 'is-active': contentStore.filter === item.id }"
          @click="contentStore.filter = item.id"
        >
          {{ item.label }}
        </button>
      </div>
      <el-input
        v-model="contentStore.searchQuery"
        clearable
        placeholder="搜索标题 / 正文 / 关键词 / 方向"
        style="max-width: 320px"
      />
    </div>

    <div class="layout">
      <div class="list panel">
        <div
          v-for="item in contentStore.filteredContents"
          :key="item.id"
          class="card"
          :class="{ active: active?.id === item.id }"
          @click="openDetail(item)"
        >
          <div class="card-top">
            <h3>{{ item.title }}</h3>
            <button
              type="button"
              class="star"
              @click.stop="contentStore.toggleFavorite(item.id)"
            >
              {{ item.favorite ? '★' : '☆' }}
            </button>
          </div>
          <p class="excerpt">{{ item.content.slice(0, 72) }}...</p>
          <div class="card-meta">
            <span>{{ item.keyword }}</span>
            <span>{{ formatDate(item.createdAt) }}</span>
          </div>
          <div class="card-actions" @click.stop>
            <el-button size="small" text @click="handleCopy(item, 'full')">复制内容+讨论</el-button>
            <el-button size="small" text type="danger" @click="handleDelete(item)">删除</el-button>
          </div>
        </div>

        <div v-if="!contentStore.filteredContents.length" class="empty">暂无内容</div>
      </div>

      <div class="detail panel">
        <template v-if="active">
          <div class="detail-toolbar">
            <el-button size="small" @click="handleCopy(active, 'body')">复制正文</el-button>
            <el-button size="small" @click="handleCopy(active, 'discussion')">复制讨论</el-button>
            <el-button size="small" type="primary" @click="handleCopy(active, 'full')">
              复制内容+讨论
            </el-button>
          </div>
          <h2>{{ active.title }}</h2>
          <div class="meta-line">
            <span>评分 {{ active.score.total }}</span>
            <span>·</span>
            <span>{{ active.directions.map((d) => DIRECTION_LABEL_MAP[d]).join(' / ') }}</span>
            <span>·</span>
            <span>{{ active.topicAngle }}</span>
          </div>
          <div class="image-section">
            <ImagePanel :content="active" @updated="syncActiveImages" />
          </div>
          <pre class="body">{{ active.content }}</pre>
          <div class="hook-box">
            <div class="hook-head">
              <div class="hook-label">讨论引导</div>
              <el-button size="small" text type="primary" @click="handleCopy(active, 'discussion')">
                复制讨论
              </el-button>
            </div>
            <p>
              {{
                active.discussionHooks.find((h) => h.recommended)?.content ||
                active.discussionHooks[0]?.content
              }}
            </p>
          </div>
        </template>
        <div v-else class="empty detail-empty">选择左侧内容查看详情</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.header {
  margin-bottom: 18px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.filters {
  display: flex;
  gap: 8px;
}

.layout {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 12px;
  min-height: 520px;
}

.list {
  padding: 8px;
  overflow: auto;
  max-height: calc(100vh - 220px);
}

.card {
  padding: 14px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
}

.card:hover,
.card.active {
  background: var(--color-bg-muted);
}

.card.active {
  border-color: #d8dcff;
}

.card-top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.card-top h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}

.star {
  border: none;
  background: transparent;
  cursor: pointer;
  color: #f5a524;
  font-size: 14px;
}

.excerpt {
  margin: 8px 0;
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #98a2b3;
}

.card-actions {
  margin-top: 4px;
}

.detail {
  padding: 24px;
  overflow: auto;
  max-height: calc(100vh - 220px);
}

.detail-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.detail h2 {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 600;
}

.meta-line {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-bottom: 16px;
}

.image-section {
  margin: 0 0 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eef1f5;
}

.body {
  margin: 0;
  white-space: pre-wrap;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.75;
}

.hook-box {
  margin-top: 20px;
  padding: 14px;
  border-radius: 8px;
  background: var(--color-bg-muted);
}

.hook-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.hook-label {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.hook-box p {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
}

.empty {
  padding: 40px;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.detail-empty {
  height: 100%;
  display: grid;
  place-items: center;
}

@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
</style>
