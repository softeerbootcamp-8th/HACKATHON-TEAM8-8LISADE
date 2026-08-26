import { afterEach, describe, expect, it, vi } from 'vitest'
import { pollEverySecond } from './pollEverySecond'

describe('pollEverySecond', () => {
  afterEach(() => vi.useRealTimers())

  it('Given_이전_조회가_진행_중일_때_When_여러_주기가_지나면_Then_요청을_겹치지_않는다', async () => {
    // given
    vi.useFakeTimers()
    let resolve: (value: number) => void = () => undefined
    const load = vi.fn(() => new Promise<number>((next) => { resolve = next }))
    const stop = pollEverySecond(load, vi.fn(), vi.fn())

    // when
    await vi.advanceTimersByTimeAsync(3_000)

    // then
    expect(load).toHaveBeenCalledOnce()
    resolve(1)
    await vi.advanceTimersByTimeAsync(0)
    stop()
  })

  it('Given_폴링_중인_화면_When_화면을_떠나면_Then_후속_요청과_상태_반영을_멈춘다', async () => {
    // given
    vi.useFakeTimers()
    let resolve: (value: number) => void = () => undefined
    const load = vi.fn(() => new Promise<number>((next) => { resolve = next }))
    const onSuccess = vi.fn()
    const stop = pollEverySecond(load, onSuccess, vi.fn())

    // when
    stop()
    resolve(1)
    await vi.advanceTimersByTimeAsync(3_000)

    // then
    expect(load).toHaveBeenCalledOnce()
    expect(onSuccess).not.toHaveBeenCalled()
  })
})
