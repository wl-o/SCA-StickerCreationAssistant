<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import CreationForm from '@/components/creation/CreationForm.vue'
import GenerationProgress from '@/components/creation/GenerationProgress.vue'
import { useCreationStore } from '@/stores/creation'

const router = useRouter()
const creationStore = useCreationStore()

async function handleGenerate() {
  try {
    const promise = creationStore.startGeneration()
    await router.push('/results')
    await promise
  } catch (error) {
    ElMessage.warning(error instanceof Error ? error.message : '生成失败')
  }
}
</script>

<template>
  <div class="creation-page">
    <div class="creation-scroll">
      <CreationForm />

      <GenerationProgress
        class="progress-block"
        :task="creationStore.currentTask"
        :is-generating="creationStore.isGenerating"
      />
    </div>

    <div class="actions">
      <el-button
        type="primary"
        size="large"
        :loading="creationStore.isGenerating"
        @click="handleGenerate"
      >
        ✨ 开始批量创作
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.creation-page {
  flex: 1;
  min-height: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-muted);
}

.creation-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 24px 28px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.creation-scroll :deep(.form.panel) {
  flex: 1;
  width: 100%;
  max-width: none;
}

.progress-block {
  width: 100%;
}

.actions {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  padding: 16px 28px 24px;
  border-top: 1px solid var(--color-border);
  background: #fff;
}

.actions :deep(.el-button) {
  min-width: 220px;
  border-radius: 6px;
}
</style>
