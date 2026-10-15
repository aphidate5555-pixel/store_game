/**
 * Error copy.
 *
 * save.failedReassure is the line that stops an administrator from panicking
 * and discarding a half-filled form: the data is still there. It is required
 * wherever a save fails.
 *
 * error.filterStrip is an inline strip above the grid, never a full-screen
 * error. A full-screen error after a failed filter fetch reads as "the shop
 * has no products", which is worse than showing the previous results (C-34).
 */
export const th = {
  filterStrip: 'โหลดสินค้าไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วกดลองใหม่ ตัวกรองที่เลือกไว้ยังอยู่',
  filterRetry: 'ลองใหม่',
  offlineHint: 'หากอินเทอร์เน็ตยังไม่กลับมา ตัวกรองและคำค้นที่คุณเลือกไว้จะยังอยู่ครบ',

  generic: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
  genericTitle: 'เกิดข้อผิดพลาด',
  globalErrorTitle: 'เว็บไซต์เกิดข้อผิดพลาด',
  globalErrorBody: 'ขออภัยในความไม่สะดวก กรุณาลองโหลดหน้านี้อีกครั้ง',
  reload: 'โหลดหน้านี้อีกครั้ง',

  /** The site-wide 404, including URLs under /admin. */
  /**
   * C-5: shown when the visitor HAS signed in but holds no admin grant.
   * Redirecting them back to the login form would loop, and wording it as
   * "not an administrator" would turn the form into an oracle that enumerates
   * public.admins. The text is identical whatever the reason.
   */
  forbiddenTitle: 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้',
  forbiddenBody:
    'บัญชีนี้ไม่ได้รับสิทธิ์ผู้ดูแลระบบ หากคุณคิดว่านี่เป็นความผิดพลาด โปรดติดต่อผู้ดูแลระบบของร้าน',
  forbiddenBackHome: 'กลับหน้าหลัก',
  forbiddenLogout: 'ออกจากระบบ',
  forbiddenLoggedInAs: (email: string) => `กำลังเข้าสู่ระบบด้วย ${email}`,

  notFoundTitle: 'ไม่พบหน้าที่คุณค้นหา',
  notFoundBody: 'ลองตรวจสอบ URL หรือกลับไปหน้าหลัก',
  notFoundCta: 'กลับหน้าหลัก',
  goHome: 'กลับหน้าหลัก',

  save: {
    failedTitle: 'บันทึกการเปลี่ยนแปลงไม่สำเร็จ',
    failedBody: 'การเปลี่ยนแปลงยังไม่ถูกบันทึก กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วกดบันทึกอีกครั้ง',
    failedReassure: 'ข้อมูลที่คุณกรอกไว้ยังอยู่ครบ กดบันทึกใหม่ได้เลย ไม่ต้องกรอกใหม่',
    failedReasonPermission: 'คุณไม่มีสิทธิ์เปลี่ยนแปลงการตั้งค่านี้',
    failedReasonValidation: 'กรุณาตรวจสอบข้อมูลในส่วนที่ทำเครื่องหมายไว้ แล้วกดบันทึกอีกครั้ง',
    failedReasonNetwork: 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ต',

    conflictTitle: 'มีผู้ดูแลคนอื่นบันทึกก่อนคุณ',
    conflictBody: 'ค่าบนเซิร์ฟเวอร์เปลี่ยนไปแล้วหลังที่คุณเปิดหน้านี้ เพื่อไม่ให้ข้อมูลของเขาถูกทับ ระบบจึงยังไม่บันทึก คุณต้องกดโหลดค่าล่าสุดก่อน แล้วกรอกใหม่อีกครั้ง',
    conflictReload: 'โหลดค่าล่าสุด',

    saving: 'กำลังบันทึก…',
    saved: 'บันทึกการเปลี่ยนแปลงเรียบร้อยแล้ว',
    discard: 'ละเลยการเปลี่ยนแปลง',
    revertConfirmTitle: 'คืนค่าที่แก้ไขในหน้านี้?',
    revertConfirmBody: 'ค่าที่แก้ไขแต่ยังไม่ได้บันทึกจะถูกยกเลิก แล้วฟอร์มจะกลับไปแสดงค่าที่บันทึกไว้ล่าสุด ข้อมูลบนเซิร์ฟเวอร์จะไม่ถูกเขียนทับ',
    previewUpdated: 'อัปเดตหน้าตัวอย่างแล้ว',
  },

  delete: {
    failed: 'ลบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
    confirmTitle: 'ยืนยันการลบ',
    confirmIrreversible: 'การลบไม่สามารถย้อนกลับได้',
  },
} as const
