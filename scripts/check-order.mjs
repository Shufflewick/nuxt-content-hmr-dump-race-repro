// Run with the dev server up: `npm run check-order` (defaults to http://localhost:3000).
// Listens on the dev server's HMR socket like a browser tab, edits one file in collection B, and
// as soon as the `nuxt-content:update` event arrives fetches B's dump, the request a tab that has
// not loaded B makes. Reports whether that dump already contains the edit the event announced,
// then fetches again until it does, to show how long the dump lags the event.
import { appendFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'

const base = process.argv[2] ?? 'http://localhost:3000'
const runs = Number(process.argv[3] ?? 5)
const editedFile = new URL('../content/b/page-00000.md', import.meta.url)

async function readDump(tag) {
  const response = await fetch(`${base}/__nuxt_content/b/sql_dump.txt?t=${Date.now()}`)
  const body = await response.text()
  try {
    return gunzipSync(Buffer.from(body, 'base64')).toString().includes(tag) ? 'current' : 'stale'
  } catch (error) {
    return `unreadable (HTTP ${response.status}, ${body.length} bytes: ${error.message})`
  }
}

// Vite only accepts HMR sockets carrying the token it serves in its client.
const client = await (await fetch(`${base}/_nuxt/@vite/client`)).text()
const token = client.match(/wsToken = "([^"]+)"/)?.[1]
if (!token) throw new Error(`No Vite HMR token found at ${base}/_nuxt/@vite/client. Is \`npm run dev\` running there?`)
const socket = new WebSocket(`${base.replace(/^http/, 'ws')}/_nuxt/?token=${token}`, 'vite-hmr')
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', () => reject(new Error(`Could not open the HMR socket at ${base}/_nuxt/. Is \`npm run dev\` running there?`)), { once: true })
})

let notCurrent = 0
for (let run = 1; run <= runs; run++) {
  const tag = `check-order-${Date.now()}`
  const event = new Promise((resolve) => {
    const onMessage = (message) => {
      if (!String(message.data).includes('nuxt-content:update')) return
      socket.removeEventListener('message', onMessage)
      resolve(Date.now())
    }
    socket.addEventListener('message', onMessage)
  })
  const editedAt = Date.now()
  appendFileSync(editedFile, `\n${tag}\n`)
  const eventAt = await event
  const first = await readDump(tag)
  if (first !== 'current') notCurrent++
  let state = first
  while (state !== 'current') state = await readDump(tag)
  console.log(`run ${run}: event ${eventAt - editedAt} ms after the edit; dump fetched on the event was ${first}; dump first current ${Date.now() - eventAt} ms after the event`)
}
socket.close()
console.log(`${notCurrent}/${runs} dumps fetched on the HMR event did not contain the change the event announced`)
