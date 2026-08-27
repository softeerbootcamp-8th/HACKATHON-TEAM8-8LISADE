import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PhotoSourceDialog } from './PhotoSourceDialog'

describe('사진 소스 선택 다이얼로그', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute('open', '') }
    HTMLDialogElement.prototype.close = function close() { this.removeAttribute('open') }
  })

  it('카메라로 촬영을 누르면 camera를 골랐다고 알린다', () => {
    const onChoose = vi.fn()
    render(<PhotoSourceDialog onChoose={onChoose} onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: '카메라로 촬영' }))

    expect(onChoose).toHaveBeenCalledWith('camera')
  })

  it('갤러리에서 선택을 누르면 gallery를 골랐다고 알린다', () => {
    const onChoose = vi.fn()
    render(<PhotoSourceDialog onChoose={onChoose} onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: '갤러리에서 선택' }))

    expect(onChoose).toHaveBeenCalledWith('gallery')
  })

  it('취소를 누르면 닫는다', () => {
    const onClose = vi.fn()
    render(<PhotoSourceDialog onChoose={vi.fn()} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: '취소' }))

    expect(onClose).toHaveBeenCalledOnce()
  })
})
