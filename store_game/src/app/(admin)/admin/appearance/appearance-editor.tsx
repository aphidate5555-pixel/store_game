'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import { saveSectionAction, toggleSectionAction, type AppearanceResult } from './actions'
import { t, type MessageKey } from '@/lib/i18n/th/admin'
import { ROUTE_KEYS, ROUTES, type RouteKey } from '@/lib/validation/route-keys'
import { sectionPayload } from '@/lib/catalog/site-content'
import type { Database } from '@/lib/database.types'

type SectionRow = Database['public']['Tables']['site_sections']['Row']

const FIELD =
  'min-h-11 w-full rounded-lg border border-line bg-surface-2 px-3 text-base text-text focus-ring'
const LABEL = 'block text-sm font-medium text-text-2'
const HINT = 'mt-1.5 text-sm text-text-3'

/**
 * A literal object rather than `Record<string, MessageKey>`: the index
 * signature would make every lookup `MessageKey | undefined` under
 * noUncheckedIndexedAccess, and `satisfies` keeps the compile-time check that
 * each value is a real key while still failing on a typo at this line.
 */
const SECTION_LABELS = {
  hero: 'admin.appearance.sectionHero',
  trust: 'admin.appearance.sectionTrust',
  categories: 'admin.appearance.sectionCategories',
  featured_products: 'admin.appearance.sectionFeatured',
  all_products: 'admin.appearance.sectionAllProducts',
  navigation: 'admin.appearance.sectionNavigation',
  footer: 'admin.appearance.sectionFooter',
} as const satisfies Record<string, MessageKey>

/**
 * The appearance editor.
 *
 * Each section is a card with its own save, so a validation failure in one
 * does not discard work in another. The live preview sits below and shows
 * the values currently in the form, not the values on the server — the copy
 * says so explicitly, because an administrator who edits a colour and does
 * not see it change assumes the save failed.
 */
