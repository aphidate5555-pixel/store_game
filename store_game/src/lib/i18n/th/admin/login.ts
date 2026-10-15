export const adminTh = {
  'admin.login.title': 'เข้าสู่ระบบผู้ดูแล',
  'admin.login.subtitle': 'หน้านี้สำหรับผู้ดูแลร้านเท่านั้น',
  'admin.login.email': 'อีเมล',
  'admin.login.emailPlaceholder': 'owner@yourstore.com',
  'admin.login.password': 'รหัสผ่าน',
  'admin.login.passwordPlaceholder': 'รหัสผ่านของคุณ',
  'admin.login.submit': 'เข้าสู่ระบบ',
  'admin.login.submitting': 'กำลังเข้าสู่ระบบ…',
  'admin.login.showPassword': 'แสดงรหัสผ่าน',
  'admin.login.hidePassword': 'ซ่อนรหัสผ่าน',
  'admin.login.backToStore': 'กลับหน้าเว็บไซต์',

  /**
   * The failure message must never distinguish "wrong password" from "not an
   * administrator". Either distinction turns the form into an oracle that
   * enumerates public.admins.
   */
  'admin.login.failed': 'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบอีเมลและรหัสผ่าน',
  'admin.login.rateLimited':
    'พยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่',
  'admin.login.missingCode': 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
  'admin.login.invalidCode': 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',

  /**
   * Deliberately does not say how to become an administrator. Account
   * creation happens in the Supabase dashboard followed by a SQL grant, and
   * saying so here would document the path to an attacker as clearly as to
   * the owner.
   */
  'admin.login.noAccountHint': 'ยังไม่มีบัญชีผู้ดูแล? โปรดติดต่อผู้ดูแลระบบ',

  'admin.login.maintenanceReachable':
    'เว็บไซต์อยู่ในโหมดปรับปรุง แต่คุณยังเข้าสู่ระบบผู้ดูแลได้ตามปกติ',

} as const
