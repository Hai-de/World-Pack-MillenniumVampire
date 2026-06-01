/**
 * 由宿主通过 mount(target, context) 传入的 Shell 上下文。
 * 结构与 @yidhras/contracts 的 ShellContext 一致。
 */
export interface ShellContext {
  auth_token: string
  pack_id: string
  api_base_url: string
}