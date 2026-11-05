<script setup lang="ts">
import { STYLE_OPTIONS } from '@/constants/creation'
import type { CreationStyle } from '@/types'

defineProps<{
  modelValue: CreationStyle[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: CreationStyle[]]
}>()

function toggle(id: CreationStyle, current: CreationStyle[]) {
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
      v-for="item in STYLE_OPTIONS"
      :key="item.id"
      type="button"
      class="chip"
      :class="{ 'is-active': modelValue.includes(item.id) }"
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
