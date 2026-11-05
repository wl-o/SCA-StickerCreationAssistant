<script setup lang="ts">
import { getScoreLabel } from '@/constants/creation'
import type { ContentScore } from '@/types'

defineProps<{
  score: ContentScore
}>()
</script>

<template>
  <div class="score">
    <div class="total">
      <span class="num">{{ score.total }}</span>
      <span class="label">{{ getScoreLabel(score.total) }}</span>
    </div>
    <div class="dims">
      <div class="dim"><span>标题吸引力</span><b>{{ score.title }}</b></div>
      <div class="dim"><span>情绪感染力</span><b>{{ score.emotion }}</b></div>
      <div class="dim"><span>内容完整度</span><b>{{ score.completeness }}</b></div>
      <div class="dim"><span>差异化</span><b>{{ score.originality }}</b></div>
      <div class="dim"><span>真实感</span><b>{{ score.authenticity }}</b></div>
      <div class="dim"><span>观点清晰度</span><b>{{ score.opinion }}</b></div>
      <div class="dim"><span>讨论潜力</span><b>{{ score.discussion }}</b></div>
    </div>
  </div>
</template>

<style scoped>
.score {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.total {
  min-width: 72px;
}

.num {
  display: block;
  font-size: 32px;
  font-weight: 650;
  letter-spacing: -0.03em;
  line-height: 1;
  color: var(--color-primary);
}

.label {
  display: inline-block;
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.dims {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 16px;
}

.dim {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.dim b {
  font-weight: 560;
  color: var(--color-text);
}
</style>
