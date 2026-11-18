import { asset, type Message } from './model'

export async function previewDeviceNotification(message: Message, folderName: string, sender: string): Promise<'shown' | 'denied' | 'unsupported'> {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported'
  const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission
  if (permission !== 'granted') return 'denied'
  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration?.active) return 'unsupported'
  await registration.showNotification(`[${folderName}] ${sender}`, {
    body: `${message.body}\n사진을 확인하고 의견을 남겨주세요. (미리보기)`,
    icon: new URL(asset('NotificationAvatar.png'), location.href).href,
    badge: new URL(`${import.meta.env.BASE_URL}icons/icon-192.png`, location.href).href,
    tag: `shallpick-preview-${message.id}`,
    data: { url: `${location.pathname}#respond/${message.folderId}/${message.id}` },
  })
  return 'shown'
}
