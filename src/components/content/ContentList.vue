<script setup lang="ts">
import type { Content } from '@/types'

defineProps<{
  contents: Content[]
  selectedId: string | null
}>()

const emit = defineEmits<{
  select: [id: string]
}>()

function statusText(item: Content) {
  if (item.status === 'generating') return '生成中'
  if (item.status === 'pending') return '等待中'
  if (item.status === 'failed') return item.errorMessage || '失败'
  return ''
}
</script>

<template>
  <div class="list">
    <button
      v-for="(item, index) in contents"
      :key="item.id"
      type="button"
      class="list-item"
      :class="{
        active: selectedId === item.id,
        muted: item.status === 'pending',
        generating: item.status === 'generating',
        failed: item.status === 'failed',
      }"
      @click="emit('select', item.id)"
    >
      <div class="index">#{{ String(index + 1).padStart(2, '0') }}</div>
      <div class="meta">
        <div class="title">
          {{ item.title || (item.status === 'generating' ? '正在生成...' : '等待生成') }}
        </div>
        <div class="sub">
          <span v-if="item.status === 'completed'">评分 {{ item.score.total }}</span>
          <span v-else>{{ statusText(item) }}</span>
          <span v-if="item.topicAngle"> · {{ item.topicAngle }}</span>
        </div>
      </div>
    </button>
  </div>
</template>

<style scoped>
.list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.list-item {
  display: flex;
  gap: 10px;
  width: 100%;
  padding: 12px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.list-item:hover {
  background: var(--color-bg-muted);
}

.list-item.active {
  background: var(--color-primary-soft);
  border-color: #d8dcff;
}

.list-item.muted {
  opacity: 0.55;
}

.list-item.generating .title {
  color: var(--color-primary);
}

.list-item.failed .title {
  color: #b42318;
}

.index {
  flex-shrink: 0;
  width: 36px;
  font-size: 12px;
  color: var(--color-text-secondary);
  padding-top: 2px;
}

.title {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.sub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-secondary);
}
</style>
