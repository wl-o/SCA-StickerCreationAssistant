<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Collection,
  Document,
  EditPen,
  Files,
  Setting,
  User,
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

const navItems = [
  { path: '/creation', label: '创作', icon: EditPen },
  { path: '/rewrite', label: '改写', icon: Document },
  { path: '/library', label: '内容库', icon: Collection },
  { path: '/templates', label: '模板', icon: Files },
  { path: '/persona', label: '人设', icon: User },
  { path: '/settings', label: '设置', icon: Setting },
]

const activePath = computed(() => {
  if (route.path.startsWith('/results')) return '/creation'
  return route.path
})

const mainBodyClass = computed(() => ({
  'is-creation': activePath.value === '/creation',
  'is-rewrite': activePath.value === '/rewrite',
}))

function go(path: string) {
  router.push(path)
}
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand" @click="go('/creation')">
        <div class="brand-mark">AI</div>
        <div class="brand-text">
          <div class="brand-name">贴图创作助手</div>
          <div class="brand-sub">批量 · 质量 · 讨论</div>
        </div>
      </div>

      <nav class="nav">
        <button
          v-for="item in navItems"
          :key="item.path"
          class="nav-item"
          :class="{ active: activePath === item.path }"
          type="button"
          @click="go(item.path)"
        >
          <el-icon :size="18"><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </button>
      </nav>

      <div class="sidebar-footer">SQLite · 本地持久化</div>
    </aside>

    <main class="main">
      <div class="main-body" :class="mainBodyClass">
        <RouterView />
      </div>
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  width: var(--sidebar-width);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--color-border);
  background: #fff;
  padding: 20px 14px;
}

.brand {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 4px 8px 20px;
  cursor: pointer;
}

.brand-mark {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-size: 13px;
  font-weight: 700;
}

.brand-name {
  font-size: 14px;
  font-weight: 600;
}

.brand-sub {
  margin-top: 2px;
  font-size: 11px;
  color: var(--color-text-secondary);
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 14px;
  cursor: pointer;
  text-align: left;
}

.nav-item:hover {
  background: var(--color-bg-muted);
  color: var(--color-text);
}

.nav-item.active {
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-weight: 560;
}

.sidebar-footer {
  padding: 12px 8px 4px;
  font-size: 12px;
  color: #98a2b3;
}

.main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-body {
  flex: 1;
  min-height: 0;
  padding: 24px 28px 40px;
  overflow: auto;
}

.main-body.is-creation {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.main-body.is-rewrite {
  padding: 16px 18px 24px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.main-body.is-rewrite > :deep(*) {
  flex: 1;
  min-height: 0;
}

@media (max-width: 900px) {
  .sidebar {
    display: none;
  }

  .main-body {
    padding: 16px;
  }

  .main-body.is-creation {
    padding: 0;
  }

  .main-body.is-rewrite {
    padding: 12px;
    overflow: hidden;
  }
}
</style>
