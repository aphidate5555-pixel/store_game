'use client'

import { useActionState, useState, useTransition } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'

import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import {
  uploadProductImages,
  upsertProductAction,
  deleteProductImageAction,
  setProductCoverAction,
  type ActionResult,
} from './actions'
import { MAX_IMAGE_BYTES_LABEL, MAX_FILES_PER_UPLOAD } from '@/lib/images/limits'
import { getProductPrices, formatCodePrice } from '@/lib/format/money'
import { productMediaUrl } from '@/lib/storage/media-url'
import { ImageWithFallback, ProductArtworkFallback } from '@/components/ui/image-with-fallback'
import { t } from '@/lib/i18n/th/admin'
import type { Database } from '@/lib/database.types'

type ProductRow = Database['public']['Tables']['products']['Row']
type ProductImageRow = Database['public']['Tables']['product_images']['Row']
type GameRow = Database['public']['Tables']['games']['Row']

const FIELD =
  'min-h-11 w-full rounded-lg border border-line bg-surface-2 px-3 text-base text-text focus-ring'
const LABEL = 'block text-sm font-medium text-text-2'

function SaveButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-12 w-full rounded-lg bg-primary text-base font-medium text-on-primary transition-[background-color] duration-micro hover:brightness-95 disabled:opacity-60 focus-ring sm:min-h-11"
    >
      {pending ? t('errors.save.saving') : t('admin.common.save')}
    </button>
  )
}

