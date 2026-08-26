import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ActivityConfirmation } from './StudentScreens'

describe('활동 미션 사진 확인 화면', () => {
  it('Given 촬영한 사진 URI가 있을 때 When 렌더하면 Then 미리보기가 실제 촬영한 사진을 보여준다', () => {
    render(
      <ActivityConfirmation
        isResubmission={false}
        photoUri="capacitor://localhost/_capacitor_file_/photo.jpg"
        onRetake={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByRole('img', { name: '촬영한 사진 미리보기' })).toHaveAttribute(
      'src',
      'capacitor://localhost/_capacitor_file_/photo.jpg',
    )
  })
})
