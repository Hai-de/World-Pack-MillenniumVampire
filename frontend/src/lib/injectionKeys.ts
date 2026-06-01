import type { InjectionKey } from 'vue'
import type { ShellContext } from './types'

/** ShellContext 的 provide/inject key */
export const SHELL_CONTEXT_KEY: InjectionKey<ShellContext> = Symbol('ShellContext')