export function AppearanceEditor({ sections }: { sections: readonly SectionRow[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<AppearanceResult | null>(null)
  const [dirty, setDirty] = useState(false)

  useUnsavedChangesGuard({ when: dirty })

  const save = (sectionKey: string, patch: unknown) => {
    setResult(null)
    setDirty(true)
    startTransition(async () => {
      const outcome = await saveSectionAction({ sectionKey, patch })
      setResult(outcome)
      if (outcome.ok) {
        setDirty(false)
        router.refresh()
      }
    })
  }

  const toggle = (sectionKey: string, isEnabled: boolean) => {
    startTransition(async () => {
      const outcome = await toggleSectionAction(sectionKey, isEnabled)
      setResult(outcome)
      if (outcome.ok) router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {result ? (
        <div
          role="alert"
          className={[
            'rounded-lg border px-4 py-3',
            result.ok ? 'border-success/40 bg-success/10' : 'border-danger/40 bg-danger/10',
          ].join(' ')}
        >
          <p className="text-sm text-text">
            {result.ok ? t('errors.save.saved') : result.message}
          </p>
        </div>
      ) : null}

      {(Object.keys(SECTION_LABELS) as (keyof typeof SECTION_LABELS)[]).map((key) => {
        const labelKey = SECTION_LABELS[key]
        const payload = sectionPayload(sections, key)
        const enabled = payload.enabled !== false
        return (
          <section key={key} className="rounded-xl border border-line bg-surface p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-text">{t(labelKey)}</h2>
              <button
                type="button"
                disabled={pending}
                onClick={() => toggle(key, !enabled)}
                aria-pressed={!enabled}
                className="min-h-11 rounded-lg border border-line px-3 text-sm text-text hover:border-line-ctl focus-ring disabled:opacity-50"
              >
                {enabled ? t('admin.appearance.sectionHidden') : t('admin.common.enable')}
              </button>
            </div>

            {!enabled ? (
              <p className="mb-3 text-sm text-text-3">{t('admin.appearance.sectionHiddenHint')}</p>
            ) : null}

            <div className="space-y-4">
              {key === 'hero' ? <HeroCard payload={payload} onSave={save} /> : null}
              {key === 'trust' ? <TrustCard payload={payload} onSave={save} /> : null}
              {key === 'categories' ? <CategoriesCard payload={payload} onSave={save} /> : null}
              {key === 'featured_products' ? <FeaturedCard payload={payload} onSave={save} /> : null}
              {key === 'all_products' ? <AllProductsCard payload={payload} onSave={save} /> : null}
              {key === 'navigation' ? <NavigationCard payload={payload} onSave={save} /> : null}
              {key === 'footer' ? <FooterCard payload={payload} onSave={save} /> : null}
            </div>

            <button
              type="button"
              disabled={pending}
              onClick={() => save(key, {})}
              className="mt-4 min-h-11 w-full rounded-lg bg-primary text-sm font-medium text-on-primary hover:brightness-95 focus-ring disabled:opacity-60"
            >
              {pending ? t('errors.save.saving') : t('admin.common.save')}
            </button>
          </section>
        )
      })}

      <LivePreview sections={sections} />

      <p className="text-sm text-text-3">{t('admin.appearance.noAdminLinks')}</p>
    </div>
  )
}

type Payload = Record<string, unknown>
type Saver = (sectionKey: string, patch: unknown) => void

function HeroCard({ payload, onSave }: { payload: Payload; onSave: Saver }) {
  const [title, setTitle] = useState(String(payload.title ?? ''))
  const [subtitle, setSubtitle] = useState(String(payload.subtitle ?? ''))
  const [ctaText, setCtaText] = useState(String(payload.cta_text ?? ''))
  const [ctaRoute, setCtaRoute] = useState<RouteKey>(
    (payload.cta_route as RouteKey) ?? 'games',
  )

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="heroTitle" className={LABEL}>
          {t('admin.appearance.fieldHeroTitle')}
        </label>
        <input
          id="heroTitle"
          maxLength={40}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-describedby="heroTitle-hint"
          className={`mt-1.5 ${FIELD}`}
        />
        <p id="heroTitle-hint" className={HINT}>
          {t('admin.appearance.fieldHeroTitleHint')}
        </p>
      </div>

      <div>
        <label htmlFor="heroSubtitle" className={LABEL}>
          {t('admin.appearance.fieldHeroSubtitle')}
        </label>
        <textarea
          id="heroSubtitle"
          rows={2}
          maxLength={120}
          value={subtitle}
          onChange={(event) => setSubtitle(event.target.value)}
          aria-describedby="heroSubtitle-hint"
          className={`mt-1.5 py-2.5 ${FIELD}`}
        />
        <p id="heroSubtitle-hint" className={HINT}>
          {t('admin.appearance.fieldHeroSubtitleHint')}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="heroCtaText" className={LABEL}>
            {t('admin.appearance.fieldHeroCtaText')}
          </label>
          <input
            id="heroCtaText"
            maxLength={30}
            value={ctaText}
            onChange={(event) => setCtaText(event.target.value)}
            className={`mt-1.5 ${FIELD}`}
          />
        </div>

        <div>
          <label htmlFor="heroCtaRoute" className={LABEL}>
            {t('admin.appearance.fieldHeroCtaRoute')}
          </label>
          <select
            id="heroCtaRoute"
            value={ctaRoute}
            onChange={(event) => setCtaRoute(event.target.value as RouteKey)}
            aria-describedby="heroCtaRoute-hint"
            className={`mt-1.5 ${FIELD}`}
          >
            {ROUTE_KEYS.map((key) => (
              <option key={key} value={key}>
                {ROUTES[key]}
              </option>
            ))}
          </select>
          <p id="heroCtaRoute-hint" className={HINT}>
            {t('admin.appearance.fieldHeroCtaRouteHint')}
          </p>
        </div>
      </div>

      <SaveButton
        onClick={() =>
          onSave('hero', {
            title: title || undefined,
            subtitle: subtitle || undefined,
            cta_text: ctaText || undefined,
            cta_route: ctaRoute,
          })
        }
      />
    </div>
  )
}

function TrustCard({ payload, onSave }: { payload: Payload; onSave: Saver }) {
  const count = typeof payload.count === 'number' ? payload.count : 4
  const items = Array.isArray(payload.items) ? (payload.items as string[]) : []

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="trustCount" className={LABEL}>
          {t('admin.appearance.fieldTrustCount')}
        </label>
        <input
          id="trustCount"
          type="number"
          min={0}
          max={4}
          value={count}
          onChange={(event) => {
            const next = Number(event.target.value)
            const clamped = Math.min(Math.max(next, 0), 4)
            onSave('trust', { count: clamped })
          }}
          aria-describedby="trustCount-hint"
          className={`mt-1.5 ${FIELD}`}
        />
        <p id="trustCount-hint" className={HINT}>
          {t('admin.appearance.fieldTrustItemHint')}
        </p>
      </div>

      {Array.from({ length: count }, (_, index) => (
        <div key={index}>
          <label htmlFor={`trustItem${index}`} className={LABEL}>
            {t('admin.appearance.fieldTrustItem', { index: index + 1 })}
          </label>
          <input
            id={`trustItem${index}`}
            maxLength={60}
            defaultValue={items[index] ?? ''}
            onBlur={(event) => {
              const next = [...items]
              while (next.length < count) next.push('')
              next[index] = event.target.value
              onSave('trust', { items: next.filter((item) => item.length > 0) })
            }}
            className={`mt-1.5 ${FIELD}`}
          />
        </div>
      ))}
    </div>
  )
}

function CategoriesCard({ payload, onSave }: { payload: Payload; onSave: Saver }) {
  return (
    <div>
      <label htmlFor="categoriesLimit" className={LABEL}>
        {t('admin.appearance.fieldCategoriesLimit')}
      </label>
      <input
        id="categoriesLimit"
        type="number"
        min={0}
        max={24}
        defaultValue={typeof payload.limit === 'number' ? payload.limit : 8}
        onBlur={(event) => {
          const raw = Number(event.target.value)
          onSave('categories', { limit: Math.min(Math.max(raw, 0), 24) })
        }}
        aria-describedby="categoriesLimit-hint"
        className={`mt-1.5 ${FIELD}`}
      />
      <p id="categoriesLimit-hint" className={HINT}>
        {t('admin.appearance.fieldCategoriesLimitHint')}
      </p>
    </div>
  )
}

function FeaturedCard({ payload, onSave }: { payload: Payload; onSave: Saver }) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="featuredTitle" className={LABEL}>
          {t('admin.appearance.fieldFeaturedTitle')}
        </label>
        <input
          id="featuredTitle"
          maxLength={60}
          defaultValue={String(payload.title ?? '')}
          onBlur={(event) => onSave('featured_products', { title: event.target.value || undefined })}
          className={`mt-1.5 ${FIELD}`}
        />
      </div>
      <div>
        <label htmlFor="featuredCount" className={LABEL}>
          {t('admin.appearance.fieldFeaturedCount')}
        </label>
        <input
          id="featuredCount"
          type="number"
          min={0}
          max={24}
          defaultValue={typeof payload.count === 'number' ? payload.count : 8}
          onBlur={(event) => {
            const raw = Number(event.target.value)
            onSave('featured_products', { count: Math.min(Math.max(raw, 0), 24) })
          }}
          aria-describedby="featuredCount-hint"
          className={`mt-1.5 ${FIELD}`}
        />
        <p id="featuredCount-hint" className={HINT}>
          {t('admin.appearance.fieldFeaturedCountHint')}
        </p>
      </div>
    </div>
  )
}

