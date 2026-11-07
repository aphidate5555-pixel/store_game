'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react'

import { ImageWithFallback, ProductArtworkFallback } from '@/components/ui/image-with-fallback'
import { productMediaUrl } from '@/lib/storage/media-url'
import { getMessages } from '@/lib/i18n'
import type { ProductImageRow } from '@/lib/catalog/product-utils'

export function ProductGallery({
  images,
  productName,
  productCode,
  gameName,
}: {
  images: readonly ProductImageRow[]
  productName: string
  productCode: string
  gameName?: string | null
}) {
  const m = getMessages()
  const [activeIndex, setActiveIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const safeIndex = images.length > 0 ? Math.min(activeIndex, images.length - 1) : 0
  const activeImage = images[safeIndex] ?? null
  const activeUrl = activeImage ? productMediaUrl(activeImage.full_path) : null

  const prev = () => {
    if (images.length <= 1) return
    setActiveIndex((current) => (current - 1 + images.length) % images.length)
  }

  const next = () => {
    if (images.length <= 1) return
    setActiveIndex((current) => (current + 1) % images.length)
  }

  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-surface-2">
        <ImageWithFallback
          src={activeUrl}
          alt={activeImage?.alt ?? productName}
          priority
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover"
          fallback={<ProductArtworkFallback code={productCode} gameName={gameName} />}
        />

        {images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label={m.gallery.prev}
              className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-line bg-ink/80 text-text backdrop-blur-xs transition-colors hover:border-primary hover:bg-ink focus-ring"
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label={m.gallery.next}
              className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-line bg-ink/80 text-text backdrop-blur-xs transition-colors hover:border-primary hover:bg-ink focus-ring"
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </>
        ) : null}

        {activeUrl ? (
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            {images.length > 1 ? (
              <span className="rounded-full border border-line bg-ink/85 px-2.5 py-1 text-xs font-medium text-text-2 backdrop-blur-xs">
                {m.gallery.counter(safeIndex + 1, images.length)}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              aria-label={m.gallery.open}
              className="grid size-9 place-items-center rounded-full border border-line bg-ink/85 text-text backdrop-blur-xs hover:border-primary focus-ring"
            >
              <Maximize2 size={15} aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>

      {images.length > 1 ? (
        <ul
          aria-label={m.product.gallery}
          className="mt-3 flex gap-2.5 overflow-x-auto pb-1 scrollbar-none"
        >
          {images.map((image, idx) => {
            const thumbUrl = productMediaUrl(image.storage_path)
            const selected = idx === safeIndex
            return (
              <li key={image.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  aria-label={m.product.galleryImage(idx + 1)}
                  aria-current={selected ? 'true' : undefined}
                  className={[
                    'relative size-18 overflow-hidden rounded-xl border-2 bg-surface-2 transition-all focus-ring',
                    selected
                      ? 'border-primary ring-2 ring-primary/30'
                      : 'border-line opacity-75 hover:border-line-ctl hover:opacity-100',
                  ].join(' ')}
                >
                  <ImageWithFallback
                    src={thumbUrl}
                    alt={image.alt ?? m.gallery.counter(idx + 1, images.length)}
                    sizes="72px"
                    className="object-cover"
                    fallback={<ProductArtworkFallback code={productCode} />}
                  />
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}

      {lightboxOpen && activeUrl ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={productName}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 p-4 backdrop-blur-sm"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="relative max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-line bg-surface"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="truncate text-sm font-semibold text-text">
                {productName} ({m.gallery.counter(safeIndex + 1, images.length)})
              </p>
              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                aria-label={m.gallery.close}
                className="grid size-9 place-items-center rounded-lg text-text-2 hover:bg-surface-2 hover:text-text focus-ring"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="relative aspect-[16/10] w-full bg-ink">
              <ImageWithFallback
                src={activeUrl}
                alt={activeImage?.alt ?? productName}
                sizes="90vw"
                className="object-contain"
                fallback={<ProductArtworkFallback code={productCode} gameName={gameName} />}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
