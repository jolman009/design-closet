// Central render loop, isolated so both views and modals can trigger a re-render
// without creating an import cycle.
import { S } from './state.js'
import { VIEWS, renderNav } from './views.js'

export function render() {
  const fab = document.querySelector('#fab')
  if (fab) fab.style.display = S.tab === 'closet' ? 'flex' : 'none'
  const view = VIEWS[S.tab] || VIEWS.home
  document.querySelector('#view').innerHTML = view()
  // Reflect connectivity in the header bell.
  const dot = document.querySelector('#offline-dot')
  if (dot) dot.style.display = S.online ? 'none' : 'block'
}

export function go(tab) {
  S.tab = tab
  renderNav()
  render()
  window.scrollTo({ top: 0 })
}