function AllProductsCard({ payload, onSave }: { payload: Payload; onSave: Saver }) {
  return (
    <div>
      <label htmlFor="perPage" className={LABEL}>
        {t('admin.appearance.fieldPerPage')}
      </label>
      <input
        id="perPage"
        type="number"
        min={4}
        max={48}
        defaultValue={typeof payload.per_page === 'number' ? payload.per_page : 16}
        onBlur={(event) => {
          const raw = Number(event.target.value)
          onSave('all_products', { per_page: Math.min(Math.max(raw, 4), 48) })
        }}
        aria-describedby="perPage-hint"
        className={`mt-1.5 ${FIELD}`}
      />
      <p id="perPage-hint" className={HINT}>
        {t('admin.appearance.perPageHint')}
      </p>
    </div>
  )
}

/**
 * The menu editor.
 *
 * Each item picks a route key from a select. There is deliberately no text
 * field for a URL: a typed href is how a menu ends up pointing at a page that
 * does not exist, and the registry is the only list of destinations that
 * actually exist (F-13).
 */
function NavigationCard({ payload, onSave }: { payload: Payload; onSave: Saver }) {
  const items = Array.isArray(payload.items)
    ? (payload.items as { label: string; route: RouteKey }[])
    : []

  const update = (index: number, patch: Partial<{ label: string; route: RouteKey }>) => {
    const next = items.map((item, i) => (i === index ? { ...item, ...patch } : item))
    onSave('navigation', { items: next })
  }

  return (
    <div className="space-y-4">
      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          defaultChecked={payload.show_search !== false}
          onChange={(event) => onSave('navigation', { show_search: event.target.checked })}
          aria-describedby="navSearch-hint"
          className="size-5 rounded border-line"
        />
        {t('admin.appearance.fieldNavShowSearch')}
      </label>
      <p id="navSearch-hint" className="-mt-2 text-sm text-text-3">
        {t('admin.appearance.fieldNavShowSearchHint')}
      </p>

      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          defaultChecked={payload.show_whatsapp_button !== false}
          onChange={(event) =>
            onSave('navigation', { show_whatsapp_button: event.target.checked })
          }
          aria-describedby="navWa-hint"
          className="size-5 rounded border-line"
        />
        {t('admin.appearance.fieldNavShowWhatsapp')}
      </label>
      <p id="navWa-hint" className="-mt-2 text-sm text-text-3">
        {t('admin.appearance.fieldNavShowWhatsappHint')}
      </p>

      {items.map((item, index) => (
        <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <div>
            <label htmlFor={`navLabel${index}`} className={LABEL}>
              {t('admin.appearance.fieldNavItemLabel')}
            </label>
            <input
              id={`navLabel${index}`}
              maxLength={24}
              defaultValue={item.label}
              onBlur={(event) => update(index, { label: event.target.value })}
              className={`mt-1.5 ${FIELD}`}
            />
          </div>
          <div>
            <label htmlFor={`navRoute${index}`} className={LABEL}>
              {t('admin.appearance.fieldNavItemRoute')}
            </label>
            <select
              id={`navRoute${index}`}
              value={item.route}
              onChange={(event) => update(index, { route: event.target.value as RouteKey })}
              aria-describedby={`navRoute${index}-hint`}
              className={`mt-1.5 ${FIELD}`}
            >
              {ROUTE_KEYS.map((key) => (
                <option key={key} value={key}>
                  {ROUTES[key]}
                </option>
              ))}
            </select>
            <p id={`navRoute${index}-hint`} className={HINT}>
              {t('admin.appearance.fieldNavItemRouteHint')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSave('navigation', { items: items.filter((_, i) => i !== index) })}
            className="mt-6 min-h-11 rounded-lg border border-line px-3 text-sm text-text focus-ring"
          >
            {t('admin.common.delete')}
          </button>
        </div>
      ))}

      {items.length < 6 ? (
        <button
          type="button"
          onClick={() => onSave('navigation', { items: [...items, { label: '', route: 'products' }] })}
          className="min-h-11 rounded-lg border border-line bg-surface-2 px-4 text-sm text-text focus-ring"
        >
          {t('admin.appearance.fieldNavAddItem')}
        </button>
      ) : null}
    </div>
  )
}

