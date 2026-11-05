import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { api } from '@/services/storage/api'
import type { Persona } from '@/types'

export const usePersonaStore = defineStore('persona', () => {
  const personas = ref<Persona[]>([])
  const activePersonaId = ref('')
  const loading = ref(false)

  const activePersona = computed(
    () => personas.value.find((item) => item.id === activePersonaId.value) ?? personas.value[0],
  )

  async function loadPersonas() {
    loading.value = true
    try {
      personas.value = await api.get<Persona[]>('/api/personas')
      const active = await api.get<{ id: string }>('/api/settings/active-persona')
      activePersonaId.value =
        active.id && personas.value.some((p) => p.id === active.id)
          ? active.id
          : personas.value[0]?.id || ''
    } finally {
      loading.value = false
    }
  }

  async function setActivePersona(id: string) {
    activePersonaId.value = id
    await api.put('/api/settings/active-persona', { id })
  }

  async function upsertPersona(persona: Persona) {
    const exists = personas.value.some((item) => item.id === persona.id)
    const saved = exists
      ? await api.put<Persona>(`/api/personas/${persona.id}`, persona)
      : await api.post<Persona>('/api/personas', persona)

    const index = personas.value.findIndex((item) => item.id === saved.id)
    if (index >= 0) personas.value[index] = saved
    else personas.value.push(saved)

    if (!activePersonaId.value) {
      await setActivePersona(saved.id)
    }
    return saved
  }

  async function removePersona(id: string) {
    if (personas.value.length <= 1) {
      throw new Error('至少保留一个人设')
    }
    await api.delete(`/api/personas/${id}`)
    personas.value = personas.value.filter((item) => item.id !== id)
    if (activePersonaId.value === id) {
      await setActivePersona(personas.value[0].id)
    }
  }

  return {
    personas,
    activePersonaId,
    activePersona,
    loading,
    loadPersonas,
    setActivePersona,
    upsertPersona,
    removePersona,
  }
})
