import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BackHeader } from './BackHeader'

describe('미션 화면 뒤로가기 헤더', () => {
  it('Given 뒤로가기 헤더를 When 렌더하면 Then 뒤로 가기 버튼과 제목을 보여준다', () => {
    render(<BackHeader title="사진 미션" onBack={vi.fn()} />)

    expect(screen.getByRole('button', { name: '뒤로 가기' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '사진 미션' })).toBeInTheDocument()
  })

  it('Given 뒤로가기 헤더에서 When 뒤로 가기 버튼을 누르면 Then onBack을 호출한다', () => {
    const onBack = vi.fn()
    render(<BackHeader title="사진 미션" onBack={onBack} />)

    fireEvent.click(screen.getByRole('button', { name: '뒤로 가기' }))

    expect(onBack).toHaveBeenCalledOnce()
  })
})
