import { useEffect, useRef } from 'react'
import type { PhotoSource } from '../../native/missionPhotoRecovery'

// 시연 장소에 카메라가 없는 경우에도 미션 사진을 준비할 수 있도록, 촬영 전에
// 카메라/갤러리 중 하나를 고르게 한다 (#235).
export function PhotoSourceDialog({ onChoose, onClose }: {
  onChoose: (source: PhotoSource) => void
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')
    return () => { if (dialog.open && typeof dialog.close === 'function') dialog.close() }
  }, [])

  return <dialog ref={dialogRef} className="photo-source-dialog" aria-labelledby="photo-source-title" onCancel={onClose}>
    <h2 id="photo-source-title">사진 가져오기</h2>
    <p>미션 사진을 어떻게 준비할까요?</p>
    <div className="photo-source-actions">
      <button type="button" onClick={() => onChoose('camera')}>카메라로 촬영</button>
      <button type="button" onClick={() => onChoose('gallery')}>갤러리에서 선택</button>
    </div>
    <button type="button" className="text-button" onClick={onClose}>취소</button>
  </dialog>
}
