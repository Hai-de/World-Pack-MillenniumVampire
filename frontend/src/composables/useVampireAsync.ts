import { ref, onMounted, type Ref } from 'vue'

export interface VampireAsyncState<T> {
  data: Ref<T | null>
  status: Ref<'idle' | 'loading' | 'loaded' | 'empty' | 'error'>
  error: Ref<Error | null>
  retry: () => Promise<void>
}

export interface UseVampireAsyncOptions<T> {
  /** 自定义空状态判断 */
  isEmpty?: (data: T) => boolean
  /** 是否自动加载 */
  immediate?: boolean
}

/**
 * 统一异步状态管理 composable。
 * 覆盖 loading / empty / error / loaded 三态，
 * 供 DiceRoller、PromptDisplay、DiaryReader 等核心组件使用。
 */
export function useVampireAsync<T>(
  fetcher: () => Promise<T>,
  options: UseVampireAsyncOptions<T> = {}
): VampireAsyncState<T> {
  const { isEmpty, immediate = true } = options

  const data = ref<T | null>(null) as Ref<T | null>
  const status = ref<'idle' | 'loading' | 'loaded' | 'empty' | 'error'>('idle') as Ref<
    'idle' | 'loading' | 'loaded' | 'empty' | 'error'
  >
  const error = ref<Error | null>(null) as Ref<Error | null>

  async function execute() {
    status.value = 'loading'
    error.value = null

    try {
      const result = await fetcher()
      data.value = result

      if (isEmpty && isEmpty(result)) {
        status.value = 'empty'
      } else {
        status.value = 'loaded'
      }
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      status.value = 'error'
    }
  }

  if (immediate) {
    onMounted(() => {
      execute()
    })
  }

  return {
    data,
    status,
    error,
    retry: execute
  }
}
