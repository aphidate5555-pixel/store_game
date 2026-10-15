import { ALLOWED_IMAGE_EXT_LABEL, MAX_IMAGE_BYTES_LABEL, ALLOWED_BRAND_EXT_LABEL } from '@/lib/images/limits'

/**
 * Validation messages.
 *
 * Three of these are generated from src/lib/images/limits.ts rather than
 * written out, because the earlier copy promised formats the pipeline cannot
 * decode (HEIC) and omitted one it can (AVIF). Building the string from the
 * same constants the validator uses makes that class of drift impossible
 * (F-14).
 */
export const adminTh = {
  // ---- generic ----------------------------------------------------------
  'v.required': 'กรุณากรอก{field}',
  'v.count.int': 'จำนวนต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป',
  'v.count.max': '{field}ต้องไม่เกิน {max}',

  // ---- product ----------------------------------------------------------
  'v.productId.required': 'กรุณากรอกรหัสสินค้า',
  'v.productId.format':
    'รหัสสินค้าต้องเป็นตัวอักษรตัวเลขและขีดกลางเท่านั้น ยาว 2–32 ตัวอักษร เช่น ML-20481',
  'v.productId.unique': 'รหัสสินค้านี้ถูกใช้งานแล้ว กรุณาตั้งรหัสใหม่',
  'v.name.required': 'กรุณากรอกชื่อสินค้า',
  'v.name.max': 'ชื่อสินค้าต้องยาวไม่เกิน {max} ตัวอักษร',
  'v.game.required': 'กรุณาเลือกเกม',
  'v.price.required': 'กรุณากรอกราคา',
  'v.price.int': 'ราคาต้องเป็นจำนวนเต็ม ไม่มีทศนิยม',
  'v.price.min': 'ราคาต้องไม่น้อยกว่า 0',
  'v.price.tooLarge': 'ราคาสูงเกินไป',
  'v.currency.required': 'กรุณาเลือกสกุลเงิน',
  'v.rank.max': 'ข้อมูลระดับยาวเกินไป',
  'v.status.required': 'กรุณาเลือกสถานะสินค้า',
  'v.binding.required': 'กรุณาเลือกสถานะการผูกบัญชี',
  'v.desc.max': 'รายละเอียดยาวเกินไป (สูงสุด {max} ตัวอักษร)',

  // ---- category ---------------------------------------------------------
  'v.categoryName.required': 'กรุณากรอกชื่อหมวดหมู่',
  'v.categoryName.duplicate': 'มีหมวดหมู่ชื่อนี้อยู่แล้ว',
  'v.categorySlug.duplicate': 'หมวดหมู่นี้มี URL ชนกับหมวดหมู่อื่น',
  'v.slug.format':
    'URL หมวดหมู่ต้องเป็นตัวอักษรตัวเลขและขีดกลางเท่านั้น เช่น mobile-legends',
  'v.slug.reserved': 'ค่านี้ถูกสงวนไว้โดยระบบ กรุณาใช้ค่าอื่น',

  // ---- colour -----------------------------------------------------------
  'v.color.format': 'รูปแบบสีไม่ถูกต้อง ต้องเป็น HEX 6 หลัก เช่น #E11D2E',
  'v.color.contrast':
    'สีนี้อ่านไม่ออกบนพื้นหลังของเว็บไซต์ (ต้องได้อย่างน้อย 4.5:1 สำหรับตัวอักษรขนาดเล็ก และ 3:1 สำหรับตัวอักษรขนาดใหญ่กับไอคอน) กรุณาเลือกสีที่สว่างขึ้น',
  'v.color.contrastOk': 'ความคอนทราสต์อยู่ในเกณฑ์ที่อ่านได้',

  // ---- links ------------------------------------------------------------
  /**
   * F-13: the hero CTA and the menu items pick a destination from the route
   * registry, so there is no free-text URL to mistype. v.heroCta.url and
   * v.nav.href are gone for that reason, not merely deprecated.
   */
  'v.route.required': 'กรุณาเลือกหน้าปลายทาง',
  'v.route.unknown': 'หน้าปลายทางนี้ไม่อยู่ในรายการที่เลือกได้',
  'v.social.url': 'ลิงก์ต้องเป็น https:// และต้องเป็นโดเมนที่อนุญาตของแพลตฟอร์มนั้น',
  'v.social.urlRequired': 'กรุณากรอกลิงก์ {field}',

  // ---- WhatsApp (C-11: digits only, no link field) ----------------------
  'v.whatsapp.digits': 'เบอร์ WhatsApp ต้องเป็นตัวเลข 8–15 หลัก และขึ้นต้นด้วยรหัสประเทศ (เช่น 66)',

  // ---- images (F-14: strings built from limits.ts) ----------------------
  'v.image.type': `รองรับเฉพาะไฟล์ ${ALLOWED_IMAGE_EXT_LABEL}`,
  'v.image.size': `ไฟล์รูปใหญ่เกิน ${MAX_IMAGE_BYTES_LABEL}`,
  'v.image.pixels': 'ไฟล์ภาพมีความละเอียดสูงเกินไป กรุณาใช้ไฟล์ที่เล็กกว่า',
  'v.image.decodeFailed': 'อ่านไฟล์ภาพไม่สำเร็จ กรุณาตรวจสอบว่าไฟล์ไม่เสียหาย',
  'v.image.count': 'กรุณาเลือกไฟล์รูปภาพอย่างน้อย 1 ไฟล์',
  'v.image.limit': 'อัปโหลดได้สูงสุด {max} รูปต่อครั้ง',
  'v.brand.type': `รองรับเฉพาะไฟล์ ${ALLOWED_BRAND_EXT_LABEL}`,
  'v.brand.size': `ไฟล์รูปใหญ่เกิน ${MAX_IMAGE_BYTES_LABEL}`,
  'v.favicon.type': `ไฟล์ไอคอนรองรับเฉพาะ ${ALLOWED_BRAND_EXT_LABEL}`,

  // ---- section limits ---------------------------------------------------
  'v.perPage.range': 'จำนวนสินค้าต่อหน้าต้องอยู่ระหว่าง {min} ถึง {max} รายการ',
  'v.featuredCount.range': 'จำนวนสินค้าแนะนำต้องอยู่ระหว่าง {min} ถึง {max} รายการ',
  'v.categoriesLimit.range': 'จำนวนหมวดหมู่ที่แสดงบนหน้าแรกต้องอยู่ระหว่าง {min} ถึง {max} หมวดหมู่',
  'v.trustCount.range': 'แถบความน่าเชื่อถือเลือกได้สูงสุด {max} ข้อ',
  'v.navItems.range': 'เมนูต้องมีอย่างน้อย {min} รายการ และไม่เกิน {max} รายการ',
  'v.navItems.empty': 'กรุณาใส่ข้อความเมนูอย่างน้อย 1 รายการ',
  'v.hero.title.max': 'หัวเรื่องยาวเกินไป (สูงสุด {max} ตัวอักษร)',
  'v.hero.subtitle.max': 'คำอธิบายยาวเกินไป (สูงสุด {max} ตัวอักษร)',
  'v.hero.ctaText.max': 'ข้อความบนปุ่มยาวเกินไป (สูงสุด {max} ตัวอักษร)',

  // ---- unsaved changes --------------------------------------------------
  'v.unsavedChanges': 'มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก',
} as const