export function ProductForm({
  product,
  games,
  images = [],
}: {
  product: ProductRow | null
  games: GameRow[]
  images?: ProductImageRow[]
}) {
  const router = useRouter()
  const [state, formAction] = useActionState<ActionResult | null, FormData>(upsertProductAction, null)
  const initialPrices = product ? getProductPrices(product) : { thb: null, lak: null }
  const [priceThbInput, setPriceThbInput] = useState<string>(
    initialPrices.thb !== null ? String(initialPrices.thb) : '',
  )
  const [priceLakInput, setPriceLakInput] = useState<string>(
    initialPrices.lak !== null ? String(initialPrices.lak) : '',
  )
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)

  useUnsavedChangesGuard({ when: dirty && !saved })

  const productCode = product?.product_code ?? ''
  const productId = product?.id ?? ''

  const parsedThb =
    priceThbInput.trim() !== '' && Number.isInteger(Number(priceThbInput)) && Number(priceThbInput) >= 0
      ? Number(priceThbInput)
      : null
  const parsedLak =
    priceLakInput.trim() !== '' && Number.isInteger(Number(priceLakInput)) && Number(priceLakInput) >= 0
      ? Number(priceLakInput)
      : null

  return (
    <div className="space-y-6 pb-28 lg:pb-0">
      <form
        action={formAction}
        onChange={() => {
          setDirty(true)
          setSaved(false)
        }}
        className="space-y-6"
      >
        {productId ? <input type="hidden" name="id" value={productId} /> : null}

        <fieldset className="space-y-4 rounded-xl border border-line bg-surface p-4">
          <legend className="px-1 text-sm font-semibold text-text">
            {t('admin.products.sectionBasic')}
          </legend>

          <div>
            <label htmlFor="productCode" className={LABEL}>
              {t('admin.products.fieldCode')}
            </label>
            <input
              id="productCode"
              name="productCode"
              required
              defaultValue={productCode}
              placeholder="ML-20481"
              aria-describedby="productCode-hint"
              className={`mt-1.5 ${FIELD} font-mono`}
            />
            <p id="productCode-hint" className="mt-1.5 text-sm text-text-3">
              {t('admin.products.fieldCodeHint')}
            </p>
          </div>

          <div>
            <label htmlFor="name" className={LABEL}>
              {t('admin.products.fieldName')}
            </label>
            <input
              id="name"
              name="name"
              required
              defaultValue={product?.name ?? ''}
              aria-describedby="name-hint"
              className={`mt-1.5 ${FIELD}`}
            />
            <p id="name-hint" className="mt-1.5 text-sm text-text-3">
              {t('admin.products.fieldNameHint')}
            </p>
          </div>

          <div>
            <label htmlFor="description" className={LABEL}>
              {t('admin.products.fieldDescription')}
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              maxLength={2000}
              defaultValue={product?.description ?? ''}
              aria-describedby="description-hint"
              className={`mt-1.5 py-2.5 ${FIELD}`}
            />
            <p id="description-hint" className="mt-1.5 text-sm text-text-3">
              {t('admin.products.fieldDescriptionHint')}
            </p>
          </div>
        </fieldset>

        <fieldset className="space-y-4 rounded-xl border border-line bg-surface p-4">
          <legend className="px-1 text-sm font-semibold text-text">
            {t('admin.products.sectionInGame')}
          </legend>

          <div>
            <label htmlFor="gameId" className={LABEL}>
              {t('admin.products.fieldGame')}
            </label>
            <select
              id="gameId"
              name="gameId"
              required
              defaultValue={product?.game_id ?? games[0]?.id ?? ''}
              aria-describedby="gameId-hint"
              className={`mt-1.5 ${FIELD}`}
            >
              <option value="">{t('admin.products.fieldGame')}</option>
              {games.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.name}
                </option>
              ))}
            </select>
            <p id="gameId-hint" className="mt-1.5 text-sm text-text-3">
              {t('admin.products.fieldGameHint')}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="rank" className={LABEL}>
                {t('admin.products.fieldRank')}
              </label>
              <input
                id="rank"
                name="rank"
                maxLength={32}
                defaultValue={product?.rank ?? ''}
                aria-describedby="rank-hint"
                className={`mt-1.5 ${FIELD}`}
              />
              <p id="rank-hint" className="mt-1.5 text-sm text-text-3">
                {t('admin.products.fieldRankHint')}
              </p>
            </div>

            <div>
              <label htmlFor="heroCount" className={LABEL}>
                {t('admin.products.fieldHeroCount')}
              </label>
              <input
                id="heroCount"
                name="heroCount"
                type="number"
                inputMode="numeric"
                min={0}
                defaultValue={product?.hero_count ?? 0}
                aria-describedby="heroCount-hint"
                className={`mt-1.5 ${FIELD}`}
              />
              <p id="heroCount-hint" className="mt-1.5 text-sm text-text-3">
                {t('admin.products.fieldHeroCountHint')}
              </p>
            </div>

            <div>
              <label htmlFor="skinCount" className={LABEL}>
                {t('admin.products.fieldSkinCount')}
              </label>
              <input
                id="skinCount"
                name="skinCount"
                type="number"
                inputMode="numeric"
                min={0}
                defaultValue={product?.skin_count ?? 0}
                aria-describedby="skinCount-hint"
                className={`mt-1.5 ${FIELD}`}
              />
              <p id="skinCount-hint" className="mt-1.5 text-sm text-text-3">
                {t('admin.products.fieldSkinCountHint')}
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="binding" className={LABEL}>
              {t('admin.products.fieldBinding')}
            </label>
            <select
              id="binding"
              name="binding"
              defaultValue={product?.binding ?? ''}
              aria-describedby="binding-hint"
              className={`mt-1.5 ${FIELD}`}
            >
              <option value="">{t('admin.products.fieldBinding')}</option>
              <option value="bound">ผูกบัญชี</option>
              <option value="unbound">ไม่ผูกบัญชี</option>
            </select>
            <p id="binding-hint" className="mt-1.5 text-sm text-text-3">
              {t('admin.products.fieldBindingHint')}
            </p>
          </div>
        </fieldset>

        <fieldset className="space-y-4 rounded-xl border border-line bg-surface p-4">
          <legend className="px-1 text-sm font-semibold text-text">
            {t('admin.products.sectionPrice')}
          </legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="priceThb" className={LABEL}>
                {t('admin.products.fieldPriceThb')}
              </label>
              <input
                id="priceThb"
                name="priceThb"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                placeholder="350"
                value={priceThbInput}
                onChange={(event) => setPriceThbInput(event.target.value)}
                aria-describedby="priceThb-hint"
                className={`mt-1.5 ${FIELD} tabular-nums`}
              />
              <p id="priceThb-hint" className="mt-1.5 text-sm text-text-3">
                {t('admin.products.fieldPriceThbHint')}
              </p>
              {parsedThb !== null ? (
                <p className="mt-1 text-xs font-semibold text-text">
                  ตัวอย่างหน้าเว็บ: {formatCodePrice(parsedThb, 'THB')}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="priceLak" className={LABEL}>
                {t('admin.products.fieldPriceLak')}
              </label>
              <input
                id="priceLak"
                name="priceLak"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                placeholder="220000"
                value={priceLakInput}
                onChange={(event) => setPriceLakInput(event.target.value)}
                aria-describedby="priceLak-hint"
                className={`mt-1.5 ${FIELD} tabular-nums`}
              />
              <p id="priceLak-hint" className="mt-1.5 text-sm text-text-3">
                {t('admin.products.fieldPriceLakHint')}
              </p>
              {parsedLak !== null ? (
                <p className="mt-1 text-xs font-semibold text-accent">
                  ตัวอย่างหน้าเว็บ: {formatCodePrice(parsedLak, 'LAK')}
                </p>
              ) : null}
            </div>
          </div>

          <p className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs text-text-2">
            {t('admin.products.currencyNoConversion')}
          </p>
        </fieldset>

        <fieldset className="space-y-4 rounded-xl border border-line bg-surface p-4">
          <legend className="px-1 text-sm font-semibold text-text">
            {t('admin.products.sectionStatus')}
          </legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="status" className={LABEL}>
                {t('admin.products.fieldStatus')}
              </label>
              <select
                id="status"
                name="status"
                defaultValue={product?.status ?? 'available'}
                aria-describedby="status-hint"
                className={`mt-1.5 ${FIELD}`}
              >
                <option value="available">{t('admin.products.statusAvailable')}</option>
                <option value="reserved">{t('admin.products.statusReserved')}</option>
                <option value="sold">{t('admin.products.statusSold')}</option>
              </select>
              <p id="status-hint" className="mt-1.5 text-sm text-text-3">
                {t('admin.products.fieldStatusHint')}
              </p>
            </div>

            <div className="flex items-end">
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  name="isVisible"
                  defaultChecked={product?.is_visible ?? true}
                  className="size-5 rounded border-line"
                />
                {t('admin.products.fieldVisibility')}
              </label>
            </div>
          </div>
          <p className="text-sm text-text-3">{t('admin.products.fieldVisibilityHint')}</p>
        </fieldset>

        {state ? (
          state.ok ? (
            <div role="status" className="rounded-lg border border-success/40 bg-success/10 p-4">
              <p className="text-sm font-medium text-text">{t('errors.save.saved')}</p>
            </div>
          ) : (
            <div role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-4">
              <p className="text-sm font-medium text-text">{t('errors.save.failedTitle')}</p>
              <p className="mt-1 text-sm text-text-2">{state.message}</p>
              <p className="mt-2 text-sm text-text-3">{t('errors.save.failedReassure')}</p>
            </div>
          )
        ) : null}

        <div className="sticky bottom-0 z-40 -mx-4 border-t border-line bg-surface px-4 py-3 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
          <SaveButton />
        </div>
      </form>

      {productId ? (
        <ImageUploader
          productId={productId}
          productCode={productCode}
          images={images}
          onDone={() => router.refresh()}
        />
      ) : (
        <p className="rounded-lg border border-line bg-surface-2 p-4 text-sm text-text-2">
          {t('admin.products.noCoverYet')}
        </p>
      )}
    </div>
  )
}

