'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import {
  saveSettingsCard,
  uploadBrandAssetAction,
  removeBrandAssetAction,
  type SettingsResult,
  type CardKey,
} from './actions'
import { brandMediaUrl } from '@/lib/storage/media-url'
import { t } from '@/lib/i18n/th/admin'
import type { Database } from '@/lib/database.types'

type SettingsRow = Database['public']['Tables']['store_settings']['Row']

const FIELD =
  'min-h-11 w-full rounded-lg border border-line bg-surface-2 px-3 text-base text-text focus-ring'
const LABEL = 'block text-sm font-medium text-text-2'
const HINT = 'mt-1.5 text-sm text-text-3'

/**
 * The settings form.
 *
 * Each card saves independently and carries the version it loaded, so two
 * administrators editing different cards do not overwrite each other — the
 * conflict message appears only when the same card is saved twice from a
 * stale form.
 */
export function SettingsForm({ settings }: { settings: SettingsRow }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<SettingsResult | null>(null)
  const [dirty, setDirty] = useState(false)

  useUnsavedChangesGuard({ when: dirty })

  const save = (card: CardKey, patch: Record<string, unknown>) => {
    setResult(null)
    startTransition(async () => {
      const outcome = await saveSettingsCard({
        card,
        patch,
        expectedVersion: settings.version,
      })
      setResult(outcome)
      if (outcome.ok) {
        setDirty(false)
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-6">
      {result ? (
        <div
          role="alert"
          className={[
            'rounded-lg border px-4 py-3',
            result.ok
              ? 'border-success/40 bg-success/10'
              : 'border-danger/40 bg-danger/10',
          ].join(' ')}
        >
          <p className="text-sm text-text">
            {result.ok ? t('errors.save.saved') : result.message}
          </p>
          {!result.ok ? (
            <p className="mt-1 text-sm text-text-3">{t('errors.save.failedReassure')}</p>
          ) : null}
        </div>
      ) : null}

      {/* ---- store identity ------------------------------------------- */}
      <Card title={t('admin.settings.sectionStore')} onSave={() => save('store', {
        store_name: text('storeName'),
        store_description: text('storeDescription'),
        seo_title: text('seoTitle'),
        seo_description: text('seoDescription'),
      })}>
        <Text
          id="storeName"
          label={t('admin.settings.fieldStoreName')}
          hint={t('admin.settings.fieldStoreNameHint')}
          defaultValue={settings.store_name}
          maxLength={80}
        />
        <Text
          id="storeDescription"
          label={t('admin.settings.fieldStoreDescription')}
          hint={t('admin.settings.fieldStoreDescriptionHint')}
          defaultValue={settings.store_description}
        />
        <Text
          id="seoTitle"
          label={t('admin.settings.fieldSeoTitle')}
          hint={t('admin.settings.fieldSeoTitleHint')}
          defaultValue={settings.seo_title ?? ''}
          maxLength={70}
        />
        <Text
          id="seoDescription"
          label={t('admin.settings.fieldSeoDescription')}
          hint={t('admin.settings.fieldSeoDescriptionHint')}
          defaultValue={settings.seo_description ?? ''}
          maxLength={200}
        />
      </Card>

      {/* ---- branding & colours ----------------------------------------- */}
      <Card title={t('admin.appearance.sectionBranding')} onSave={() => save('branding', {
        primary_color: text('primaryColor'),
        accent_color: text('accentColor'),
      })}>
        <div className="grid gap-4 sm:grid-cols-3">
          <BrandAssetUpload
            column="logo_path"
            kind="logo"
            label={t('admin.settings.fieldLogo')}
            hint={t('admin.settings.fieldLogoHint')}
            currentPath={settings.logo_path}
            expectedVersion={settings.version}
            onDone={(outcome) => {
              setResult(outcome)
              if (outcome.ok) router.refresh()
            }}
          />
          <BrandAssetUpload
            column="favicon_path"
            kind="favicon"
            label={t('admin.settings.fieldFavicon')}
            hint={t('admin.settings.fieldFaviconHint')}
            currentPath={settings.favicon_path}
            expectedVersion={settings.version}
            onDone={(outcome) => {
              setResult(outcome)
              if (outcome.ok) router.refresh()
            }}
          />
          <BrandAssetUpload
            column="default_og_image_path"
            kind="og"
            label={t('admin.settings.fieldOgImage')}
            hint={t('admin.settings.fieldOgImageHint')}
            currentPath={settings.default_og_image_path}
            expectedVersion={settings.version}
            onDone={(outcome) => {
              setResult(outcome)
              if (outcome.ok) router.refresh()
            }}
          />
        </div>
        <ColorField
          id="primaryColor"
          label={t('admin.appearance.fieldPrimaryColor')}
          hint={t('admin.appearance.fieldPrimaryColorHint')}
          value={settings.primary_color}
        />
        <ColorField
          id="accentColor"
          label={t('admin.appearance.fieldAccentColor')}
          hint={t('admin.appearance.fieldAccentColorHint')}
          value={settings.accent_color}
        />
      </Card>

      {/* ---- WhatsApp and hours ------------------------------------------ */}
      <Card title={t('admin.settings.sectionContact')} onSave={() => save('contact', {
        whatsapp_number: text('whatsappNumber'),
        business_hours: text('businessHours'),
      })}>
        <Text
          id="whatsappNumber"
          label={t('admin.settings.fieldWhatsappNumber')}
          hint={
            settings.whatsapp_number
              ? t('admin.settings.fieldWhatsappNumberHint')
              : t('admin.settings.fieldWhatsappNumberHintEmpty')
          }
          defaultValue={settings.whatsapp_number ?? ''}
          inputMode="numeric"
        />
        <Text
          id="businessHours"
          label={t('admin.settings.fieldBusinessHours')}
          hint={t('admin.settings.fieldBusinessHoursHint')}
          defaultValue={settings.business_hours}
          maxLength={60}
        />
      </Card>

      {/* ---- social ------------------------------------------------------ */}
      <Card title={t('admin.settings.sectionSocial')} onSave={() => save('social', {
        facebook_url: text('facebook'),
        tiktok_url: text('tiktok'),
        instagram_url: text('instagram'),
      })}>
        <p className="mb-1 text-sm text-text-3">{t('admin.settings.fieldSocialHint')}</p>
        <Text id="facebook" label="Facebook" defaultValue={settings.facebook_url ?? ''} />
        <Text id="tiktok" label="TikTok" defaultValue={settings.tiktok_url ?? ''} />
        <Text id="instagram" label="Instagram" defaultValue={settings.instagram_url ?? ''} />
      </Card>

      {/* ---- floating button --------------------------------------------- */}
      <Card title={t('admin.settings.sectionFloating')} onSave={() => save('floating', {
        floating_whatsapp_enabled: checked('floatingEnabled'),
        floating_whatsapp_text: text('floatingText'),
      })}>
        <Checkbox
          id="floatingEnabled"
          label={t('admin.settings.fieldFloatingEnabled')}
          hint={t('admin.settings.fieldFloatingEnabledHint')}
          defaultChecked={settings.floating_whatsapp_enabled}
        />
        <Text
          id="floatingText"
          label={t('admin.settings.fieldFloatingText')}
          hint={t('admin.settings.fieldFloatingTextHint')}
          defaultValue={settings.floating_whatsapp_text}
          maxLength={12}
        />
      </Card>

      {/* ---- footer -------------------------------------------------------- */}
      <Card title={t('admin.appearance.sectionFooter')} onSave={() => save('footer', {
        footer_text: text('footerText'),
        footer_disclaimer: text('footerDisclaimer'),
      })}>
        <Text
          id="footerText"
          label={t('admin.appearance.fieldFooterText')}
          defaultValue={settings.footer_text}
        />
        <Text
          id="footerDisclaimer"
          label={t('admin.appearance.fieldFooterDisclaimer')}
          hint={t('admin.appearance.disclaimerWarn')}
          defaultValue={settings.footer_disclaimer}
        />
      </Card>

      <MaintenanceCard settings={settings} />

      {/* Stated rather than implied: this is not a checkout. */}
      <ul className="space-y-1 rounded-xl border border-line bg-surface-2 p-4 text-sm text-text-2">
        <li>{t('admin.settings.cautionNoCheckout')}</li>
        <li>{t('admin.settings.cautionStock')}</li>
        <li>{t('admin.settings.cautionCurrency')}</li>
        <li>{t('admin.settings.cautionConcurrent')}</li>
      </ul>

      {pending ? (
        <p className="text-sm text-text-3" aria-live="polite">
          {t('errors.save.saving')}
        </p>
      ) : null}
    </div>
  )
}

/**
 * Reads the live form values.
 *
 * Cards render several controls into one DOM subtree, and a save belongs to
 * the card that was pressed — so the values are read from the fields rather
 * than from React state, which would have to be mirrored per keystroke.
 */
function text(id: string): string {
  if (typeof document === 'undefined') return ''
  const field = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null
  return field?.value ?? ''
}

function checked(id: string): boolean {
  if (typeof document === 'undefined') return false
  const field = document.getElementById(id) as HTMLInputElement | null
  return field?.checked ?? false
}

function Card({
  title,
  children,
  onSave,
}: {
  title: string
  children: React.ReactNode
  onSave: () => void
}) {
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h2 className="mb-4 text-base font-semibold text-text">{title}</h2>
      <div className="space-y-4">{children}</div>
      <button
        type="button"
        onClick={onSave}
        className="mt-4 min-h-11 w-full rounded-lg bg-primary text-sm font-medium text-on-primary hover:brightness-95 focus-ring"
      >
        {t('admin.common.save')}
      </button>
    </section>
  )
}

function Text({
  id,
  label,
  hint,
  defaultValue,
  maxLength,
  inputMode,
}: {
  id: string
  label: string
  hint?: string
  defaultValue?: string | null
  maxLength?: number
  inputMode?: 'numeric' | 'text'
}) {
  return (
    <div>
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      <input
        id={id}
        name={id}
        defaultValue={defaultValue ?? ''}
        maxLength={maxLength}
        inputMode={inputMode}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={`mt-1.5 ${FIELD}`}
      />
      {hint ? (
        <p id={`${id}-hint`} className={HINT}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}

function ColorField({
  id,
  label,
  hint,
  value,
}: {
  id: string
  label: string
  hint: string
  value: string
}) {
  const [current, setCurrent] = useState(value)

  return (
    <div>
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      <div className="mt-1.5 flex items-center gap-3">
        <input
          id={id}
          name={id}
          type="color"
          value={current}
          onChange={(event) => setCurrent(event.target.value.toUpperCase())}
          aria-describedby={`${id}-hint`}
          className="h-11 w-14 cursor-pointer rounded-lg border border-line bg-surface-2 p-1 focus-ring"
        />
        <span className="font-mono text-sm text-text-2">{current}</span>
      </div>
      <p id={`${id}-hint`} className={HINT}>
        {hint}
      </p>
    </div>
  )
}

function Checkbox({
  id,
  label,
  hint,
  defaultChecked,
}: {
  id: string
  label: string
  hint: string
  defaultChecked: boolean
}) {
  return (
    <div>
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-text">
        <input
          id={id}
          name={id}
          type="checkbox"
          defaultChecked={defaultChecked}
          aria-describedby={`${id}-hint`}
          className="size-5 rounded border-line"
        />
        {label}
      </label>
      <p id={`${id}-hint`} className={HINT}>
        {hint}
      </p>
    </div>
  )
}

/**
 * Maintenance is its own card because it takes the whole storefront offline,
 * and the confirmation is typed rather than a checkbox (C-26).
 */
function MaintenanceCard({ settings }: { settings: SettingsRow }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirm, setConfirm] = useState('')

  const apply = (enabled: boolean) => {
    startTransition(async () => {
      const outcome = await saveSettingsCard({
        card: 'maintenance',
        patch: {
          maintenance_mode: enabled,
          maintenance_confirm: confirm,
        },
        expectedVersion: settings.version,
      })
      if (outcome.ok) {
        setConfirm('')
        router.refresh()
      }
    })
  }

  return (
    <section
      className={[
        'rounded-xl border p-4',
        settings.maintenance_mode ? 'border-warning/40 bg-warning/10' : 'border-line bg-surface',
      ].join(' ')}
    >
      <h2 className="text-base font-semibold text-text">{t('admin.settings.sectionMaintenance')}</h2>

      <p className="mt-1 text-sm text-text-2">
        {settings.maintenance_mode
          ? t('admin.settings.maintenanceOnWarning')
          : t('admin.settings.maintenanceOffWarning')}
      </p>
      <p className="mt-2 text-sm text-text-3">{t('admin.settings.fieldMaintenanceModeHint')}</p>

      <div className="mt-4">
        <label htmlFor="maintenanceConfirm" className={LABEL}>
          {t('admin.settings.fieldMaintenanceConfirm')}
        </label>
        <input
          id="maintenanceConfirm"
          name="maintenance_confirm"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          autoComplete="off"
          aria-describedby="maintenanceConfirm-hint"
          className={`mt-1.5 ${FIELD} font-mono`}
        />
        <p id="maintenanceConfirm-hint" className={HINT}>
          {t('admin.settings.fieldMaintenanceConfirmHint')}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending || !settings.maintenance_mode}
          onClick={() => apply(false)}
          className="min-h-11 rounded-lg border border-line bg-surface-2 px-4 text-sm text-text hover:border-line-ctl focus-ring disabled:opacity-50"
        >
          {t('admin.dashboard.closeMaintenance')}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => apply(true)}
          className="min-h-11 rounded-lg bg-danger px-4 text-sm font-medium text-white focus-ring disabled:opacity-50"
        >
          {t('admin.dashboard.openMaintenance')}
        </button>
      </div>

      {pending ? (
        <p className="mt-2 text-sm text-text-3" aria-live="polite">
          {t('errors.save.saving')}
        </p>
      ) : null}
    </section>
  )
}

function BrandAssetUpload({
  column,
  kind,
  label,
  hint,
  currentPath,
  expectedVersion,
  onDone,
}: {
  column: 'logo_path' | 'favicon_path' | 'default_og_image_path'
  kind: 'logo' | 'favicon' | 'og'
  label: string
  hint: string
  currentPath: string | null
  expectedVersion: number
  onDone: (outcome: SettingsResult) => void
}) {
  const [pending, startTransition] = useTransition()
  const url = brandMediaUrl(currentPath)

  return (
    <div className="flex flex-col justify-between rounded-xl border border-line bg-surface-2 p-3">
      <div>
        <label htmlFor={`asset-${kind}`} className={LABEL}>
          {label}
        </label>
        <p className={HINT}>{hint}</p>

        {url ? (
          <div className="mt-2.5 flex h-16 items-center justify-center overflow-hidden rounded-lg border border-line bg-ink p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={label} className="max-h-full max-w-full object-contain" />
          </div>
        ) : (
          <div className="mt-2.5 flex h-16 items-center justify-center rounded-lg border border-dashed border-line bg-ink/50 text-xs text-text-3">
            ยังไม่มีรูป
          </div>
        )}
      </div>

      <div className="mt-3 space-y-2">
        <input
          id={`asset-${kind}`}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={pending}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (!file) return
            const fd = new FormData()
            fd.set('column', column)
            fd.set('kind', kind)
            fd.set('expectedVersion', String(expectedVersion))
            fd.set('file', file)
            startTransition(async () => {
              const res = await uploadBrandAssetAction({ ok: true, error: null }, fd)
              onDone(
                res.ok
                  ? { ok: true, version: expectedVersion + 1 }
                  : { ok: false, message: res.error ?? 'อัปโหลดไม่สำเร็จ' },
              )
              event.target.value = ''
            })
          }}
          className="block w-full text-xs text-text-2 file:mr-2 file:min-h-9 file:cursor-pointer file:rounded-lg file:border file:border-line file:bg-surface file:px-2.5 file:text-xs file:font-medium file:text-text"
        />
        {currentPath ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const res = await removeBrandAssetAction(column, expectedVersion)
                onDone(res)
              })
            }}
            className="min-h-9 w-full rounded-lg border border-danger/40 px-2.5 text-xs font-medium text-danger hover:bg-danger/10 focus-ring disabled:opacity-50"
          >
            {t('admin.common.delete')}
          </button>
        ) : null}
      </div>
    </div>
  )
}

