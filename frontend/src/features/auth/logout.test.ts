import { describe, expect, it, vi } from 'vitest'
import { createLogout } from './logout'

describe('로그아웃', () => {
  it('Given 로그인 상태 When 로그아웃하면 Then 세션이 살아 있는 동안 push를 먼저 해제한다', async () => {
    const order: string[] = []
    const push = { unregister: vi.fn(async () => { order.push('unregister') }) }
    const api = { logout: vi.fn(async () => { order.push('logout') }) }
    const tracking = {
      stopTracking: vi.fn(async () => { order.push('stopTracking') }),
      expireSession: vi.fn(async () => { order.push('expireSession') }),
    }

    await createLogout(push, api, tracking)()

    expect(order).toEqual(['unregister', 'stopTracking', 'logout', 'expireSession'])
  })

  it('Given FCM 장애로 push 해제가 실패해도 Then 로그아웃은 그대로 진행한다', async () => {
    const push = { unregister: vi.fn().mockRejectedValue(new Error('FCM 장애')) }
    const api = { logout: vi.fn().mockResolvedValue(undefined) }
    const tracking = { stopTracking: vi.fn().mockResolvedValue(undefined), expireSession: vi.fn().mockResolvedValue(undefined) }

    await expect(createLogout(push, api, tracking)()).resolves.toBeUndefined()

    expect(api.logout).toHaveBeenCalled()
  })

  it('Given 로그아웃 API가 실패하면 Then 예외를 그대로 전달한다', async () => {
    const push = { unregister: vi.fn().mockResolvedValue(undefined) }
    const api = { logout: vi.fn().mockRejectedValue(new Error('로그아웃에 실패했습니다.')) }
    const tracking = { stopTracking: vi.fn().mockResolvedValue(undefined), expireSession: vi.fn().mockResolvedValue(undefined) }

    await expect(createLogout(push, api, tracking)()).rejects.toThrow('로그아웃에 실패했습니다.')

    expect(tracking.expireSession).toHaveBeenCalled()
  })
})