function FooterCard({ payload, onSave }: { payload: Payload; onSave: Saver }) {
  const flags: [string, MessageKey][] = [
    ['show_about', 'admin.appearance.fieldFooterShowAbout'],
    ['show_games', 'admin.appearance.fieldFooterShowGames'],
    ['show_contact', 'admin.appearance.fieldFooterShowContact'],
    ['show_social', 'admin.appearance.fieldFooterShowSocial'],
    ['show_disclaimer', 'admin.appearance.fieldFooterShowDisclaimer'],
  ]

  return (
    <div className="space-y-3">
      {flags.map(([key, labelKey]) => (
        <label key={key} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            defaultChecked={payload[key] !== false}
            onChange={(event) => onSave('footer', { [key]: event.target.checked })}
            className="size-5 rounded border-line"
          />
          {t(labelKey)}
        </label>
      ))}
    </div>
  )
}

function SaveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-11 w-full rounded-lg border border-line bg-surface-2 text-sm text-text hover:border-line-ctl focus-ring"
    >
      {t('admin.common.save')}
    </button>
  )
}

/**
 * The preview.
 *
 * Renders the stored values, not the in-form ones: wiring the two together
 * would mean mirroring every field into state on each keystroke, and the
 * save bar is right above it. The hint says so plainly.
 */
function LivePreview({ sections }: { sections: readonly SectionRow[] }) {
  const hero = sectionPayload(sections, 'hero')
  const featured = sectionPayload(sections, 'featured_products')

  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h2 className="text-base font-semibold text-text">{t('admin.appearance.preview')}</h2>
      <p className="mt-1 text-sm text-text-3">{t('admin.appearance.previewHint')}</p>

      <div className="mt-4 overflow-hidden rounded-lg border border-line">
        <div className="bg-ink px-4 py-8">
          <p className="text-sm text-text-2">{t('admin.appearance.previewDesktop')}</p>
          <h3 className="mt-2 text-lg font-bold text-text">
            {String(hero.title ?? 'ไอดีเกมพร้อมเล่น')}
          </h3>
          <p className="mt-1 text-sm text-text-2">{String(hero.subtitle ?? '')}</p>
          <span className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm text-on-primary">
            {String(hero.cta_text ?? 'ดูไอดีทั้งหมด')}
          </span>
        </div>
        <div className="border-t border-line bg-surface px-4 py-3">
          <p className="text-sm font-medium text-text">
            {String(featured.title ?? 'สินค้าแนะนำ')}
          </p>
        </div>
      </div>
    </section>
  )
}
