export function pollEverySecond<T>(
  load: () => Promise<T>,
  onSuccess: (value: T) => void,
  onError: (error: unknown) => void = () => undefined,
  loadImmediately = true,
): () => void {
  let active = true
  let loading = false

  const poll = async () => {
    // 응답이 1초보다 늦어져도 같은 화면의 요청을 겹치지 않는다.
    if (loading) return
    loading = true
    try {
      const value = await load()
      if (active) onSuccess(value)
    } catch (error) {
      if (active) onError(error)
    } finally {
      loading = false
    }
  }

  if (loadImmediately) void poll()
  const interval = window.setInterval(() => { void poll() }, 1_000)
  return () => {
    active = false
    window.clearInterval(interval)
  }
}
