import Image from 'next/image'
import Link from 'next/link'

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
      <h2 className="text-lg font-semibold text-text">{m.categories.heading}</h2>

      <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {shown.map((game) => {
          const image = brandMediaUrl(game.image_path)
          return (
            <li key={game.id}>
              <Link
                href={`/games/${game.slug}`}
                className="focus-ring group block rounded-xl"
              >
                <div className="overflow-hidden rounded-xl border border-line bg-surface transition-[border-color] duration-micro hover:border-line-ctl group-focus-within:border-primary/40">
                  <div className="relative aspect-[16/10] bg-surface-2">
                    {image ? (
                      <Image
                        src={image}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="p-3">
                    <p className="truncate text-sm font-medium text-text">{game.name}</p>
                    {game.available_count > 0 ? (
                      <p className="mt-0.5 text-xs text-text-3">
                        {m.categories.productCount(game.available_count)}
                      </p>
                    ) : null}
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
