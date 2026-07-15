// Small DOM/format utilities and shared render helpers.
import { COLOR_HEX, CAT_ICON } from './state.js'

export const $ = (s) => document.querySelector(s)
export const esc = (s) =>
  (s ?? '')
    .toString()
    .replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]),
    )

export function toast(msg) {
  const t = $('#toast')
  if (!t) return
  t.textContent = msg
  t.classList.add('show')
  clearTimeout(t._h)
  t._h = setTimeout(() => t.classList.remove('show'), 2600)
}

export function seasonNow() {
  const m = new Date().getMonth() + 1
  return m <= 2 || m === 12 ? 'winter' : m <= 5 ? 'spring' : m <= 8 ? 'summer' : 'fall'
}

export function fmtEvent(d) {
  const dt = new Date(d)
  const day0 = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((day0(dt) - day0(new Date())) / 86400000)
  const time = dt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const dayTxt =
    diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : dt.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
  return `${dayTxt}, ${time}`
}

export function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening'
}

export function swatches(colors) {
  if (!colors || !colors.length) return ''
  return `<div class="swatchbar">${colors
    .slice(0, 4)
    .map((c) => `<div style="flex:1;background:${COLOR_HEX[c] || c}"></div>`)
    .join('')}</div>`
}

export function thumbHTML(item, cls = '') {
  if (item?.photo_url)
    return `<div class="thumb ${cls}"><img src="${esc(item.photo_url)}" alt="${esc(
      item.name,
    )}" loading="lazy">${swatches(item.colors)}</div>`
  const bg = item?.colors?.[0] ? COLOR_HEX[item.colors[0]] : null
  return `<div class="thumb ${cls}" ${
    bg ? `style="background:color-mix(in srgb, ${bg} 30%, var(--surface-2))"` : ''
  }><span class="ms">${CAT_ICON[item?.category] || 'checkroom'}</span>${swatches(
    item?.colors,
  )}</div>`
}

export const theme = () => document.documentElement.dataset.theme
