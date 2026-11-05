<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useTemplateStore } from '@/stores/template'
import type { ContentTemplate } from '@/types'

const templateStore = useTemplateStore()
const showCreate = ref(false)
const form = reactive({
  name: '',
  description: '',
  structureText: '标题\n开头\n展开\n观点\n讨论',
})

onMounted(() => {
  void templateStore.loadTemplates()
})

async function createTemplate() {
  const structure = form.structureText
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
  if (!form.name.trim() || structure.length === 0) {
    ElMessage.warning('请填写名称和结构步骤')
    return
  }
  await templateStore.createTemplate({
    name: form.name.trim(),
    description: form.description.trim(),
    structure,
  })
  showCreate.value = false
  form.name = ''
  form.description = ''
  form.structureText = '标题\n开头\n展开\n观点\n讨论'
  ElMessage.success('自定义模板已保存到数据库')
}

async function removeTemplate(item: ContentTemplate) {
  if (item.isBuiltin) {
    ElMessage.warning('内置模板不可删除')
    return
  }
  await ElMessageBox.confirm(`确认删除「${item.name}」？`, '删除模板', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  })
  await templateStore.removeTemplate(item.id)
  ElMessage.success('已删除')
}
</script>

<template>
  <div class="templates-page">
    <div class="header">
      <div>
        <h1 class="page-title">内容模板</h1>
        <p class="page-desc">模板定义一篇内容应如何组织。内置与自定义模板均保存在 SQLite。</p>
      </div>
      <el-button type="primary" @click="showCreate = true">新建模板</el-button>
    </div>

    <div v-if="showCreate" class="create panel">
      <div class="field"><label>模板名称</label><el-input v-model="form.name" /></div>
      <div class="field"><label>描述</label><el-input v-model="form.description" /></div>
      <div class="field">
        <label>结构步骤（每行一步）</label>
        <el-input v-model="form.structureText" type="textarea" :rows="5" />
      </div>
      <div class="actions">
        <el-button type="primary" @click="createTemplate">保存</el-button>
        <el-button @click="showCreate = false">取消</el-button>
      </div>
    </div>

    <div class="grid">
      <article v-for="tpl in templateStore.templates" :key="tpl.id" class="card panel">
        <div class="badge">{{ tpl.isBuiltin ? '内置' : '自定义' }}</div>
        <h3>{{ tpl.name }}</h3>
        <p>{{ tpl.description }}</p>
        <ol>
          <li v-for="(step, index) in tpl.structure" :key="index">{{ step }}</li>
        </ol>
        <div v-if="!tpl.isBuiltin" class="card-actions">
          <el-button size="small" text type="danger" @click="removeTemplate(tpl)">删除</el-button>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
}

.create {
  padding: 20px;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
}

.actions {
  display: flex;
  gap: 8px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.card {
  padding: 20px;
  position: relative;
}

.badge {
  position: absolute;
  top: 16px;
  right: 16px;
  font-size: 11px;
  color: var(--color-primary);
  background: var(--color-primary-soft);
  padding: 2px 8px;
  border-radius: 999px;
}

.card h3 {
  margin: 0 0 6px;
  font-size: 16px;
  padding-right: 48px;
}

.card p {
  margin: 0 0 14px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

ol {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text);
}

.card-actions {
  margin-top: 12px;
}

@media (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
