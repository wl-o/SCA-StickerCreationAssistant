import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import {
  generateOneContent,
  planTopics,
  polishContent,
} from '@/services/content/generationPipeline'
import { useContentStore } from '@/stores/content'
import { usePersonaStore } from '@/stores/persona'
import { useSettingsStore } from '@/stores/settings'
import type { Content, CreationFormState, GenerationStatus, GenerationTask, Persona } from '@/types'

const defaultForm = (): CreationFormState => ({
  keyword: '',
  directions: ['emotion', 'opinion', 'resonance'],
  styles: ['authentic', 'restrained'],
  emotionIntensity: 60,
  opinionIntensity: 50,
  controversyLevel: 40,
  count: 1,
  length: 'medium',
  personaId: 'persona-default',
  templateId: 'auto',
})

export const useCreationStore = defineStore('creation', () => {
  const form = ref<CreationFormState>(defaultForm())
  const currentTask = ref<GenerationTask | null>(null)
  const selectedContentId = ref<string | null>(null)
  const isGenerating = ref(false)

  const selectedContent = computed(() => {
    if (!currentTask.value || !selectedContentId.value) return null
    return currentTask.value.contents.find((item) => item.id === selectedContentId.value) ?? null
  })

  const completedCount = computed(
    () => currentTask.value?.contents.filter((item) => item.status === 'completed').length ?? 0,
  )

  const failedCount = computed(
    () => currentTask.value?.contents.filter((item) => item.status === 'failed').length ?? 0,
  )

  function resetForm() {
    form.value = defaultForm()
  }

  function selectContent(id: string) {
    selectedContentId.value = id
  }

  function updateContent(id: string, patch: Partial<Content>) {
    if (!currentTask.value) return
    const index = currentTask.value.contents.findIndex((item) => item.id === id)
    if (index < 0) return
    currentTask.value.contents[index] = {
      ...currentTask.value.contents[index],
      ...patch,
      updatedAt: new Date().toISOString(),
    }
  }

  function resolvePersona(): Persona {
    const personaStore = usePersonaStore()
    return (
      personaStore.personas.find((item) => item.id === form.value.personaId) ??
      personaStore.activePersona ??
      ({
        id: 'persona-default',
        name: '默认人设',
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
      } satisfies Persona)
    )
  }

  async function persistToLibrary(item: Content) {
    if (item.status !== 'completed' || !item.title.trim()) return
    try {
      const contentStore = useContentStore()
      await contentStore.saveOne(item)
    } catch (error) {
      console.error('自动保存到内容库失败', error)
    }
  }

  function isCancelled(): boolean {
    return currentTask.value?.status === 'cancelled'
  }

  async function startGeneration() {
    if (!form.value.keyword.trim()) {
      throw new Error('请输入关键词')
    }
    if (form.value.directions.length === 0) {
      throw new Error('请至少选择一个创作方向')
    }
    if (form.value.styles.length === 0) {
      throw new Error('请至少选择一个创作风格')
    }

    const settingsStore = useSettingsStore()
    if (!settingsStore.ai.apiKey.trim()) {
      throw new Error('请先在设置页配置 DeepSeek API Key')
    }

    isGenerating.value = true
    const count = form.value.count
    const taskId = `task-${Date.now()}`
    const now = new Date().toISOString()
    const persona = resolvePersona()

    const placeholders: Content[] = Array.from({ length: count }, (_, index) => ({
      id: `${taskId}-${index + 1}`,
      title: '',
      content: '',
      keyword: form.value.keyword,
      directions: [...form.value.directions],
      styles: [...form.value.styles],
      topicAngle: '',
      discussionHooks: [],
      score: emptyScore(),
      personaId: form.value.personaId,
      templateId: form.value.templateId === 'auto' ? undefined : form.value.templateId,
      createdAt: now,
      updatedAt: now,
      favorite: false,
      status: 'pending',
    }))

    currentTask.value = {
      id: taskId,
      status: 'planning',
      progress: 0,
      total: count,
      completed: 0,
      currentStep: '正在规划选题...',
      contents: placeholders,
      form: {
        ...form.value,
        directions: [...form.value.directions],
        styles: [...form.value.styles],
      },
      createdAt: now,
    }
    selectedContentId.value = null

    try {
      const topics = await planTopics(settingsStore.ai, form.value, persona)
      if (!currentTask.value || isCancelled()) return

      setTaskStatus('generating', '正在生成内容...')

      for (let i = 0; i < count; i++) {
        if (!currentTask.value || isCancelled()) break

        currentTask.value.currentStep = `正在生成第 ${i + 1} 条...`
        currentTask.value.contents[i].status = 'generating'
        if (!selectedContentId.value) {
          selectedContentId.value = currentTask.value.contents[i].id
        }

        const existingTitles = currentTask.value.contents
          .filter((item) => item.status === 'completed' && item.title)
          .map((item) => item.title)

        try {
          const generated = await generateOneContent({
            settings: settingsStore.ai,
            form: form.value,
            persona,
            topic: topics[i],
            existingTitles,
            id: currentTask.value.contents[i].id,
          })
          if (!currentTask.value || isCancelled()) break
          currentTask.value.contents[i] = generated
          await persistToLibrary(generated)
        } catch (error) {
          if (!currentTask.value) break
          currentTask.value.contents[i] = {
            ...currentTask.value.contents[i],
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : '生成失败',
            title: `第 ${i + 1} 条生成失败`,
            content: '',
            updatedAt: new Date().toISOString(),
          }
        }

        currentTask.value.completed = currentTask.value.contents.filter(
          (item) => item.status === 'completed',
        ).length
        currentTask.value.progress = Math.round(((i + 1) / count) * 100)
      }

      if (currentTask.value && !isCancelled()) {
        const ok = currentTask.value.contents.filter((item) => item.status === 'completed').length
        const fail = currentTask.value.contents.filter((item) => item.status === 'failed').length
        if (ok === 0) {
          setTaskStatus('failed', fail ? `全部失败（${fail}）` : '生成失败')
        } else {
          setTaskStatus('completed', fail ? `完成 ${ok} 条，失败 ${fail} 条` : '生成完成')
        }
        const firstOk = currentTask.value.contents.find((item) => item.status === 'completed')
        if (firstOk) selectedContentId.value = firstOk.id
      }
    } catch (error) {
      if (currentTask.value) {
        currentTask.value.errorMessage =
          error instanceof Error ? error.message : '选题规划失败'
        setTaskStatus('failed', currentTask.value.errorMessage)
      }
      throw error
    } finally {
      isGenerating.value = false
    }
  }

  function setTaskStatus(status: GenerationStatus, step: string) {
    if (!currentTask.value) return
    currentTask.value.status = status
    currentTask.value.currentStep = step
  }

  function cancelGeneration() {
    if (!currentTask.value) return
    currentTask.value.status = 'cancelled'
    currentTask.value.currentStep = '已取消'
    isGenerating.value = false
  }

  async function regenerateOne(id: string) {
    if (!currentTask.value) return
    const index = currentTask.value.contents.findIndex((item) => item.id === id)
    if (index < 0) return

    const settingsStore = useSettingsStore()
    if (!settingsStore.ai.apiKey.trim()) {
      throw new Error('请先在设置页配置 API Key')
    }

    const item = currentTask.value.contents[index]
    item.status = 'generating'
    item.errorMessage = undefined

    const persona = resolvePersona()
    const existingTitles = currentTask.value.contents
      .filter((c) => c.id !== id && c.status === 'completed' && c.title)
      .map((c) => c.title)

    try {
      const generated = await generateOneContent({
        settings: settingsStore.ai,
        form: currentTask.value.form,
        persona,
        topic: {
          angle: item.topicAngle || `重写角度${index + 1}`,
          topic: item.title || `${item.keyword}重写`,
          core_conflict: '换一个更有差异的切入点',
          target_emotion: '共鸣',
        },
        existingTitles,
        id: item.id,
      })
      generated.favorite = item.favorite
      generated.createdAt = item.createdAt
      currentTask.value.contents[index] = generated
      currentTask.value.completed = currentTask.value.contents.filter(
        (c) => c.status === 'completed',
      ).length
      await persistToLibrary(generated)
    } catch (error) {
      currentTask.value.contents[index] = {
        ...item,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : '重新生成失败',
        updatedAt: new Date().toISOString(),
      }
      throw error
    }
  }

  async function polishOne(id: string, mode: string) {
    if (!currentTask.value) return
    const item = currentTask.value.contents.find((c) => c.id === id)
    if (!item || item.status !== 'completed') return

    const settingsStore = useSettingsStore()
    if (!settingsStore.ai.apiKey.trim()) {
      throw new Error('请先在设置页配置 API Key')
    }

    const persona = resolvePersona()
    const result = await polishContent({
      settings: settingsStore.ai,
      persona,
      title: item.title,
      content: item.content,
      mode,
    })
    updateContent(id, { title: result.title, content: result.content })
    const latest = currentTask.value.contents.find((c) => c.id === id)
    if (latest) await persistToLibrary(latest)
  }

  async function retryFailed() {
    if (!currentTask.value) return
    const failed = currentTask.value.contents.filter((item) => item.status === 'failed')
    for (const item of failed) {
      await regenerateOne(item.id)
    }
  }

  return {
    form,
    currentTask,
    selectedContentId,
    selectedContent,
    completedCount,
    failedCount,
    isGenerating,
    resetForm,
    selectContent,
    updateContent,
    startGeneration,
    cancelGeneration,
    regenerateOne,
    polishOne,
    retryFailed,
  }
})

function emptyScore() {
  return {
    title: 0,
    emotion: 0,
    completeness: 0,
    originality: 0,
    authenticity: 0,
    opinion: 0,
    discussion: 0,
    total: 0,
  }
}
