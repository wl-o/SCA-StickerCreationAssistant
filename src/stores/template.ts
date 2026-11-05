import { defineStore } from 'pinia'
import { ref } from 'vue'

import { api } from '@/services/storage/api'
import type { ContentTemplate } from '@/types'

export const useTemplateStore = defineStore('template', () => {
  const templates = ref<ContentTemplate[]>([])
  const loading = ref(false)

  async function loadTemplates() {
    loading.value = true
    try {
      templates.value = await api.get<ContentTemplate[]>('/api/templates')
    } finally {
      loading.value = false
    }
  }

  async function createTemplate(input: {
    name: string
    description: string
    structure: string[]
  }) {
    const saved = await api.post<ContentTemplate>('/api/templates', input)
    templates.value.unshift(saved)
    return saved
  }

  async function updateTemplate(id: string, patch: Partial<ContentTemplate>) {
    const saved = await api.put<ContentTemplate>(`/api/templates/${id}`, patch)
    const index = templates.value.findIndex((item) => item.id === id)
    if (index >= 0) templates.value[index] = saved
    return saved
  }

  async function removeTemplate(id: string) {
    await api.delete(`/api/templates/${id}`)
    templates.value = templates.value.filter((item) => item.id !== id)
  }

  return {
    templates,
    loading,
    loadTemplates,
    createTemplate,
    updateTemplate,
    removeTemplate,
  }
})
