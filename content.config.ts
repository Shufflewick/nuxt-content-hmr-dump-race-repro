import { defineContentConfig, defineCollection } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    a: defineCollection({ type: 'page', source: 'a/**' }),
    // Many large files, so its compressed dump takes a while to rebuild and write.
    b: defineCollection({ type: 'page', source: 'b/**' }),
  },
})
