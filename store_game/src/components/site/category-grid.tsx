import Link from 'next/link'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

import { CategoryArtworkFallback, ImageWithFallback } from '@/components/ui/image-with-fallback'
import { getMessages } from '@/lib/i18n'
import { brandMediaUrl } from '@/lib/storage/media-url'
import { sectionPayload } from '@/lib/catalog/site-content'
import { EmptyState } from '@/components/ui/empty-state'
import type { Database } from '@/lib/database.types'
import type { GameCard } from '@/lib/catalog/queries'

type SectionRow = Database['public']['Tables']['site_sections']['Row']

export function CategoryGrid({
  games,
  sections,
}: {
  games: GameCard[]
  sections: readonly SectionRow[]
}) {
  const m = getMessages()
  const payload = sectionPayload(sections, 'categories')
  const limit = typeof payload.limit === 'number' ? payload.limit : 8

  const shown = games.slice(0, Math.min(Math.max(limit, 0), 24))

  if (shown.length === 0) {
    return <EmptyState title={m.empty.catalogTitle} body={m.categories.emptyBody} />
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text">{m.categories.heading}</h2>
          <p className="mt-1 text-sm text-text-2">{m.categories.subtitle}</p>
        </div>
        <Link
          href="/products"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary underline underline-offset-4 focus-ring rounded"
        >
          {m.action.viewAll}
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      <ul className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {shown.map((game) => {
          const image = brandMediaUrl(game.image_path)
          return (
            <li key={game.id}>
              <Link
                href={`/products?game=${encodeURIComponent(game.slug)}`}
                className="focus-ring group block h-full rounded-xl"
              >
                <div className="flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface transition-[border-color,transform] duration-micro hover:-translate-y-0.5 hover:border-primary/60 group-focus-within:border-primary">
                  <div className="relative aspect-[16/10] overflow-hidden bg-surface-2">
                    <ImageWithFallback
                      src={image}
                      alt={game.name}
                      sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      fallback={<CategoryArtworkFallback slug={game.slug} name={game.name} />}
                    />
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/85 via-transparent to-transparent"
                    />
                    <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full border border-success/40 bg-ink/80 px-2 py-0.5 text-[11px] font-medium text-success backdrop-blur-xs">
                      <CheckCircle2 size={11} aria-hidden="true" />
                      {m.categories.statusActive}
                    </span>
                    <span className="absolute bottom-2.5 left-2.5 inline-flex items-center rounded-md border border-accent/30 bg-ink/85 px-2 py-0.5 text-xs font-semibold text-accent backdrop-blur-xs">
                      {m.categories.productCount(Number(game.available_count ?? 0))}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-3.5">
                    <div>
                      <p className="line-clamp-1 text-sm font-bold text-text group-hover:text-primary">
                        {game.name}
                      </p>
                      {game.description ? (
                        <p className="mt-1 line-clamp-1 text-xs text-text-3">
                          {game.description}
                        </p>
                      ) : null}
                    </div>
                    <p className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-text-2 group-hover:text-primary">
                      {m.categories.viewCategory}
                      <ArrowRight size={13} aria-hidden="true" />
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
