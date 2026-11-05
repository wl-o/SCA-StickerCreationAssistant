<script setup lang="ts">
import { DIRECTION_OPTIONS } from '@/constants/creation'
import type { CreationDirection } from '@/types'

defineProps<{
  modelValue: CreationDirection[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: CreationDirection[]]
}>()

function toggle(id: CreationDirection, current: CreationDirection[]) {
  if (current.includes(id)) {
    emit(
      'update:modelValue',
      current.filter((item) => item !== id),
    )
  } else {
    emit('update:modelValue', [...current, id])
  }
}
</script>

<template>
  <div class="selector">
    <button
      v-for="item in DIRECTION_OPTIONS"
      :key="item.id"
      type="button"
      class="chip"
      :class="{ 'is-active': modelValue.includes(item.id) }"
      :title="item.description"
      @click="toggle(item.id, modelValue)"
    >
      {{ item.name }}
    </button>
  </div>
</template>

<style scoped>
.selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
