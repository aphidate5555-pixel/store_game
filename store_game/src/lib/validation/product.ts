import { z } from 'zod'

/**
 * Product validation.
 *
 * Every message is Thai and every rule has a reason: the code is what the
 * customer pastes into WhatsApp, the price is shown on the storefront and in
 * a JSON-LD offer, and the name is the accessible label of the product card.
 */

/** 2–32 characters, letters, digits and a single hyphen class. The same rule
 *  the database CHECK enforces, so a form that passes here cannot be
 *  rejected by the column. */
export const PRODUCT_CODE = /^[A-Za-z0-9][A-Za-z0-9-]{1,31}$/

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .or(z.literal('').transform(() => undefined))

export const productUpsertSchema = z.object({
  id: z.string().uuid().optional(),

  productCode: z
    .string()
    .trim()
    .min(1, 'กรุณากรอกรหัสสินค้า')
    .regex(
      PRODUCT_CODE,
      'รหัสสินค้าต้องเป็นตัวอักษรตัวเลขและขีดกลางเท่านั้น ยาว 2–32 ตัวอักษร เช่น ML-20481',
    ),

  name: z
    .string()
    .trim()
    .min(1, 'กรุณากรอกชื่อสินค้า')
    .max(120, 'ชื่อสินค้าต้องยาวไม่เกิน 120 ตัวอักษร'),

  gameId: z.string().uuid('กรุณาเลือกเกม'),

  // An empty price must be rejected, and plain z.coerce.number() does not
  // do that: Number('') is 0, so a cleared field silently became a free
  // product. The empty string is turned into undefined first, which coerces
  // to NaN and trips invalid_type_error.
  priceAmount: z.preprocess(
    (raw) => (typeof raw === 'string' && raw.trim() === '' ? undefined : raw),
    z.coerce
      .number({ invalid_type_error: 'กรุณากรอกราคา' })
      .int('ราคาต้องเป็นจำนวนเต็ม ไม่มีทศนิยม')
      .min(0, 'ราคาต้องไม่น้อยกว่า 0')
      .max(1_000_000_000, 'ราคาสูงเกินไป'),
  ),

  currency: z.enum(['THB', 'LAK'], { errorMap: () => ({ message: 'กรุณาเลือกสกุลเงิน' }) }),

  rank: optionalText(32, 'ข้อมูลระดับยาวเกินไป'),
  description: optionalText(2000, 'รายละเอียดยาวเกินไป (สูงสุด 2000 ตัวอักษร)'),

  heroCount: z.coerce.number().int('จำนวนต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป').min(0).max(9999).default(0),
  skinCount: z.coerce.number().int('จำนวนต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป').min(0).max(9999).default(0),

  binding: z.enum(['bound', 'unbound']).optional().or(z.literal('').transform(() => undefined)),
  status: z.enum(['available', 'sold']).default('available'),
  isVisible: z.coerce.boolean().default(true),
  featuredAt: z.string().datetime().nullable().optional(),
})

export type ProductUpsertInput = z.input<typeof productUpsertSchema>
export type ProductUpsertValues = z.output<typeof productUpsertSchema>

export const CATEGORY_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/

export const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z
    .string()
    .trim()
    .min(1, 'กรุณากรอกชื่อหมวดหมู่')
    .max(80, 'ชื่อหมวดหมู่ยาวเกินไป'),
  slug: z
    .string()
    .trim()
    .min(1, 'กรุณากรอก URL หมวดหมู่')
    .max(80)
    .regex(
      CATEGORY_SLUG,
      'URL หมวดหมู่ต้องเป็นตัวอักษรอังกฤษตัวเล็ก ตัวเลข และขีดกลางเท่านั้น เช่น mobile-legends',
    ),
  description: optionalText(500, 'รายละเอียดยาวเกินไป'),
  is_enabled: z.coerce.boolean().default(true),
  position: z.coerce.number().int().min(0).max(9999).default(0),
})

export type CategoryInput = z.infer<typeof categorySchema>
