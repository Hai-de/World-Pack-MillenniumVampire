import type { App } from 'vue'
import { createApp } from 'vue'
import { createPinia } from 'pinia'

import RootComponent from './App.vue'
import { createVampireRouter } from './router'
import type { ShellContext } from './lib/types'
import { SHELL_CONTEXT_KEY } from './lib/injectionKeys'

import './design/tokens.css'
import './design/fonts.css'
import './design/base.css'

// Load Google Fonts via non-blocking <link> instead of CSS @import.
// CSS @import blocks the entire stylesheet until the cross-origin font CSS
// is fetched and parsed — which can take seconds from regions where Google
// services are slow.  A <link> element loads in parallel with style.css.
const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap'

const fontLinkEl = document.createElement('link')
fontLinkEl.rel = 'stylesheet'
fontLinkEl.href = GOOGLE_FONTS_URL
// Inject before any other stylesheet so font faces are available when the
// pack CSS applies.  Must happen synchronously on module evaluation — if
// deferred to mount(), fonts load after the first paint.
document.head.appendChild(fontLinkEl)

/**
 * PackFrontendMount 调用入口。
 * 创建独立的 Vue App 实例（独立 Pinia、独立 Router），
 * 并将 ShellContext 通过 provide 注入到整个子应用树。
 */
export function mount(target: HTMLElement, context: ShellContext): App {
  const app = createApp(RootComponent)
  const pinia = createPinia()
  const router = createVampireRouter()

  app.use(pinia)
  app.use(router)

  // 注入 ShellContext，所有子组件通过 inject(SHELL_CONTEXT_KEY) 获取
  app.provide(SHELL_CONTEXT_KEY, context)

  app.mount(target)
  return app
}

/**
 * PackFrontendMount 卸载入口。
 * 宿主在 onBeforeUnmount 时调用。
 */
export function unmount(app: App): void {
  app.unmount()
}