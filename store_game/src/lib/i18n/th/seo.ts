/**
 * SEO defaults. C-9: a sold product stays indexable so it can come back,
 * while a product with is_visible = false is the only thing that is noindex.
 * These strings are the metadata shown when no override is set.
 */
export const th = {
  homeTitle: 'หน้าหลัก',
  homeDescription: 'ร้านไอดีเกมออนไลน์ ค้นหาไอดีเกมตามเกมที่ชอบ สั่งซื้อผ่าน WhatsApp ส่งมอบไว',

  productsTitle: 'ไอดีเกมทั้งหมด',
  productsDescription:
    'ค้นหาและกรองไอดีเกมตามหมวดหมู่ สถานะ สกุลเงิน และช่วงราคา สั่งซื้อผ่าน WhatsApp ส่งมอบไว',

  gamesTitle: 'เกมทั้งหมด',
  gamesDescription: 'เลือกดูไอดีเกมแยกตามเกม ทั้ง MOBILE LEGENDS, FREE FIRE, ROV และ PUBG MOBILE',

  gameTitle: (game: string) => `ไอดี${game}`,
  gameDescription: (game: string) => `ไอดีเกม${game} ราคาถูก สแกนครบ สั่งซื้อผ่าน WhatsApp ส่งมอบไว`,

  contactTitle: 'ติดต่อร้าน',
  contactDescription: 'ช่องทางติดต่อร้าน สั่งซื้อผ่าน WhatsApp พร้อมเวลาทำการ',

  productNotFoundTitle: 'ไม่พบสินค้านี้',
  productNotFoundDescription: 'สินค้าที่คุณค้นหาไม่พบหรือถูกนำออกจากร้านแล้ว',

  /** C-9 — a sold product keeps its ranking, so the title is unchanged. */
  productTitle: (name: string, code: string, game: string) => `${name} (${code}) — เกม${game}`,

  ogAlt: (store: string) => `โลโก้ ${store}`,
  shareImageAlt: (name: string) => `ภาพสินค้า ${name}`,
} as const
