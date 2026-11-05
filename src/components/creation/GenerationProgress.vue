<script setup lang="ts">
import { computed } from 'vue'
import type { GenerationTask } from '@/types'

const props = defineProps<{
  task: GenerationTask | null
  isGenerating: boolean
}>()

const percent = computed(() => props.task?.progress ?? 0)
const step = computed(() => props.task?.currentStep ?? '')
const completed = computed(() => props.task?.completed ?? 0)
const total = computed(() => props.task?.total ?? 0)
</script>

<template>
  <div v-if="task && (isGenerating || task.status !== 'completed')" class="progress panel">
    <div class="progress-head">
      <span class="step">{{ step }}</span>
      <span class="count">已完成 {{ completed }} / {{ total }}</span>
    </div>
    <el-progress :percentage="percent" :stroke-width="8" />
  </div>
</template>

<style scoped>
.progress {
  padding: 16px 20px;
}

.progress-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 13px;
}

.step {
  color: var(--color-primary);
  font-weight: 500;
}

.count {
  color: var(--color-text-secondary);
}
</style>
