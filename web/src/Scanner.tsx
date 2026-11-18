import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { Modal } from './ui'

export default function Scanner({ close, onCode }: { close: () => void; onCode: (text: string) => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let stopped = false, stream: MediaStream | undefined, frame = 0
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' }, audio: false }).then(async media => {
      if (stopped) { media.getTracks().forEach(t => t.stop()); return }
      stream = media; video.current!.srcObject = media; await video.current!.play()
      const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d', { willReadFrequently: true })!
      function scan() {
        if (stopped) return
        const el = video.current
        if (el && el.readyState >= 2) {
          canvas.width = 480; canvas.height = Math.round(480 * el.videoHeight / el.videoWidth)
          ctx.drawImage(el, 0, 0, canvas.width, canvas.height)
          const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(pixels.data, pixels.width, pixels.height)
          if (code) { stopped = true; media.getTracks().forEach(t => t.stop()); onCode(code.data); return }
        }
        frame = requestAnimationFrame(scan)
      }
      scan()
    }).catch(() => setError('카메라를 열 수 없어요. 브라우저의 카메라 권한을 확인하거나 코드로 참여해 주세요.'))
    if (!navigator.mediaDevices?.getUserMedia) setError('이 브라우저에서는 카메라를 사용할 수 없어요. 코드로 참여해 주세요.')
    return () => { stopped = true; cancelAnimationFrame(frame); stream?.getTracks().forEach(t => t.stop()) }
  }, [onCode])
  return <Modal title="QR로 참여하기" onClose={close}>{error ? <p className="help">{error}</p> : <><video className="scanner" ref={video} muted playsInline /><p className="help">초대 QR 코드를 화면 안에 맞춰 주세요.</p></>}</Modal>
}
