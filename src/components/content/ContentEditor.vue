<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { DIRECTION_LABEL_MAP, STYLE_LABEL_MAP } from '@/constants/creation'
import type { Content, ContentCoverImage, DiscussionHook } from '@/types'
import { copyText, formatBodyForCopy, formatContentForCopy, formatDate, formatDiscussionForCopy } from '@/utils/content'
import DiscussionPanel from '@/components/discussion/DiscussionPanel.vue'
import ImagePanel from './ImagePanel.vue'
import ScorePanel from './ScorePanel.vue'

const props = defineProps<{
  content: Content | null
  regenerating?: boolean
}>()

const emit = defineEmits<{
  regenerate: []
  polish: [mode: string]
  update: [patch: Partial<Content>]
  favorite: []
  imagesUpdated: [images: ContentCoverImage[], query: string]
}>()

const polishOptions = [
  { id: 'authentic', label: '更真实' },
  { id: 'emotion', label: '更有情绪' },
  { id: 'conflict', label: '更有冲突' },
  { id: 'colloquial', label: '更口语化' },
  { id: 'shorten', label: '更简洁' },
]

const directionText = computed(() =>
  (props.content?.directions ?? []).map((d) => DIRECTION_LABEL_MAP[d]).join(' · '),
)

const styleText = computed(() =>
  (props.content?.styles ?? []).map((s) => STYLE_LABEL_MAP[s]).join(' · '),
)

async function handleCopy(mode: 'body' | 'full' | 'discussion') {
  if (!props.content) return
  if (mode === 'body') {
    await copyText(formatBodyForCopy(props.content))
    ElMessage.success('已复制正文')
    return
  }
  if (mode === 'discussion') {
    const text = formatDiscussionForCopy(props.content)
    if (!text) {
      ElMessage.warning('暂无讨论引导')
      return
    }
    await copyText(text)
    ElMessage.success('已复制讨论引导')
    return
  }
  await copyText(formatContentForCopy(props.content, true))
  ElMessage.success('已复制内容+讨论')
}

function updateTitle(value: string) {
  emit('update', { title: value })
}

function updateBody(value: string) {
  emit('update', { content: value })
}

function updateHooks(hooks: DiscussionHook[]) {
  emit('update', { discussionHooks: hooks })
}
</script>

<template>
  <div v-if="!content" class="empty panel">
    <p>选择左侧内容查看详情</p>
  </div>

  <div v-else class="editor panel">
    <div class="toolbar">
      <div class="tags">
        <span v-if="content.topicAngle" class="tag">{{ content.topicAngle }}</span>
        <span v-if="directionText" class="tag soft">{{ directionText }}</span>
        <span v-if="styleText" class="tag soft">{{ styleText }}</span>
      </div>
      <div class="actions">
        <el-button size="small" :loading="regenerating" @click="emit('regenerate')">
          重新生成
        </el-button>
        <el-dropdown trigger="click" @command="(cmd: string) => emit('polish', cmd)">
          <el-button size="small">AI润色</el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-for="opt in polishOptions" :key="opt.id" :command="opt.id">
                {{ opt.label }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button size="small" @click="handleCopy('body')">复制正文</el-button>
        <el-button size="small" @click="handleCopy('discussion')">复制讨论</el-button>
        <el-button size="small" type="primary" @click="handleCopy('full')">
          复制内容+讨论
        </el-button>
      </div>
    </div>

    <el-input
      class="title-input"
      :model-value="content.title"
      placeholder="标题"
      @update:model-value="updateTitle(String($event))"
    />

    <el-input
      type="textarea"
      :rows="12"
      :model-value="content.content"
      placeholder="正文"
      @update:model-value="updateBody(String($event))"
    />

    <div class="divider" />

    <ImagePanel
      v-if="content.status === 'completed'"
      :content="content"
      @updated="(images, query) => emit('imagesUpdated', images, query)"
    />

    <div class="divider" />

    <DiscussionPanel
      :hooks="content.discussionHooks"
      editable
      @update:hooks="updateHooks"
    />

    <div class="divider" />

    <ScorePanel v-if="content.status === 'completed'" :score="content.score" />

    <div class="footer">
      <span>创建于 {{ formatDate(content.createdAt) }}</span>
      <button type="button" class="fav" @click="emit('favorite')">
        {{ content.favorite ? '★ 已收藏' : '☆ 收藏' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.empty {
  height: 100%;
  min-height: 360px;
  display: grid;
  place-items: center;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.editor {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 100%;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.tag {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 6px;
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.tag.soft {
  background: var(--color-bg-muted);
  color: var(--color-text-secondary);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.title-input :deep(.el-input__wrapper) {
  box-shadow: none;
  border-bottom: 1px solid var(--color-border);
  border-radius: 0;
  padding-left: 0;
  font-size: 20px;
  font-weight: 600;
}

.divider {
  height: 1px;
  background: var(--color-border);
  margin: 4px 0;
}

.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.fav {
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 12px;
}

.fav:hover {
  color: var(--color-primary);
}
</style>
