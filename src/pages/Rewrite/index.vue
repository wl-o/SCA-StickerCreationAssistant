<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import ImagePanel from '@/components/content/ImagePanel.vue'
import TitleCoverPanel from '@/components/rewrite/TitleCoverPanel.vue'
import { polishRewriteResult, rewriteLongContent, type RewriteMode } from '@/services/content/rewriteService'
import { useContentStore } from '@/stores/content'
import { useSettingsStore } from '@/stores/settings'
import type { Content, ContentCoverImage, DiscussionHook } from '@/types'
import {
  copyText,
  formatBodyForCopy,
  formatContentForCopy,
} from '@/utils/content'

const settingsStore = useSettingsStore()
const contentStore = useContentStore()

const sourceText = ref('')
const hintTitle = ref('')
const rewritingMode = ref<RewriteMode | null>(null)
const polishing = ref(false)
const saving = ref(false)
const draftPersisted = ref(false)

const result = reactive({
  id: '',
  title: '',
  content: '',
  discussionHook: '',
  keyword: '',
  keyPoints: [] as string[],
  images: [] as ContentCoverImage[],
  createdAt: '',
})

const polishOptions = [
  { id: 'keep-key', label: '补回关键信息' },
  { id: 'human', label: '像真人重写' },
  { id: 'authentic', label: '更有判断' },
  { id: 'emotion', label: '更有情绪' },
  { id: 'conflict', label: '观点更鲜明' },
  { id: 'colloquial', label: '更自然口语' },
  { id: 'shorten', label: '再压缩' },
]

const isRewriting = computed(() => rewritingMode.value !== null)
const hasResult = computed(() => Boolean(result.title && result.content))

const previewContent = computed<Content | null>(() => {
  if (!hasResult.value || !result.id) return null
  const hooks: DiscussionHook[] = result.discussionHook
    ? [
        {
          type: 'question',
          content: result.discussionHook,
          score: 80,
          recommended: true,
        },
      ]
    : []
  const now = new Date().toISOString()
  return {
    id: result.id,
    title: result.title,
    content: result.content,
    keyword: result.keyword || '改写',
    directions: ['emotion'],
    styles: ['authentic', 'colloquial'],
    topicAngle: result.keyPoints.length ? '保留关键改写' : '长文缩略改写',
    discussionHooks: hooks,
    score: {
      title: 0,
      emotion: 0,
      completeness: 0,
      originality: 0,
      authenticity: 0,
      opinion: 0,
      discussion: 0,
      total: 0,
    },
    createdAt: result.createdAt || now,
    updatedAt: now,
    favorite: false,
    status: 'completed',
    images: result.images,
    coverImage: result.images[0],
    coverImageId: result.images[0]?.id,
  }
})

function ensureDraftId() {
  if (!result.id) result.id = `rewrite-${Date.now()}`
  if (!result.createdAt) result.createdAt = new Date().toISOString()
}

async function applyRewriteResult(data: Awaited<ReturnType<typeof rewriteLongContent>>) {
  ensureDraftId()
  result.title = data.title
  result.content = data.content
  result.discussionHook = data.discussionHook
  result.keyword = data.keyword
  result.keyPoints = data.keyPoints || []
  result.images = []
  result.createdAt = new Date().toISOString()
  draftPersisted.value = false
}

async function handleRewrite(mode: RewriteMode = 'compress') {
  rewritingMode.value = mode
  try {
    const data = await rewriteLongContent(
      settingsStore.ai,
      sourceText.value,
      hintTitle.value,
      mode,
    )
    await applyRewriteResult(data)
    ElMessage.success(mode === 'keep-key' ? '保留关键改写完成' : '缩略改写完成')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '改写失败')
  } finally {
    rewritingMode.value = null
  }
}

async function handlePolish(mode: string) {
  if (!hasResult.value) {
    ElMessage.warning('请先完成改写')
    return
  }
  if (mode === 'keep-key' && !sourceText.value.trim()) {
    ElMessage.warning('补回关键信息需要左侧保留原文')
    return
  }
  polishing.value = true
  try {
    const data = await polishRewriteResult(settingsStore.ai, {
      title: result.title,
      content: result.content,
      discussionHook: result.discussionHook,
      mode,
      keyword: result.keyword,
      sourceText: sourceText.value,
    })
    result.title = data.title
    result.content = data.content
    result.discussionHook = data.discussionHook
    if (data.keyword) result.keyword = data.keyword
    if (data.keyPoints?.length) result.keyPoints = data.keyPoints
    ElMessage.success(mode === 'keep-key' ? '已按原文补回关键信息' : '重写完成')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '重写失败')
  } finally {
    polishing.value = false
  }
}

