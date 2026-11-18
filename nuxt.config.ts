export default defineNuxtConfig({
  modules: ['@nuxt/content'],
  devtools: { enabled: false },
  // Node 22.5+ ships node:sqlite, so no native module install is needed.
  content: { experimental: { sqliteConnector: 'native' } },
  compatibilityDate: '2024-04-03',
})
