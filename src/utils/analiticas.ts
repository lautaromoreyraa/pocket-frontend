/**
 * Cloudflare Web Analytics: cuenta sólo navegadores reales que ejecutan el
 * script, así que los barridos de bots no ensucian las métricas. Se carga
 * únicamente en el dominio publicado: ni el entorno local ni las URLs de
 * prueba de Vercel llegan a las estadísticas. El token es público (viaja en
 * el HTML); es el del sitio pocket.lautaromoreyra.dev en Web Analytics.
 */
const HOST = 'pocket.lautaromoreyra.dev'
const TOKEN = 'a78805cd382a494fa8785de2f0357529'

export function iniciarAnaliticas(): void {
  // En la app nativa no hay document: las analíticas son sólo de la web.
  if (typeof document === 'undefined' || window.location.hostname !== HOST) return
  const script = document.createElement('script')
  script.defer = true
  script.src = 'https://static.cloudflareinsights.com/beacon.min.js'
  script.dataset.cfBeacon = JSON.stringify({ token: TOKEN })
  document.body.appendChild(script)
}
