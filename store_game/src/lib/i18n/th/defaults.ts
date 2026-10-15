/**
 * Default values for everything an administrator can override.
 *
 * This file is the single source of truth (C-2). The database stores ONLY
 * what an administrator has actually changed: an empty payload means "not
 * edited yet", so editing a default here is visible on every install without
 * a migration, and no Thai string exists in two places.
 *
 * Navigation items carry a routeKey, never an href (F-13). The path is
 * resolved through src/lib/validation/route-keys.ts, so a menu item cannot
 * point at a page that does not exist.
 */
import { type RouteKey } from '@/lib/validation/route-keys'

export interface HeroDefaults {
  readonly enabled: boolean
  readonly title: string
  readonly subtitle: string
  readonly cta_text: string
  readonly cta_route: RouteKey
}

export interface TrustDefaults {
  readonly enabled: boolean
  readonly count: number
  readonly items: readonly string[]
}

export interface NavigationItem {
  readonly label: string
  readonly route: RouteKey
}

export const SITE_DEFAULTS = {
  hero: {
    enabled: true,
    title: 'ไอดีเกมพร้อมเล่น',
    subtitle: 'เลือกไอดีเกมที่ใช่สำหรับคุณ สแกนครบ ส่งมอบเร็ว พร้อมให้บริการทุกวัน',
    cta_text: 'ดูไอดีทั้งหมด',
    cta_route: 'games',
  },
  trust: {
    enabled: true,
    count: 4,
    items: ['สแกนครบทุกรหัส', 'ส่งมอบเร็วภายใน 5 นาที', 'มีทีมช่วยแก้ปัญหา', 'รับประกันสินค้าตามรหัส'],
  },
  categories: {
    enabled: true,
    limit: 8,
  },
  featured_products: {
    enabled: true,
    title: 'สินค้าแนะนำ',
    count: 8,
  },
  all_products: {
    enabled: true,
    per_page: 16,
  },
  navigation: {
    enabled: true,
    show_search: true,
    show_whatsapp_button: true,
    items: [
      { label: 'หน้าหลัก', route: 'home' },
      { label: 'เกมทั้งหมด', route: 'games' },
      { label: 'ไอดีเกมทั้งหมด', route: 'products' },
      { label: 'ติดต่อร้าน', route: 'contact' },
    ] satisfies NavigationItem[],
  },
  footer: {
    enabled: true,
    show_about: true,
    show_games: true,
    show_contact: true,
    show_social: true,
    show_disclaimer: true,
  },
} as const

export type SiteDefaults = typeof SITE_DEFAULTS

export const STORE_DEFAULTS = {
  store_name: 'ร้านไอดีพร้อมเล่น',
  store_description: 'ร้านไอดีเกมออนไลน์ สั่งซื้อผ่าน WhatsApp ส่งมอบไว',
  business_hours: 'ทุกวัน 09:00-23:00 น.',
  footer_text: 'ขอบคุณที่ใช้บริการ',
  footer_disclaimer:
    'เว็บไซต์นี้เป็นตัวแทนนำเสนอสินค้าเท่านั้น ไม่ใช่เว็บไซต์ทางการของผู้พัฒนาเกม การสั่งซื้อและการชำระเงินดำเนินการผ่าน WhatsApp โดยตรงกับร้าน',
  maintenance_message: 'เว็บไซต์กำลังปรับปรุงอยู่ชั่วคราว กรุณากลับมาเยือนอีกครั้งเร็ว ๆ นี้',
  floating_whatsapp_text: 'ทักร้าน',
} as const

export type StoreDefaults = typeof STORE_DEFAULTS

/** Clamp ranges, enforced by the Server Action as well as the form. */
export const SECTION_LIMITS = {
  perPage: { min: 4, max: 48 },
  featuredCount: { min: 0, max: 24 },
  categoriesLimit: { min: 0, max: 24 },
  trustCount: { min: 0, max: 4 },
  navItems: { min: 1, max: 6 },
  trustItems: { min: 0, max: 4 },
} as const

export const TEXT_LIMITS = {
  heroTitle: 40,
  heroSubtitle: 120,
  ctaText: 30,
  trustItem: 60,
  sectionTitle: 60,
  navLabel: 24,
  storeName: 80,
  businessHours: 60,
  floatingText: 12,
  footerText: 120,
  disclaimer: 300,
} as const
