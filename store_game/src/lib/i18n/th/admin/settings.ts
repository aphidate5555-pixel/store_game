export const adminTh = {
  'admin.settings.title': 'ตั้งค่าร้าน',
  'admin.settings.subtitle': 'ข้อมูลร้าน ช่องทางติดต่อ และโหมดปรับปรุง',

  'admin.settings.sectionStore': 'ข้อมูลร้าน',
  'admin.settings.sectionContact': 'ช่องทางติดต่อ',
  'admin.settings.sectionSocial': 'ช่องทางโซเชียล',
  'admin.settings.sectionFloating': 'ปุ่ม WhatsApp ลอย',
  'admin.settings.sectionMaintenance': 'โหมดปรับปรุง',
  'admin.settings.sectionCaution': 'ส่วนที่ต้องระวัง',
  'admin.settings.sectionSeo': 'การแสดงผลในผลการค้นหา',

  'admin.settings.fieldStoreName': 'ชื่อร้าน',
  'admin.settings.fieldStoreNameHint':
    'ชื่อที่แสดงบนส่วนหัว ท้ายเว็บไซต์ และชื่อที่แสดงบน Google',
  'admin.settings.fieldStoreDescription': 'คำอธิบายร้าน',
  'admin.settings.fieldStoreDescriptionHint': 'คำอธิบายสั้น ๆ เกี่ยวกับร้านของคุณ',

  'admin.settings.fieldLogo': 'โลโก้ร้าน',
  'admin.settings.fieldLogoHint': 'PNG หรือ WebP แนะนำพื้นที่โปร่งใส ไม่เกิน 3.5 MB',

  'admin.settings.fieldFavicon': 'ไอคอนเว็บไซต์',
  'admin.settings.fieldFaviconHint':
    'รูปแบบที่รองรับ: PNG, JPG หรือ WebP ขนาด 512×512 พิกเซล ไม่เกิน 3.5 MB · ระบบจะแสดงไอคอนเดิมอยู่ได้อีกหลายนาทีหลังบันทึก',
  'admin.settings.fieldOgImage': 'รูปสำหรับแชร์บนโซเชียล',
  'admin.settings.fieldOgImageHint': 'ขนาด 1200×630 พิกเซล · PNG หรือ WebP ไม่เกิน 3.5 MB',

  'admin.settings.fieldSeoTitle': 'ชื่อหน้าในผลการค้นหา',
  'admin.settings.fieldSeoTitleHint': 'สูงสุด 70 ตัวอักษร · เว้นว่างไว้เพื่อใช้ชื่อร้าน',
  'admin.settings.fieldSeoDescription': 'คำอธิบายในผลการค้นหา',
  'admin.settings.fieldSeoDescriptionHint': 'สูงสุด 200 ตัวอักษร',

  /**
   * C-11: digits only. There is no companion "WhatsApp link" field, and
   * adding one would create two sources of truth that can disagree.
   */
  'admin.settings.fieldWhatsappNumber': 'เบอร์ WhatsApp ของร้าน',
  'admin.settings.fieldWhatsappNumberHint':
    'ใส่เบอร์เต็มรวมรหัสประเทศ ไม่ต้องใส่เครื่องหมาย + เช่น 66812345678',
  'admin.settings.fieldWhatsappNumberHintEmpty':
    'ยังไม่ได้ตั้งค่า — ปุ่มทักร้านจะยังไม่ทำงานจนกว่าจะกรอกเบอร์นี้',

  'admin.settings.fieldBusinessHours': 'เวลาทำการ',
  'admin.settings.fieldBusinessHoursHint': 'เช่น ทุกวัน 09:00-23:00 น.',

  'admin.settings.fieldFacebook': 'ลิงก์เฟซบุ๊ก',
  'admin.settings.fieldTiktok': 'ลิงก์ติ๊กต๊อก',
  'admin.settings.fieldInstagram': 'ลิงก์อินสตาแกรม',
  'admin.settings.fieldSocialHint':
    'ต้องเป็นลิงก์ https:// ที่อยู่เว็บไซต์ของแพลตฟอร์มนั้นโดยตรง',

  'admin.settings.fieldFloatingEnabled': 'แสดงปุ่ม WhatsApp ลอย',
  'admin.settings.fieldFloatingEnabledHint':
    'แสดงปุ่มติดต่อที่มุมขวาล่างของทุกหน้าในหน้าเว็บไซต์ ไม่แสดงในหน้าแอดมิน',
  'admin.settings.fieldFloatingText': 'ข้อความบนปุ่มลอย',
  'admin.settings.fieldFloatingTextHint':
    'ควรสั้นไว้เพราะแสดงบนหน้าจอมือถือ ประมาณไม่เกิน 12 ตัวอักษร',

  'admin.settings.fieldFooterText': 'ข้อความท้ายเว็บไซต์',
  'admin.settings.fieldFooterDisclaimer': 'คำเตือนท้ายเว็บไซต์',
  'admin.settings.fieldFooterDisclaimerHint':
    'ควรระบุว่าเว็บไซต์นี้เป็นตัวแทนนำเสนอสินค้า ไม่ใช่เว็บไซต์ทางการของผู้พัฒนาเกม และไม่มีการรับชำระเงินผ่านเว็บไซต์',

  'admin.settings.fieldMaintenanceMode': 'เปิดโหมดปรับปรุง',
  'admin.settings.fieldMaintenanceModeHint':
    'เมื่อเปิด ผู้เข้าชมทุกคนจะเห็นหน้าแจ้งปรับปรุงแทนหน้าเว็บไซต์ แต่คุณยังเข้าสู่ระบบผู้ดูแลได้ตามปกติ',
  'admin.settings.fieldMaintenanceMessage': 'ข้อความแจ้งปรับปรุง',
  'admin.settings.fieldMaintenanceMessageHint': 'ข้อความที่ผู้เข้าชมจะเห็น',
  'admin.settings.fieldMaintenanceConfirm': 'พิมพ์คำว่า MAINTENANCE เพื่อยืนยัน',
  'admin.settings.fieldMaintenanceConfirmHint':
    'การเปิดโหมดปรับปรุงจะทำให้เว็บไซต์ทั้งหมดหยุดให้บริการชั่วคราว ต้องพิมพ์คำยืนยันเพื่อป้องกันการกดผิด',

  'admin.settings.maintenanceOnWarning':
    'ขณะนี้เว็บไซต์อยู่ในโหมดปรับปรุง ผู้เข้าชมจะไม่เห็นสินค้า',
  'admin.settings.maintenanceOffWarning': 'ขณะนี้เว็บไซต์เปิดให้บริการตามปกติ',
  'admin.settings.maintenanceEnabledSuccess': 'เปิดโหมดปรับปรุงแล้ว',
  'admin.settings.maintenanceDisabledSuccess': 'ปิดโหมดปรับปรุงแล้ว',

  'admin.settings.cautionNoCheckout':
    'ระบบนี้ไม่มีการชำระเงินผ่านเว็บไซต์ การสั่งซื้อทั้งหมดเกิดขึ้นผ่าน WhatsApp',
  'admin.settings.cautionStock':
    'ระบบไม่มีการตัดสต็อกอัตโนมัติ กรุณาเปลี่ยนสถานะสินค้าเป็น "ขายแล้ว" หลังจากส่งมอบสินค้าแล้ว',
  'admin.settings.cautionCurrency':
    'ราคาที่มีอยู่จะไม่ถูกแปลงสกุลเงิน ผู้ซื้อเห็นราคาตามสกุลที่เลือกเท่านั้น',
  'admin.settings.cautionConcurrent':
    'หากมีผู้ดูแลหลายคน การบันทึกพร้อมกันอาจชนกัน ระบบจะแจ้งให้โหลดค่าล่าสุดก่อนบันทึกซ้ำ',

  'admin.settings.saveSuccess': 'บันทึกการตั้งค่าเรียบร้อยแล้ว',
  'admin.settings.unsavedChanges': 'มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก',
  'admin.settings.assetRemove': 'ลบรูปนี้',
  'admin.settings.assetRemoveConfirm': 'ลบรูปนี้? รูปจะถูกใช้งานทันทีทั้งเว็บไซต์',
} as const
