/**
 * Loading, empty and error states, kept apart from the page copy so a screen
 * that is in a non-happy state can be audited in one place.
 */
export const th = {
  loading: 'กำลังโหลด…',
  loadingProducts: 'กำลังโหลดรายการสินค้า…',
  loadingProduct: 'กำลังโหลดรายละเอียดสินค้า…',
  loadingGames: 'กำลังโหลดหมวดหมู่เกม…',
  saving: 'กำลังบันทึก…',
  saved: 'บันทึกการเปลี่ยนแปลงเรียบร้อยแล้ว',
  deleting: 'กำลังลบ…',

  emptyCartless: 'ยังไม่มีรายการ',
  emptyGeneric: 'ยังไม่มีข้อมูลในขณะนี้',

  offline: 'อินเทอร์เน็ตหลุด',
  offlineBody: 'กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่อีกครั้ง',
} as const
