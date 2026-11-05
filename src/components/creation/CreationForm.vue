<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { COUNT_OPTIONS, LENGTH_OPTIONS } from '@/constants/creation'
import { useCreationStore } from '@/stores/creation'
import { usePersonaStore } from '@/stores/persona'
import { useTemplateStore } from '@/stores/template'
import DirectionSelector from './DirectionSelector.vue'
import StyleSelector from './StyleSelector.vue'

const creationStore = useCreationStore()
const personaStore = usePersonaStore()
const templateStore = useTemplateStore()

const form = computed(() => creationStore.form)
const showTokenHint = computed(() => form.value.count > 20)

const templateOptions = computed(() => [
  { id: 'auto', name: '自动选择' },
  ...templateStore.templates.map((item) => ({ id: item.id, name: item.name })),
])

onMounted(async () => {
  if (!personaStore.personas.length) await personaStore.loadPersonas()
  if (!templateStore.templates.length) await templateStore.loadTemplates()
  if (personaStore.activePersonaId) {
    form.value.personaId = personaStore.activePersonaId
  }
})

</script>

<template>
  <div class="form panel">
    <section class="field">
      <label class="label">关键词</label>
      <el-input
        v-model="form.keyword"
        size="large"
        placeholder="输入关键词或主题，例如：60岁以后的人生"
        maxlength="80"
        show-word-limit
        clearable
      />
    </section>

    <section class="field">
      <label class="label">创作方向</label>
      <p class="hint">可多选，组合不同角度提升差异化</p>
      <DirectionSelector v-model="form.directions" />
    </section>

    <section class="field">
      <label class="label">创作风格</label>
      <StyleSelector v-model="form.styles" />
    </section>

    <section class="sliders">
      <div class="slider-item">
        <div class="slider-head">
          <span>情绪强度</span>
          <span class="slider-value">{{ form.emotionIntensity }}</span>
        </div>
        <el-slider v-model="form.emotionIntensity" :show-tooltip="false" />
        <div class="slider-ends"><span>低</span><span>高</span></div>
      </div>
      <div class="slider-item">
        <div class="slider-head">
          <span>观点强度</span>
          <span class="slider-value">{{ form.opinionIntensity }}</span>
        </div>
        <el-slider v-model="form.opinionIntensity" :show-tooltip="false" />
        <div class="slider-ends"><span>温和</span><span>尖锐</span></div>
      </div>
      <div class="slider-item">
        <div class="slider-head">
          <span>争议程度</span>
          <span class="slider-value">{{ form.controversyLevel }}</span>
        </div>
        <el-slider v-model="form.controversyLevel" :show-tooltip="false" />
        <div class="slider-ends"><span>低</span><span>高</span></div>
      </div>
    </section>

    <section class="row-fields">
      <div class="field grow">
        <label class="label">生成数量</label>
        <div class="count-row">
          <el-input-number v-model="form.count" :min="1" :max="30" :step="1" />
          <div class="count-presets">
            <button
              v-for="n in COUNT_OPTIONS"
              :key="n"
              type="button"
              class="chip compact"
              :class="{ 'is-active': form.count === n }"
              @click="form.count = n"
            >
              {{ n }}
            </button>
          </div>
        </div>
        <p v-if="showTokenHint" class="warn">批量生成数量较大，预计消耗更多 Token。</p>
      </div>

      <div class="field">
        <label class="label">内容长度</label>
        <div class="length-row">
          <button
            v-for="item in LENGTH_OPTIONS"
            :key="item.id"
            type="button"
            class="chip"
            :class="{ 'is-active': form.length === item.id }"
            @click="form.length = item.id"
          >
            {{ item.name }}
          </button>
        </div>
      </div>
    </section>

    <section class="row-fields">
      <div class="field grow">
        <label class="label">账号人设</label>
        <el-select v-model="form.personaId" style="width: 100%">
          <el-option
            v-for="persona in personaStore.personas"
            :key="persona.id"
            :label="persona.name"
            :value="persona.id"
          />
        </el-select>
      </div>
      <div class="field grow">
        <label class="label">内容模板</label>
        <el-select v-model="form.templateId" style="width: 100%">
          <el-option
            v-for="tpl in templateOptions"
            :key="tpl.id"
            :label="tpl.name"
            :value="tpl.id"
          />
        </el-select>
      </div>
    </section>
  </div>
</template>

<style scoped>
.form {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.hint {
  margin: -2px 0 0;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.sliders {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.slider-head {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  margin-bottom: 4px;
}

.slider-value {
  color: var(--color-text-secondary);
}

.slider-ends {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #98a2b3;
  margin-top: -4px;
}

.row-fields {
  display: flex;
  gap: 20px;
}

.grow {
  flex: 1;
}

.count-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.count-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.compact {
  padding: 6px 10px;
}

.length-row {
  display: flex;
  gap: 8px;
}

.warn {
  margin: 0;
  font-size: 12px;
  color: #b54708;
}

@media (max-width: 900px) {
  .sliders,
  .row-fields {
    grid-template-columns: 1fr;
    flex-direction: column;
  }
}
</style>
