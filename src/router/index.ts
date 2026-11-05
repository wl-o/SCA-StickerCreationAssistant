import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/creation',
    },
    {
      path: '/creation',
      name: 'creation',
      component: () => import('@/pages/Creation/index.vue'),
      meta: { title: '新建创作' },
    },
    {
      path: '/rewrite',
      name: 'rewrite',
      component: () => import('@/pages/Rewrite/index.vue'),
      meta: { title: '改写' },
    },
    {
      path: '/results',
      name: 'results',
      component: () => import('@/pages/Creation/Result.vue'),
      meta: { title: '创作结果' },
    },
    {
      path: '/library',
      name: 'library',
      component: () => import('@/pages/ContentLibrary/index.vue'),
      meta: { title: '内容库' },
    },
    {
      path: '/templates',
      name: 'templates',
      component: () => import('@/pages/Templates/index.vue'),
      meta: { title: '模板' },
    },
    {
      path: '/persona',
      name: 'persona',
      component: () => import('@/pages/Persona/index.vue'),
      meta: { title: '人设' },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/pages/Settings/index.vue'),
      meta: { title: 'AI设置' },
    },
  ],
})

router.afterEach((to) => {
  const title = (to.meta.title as string) || 'AI贴图创作助手'
  document.title = `${title} · AI贴图创作助手`
})

export default router
