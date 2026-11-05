<script setup lang="ts">
import { ElMessage } from 'element-plus'
import type { DiscussionHook } from '@/types'
import { copyText, getRecommendedHook } from '@/utils/content'

const props = defineProps<{
  hooks: DiscussionHook[]
  editable?: boolean
}>()

const emit = defineEmits<{
  'update:hooks': [hooks: DiscussionHook[]]
}>()

const typeLabel: Record<DiscussionHook['type'], string> = {
  question: '提问型',
  choice: '二选一',
  controversy: '争议型',
  experience: '经验征集',
  self: '自我代入',
}

function updateContent(hooks: DiscussionHook[], index: number, content: string) {
  const next = hooks.map((item, i) => (i === index ? { ...item, content } : item))
  emit('update:hooks', next)
}

function setRecommended(hooks: DiscussionHook[], index: number) {
  const next = hooks.map((item, i) => ({ ...item, recommended: i === index }))
  emit('update:hooks', next)
}

async function copyHook(text: string) {
  if (!text.trim()) {
    ElMessage.warning('内容为空')
    return
  }
  await copyText(text)
  ElMessage.success('已复制讨论')
}

async function copyRecommended() {
  const hook = getRecommendedHook(props.hooks)
  if (!hook?.content) {
    ElMessage.warning('暂无讨论引导')
    return
  }
  await copyHook(hook.content)
}
</script>

<template>
  <div class="discussion">
    <div class="head">
      <span class="icon">💬</span>
      <span>讨论引导</span>
      <el-button
        v-if="hooks.length"
        size="small"
        text
        type="primary"
        class="copy-rec"
        @click="copyRecommended"
      >
        复制推荐讨论
      </el-button>
    </div>

    <div v-for="(hook, index) in hooks" :key="`${hook.type}-${index}`" class="hook">
      <div class="hook-top">
        <span class="type">{{ typeLabel[hook.type] }}</span>
        <button
          v-if="editable"
          type="button"
          class="rec-btn"
          :class="{ active: hook.recommended }"
          @click="setRecommended(hooks, index)"
        >
          {{ hook.recommended ? '主推荐' : '设为主推荐' }}
        </button>
        <span v-else-if="hook.recommended" class="badge">推荐</span>
        <el-button size="small" text @click="copyHook(hook.content)">复制</el-button>
      </div>

      <el-input
        v-if="editable"
        type="textarea"
        :rows="2"
        :model-value="hook.content"
        @update:model-value="updateContent(hooks, index, String($event))"
      />
      <p v-else class="text">{{ hook.content }}</p>
    </div>

    <p v-if="!hooks.length" class="empty">暂无讨论引导</p>
  </div>
</template>

<style scoped>
.discussion {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
}

.copy-rec {
  margin-left: auto;
}

.icon {
  font-size: 14px;
}

.hook {
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg-muted);
}

.hook-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.type {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.badge {
  margin-left: auto;
  font-size: 11px;
  color: var(--color-primary);
  background: var(--color-primary-soft);
  padding: 2px 8px;
  border-radius: 999px;
}

.rec-btn {
  margin-left: auto;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 12px;
  cursor: pointer;
}

.rec-btn.active {
  color: var(--color-primary);
  font-weight: 600;
}

.text {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
}

.empty {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 13px;
}
</style>
