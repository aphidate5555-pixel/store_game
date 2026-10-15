export const th = {
  about: 'เกี่ยวกับร้าน',
  aboutDescription: 'ร้านไอดีเกมออนไลน์ สั่งซื้อผ่าน WhatsApp ส่งมอบไว',
  games: 'เกมทั้งหมด',
  contact: 'ติดต่อเรา',
  follow: 'ติดตามเรา',
  navigationLabel: 'ส่วนท้ายเว็บไซต์',

  /**
   * The year comes from the server clock and is rendered with a pinned
   * Gregorian locale, so this never prints 2569.
   */
  rights: (year: number, store: string) => `© ${year} ${store}`,

  disclaimerLabel: 'หมายเหตุ',
  builtWith: 'สร้างด้วย Next.js และ Supabase',
} as const
