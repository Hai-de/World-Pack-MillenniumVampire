import { inject } from 'vue'
import type { ShellContext } from '../lib/types'
import { SHELL_CONTEXT_KEY } from '../lib/injectionKeys'
import { VampireHttpClient } from '../lib/httpClient'

/**
 * 注入 ShellContext 并提供预构建的 HTTP 客户端。
 */
export function useShellAuth() {
  const shellContext = inject(SHELL_CONTEXT_KEY)
  if (!shellContext) {
    throw new Error('ShellContext not provided. Ensure mount() was called with a valid context.')
  }

  const httpClient = new VampireHttpClient(shellContext)

  return {
    shellContext,
    httpClient
  }
}
