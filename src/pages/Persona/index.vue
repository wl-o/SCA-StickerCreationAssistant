<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { usePersonaStore } from '@/stores/persona'
import type { Persona } from '@/types'

const personaStore = usePersonaStore()
const selectedId = ref('')
const saving = ref(false)

const emptyPersona = (): Persona => ({
  id: '',
  name: '',
  identity: '',
  age: '',
  occupation: '',
  lifeBackground: '',
  familyBackground: '',
  personality: '',
  languageStyle: '口语化',
  values: '',
  goodAtTopics: '',
  badAtTopics: '',
  forbiddenExpressions: '',
  commonWords: '',
  bannedWords: '',
})

const form = reactive<Persona>(emptyPersona())

onMounted(async () => {
  if (!personaStore.personas.length) {
    await personaStore.loadPersonas()
  }
  selectPersona(personaStore.activePersonaId || personaStore.personas[0]?.id)
})

watch(
  () => personaStore.personas,
  (list) => {
    if (!selectedId.value && list[0]) selectPersona(list[0].id)
  },
)

function selectPersona(id?: string) {
  if (!id) return
  const found = personaStore.personas.find((item) => item.id === id)
  if (!found) return
  selectedId.value = id
  Object.assign(form, found)
}

async function createPersona() {
  const next: Persona = {
    ...emptyPersona(),
    id: `persona-${Date.now()}`,
    name: '新人设',
  }
  const saved = await personaStore.upsertPersona(next)
  selectPersona(saved.id)
  ElMessage.success('已创建人设')
}

async function savePersona() {
  if (!form.name.trim()) {
    ElMessage.warning('请填写人设名称')
    return
  }
  saving.value = true
  try {
    await personaStore.upsertPersona({ ...form })
    ElMessage.success('人设已保存到数据库')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存失败')
  } finally {
    saving.value = false
  }
}

async function setDefault() {
  await personaStore.setActivePersona(form.id)
  ElMessage.success('已设为当前创作人设')
}

async function removeCurrent() {
  try {
    await ElMessageBox.confirm(`确认删除「${form.name}」？`, '删除人设', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    await personaStore.removePersona(form.id)
    selectPersona(personaStore.activePersonaId || personaStore.personas[0]?.id)
    ElMessage.success('已删除')
  } catch (error) {
    if (error === 'cancel' || error === 'close') return
    ElMessage.error(error instanceof Error ? error.message : '删除失败')
  }
}
</script>

<template>
  <div class="persona-page">
    <div class="header">
      <div>
        <h1 class="page-title">账号人设</h1>
        <p class="page-desc">独立维护账号人设，创作时自动继承当前人设。数据保存在 SQLite。</p>
      </div>
      <el-button type="primary" @click="createPersona">新建人设</el-button>
    </div>

    <div class="layout">
      <aside class="list panel">
        <button
          v-for="item in personaStore.personas"
          :key="item.id"
          type="button"
          class="persona-item"
          :class="{ active: selectedId === item.id }"
          @click="selectPersona(item.id)"
        >
          <div class="name">{{ item.name }}</div>
          <div class="sub">{{ item.identity || item.occupation || '未填写身份' }}</div>
          <div v-if="personaStore.activePersonaId === item.id" class="badge">当前使用</div>
        </button>
      </aside>

      <section class="editor panel">
        <div class="persona-grid">
          <div class="field"><label>人设名称</label><el-input v-model="form.name" /></div>
          <div class="field"><label>人物身份</label><el-input v-model="form.identity" /></div>
          <div class="field"><label>年龄</label><el-input v-model="form.age" /></div>
          <div class="field"><label>职业</label><el-input v-model="form.occupation" /></div>
          <div class="field full">
            <label>生活背景</label>
            <el-input v-model="form.lifeBackground" type="textarea" :rows="2" />
          </div>
          <div class="field full">
            <label>家庭背景</label>
            <el-input v-model="form.familyBackground" type="textarea" :rows="2" />
          </div>
          <div class="field"><label>性格</label><el-input v-model="form.personality" /></div>
          <div class="field"><label>语言风格</label><el-input v-model="form.languageStyle" /></div>
          <div class="field full"><label>价值观</label><el-input v-model="form.values" /></div>
          <div class="field"><label>擅长话题</label><el-input v-model="form.goodAtTopics" /></div>
          <div class="field"><label>不擅长话题</label><el-input v-model="form.badAtTopics" /></div>
          <div class="field">
            <label>禁止表达</label>
            <el-input v-model="form.forbiddenExpressions" />
          </div>
          <div class="field"><label>常用词汇</label><el-input v-model="form.commonWords" /></div>
          <div class="field full"><label>禁用词汇</label><el-input v-model="form.bannedWords" /></div>
        </div>

        <div class="actions">
          <el-button type="primary" :loading="saving" @click="savePersona">保存到数据库</el-button>
          <el-button @click="setDefault">设为当前创作人设</el-button>
          <el-button type="danger" plain @click="removeCurrent">删除</el-button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 18px;
}

.layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 12px;
  min-height: 560px;
}

.list {
  padding: 8px;
  overflow: auto;
}

.persona-item {
  width: 100%;
  text-align: left;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  position: relative;
}

.persona-item:hover,
.persona-item.active {
  background: var(--color-bg-muted);
}

.persona-item.active {
  border-color: #d8dcff;
}

.name {
  font-size: 14px;
  font-weight: 600;
}

.sub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.badge {
  margin-top: 8px;
  display: inline-block;
  font-size: 11px;
  color: var(--color-primary);
  background: var(--color-primary-soft);
  padding: 2px 8px;
  border-radius: 999px;
}

.editor {
  padding: 24px;
}

.persona-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
}

.field.full {
  grid-column: 1 / -1;
}

.actions {
  margin-top: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .persona-grid {
    grid-template-columns: 1fr;
  }
}
</style>
