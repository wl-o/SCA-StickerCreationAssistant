<script setup lang="ts">
import type { AISettings, AIProviderType } from '@/types'
import { resolveProviderDefaults } from '@/services/ai/types'

const props = defineProps<{
  modelValue: AISettings
  status: 'idle' | 'testing' | 'success' | 'failed'
  message: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: AISettings]
  test: []
}>()

const providers: { id: AIProviderType; label: string }[] = [
  { id: 'deepseek', label: 'DeepSeek' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'openai-compatible', label: 'OpenAI Compatible' },
  { id: 'anthropic', label: 'Anthropic' },
]

function patch(partial: Partial<AISettings>) {
  if (partial.provider && partial.provider !== props.modelValue.provider) {
    const defaults = resolveProviderDefaults(partial.provider)
    emit('update:modelValue', {
      ...props.modelValue,
      ...partial,
      baseUrl: defaults.baseUrl || props.modelValue.baseUrl,
      model: defaults.model || props.modelValue.model,
    })
    return
  }
  emit('update:modelValue', { ...props.modelValue, ...partial })
}
</script>

<template>
  <div class="ai-settings panel">
    <h3 class="section-title">AI 模型</h3>
    <p class="section-desc">
      API Key 仅保存在本地。DeepSeek 推荐：Base URL
      <code>https://api.deepseek.com/v1</code>，Model
      <code>deepseek-flash</code>（旧名 deepseek-chat / deepseek-v4-flash 已退役）。
    </p>

    <div class="provider-row">
      <button
        v-for="item in providers"
        :key="item.id"
        type="button"
        class="chip"
        :class="{ 'is-active': modelValue.provider === item.id }"
        @click="patch({ provider: item.id })"
      >
        {{ item.label }}
      </button>
    </div>

    <div class="grid">
      <div class="field">
        <label>API Key</label>
        <el-input
          :model-value="modelValue.apiKey"
          type="password"
          placeholder="sk-..."
          show-password
          @update:model-value="patch({ apiKey: String($event) })"
        />
      </div>
      <div class="field">
        <label>Base URL</label>
        <el-input
          :model-value="modelValue.baseUrl"
          placeholder="https://api.openai.com/v1"
          @update:model-value="patch({ baseUrl: String($event) })"
        />
      </div>
      <div class="field">
        <label>Model</label>
        <el-input
          :model-value="modelValue.model"
          :placeholder="modelValue.provider === 'deepseek' ? 'deepseek-flash' : 'gpt-4o-mini'"
          @update:model-value="patch({ model: String($event) })"
        />
        <div v-if="modelValue.provider === 'deepseek'" class="model-presets">
          <button type="button" class="preset" @click="patch({ model: 'deepseek-flash' })">
            deepseek-flash
          </button>
          <button type="button" class="preset" @click="patch({ model: 'deepseek-v4-pro' })">
            deepseek-v4-pro
          </button>
        </div>
      </div>
      <div class="field">
        <label>Temperature · {{ modelValue.temperature }}</label>
        <el-slider
          :model-value="modelValue.temperature"
          :min="0"
          :max="2"
          :step="0.1"
          @update:model-value="patch({ temperature: Number($event) })"
        />
      </div>
      <div class="field">
        <label>Max Tokens</label>
        <el-input-number
          :model-value="modelValue.maxTokens"
          :min="256"
          :max="8192"
          :step="128"
          @update:model-value="patch({ maxTokens: Number($event) })"
        />
      </div>
    </div>

    <div class="footer">
      <el-button type="primary" :loading="status === 'testing'" @click="emit('test')">
        测试连接
      </el-button>
      <span
        class="msg"
        :class="{
          ok: status === 'success',
          err: status === 'failed',
        }"
      >
        {{ message }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.ai-settings {
  padding: 24px;
}

.section-title {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 600;
}

.section-desc {
  margin: 0 0 18px;
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.section-desc code {
  font-size: 12px;
  background: var(--color-bg-muted);
  padding: 1px 6px;
  border-radius: 4px;
}

.provider-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
}

.field:first-child {
  grid-column: 1 / -1;
}

.model-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.preset {
  border: 1px solid var(--color-border);
  background: #fff;
  border-radius: 6px;
  padding: 2px 8px;
  font-size: 12px;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.preset:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.footer {
  margin-top: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.msg {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.msg.ok {
  color: #067647;
}

.msg.err {
  color: #b42318;
}

@media (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
