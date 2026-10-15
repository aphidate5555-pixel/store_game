/**
 * Storefront copy. Thai is the only language, and every string the visitor
 * can read lives here or in one of its siblings — never inline in a
 * component.
 */
export const th = {
  meta: {
    titleTemplate: (store: string) => `%s | ${store}`,
    defaultDescription: 'ร้านไอดีเกมออนไลน์ คัดลอกรหัสสินค้าแล้วทักมาทาง WhatsApp ส่งมอบไว',
  },

  nav: {
    home: 'หน้าหลัก',
    products: 'ไอดีเกมทั้งหมด',
    games: 'เกมทั้งหมด',
    contact: 'ติดต่อร้าน',
    openMenu: 'เปิดเมนู',
    closeMenu: 'ปิดเมนู',
    menu: 'เมนู',
    skipToContent: 'ข้ามไปยังเนื้อหา',
  },

  action: {
    copyCode: 'คัดลอกรหัส',
    copied: 'คัดลโดแล้ว',
    viewAll: 'ดูทั้งหมด',
    orderNow: 'สั่งซื้อเลย',
    viewDetails: 'ดูรายละเอียด',
    retry: 'ลองใหม่',
    loadMore: 'ดูเพิ่มเติม',
    back: 'ย้อนกลับ',
  },

  hero: {
    badge: 'พร้อมเล่นทันที',
    secondaryCta: 'ค้นหาสินค้า',
    title: 'ดูไอดีทั้งหมด',
    subtitle: 'คัดลอกรหัสสินค้าแล้วทักมาทาง WhatsApp ส่งมอบไว',
  },


  categories: {
    heading: 'เลือกตามเกม',
    emptyTitle: 'ยังไม่มีหมวดหมู่เกม',
    emptyBody: 'ร้านกำลังเพิ่มหมวดหมู่อยู่ กรุณากลับมาเยือนอีกครั้งเร็ว ๆ นี้',
    productCount: (count: number) => `พร้อมขาย ${count} รายการ`,
  },

  featured: {
    heading: 'สินค้าแนะนำ',
    regionLabel: 'สินค้าแนะนำ',
    scrollHint: 'เลื่อนดูเพิ่มเติม',
  },

  allProducts: {
    heading: 'ไอดีเกมทั้งหมด',
    description: 'ค้นหาและกรองไอดีเกมตามหมวดหมู่ สถานะ สกุลเงิน และช่วงราคา',
  },

  catalog: {
    heading: 'ไอดีเกมทั้งหมด',
    description: 'ค้นหาและกรองไอดีเกมตามหมวดหมู่ สถานะ สกุลเงิน และช่วงราคา สั่งซื้อผ่าน WhatsApp ส่งมอบไว',
    resultCount: (count: number, total: number) => `พบ ${count} จาก ${total} รายการ`,
    page: (current: number, total: number) => `หน้า ${current} จาก ${total}`,
    previous: 'หน้าก่อนหน้า',
    next: 'หน้าถัดไป',
    first: 'หน้าแรก',
    last: 'หน้าสุดท้าย',
  },

  filter: {
    open: 'ตัวกรอง',
    openWithCount: (count: number) => `ตัวกรอง (${count})`,
    apply: 'ใช้ตัวกรอง',
    clear: 'ล้างตัวกรองทั้งหมด',
    clearOne: 'ล้าง',
    game: 'เกม',
    allGames: 'ทุกเกม',
    status: 'สถานะ',
    allStatuses: 'ทุกสถานะ',
    statusAvailable: 'พร้อมขาย',
    statusSold: 'ขายแล้ว',
    currency: 'สกุลเงิน',
    currencyThb: 'บาท (THB)',
    currencyLak: 'ลาว (LAK)',
    priceRange: 'ช่วงราคา',
    minPrice: 'ราคาต่ำสุด',
    maxPrice: 'ราคาสูงสุด',
    sort: 'เรียงตาม',
    sortNewest: 'ใหม่สุด',
    sortOldest: 'เก่าสุด',
    sortPriceAsc: 'ราคาน้อยไปมาก',
    sortPriceDesc: 'ราคามากไปน้อย',
    close: 'ปิดตัวกรอง',
    activeCount: (count: number) => `มี ${count} ตัวกรองที่ใช้งานอยู่`,
    currencyNote: 'ราคาที่มีอยู่จะไม่ถูกแปลงสกุลเงิน ระบบจะแสดงตามสกุลที่เลือกเท่านั้น',
  },

  search: {
    label: 'ค้นหา',
    placeholder: 'ค้นหารหัสสินค้า ชื่อสินค้า หรือชื่อเกม',
    submit: 'ค้นหา',
    clear: 'ล้างคำค้น',
    hint: 'ค้นหาได้จากรหัสสินค้า ชื่อสินค้า หรือชื่อเกม',
  },

  product: {
    code: 'รหัสสินค้า',
    game: 'เกม',
    rank: 'ระดับ',
    rankUnknown: 'ไม่ระบุระดับ',
    heroCount: 'จำนวนฮีโร่',
    skinCount: 'จำนวนสกิน',
    binding: 'การผูกบัญชี',
    bindingBound: 'ผูกบัญชี',
    bindingUnbound: 'ไม่ผูกบัญชี',
    price: 'ราคา',
    status: 'สถานะ',
    description: 'รายละเอียด',
    gallery: 'รูปภาพสินค้า',
    galleryImage: (index: number) => `รูปที่ ${index}`,
    related: 'สินค้าอื่นในเกมนี้',
    relatedEmpty: 'ยังไม่มีสินค้าอื่นในเกมนี้',
    notFoundTitle: 'ไม่พบสินค้านี้',
    notFoundBody: 'สินค้าที่คุณค้นหาอาจถูกนำออกจากร้านแล้ว ลองเลือกสินค้าจากหน้าไอดีเกมทั้งหมดอีกครั้ง',
    notFoundCta: 'ดูไอดีเกมทั้งหมด',
    soldNotice: 'สินค้านี้ขายแล้ว',
    soldHint: 'เลือกดูสินค้าอื่นในเกมเดียวกันด้านล่าง',
  },

  gallery: {
    open: 'เปิดดูรูปขนาดใหญ่',
    close: 'ปิดรูป',
    counter: (current: number, total: number) => `${current} / ${total}`,
  },

  // The `whatsapp` group lives in whatsapp.ts. Declaring it here as well meant
  // the intersection type merged two different objects, so a key present in
  // only one of them was not visible on `m.whatsapp`.

  contact: {
    heading: 'ติดต่อร้าน',
    body: 'สั่งซื้อผ่าน WhatsApp ได้โดยตรง ทีมงานตอบกลับในเวลาทำการ',
    hours: 'เวลาทำการ',
    hoursUnknown: 'ยังไม่ได้ระบุเวลาทำการ',
    channel: 'ช่องทางติดต่อ',
    howTo: 'วิธีสั่งซื้อ',
    step1: 'เลือกสินค้าที่ต้องการ',
    step2: 'กดปุ่มคัดลอกรหัสสินค้า',
    step3: 'เปิด WhatsApp แล้ววางรหัสที่คัดลอกไว้',
    social: 'ช่องทางอื่น ๆ',
  },

  // The trust-bar defaults. This group is display copy only; the
  // administrator-editable list lives in site_sections.payload.trust.items.

  // `error`, `maintenance` and `footer` live in their own files and
  // are spread in by src/lib/i18n/index.ts. Declaring them here as well meant
  // one copy was silently dropped, and which copy survived depended on the
  // order of the imports.

  trust: {
    heading: 'ทำไมต้องเลือกเรา',
    items: {
      scan: 'สแกนครบทุกรหัส',
      fast: 'ส่งมอบเร็วภายใน 5 นาที',
      support: 'มีทีมช่วยแก้ปัญหา',
      guarantee: 'รับประกันสินค้าตามรหัส',
    },
  },

  empty: {
    catalogTitle: 'ยังไม่มีไอดีเกมให้บริการในขณะนี้',
    catalogBody: 'ร้านกำลังเตรียมสินค้าและอัปโหลดรูปอยู่ กรุณากลับมาเยือนอีกครั้งเร็ว ๆ นี้ หรือทักถามร้านได้เลย',
    catalogCta: 'ทักถามร้านผ่าน WhatsApp',
    searchTitle: 'ไม่พบสินค้าที่ค้นหา',
    searchBody: 'ลองตรวจสอบรหัสหรือชื่อสินค้าอีกครั้ง หรือเลือกดูจากหมวดหมู่เกม',
    searchCta: 'ล้างคำค้น',
    categoryAvailableTitle: (game: string) => `ขณะนี้ไม่มีไอดี${game} ที่พร้อมขาย`,
    categoryAvailableBody: 'สินค้าในหมวดนี้หมดแล้วชั่วคราว ไอดีเกมนี้เพิ่มเติมเป็นระยะ ลองดูหมวดหมู่อื่นหรือทักถามร้านได้เลย',
    categoryAvailableClearFilters: 'ล้างตัวกรองแล้วดูทั้งหมดในหมวดนี้',
    categoryAvailableCta: 'ทักถามร้านผ่าน WhatsApp',
    categoryBrowseOthers: 'ดูหมวดหมู่เกมอื่น',
    gameNotFoundTitle: 'ไม่พบเกมนี้',
    gameNotFoundBody: 'หมวดหมู่นี้อาจถูกปิดการแสดงผลแล้ว ลองเลือกเกมอื่นดู',
  },




  status: {
    available: 'พร้อมขาย',
    sold: 'ขายแล้ว',
    availableAria: 'สถานะ: พร้อมขาย',
    soldAria: 'สถานะ: ขายแล้ว',
  },
} as const
