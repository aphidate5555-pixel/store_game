export const adminTh = {
  'admin.categories.title': 'จัดการหมวดหมู่เกม',
  'admin.categories.subtitle': 'เพิ่ม แก้ไข เรียงลำดับ และเปิด-ปิดหมวดหมู่เกมของร้าน',
  'admin.categories.new': 'เพิ่มหมวดหมู่ใหม่',
  'admin.categories.edit': 'แก้ไขหมวดหมู่',
  'admin.categories.empty': 'ยังไม่มีหมวดหมู่เกม',
  'admin.categories.emptyBody': 'เพิ่มหมวดหมู่เกมแรกเพื่อเริ่มต้นเพิ่มสินค้า',
  'admin.categories.searchPlaceholder': 'ค้นหาชื่อหมวดหมู่เกม',

  'admin.categories.fieldName': 'ชื่อหมวดหมู่',
  'admin.categories.fieldNameHint': 'ชื่อที่ลูกค้าจะเห็นบนหน้าเว็บไซต์',
  'admin.categories.fieldSlug': 'URL หมวดหมู่',
  'admin.categories.fieldSlugHint':
    'ใช้เป็นส่วนหนึ่งของ URL หน้าหมวดหมู่ ใช้ได้เฉพาะตัวอักษรอังกฤษตัวเล็ก ตัวเลข และขีดกลาง เช่น mobile-legends',
  'admin.categories.fieldDescription': 'รายละเอียด',
  'admin.categories.fieldDescriptionHint': 'คำอธิบายสั้น ๆ เกี่ยวกับเกมในหมวดนี้',
  'admin.categories.fieldImage': 'รูปปกหมวดหมู่เกม',
  'admin.categories.fieldImageHint':
    'แนะนำภาพแนวนอนหรือแนวกว้าง ขนาด 1200×675 พิกเซล (PNG, JPG, WebP ไม่เกิน 3.5 MB) หากไม่อัปโหลดจะแสดงภาพปกเกมมาตรฐาน',
  'admin.categories.imageUpload': 'อัปโหลดรูปปกเกม',
  'admin.categories.imageReplace': 'เปลี่ยนรูปปกเกม',
  'admin.categories.imageRemove': 'ลบรูปปกเกม',
  'admin.categories.imageUploaded': 'อัปโหลดรูปปกหมวดหมู่เรียบร้อยแล้ว',
  'admin.categories.imageRemoved': 'ลบรูปปกหมวดหมู่เรียบร้อยแล้ว',
  'admin.categories.fieldEnabled': 'เปิดใช้งาน',
  'admin.categories.fieldEnabledHint':
    'ปิดไว้ หมวดหมู่จะไม่แสดงบนหน้าแรกและเมนู แต่หน้า URL เดิมยังเข้าถึงได้',

  'admin.categories.productCount': 'พร้อมขาย {available} จาก {total} รายการ',
  'admin.categories.position': 'ลำดับที่ {position}',
  'admin.categories.setEnabled': 'เปิดใช้งานหมวดหมู่นี้',
  'admin.categories.setDisabled': 'ปิดใช้งานหมวดหมู่นี้',

  'admin.categories.deleteTitle': 'ลบหมวดหมู่นี้?',
  'admin.categories.deleteConfirmBody': 'หมวดหมู่ {name} จะถูกลบถาวร',
  'admin.categories.deleteSuccess': 'ลบหมวดหมู่แล้ว',
  'admin.categories.lastOneHint': 'สามารถลบหมวดหมู่สุดท้ายได้ หน้าเว็บไซต์จะแสดงข้อความว่ายังไม่มีสินค้า',

  /**
   * A category holding products cannot be deleted. The alternative —
   * silently hiding its products — would remove them from the storefront
   * without anyone deciding to.
   */
  'admin.categories.deleteBlocked':
    'ยังลบไม่ได้ หมวดหมู่นี้ยังมีสินค้า {count} รายการ กรุณาย้ายสินค้าออกให้หมดก่อน',
  'admin.categories.bulkMoveCta': 'ย้ายสินค้าทั้งหมดไปหมวดหมู่อื่น',
  'admin.categories.bulkMoveTitle': 'ย้ายสินค้า {count} รายการไปที่',
  'admin.categories.bulkMoveSuccess': 'ย้ายสินค้าเรียบร้อยแล้ว',
  'admin.categories.bulkMoveNoTarget': 'กรุณาเลือกหมวดหมู่ปลายทาง',

  'admin.categories.unsavedChanges': 'มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก',
  'admin.categories.saveSuccess': 'บันทึกหมวดหมู่เรียบร้อยแล้ว',
  'admin.categories.createSuccess': 'เพิ่มหมวดหมู่เรียบร้อยแล้ว',
} as const