function ImageUploader({
  productId,
  productCode,
  images,
  onDone,
}: {
  productId: string
  productCode: string
  images: ProductImageRow[]
  onDone: () => void
}) {
  const [state, formAction] = useActionState(uploadProductImages, {
    ok: true,
    error: null,
  })
  const [pendingAction, startTransition] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)

  return (
    <div className="space-y-4 rounded-xl border border-line bg-surface p-4">
      <h2 className="text-sm font-semibold text-text">{t('admin.products.sectionImages')}</h2>

      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((image) => {
            const url = productMediaUrl(image.storage_path)
            const isCover = image.position === 0
            return (
              <div
                key={image.id}
                className={[
                  'overflow-hidden rounded-xl border bg-surface-2',
                  isCover ? 'border-primary ring-1 ring-primary' : 'border-line',
                ].join(' ')}
              >
                <div className="relative aspect-[16/10] w-full bg-ink">
                  <ImageWithFallback
                    src={url}
                    alt={image.alt || productCode}
                    sizes="200px"
                    className="object-cover"
                    fallback={<ProductArtworkFallback code={productCode} />}
                  />
                  {isCover ? (
                    <span className="absolute left-2 top-2 rounded-md bg-primary px-2 py-0.5 text-[11px] font-semibold text-on-primary">
                      {t('admin.products.coverBadge')}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-1.5 p-2">
                  {!isCover ? (
                    <button
                      type="button"
                      disabled={pendingAction}
                      onClick={() => {
                        setActionError(null)
                        startTransition(async () => {
                          const res = await setProductCoverAction(productId, image.id, productCode)
                          if (!res.ok) setActionError(res.message)
                          else onDone()
                        })
                      }}
                      className="min-h-9 flex-1 rounded-lg border border-line bg-surface px-2 text-xs font-medium text-text hover:border-line-ctl focus-ring disabled:opacity-50"
                    >
                      {t('admin.products.setCover')}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={pendingAction}
                    onClick={() => {
                      setActionError(null)
                      startTransition(async () => {
                        const res = await deleteProductImageAction(image.id, productId, productCode)
                        if (!res.ok) setActionError(res.message)
                        else onDone()
                      })
                    }}
                    className="min-h-9 rounded-lg border border-danger/40 px-2.5 text-xs font-medium text-danger hover:bg-danger/10 focus-ring disabled:opacity-50"
                  >
                    {t('admin.products.deleteImage')}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {actionError ? (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-text">
          {actionError}
        </p>
      ) : null}

      <form action={formAction} className="space-y-3 border-t border-line pt-3">
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="productCode" value={productCode} />

        <div>
          <label htmlFor="files" className={LABEL}>
            {t('admin.common.upload')}
          </label>
          <input
            id="files"
            name="files"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            aria-describedby="files-hint"
            className="mt-1.5 block min-h-11 w-full text-sm text-text-2 file:mr-3 file:min-h-11 file:rounded-lg file:border file:border-line file:bg-surface-2 file:px-3 file:text-sm file:text-text"
          />
          <p id="files-hint" className="mt-1.5 text-sm text-text-3">
            รองรับ JPG, PNG, WebP และ AVIF · ไม่เกิน {MAX_IMAGE_BYTES_LABEL} ต่อไฟล์ ·
            สูงสุด {MAX_FILES_PER_UPLOAD} รูปต่อครั้ง
          </p>
        </div>

        {state.error ? (
          <p role="alert" className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-text">
            {state.error}
          </p>
        ) : null}

        <UploadButton onDone={onDone} />
      </form>
    </div>
  )
}

function UploadButton({ onDone }: { onDone: () => void }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={onDone}
      className="min-h-11 w-full rounded-lg border border-line bg-surface-2 text-sm text-text hover:border-line-ctl focus-ring disabled:opacity-60"
    >
      {pending ? t('errors.save.saving') : t('admin.common.upload')}
    </button>
  )
}

