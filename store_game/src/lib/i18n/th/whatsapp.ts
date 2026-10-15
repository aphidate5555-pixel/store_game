/**
 * WhatsApp is the store's only customer channel. The site never sends a
 * message on the visitor's behalf: it copies the product code, opens
 * WhatsApp, and the customer pastes the code themselves. No string here may
 * claim otherwise.
 */
export const th = {
  cta: 'ทักมาสั่งซื้อ',
  ctaWithCode: (code: string) => `ทักมาสั่งซื้อ ${code}`,
  floating: 'ทักร้าน',
  floatingAria: 'ทักร้านผ่าน WhatsApp',

  copied: 'คัดลอกรหัสสินค้าแล้ว',
  copiedDetail: 'นำรหัสสินค้าไปวางใน WhatsApp แล้วส่งให้ร้าน',
  copyFailed: 'คัดลอกรหัสสินค้าไม่สำเร็จ',
  copyFailedBody: 'กรุณากดคัดลอกอีกครั้ง หรือเลือกรหัสสินค้าแล้วคัดลอกด้วยตนเอง',

  popupBlocked: 'เบราว์เซอร์บล็อกหน้าต่างใหม่',
  popupBlockedBody: 'กรุณากดลิงก์ด้านล่างเพื่อเปิด WhatsApp',
  openHere: 'เปิด WhatsApp ที่นี่',

  missingTitle: 'ยังติดต่อร้านไม่ได้',
  missingBody: 'ทางเข้าร้านยังไม่ได้เปิดใช้งาน กรุณาเลือกสินค้าไว้ก่อน แล้วทักมาสอบถามภายหลัง',

  manualHint: 'นำรหัสสินค้าไปวางใน WhatsApp แล้วส่งให้ร้าน',
  storeCta: 'ทักมาสอบถามร้าน',
  unavailable: 'ยังเปิดใช้งานไม่ได้',
  unavailableHint: 'ร้านยังไม่ได้ตั้งค่าเบอร์ WhatsApp',
} as const