async function handleCopy(mode: 'body' | 'full') {
  if (!previewContent.value) {
    ElMessage.warning('请先完成改写')
    return
  }
  if (mode === 'body') {
    await copyText(formatBodyForCopy(previewContent.value))
    ElMessage.success('已复制正文')
    return
  }
  await copyText(formatContentForCopy(previewContent.value, true))
  ElMessage.success('已复制内容+讨论')
}

function onImagesUpdated(images: ContentCoverImage[], query: string) {
  result.images = images
  void query
  draftPersisted.value = true
}

async function ensureDraftForImages() {
  if (!previewContent.value) throw new Error('请先完成改写')
  await contentStore.saveOne({
    ...previewContent.value,
    updatedAt: new Date().toISOString(),
  })
  draftPersisted.value = true
}

async function handleSave() {
  if (!previewContent.value) {
    ElMessage.warning('请先完成改写')
    return
  }
  saving.value = true
  try {
    await contentStore.saveOne({
      ...previewContent.value,
      updatedAt: new Date().toISOString(),
    })
    draftPersisted.value = true
    ElMessage.success('已保存到内容库，可继续在右侧配图')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '入库失败')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="rewrite-page">
    <header class="topbar">
      <div class="topbar-text">
        <h1 class="page-title">改写</h1>
        <p class="page-desc">左贴原文 · 中改文案 · 右做封面配图</p>
      </div>
      <div class="topbar-actions">
        <el-button
          class="save-btn"
          type="primary"
          :loading="saving"
          :disabled="!hasResult"
          @click="handleSave"
        >
          保存到内容库
        </el-button>
      </div>
    </header>

    <div class="triptych">
      <!-- 左：原文 -->
      <section class="col panel source">
        <div class="col-head">
          <span class="col-index">01</span>
          <div>
            <div class="col-title">原文</div>
            <div class="col-sub">粘贴长文，选择改写方式</div>
          </div>
        </div>

        <label class="label">正文</label>
        <el-input
          v-model="sourceText"
          class="grow-input"
          type="textarea"
          :autosize="{ minRows: 14, maxRows: 22 }"
          placeholder="把长文粘贴到这里…"
        />
        <label class="label minor">标题提示（可选）</label>
        <el-input v-model="hintTitle" clearable placeholder="不填则由 AI 生成标题" />

        <div class="action-row">
          <el-button
            type="primary"
            :loading="rewritingMode === 'compress'"
            :disabled="!sourceText.trim() || isRewriting"
            @click="handleRewrite('compress')"
          >
            一键缩略改写
          </el-button>
          <el-button
            class="keep-key-btn"
            type="success"
            :loading="rewritingMode === 'keep-key'"
            :disabled="!sourceText.trim() || isRewriting"
            @click="handleRewrite('keep-key')"
          >
            保留关键改写
          </el-button>
        </div>
        <p class="mode-hint">缩略偏短快读；保留关键不漏数字/事实/结论。</p>
      </section>

      <!-- 中：文案 -->
      <section class="col panel result">
        <div class="col-head">
          <span class="col-index">02</span>
          <div>
            <div class="col-title">文案</div>
            <div class="col-sub">改写结果，可继续润色编辑</div>
          </div>
        </div>

        <div class="result-toolbar">
          <el-dropdown trigger="click" :disabled="!hasResult" @command="handlePolish">
            <el-button size="small" :loading="polishing" :disabled="!hasResult">去AI味重写</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-for="opt in polishOptions" :key="opt.id" :command="opt.id">
                  {{ opt.label }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button
            size="small"
            plain
            :loading="polishing"
            :disabled="!hasResult"
            @click="handlePolish('keep-key')"
          >
            补回关键信息
          </el-button>
          <el-button
            size="small"
            :disabled="!hasResult"
            @click="handleCopy('body')"
          >
            复制正文
          </el-button>
          <el-button
            size="small"
            plain
            :disabled="!hasResult"
            @click="handleCopy('full')"
          >
            复制内容+讨论
          </el-button>
        </div>

        <template v-if="hasResult">
          <label class="label">标题</label>
          <el-input v-model="result.title" />
          <label class="label">正文</label>
          <el-input
            v-model="result.content"
            class="grow-input"
            type="textarea"
            :autosize="{ minRows: 10, maxRows: 18 }"
          />
          <label class="label">讨论引导</label>
          <el-input v-model="result.discussionHook" type="textarea" :rows="2" />
          <label class="label minor">主题词</label>
          <el-input v-model="result.keyword" />

          <div v-if="result.keyPoints.length" class="key-points">
            <div class="key-points-title">已保留的关键信息</div>
            <ul>
              <li v-for="(item, index) in result.keyPoints" :key="`${index}-${item}`">{{ item }}</li>
            </ul>
          </div>
        </template>
        <div v-else class="empty">改写结果会出现在这里</div>
      </section>

      <!-- 右：封面 + 配图 -->
      <section class="col panel visuals">
        <div class="col-head">
          <span class="col-index">03</span>
          <div>
            <div class="col-title">视觉</div>
            <div class="col-sub">封面与配图；保存后仍可继续配图</div>
          </div>
        </div>

        <template v-if="hasResult">
          <div class="visual-block">
            <TitleCoverPanel :title="result.title" :subtitle="result.keyword" />
          </div>
          <div class="visual-block image-block">
            <ImagePanel
              v-if="previewContent"
              :content="previewContent"
              :ensure-content="ensureDraftForImages"
              @updated="onImagesUpdated"
            />
          </div>
        </template>
        <div v-else class="empty visuals-empty">完成改写后，在这里做封面和配图</div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.rewrite-page {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  flex-shrink: 0;
  padding: 4px 2px 2px;
}

.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.page-desc {
  margin: 4px 0 0;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.topbar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.save-btn {
  min-width: 128px;
  font-weight: 600;
}

.triptych {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(280px, 1fr) minmax(320px, 1.15fr) minmax(300px, 1fr);
  grid-template-rows: minmax(0, 1fr);
  gap: 12px;
  align-items: stretch;
  overflow: hidden;
}

.col {
  min-height: 0;
  min-width: 0;
  height: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(31, 35, 41, 0.04);
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.col-head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eef1f5;
  margin-bottom: 2px;
}

.col-index {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-primary);
  background: var(--color-primary-soft);
}

.col-title {
  font-size: 15px;
  font-weight: 650;
}

.col-sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.label {
  font-size: 13px;
  font-weight: 600;
}

.label.minor {
  font-weight: 500;
  color: var(--color-text-secondary);
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.action-row :deep(.el-button) {
  min-width: 124px;
}

.keep-key-btn {
  --el-button-bg-color: #16a34a;
  --el-button-border-color: #16a34a;
  --el-button-hover-bg-color: #15803d;
  --el-button-hover-border-color: #15803d;
  --el-button-active-bg-color: #166534;
  --el-button-active-border-color: #166534;
}

.mode-hint {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.result-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.key-points {
  padding: 10px 12px;
  border-radius: 10px;
  background: #f7f8fa;
  border: 1px solid #e8ebf0;
}

.key-points-title {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}

.key-points ul {
  margin: 0;
  padding-left: 18px;
}

.key-points li {
  font-size: 13px;
  line-height: 1.55;
}

.visual-block + .visual-block {
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px dashed #e5e8ef;
}

.image-block {
  min-height: 0;
}

.empty {
  flex: 1;
  min-height: 180px;
  display: grid;
  place-items: center;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 14px;
  border: 1px dashed #d9dee7;
  border-radius: 12px;
  background: #fafbfc;
  padding: 24px;
}

.visuals-empty {
  min-height: 280px;
}

@media (max-width: 1200px) {
  .triptych {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
  }

  .visuals {
    grid-column: 1 / -1;
  }
}

@media (max-width: 860px) {
  .triptych {
    grid-template-columns: 1fr;
    grid-template-rows: repeat(3, minmax(0, 1fr));
  }

  .visuals {
    grid-column: auto;
  }
}
</style>
