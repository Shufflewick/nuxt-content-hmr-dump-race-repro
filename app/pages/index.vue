<script setup lang="ts">
// server: false makes the browser load its SQLite database with collection A, as a client-side navigation would.
const { data: page } = useAsyncData('a-index', () => queryCollection('a').path('/a').first(), { server: false })

// Run only on click, so collection B is not loaded in the browser until the HMR event arrives.
const bResult = ref('not queried yet')
async function queryB() {
  try {
    bResult.value = `ok: ${await queryCollection('b').count()} rows`
  } catch (error) {
    bResult.value = `error: ${error instanceof Error ? error.message : String(error)}`
  }
}
</script>

<template>
  <main>
    <ContentRenderer v-if="page" :value="page" />
    <button id="query-b" type="button" @click="queryB">Query collection B in the browser</button>
    <p id="b-result">{{ bResult }}</p>
  </main>
</template>
