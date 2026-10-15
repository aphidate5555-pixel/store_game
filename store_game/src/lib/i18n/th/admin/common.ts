export const adminTh = {
  // ---- actions -----------------------------------------------------------
  'admin.common.save': 'บันทึกการเปลี่ยนแปลง',
  'admin.common.cancel': 'ยกเลิก',
  'admin.common.close': 'ปิด',
  'admin.common.delete': 'ลบ',
  'admin.common.edit': 'แก้ไข',
  'admin.common.add': 'เพิ่ม',
  'admin.common.retry': 'ลองใหม่',
  'admin.common.confirm': 'ยืนยัน',
  'admin.common.back': 'ย้อนกลับ',
  'admin.common.copy': 'คัดลอก',
  'admin.common.copied': 'คัดลอกแล้ว',
  'admin.common.upload': 'อัปโหลด',
  'admin.common.preview': 'ตัวอย่าง',
  'admin.common.reset': 'คืนค่าเริ่มต้น',
  'admin.common.required': 'จำเป็น',
  'admin.common.optional': 'ไม่บังคับ',

  // ---- states ------------------------------------------------------------
  'admin.common.enabled': 'เปิดใช้งาน',
  'admin.common.disabled': 'ปิดใช้งาน',
  'admin.common.enable': 'เปิด',
  'admin.common.disable': 'ปิด',
  'admin.common.visible': 'แสดง',
  'admin.common.hidden': 'ซ่อน',
  'admin.common.loading': 'กำลังโหลด…',
  'admin.common.saving': 'กำลังบันทึก…',
  'admin.common.saved': 'บันทึกเรียบร้อยแล้ว',
  'admin.common.empty': 'ยังไม่มีข้อมูล',
  'admin.common.noPermission': 'คุณไม่มีสิทธิ์ทำรายการนี้',

  // ---- navigation --------------------------------------------------------
  'admin.common.dashboard': 'แดชบอร์ด',
  'admin.common.products': 'สินค้า',
  'admin.common.categories': 'หมวดหมู่เกม',
  'admin.common.settings': 'ตั้งค่าร้าน',
  'admin.common.appearance': 'ปรับแต่งหน้าเว็บ',
  'admin.common.exitPanel': 'ออกจากระบบ',
  'admin.common.openMenu': 'เปิดเมนูผู้ดูแล',
  'admin.common.mainNav': 'เมนูผู้ดูแลระบบ',
  'admin.common.skipToContent': 'ข้ามไปยังเนื้อหา',

  // ---- search & fields ---------------------------------------------------
  'admin.common.searchPlaceholder': 'ค้นหา{field}',
  'admin.common.fieldLabelUnknown': 'ข้อมูล',
  'admin.common.filterAll': 'ทั้งหมด',
  'admin.common.clearFilters': 'ล้างตัวกรอง',
  'admin.common.resultsOne': 'พบ {count} รายการ',
  'admin.common.resultsMany': 'พบ {count} จาก {total} รายการ',

  // ---- reorder (announced through aria-live, not shown only as a tooltip) --
  'admin.common.reorderHint': 'ลากเพื่อจัดลำดับ หรือใช้ปุ่มลูกศรบนมือถือ',
  'admin.common.reorderGrabbed': 'หยิบ {item} จากตำแหน่ง {from} แล้ว ใช้ปุ่มลูกศรเพื่อย้าย',
  'admin.common.reorderMoved': 'ย้าย {item} จากตำแหน่ง {from} ไปตำแหน่ง {to} แล้ว',
  'admin.common.reorderDone': 'จัดลำดับเสร็จแล้ว {item} อยู่ตำแหน่ง {to}',
  'admin.common.reorderUp': 'ย้าย {item} ขึ้นหนึ่งตำแหน่ง',
  'admin.common.reorderDown': 'ย้าย {item} ลงหนึ่งตำแหน่ง',
  'admin.common.reorderPosition': 'ตำแหน่ง {position} จาก {total}',

  // ---- delete ------------------------------------------------------------
  'admin.common.confirmDeleteTitle': 'ยืนยันการลบ',
  'admin.common.confirmDeleteBody':
    'การลบไม่สามารถย้อนกลับได้ กรุณาตรวจสอบให้แน่ใจก่อนดำเนินการ',

  // ---- unsaved changes ---------------------------------------------------
  'admin.common.unsavedTitle': 'คุณมีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก',
  'admin.common.unsavedBody':
    'หากออกจากหน้านี้ การเปลี่ยนแปลงทั้งหมดจะหายไปโดยไม่มีการเตือนซ้ำ',
  'admin.common.unsavedStay': 'อยู่หน้านี้ต่อ',
  'admin.common.unsavedLeave': 'ออกจากหน้านี้',
  'admin.common.discardChanges': 'ละเลยการเปลี่ยนแปลง',

  // ---- save & upload ----------------------------------------------------
  // Duplicated from the storefront errors group on purpose: the admin map is
  // self-contained, so an admin screen never has to reach into the customer
  // dictionary to render a failure.
  'errors.save.saving': 'กำลังบันทึก…',
  'errors.save.saved': 'บันทึกการเปลี่ยนแปลงเรียบร้อยแล้ว',
  'errors.save.failedTitle': 'บันทึกการเปลี่ยนแปลงไม่สำเร็จ',
  'errors.save.failedReassure': 'ข้อมูลที่คุณกรอกไว้ยังอยู่ครบ กดบันทึกใหม่ได้เลย ไม่ต้องกรอกใหม่',
  'errors.save.conflictTitle': 'มีผู้ดูแลคนอื่นบันทึกก่อนคุณ',
  'errors.save.conflictBody':
    'ค่าบนเซิร์ฟเวอร์เปลี่ยนไปแล้วหลังที่คุณเปิดหน้านี้ เพื่อไม่ให้ข้อมูลของเขาถูกทับ ระบบจึงยังไม่บันทึก คุณต้องกดโหลดค่าล่าสุดก่อน แล้วกรอกใหม่อีกครั้ง',
  'errors.save.conflictReload': 'โหลดค่าล่าสุด',

  'admin.products.noCoverYet': 'ยังไม่มีรูปภาพสินค้า — เลือกไฟล์ด้านล่างเพื่อเพิ่มรูป',
} as const
