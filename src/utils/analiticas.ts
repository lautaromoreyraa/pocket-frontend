const HOST = 'pocket.lautaromoreyra.dev'
const TOKEN = 'a78805cd382a494fa8785de2f0357529'

export function iniciarAnaliticas(): void {
  if (typeof document === 'undefined' || window.location.hostname !== HOST) return
  const script = document.createElement('script')
  script.defer = true
  script.src = 'https://static.cloudflareinsights.com/beacon.min.js'
  script.dataset.cfBeacon = JSON.stringify({ token: TOKEN })
  document.body.appendChild(script)
}
