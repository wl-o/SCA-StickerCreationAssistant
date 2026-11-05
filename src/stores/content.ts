import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { api } from '@/services/storage/api'
import type { Content } from '@/types'

export const useContentStore = defineStore('content', () => {
  const contents = ref<Content[]>([])
  const searchQuery = ref('')
  const filter = ref<'all' | 'favorite' | 'recent'>('all')
  const loading = ref(false)

  const filteredContents = computed(() => {
    let list = [...contents.value]

    if (filter.value === 'favorite') {
      list = list.filter((item) => item.favorite)
    } else if (filter.value === 'recent') {
      list = list
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 20)
    }

    const q = searchQuery.value.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.content.toLowerCase().includes(q) ||
          item.keyword.toLowerCase().includes(q) ||
          item.directions.some((d) => d.includes(q)) ||
          item.topicAngle.toLowerCase().includes(q),
      )
    }

    return list
  })

  async function loadContents() {
    loading.value = true
    try {
      contents.value = await api.get<Content[]>('/api/contents')
    } finally {
      loading.value = false
    }
  }

  async function saveContents(items: Content[]) {
    const completed = items.filter((item) => item.status === 'completed')
    if (!completed.length) return
    await api.post('/api/contents/batch', { items: completed })
    await loadContents()
  }

  async function saveOne(item: Content) {
    const saved = await api.post<Content>('/api/contents', item)
    const index = contents.value.findIndex((c) => c.id === saved.id)
    if (index >= 0) contents.value[index] = saved
    else contents.value.unshift(saved)
  }

  async function toggleFavorite(id: string) {
    const item = contents.value.find((c) => c.id === id)
    if (!item) return
    const saved = await api.put<Content>(`/api/contents/${id}`, {
      favorite: !item.favorite,
    })
    const index = contents.value.findIndex((c) => c.id === id)
    if (index >= 0) contents.value[index] = saved
  }

  async function removeContent(id: string) {
    await api.delete(`/api/contents/${id}`)
    contents.value = contents.value.filter((c) => c.id !== id)
  }

  async function updateContent(id: string, patch: Partial<Content>) {
    const saved = await api.put<Content>(`/api/contents/${id}`, patch)
    const index = contents.value.findIndex((c) => c.id === id)
    if (index >= 0) contents.value[index] = saved
  }

  return {
    contents,
    searchQuery,
    filter,
    loading,
    filteredContents,
    loadContents,
    saveContents,
    saveOne,
    toggleFavorite,
    removeContent,
    updateContent,
  }
})
