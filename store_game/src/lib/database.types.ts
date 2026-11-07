/**
 * Hand-maintained Supabase `Database` type for the store_game project.
 *
 * This file is the compile-time mirror of `supabase/migrations/*`. Every column
 * carries the migration file that creates it, so a schema change made in SQL is
 * visible here as a diff instead of surfacing as a runtime `never` deep inside a
 * `.select()` chain.
 *
 * The migration numbering follows §3.3 of the plan (`00…16`, then
 * `99_seed_demo.sql`). Only `12_functions.sql`, `13_rls.sql`,
 * `14_grants.sql`, `15_storage.sql` and `16_views_and_guards.sql` have names
 * fixed by the contract; the table/enum files below are named after the objects
 * they create.
 *
 * Rules that shaped this file:
 *  - F-07: security-definer helpers live in `private`; the `public` schema only
 *    carries the thin `security invoker` wrappers that RLS and the Data API
 *    are allowed to call.
 *  - F-01: `search_products` returns `{ items, total }`. There is no
 *    `setof public.products` overload and no `rows` key.
 *  - F-05: a product has no `cover_path`. The cover is the `product_images`
 *    row whose `position = 0`.
 *  - F-04 / F-10: `storage_path` and `full_path` hold a bucket-relative object
 *    path (`products/<uuid>/<YYYY-MM>/<16hex>.webp`), never a bucket prefix.
 *  - C-17: `search_products` declares its filter parameters as enums.
 *  - C-36: `version` drives optimistic concurrency on every admin write.
 *
 * `bigint` columns are `number` here because PostgREST serialises them as JSON
 * numbers. What must never cross an RSC boundary as a `bigint` is the *TypeScript*
 * value; the server formats it with `formatPrice()` from
 * `src/lib/format/money.ts` before rendering (C-12, rule 2 of §5).
 */

/** JSON value as produced and consumed by PostgREST. */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      /** §5.2 (C-1) — 24 columns, single row, `id = true` enforced by CHECK. */
      store_settings: {
        Row: {
          /** `03_store_settings.sql` — singleton key, `boolean primary key default true check (id)`. */
          id: boolean
          /** `03_store_settings.sql` — shop name shown in header, footer and JSON-LD. */
          store_name: string
          /** `03_store_settings.sql` — long Thai description for the about block. */
          store_description: string | null
          /** `03_store_settings.sql` — bucket-relative path, CHECK via `is_media_path()` (F-10). */
          logo_path: string | null
          /** `03_store_settings.sql` — bucket-relative path, CHECK via `is_media_path()` (F-10). */
          favicon_path: string | null
          /** `03_store_settings.sql` — bucket-relative path, CHECK via `is_media_path()` (F-10). */
          default_og_image_path: string | null
          /** `03_store_settings.sql` — `#rrggbb`, inlined into `<html style>` by the public layout. */
          primary_color: string
          /** `03_store_settings.sql` — `#rrggbb`, same constraint. */
          accent_color: string
          /** `03_store_settings.sql` — digits only (C-11); code builds the `wa.me` URL. */
          whatsapp_number: string | null
          /** `03_store_settings.sql` — CHECK via `is_safe_social(text)` (C-13). */
          facebook_url: string | null
          /** `03_store_settings.sql` — CHECK via `is_safe_social(text)` (C-13). */
          tiktok_url: string | null
          /** `03_store_settings.sql` — CHECK via `is_safe_social(text)` (C-13). */
          instagram_url: string | null
          /** `03_store_settings.sql` — free text shown in the footer. */
          footer_text: string | null
          /** `03_store_settings.sql` — secondary footer line. */
          footer_disclaimer: string | null
          /** `03_store_settings.sql` — controls the floating WhatsApp button. */
          floating_whatsapp_enabled: boolean
          /** `03_store_settings.sql` — label of the floating WhatsApp button. */
          floating_whatsapp_text: string | null
          /** `03_store_settings.sql` — free-form opening hours line. */
          business_hours: string | null
          /** `03_store_settings.sql` — the maintenance gate, read fail-closed by `getSiteConfig()` (C-26). */
          maintenance_mode: boolean
          /** `03_store_settings.sql` — Thai maintenance copy shown by MaintenanceScreen. */
          maintenance_message: string | null
          /** `03_store_settings.sql` — fallback `<title>`; C-1 added this column. */
          seo_title: string | null
          /** `03_store_settings.sql` — fallback meta description; C-1 added this column. */
          seo_description: string | null
          /** `03_store_settings.sql` — `product_currency`; C-1 added this column. */
          default_currency: Database['public']['Enums']['product_currency']
          /** `03_store_settings.sql` — optimistic concurrency token (C-36). */
          version: number
          /** `03_store_settings.sql` — maintained by the `set_updated_at` trigger. */
          updated_at: string
        }
        Insert: {
          id?: boolean
          store_name: string
          store_description?: string | null
          logo_path?: string | null
          favicon_path?: string | null
          default_og_image_path?: string | null
          primary_color?: string
          accent_color?: string
          whatsapp_number?: string | null
          facebook_url?: string | null
          tiktok_url?: string | null
          instagram_url?: string | null
          footer_text?: string | null
          footer_disclaimer?: string | null
          floating_whatsapp_enabled?: boolean
          floating_whatsapp_text?: string | null
          business_hours?: string | null
          maintenance_mode?: boolean
          maintenance_message?: string | null
          seo_title?: string | null
          seo_description?: string | null
          default_currency?: Database['public']['Enums']['product_currency']
          version?: number
          updated_at?: string
        }
        Update: {
          id?: boolean
          store_name?: string
          store_description?: string | null
          logo_path?: string | null
          favicon_path?: string | null
          default_og_image_path?: string | null
          primary_color?: string
          accent_color?: string
          whatsapp_number?: string | null
          facebook_url?: string | null
          tiktok_url?: string | null
          instagram_url?: string | null
          footer_text?: string | null
          footer_disclaimer?: string | null
          floating_whatsapp_enabled?: boolean
          floating_whatsapp_text?: string | null
          business_hours?: string | null
          maintenance_mode?: boolean
          maintenance_message?: string | null
          seo_title?: string | null
          seo_description?: string | null
          default_currency?: Database['public']['Enums']['product_currency']
          version?: number
          updated_at?: string
        }
        Relationships: []
      }

      /** §5.2b (C-2) — one row per section key, no `visible` column and no
       *  `order_index`; a hidden section carries `payload.enabled = false`. */
      site_sections: {
        Row: {
          /** `04_site_sections.sql` — primary key, CHECK constrained to the 7 keys. */
          section_key: string
          /** `04_site_sections.sql` — free-form JSON validated in TypeScript per key (C-39). */
          payload: Json
          /** `04_site_sections.sql` — maintained by the `set_updated_at` trigger. */
          updated_at: string
        }
        Insert: {
          section_key: string
          payload: Json
          updated_at?: string
        }
        Update: {
          section_key?: string
          payload?: Json
          updated_at?: string
        }
        Relationships: []
      }

      /** §5.2 — game (category) row. Enabled games are the only ones whose
       *  products and images become publicly readable (F-09). */
      games: {
        Row: {
          /** `08_games.sql` — uuid primary key. */
          id: string
          /** `08_games.sql` — URL segment of `/games/[slug]`, unique. */
          slug: string
          /** `08_games.sql` — Thai display name. */
          name: string
          /** `08_games.sql` — optional Thai description. */
          description: string | null
          /** `08_games.sql` — bucket-relative path, CHECK via `is_media_path()` (F-10). */
          image_path: string | null
          /** `08_games.sql` — false hides the game and every product inside it. */
          is_enabled: boolean
          /** `08_games.sql` — manual ordering for the catalog facets. */
          position?: number
          sort_order?: number
          /** `08_games.sql` — maintained by the `set_updated_at` trigger. */
          created_at: string
          /** `08_games.sql` — maintained by the `set_updated_at` trigger. */
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          description?: string | null
          image_path?: string | null
          is_enabled?: boolean
          position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          description?: string | null
          image_path?: string | null
          is_enabled?: boolean
          position?: number
          updated_at?: string
        }
        Relationships: []
      }

      /** §5.2 — catalog product. `search_text` is generated, so it is read-only
       *  for the application and indexed by `products_search_trgm` (C-18). */
      products: {
        Row: {
          /** `06_products.sql` — uuid primary key; also the first segment of a media path (F-04). */
          id: string
          /** `06_products.sql` — human-facing code, unique; used in `/products/[productCode]`. */
          product_code: string
          /** `06_products.sql` — Thai product title. */
          name: string
          /** `06_products.sql` — owning game, foreign key to `games.id` (ON DELETE RESTRICT). */
          game_id: string
          /** `06_products.sql` — integer amount; always read together with `currency`. */
          price_amount: number
          /** `06_products.sql` — `product_currency`. */
          currency: Database['public']['Enums']['product_currency']
          /** `06_products.sql` — optional explicit THB price. */
          price_thb?: number | null
          /** `06_products.sql` — optional explicit LAK price. */
          price_lak?: number | null
          /** `06_products.sql` — rarity label, e.g. Mythic / Legend; nullable. */
          rank: string | null
          /** `06_products.sql` — how many heroes the account includes. */
          hero_count: number
          /** `06_products.sql` — how many skins the account includes. */
          skin_count: number
          /** `06_products.sql` — `product_binding`. */
          binding: Database['public']['Enums']['product_binding'] | null
          /** `06_products.sql` — Thai long description. */
          description: string | null
          /** `06_products.sql` — `product_status`; `sold` stays indexable and emits `OutOfStock` (C-9). */
          status: Database['public']['Enums']['product_status']
          /** `06_products.sql` — false yields `noindex, follow` (C-9). */
          is_visible: boolean
          /** `06_products.sql` — generated by the `products_search_text` trigger; not insertable. */
          search_text: string | null
          /** `06_products.sql` — drives the featured shelf; set by the admin action. */
          featured_at: string | null
          /** `06_products.sql` — maintained by the `set_updated_at` trigger. */
          created_at: string
          /** `06_products.sql` — maintained by the `set_updated_at` trigger. */
          updated_at: string
        }
        Insert: {
          id?: string
          product_code: string
          name: string
          game_id: string
          price_amount: number
          currency?: Database['public']['Enums']['product_currency']
          price_thb?: number | null
          price_lak?: number | null
          rank?: string | null
          hero_count?: number
          skin_count?: number
          binding?: Database['public']['Enums']['product_binding'] | null
          description?: string | null
          status?: Database['public']['Enums']['product_status']
          is_visible?: boolean
          featured_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_code?: string
          name?: string
          game_id?: string
          price_amount?: number
          currency?: Database['public']['Enums']['product_currency']
          price_thb?: number | null
          price_lak?: number | null
          rank?: string | null
          hero_count?: number
          skin_count?: number
          binding?: Database['public']['Enums']['product_binding'] | null
          description?: string | null
          status?: Database['public']['Enums']['product_status']
          is_visible?: boolean
          featured_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'products_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'games'
            referencedColumns: ['id']
          },
        ]
      }

      /** §5.2 (C-15, C-16, F-04, F-05) — one row per uploaded file. Both paths
       *  are NOT NULL, `unique (product_id, position)` and `position = 0` is the cover. */
      product_images: {
        Row: {
          /** `07_product_images.sql` — uuid primary key. */
          id: string
          /** `07_product_images.sql` — owning product, foreign key to `products.id` (CASCADE). */
          product_id: string
          /** `07_product_images.sql` — 640px card object path, bucket-relative, ends `-card.webp`, CHECK `is_media_path()` (F-10). */
          storage_path: string
          /** `07_product_images.sql` — 1600px full object path, same stem, CHECK `is_media_path()` (F-10). */
          full_path: string
          /** `07_product_images.sql` — rendered width in pixels. */
          width: number | null
          /** `07_product_images.sql` — rendered height in pixels. */
          height: number | null
          /** `07_product_images.sql` — 0-based; 0 is the cover; booked by an RPC under `for update` (C-16). */
          position: number
          /** `07_product_images.sql` — alternative text, taken from the uploaded file name. */
          alt: string | null
          /** `07_product_images.sql` — maintained by the `set_updated_at` trigger. */
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          storage_path: string
          full_path: string
          width?: number | null
          height?: number | null
          position?: number
          alt?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          storage_path?: string
          full_path?: string
          width?: number | null
          height?: number | null
          position?: number
          alt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'product_images_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }

      /** §5.2 — public profile created by the `handle_new_user` trigger. */
      profiles: {
        Row: {
          /** `05_profiles.sql` — uuid primary key, mirrors `auth.users.id`. */
          id: string
          /** `05_profiles.sql` — display name shown in the admin header. */
          display_name: string | null
          /** `05_profiles.sql` — maintained by the `set_updated_at` trigger. */
          created_at: string
          /** `05_profiles.sql` — maintained by the `set_updated_at` trigger. */
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }

      /** §5.2 — admin roster. There is no `select` grant on this table for
       *  `anon`/`authenticated` (C-33); membership is only readable through
       *  the RPC gate. */
      admins: {
        Row: {
          /** `06_admins.sql` — uuid primary key, mirrors `auth.users.id`. */
          user_id: string
          /** `06_admins.sql` — the admin who ran `grant_admin`, null for the bootstrap row. */
          granted_by: string | null
          /** `06_admins.sql` — maintained by the `set_updated_at` trigger. */
          granted_at: string
        }
        Insert: {
          user_id: string
          granted_by?: string | null
          granted_at?: string
        }
        Update: {
          user_id?: string
          granted_by?: string | null
        }
        Relationships: []
      }

      /** §5.2 (C-4) — append-only audit trail written by `write_audit()`.
       *  No `select` grant is issued (C-33) and there is no DELETE policy. */
      admin_audit_log: {
        Row: {
          /** `07_admin_audit_log.sql` — uuid primary key. */
          id: string
          /** `07_admin_audit_log.sql` — the acting admin, mirrors `auth.users.id`. */
          admin_user_id: string
          /** `07_admin_audit_log.sql` — verb such as `product.update` or `settings.update`. */
          action: string
          /** `07_admin_audit_log.sql` — table or aggregate the action touched. */
          entity_type: string
          /** `07_admin_audit_log.sql` — product code or section key, nullable for global actions. */
          entity_id: string | null
          /** `07_admin_audit_log.sql` — before/after payload for the changed columns. */
          details: Json
          /** `07_admin_audit_log.sql` — server clock. */
          created_at: string
        }
        Insert: {
          id?: string
          admin_user_id: string
          action: string
          entity_type: string
          entity_id?: string | null
          details?: Json
          created_at?: string
        }
        Update: never
        Relationships: []
      }
    }
    Views: {
      /** §3.5 expects zero views: every read goes through an RPC. */
      [_ in never]: never
    }
    Functions: {
      /** `01_extensions_and_helpers.sql` — CHECK helper for external social links. */
      is_safe_link: {
        Args: { target: string }
        Returns: boolean
      }
      /** `01_extensions_and_helpers.sql` — CHECK helper for the three social profiles. */
      is_safe_social: {
        Args: { target: string }
        Returns: boolean
      }
      /** `01_extensions_and_helpers.sql` (F-10) — CHECK helper for bucket-relative media paths. */
      is_media_path: {
        Args: { target: string }
        Returns: boolean
      }
      /** `12_functions.sql` (F-07) — `security invoker` wrapper over
       *  `private.is_admin_internal()`; the only admin predicate RLS may call. */
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      /** `12_functions.sql` (F-01, C-17, C-18, C-22) — the catalog query.
       *  Ownership of the `is_visible` / `games.is_enabled` filtering lives
       *  here, and `total` comes from `count(*) over ()`, so it is only
       *  meaningful when `p_offset = 0`. */
      search_products: {
        Args: {
          /** Free-text term; matched with `ilike` and `escape '!'` against `search_text`. */
          p_pattern?: string | null
          /** Game slug facet, `null` for "every game". */
          p_game_slug?: string | null
          /** Status facet; `null` means both statuses. */
          p_status?: Database['public']['Enums']['product_status'] | null
          /** Currency facet; mandatory — the catalogue mixes THB and LAK with no
           *  conversion, so a price comparison across currencies is meaningless. */
          p_currency?: Database['public']['Enums']['product_currency'] | null
          /** Inclusive minimum price in the currency of `p_currency`. */
          p_min?: number | null
          /** Inclusive maximum price in the currency of `p_currency`. */
          p_max?: number | null
          /** One of newest | oldest | price_asc | price_desc. */
          p_sort?: string | null
          /** Page size, capped at 100 inside the function (C-39). */
          p_limit?: number | null
          /** Row offset, `p_limit * (page - 1)`. */
          p_offset?: number | null
        }
        Returns: {
          /** Rows of the requested page, each already filtered by visibility. */
          items: Database['public']['Tables']['products']['Row'][]
          /** Total matching rows before paging; read only when `p_offset = 0` (C-22). */
          total: number
        }[]
      }
      /** `12_functions.sql` — full detail for one product code, including the
       *  images ordered by `position`, the owning game and four siblings. */
      get_product_detail: {
        Args: { p_code: string }
        Returns: Json
      }
      /** `12_functions.sql` (C-26) — one round trip for settings and every
       *  section payload, so the public layout renders without a waterfall. */
      get_site_shell: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      /** `12_functions.sql` — per-game rollup for the category rail, with the
       *  number of products actually buyable rather than merely visible. */
      game_catalog_cards: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          slug: string
          name: string
          description: string | null
          image_path: string | null
          /** Count of `status = 'available'` products in the game. */
          available_count: number
        }[]
      }
      /** `12_functions.sql` (C-4) — admin dashboard counters, gated on `is_admin()`
       *  inside the function so the grant alone does not expose data. */
      admin_dashboard_stats_gate: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_products: number
          visible_products: number
          sold_products: number
          total_games: number
          enabled_games: number
        }[]
      }
      /** `12_functions.sql` (C-10) — grants admin rights; raises when the user
       *  does not exist so a silent no-op cannot look like success. */
      grant_admin: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      /** `12_functions.sql` (C-10) — removes admin rights; raises when the user
       *  does not exist. */
      revoke_admin: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      /** `12_functions.sql` (C-4) — appends one audit row; the single write path
       *  for `admin_audit_log`. */
      write_audit: {
        Args: {
          p_action: string
          p_entity: string
          p_entity_id?: string | null
          p_meta?: Json
        }
        Returns: undefined
      }
      /** `12_functions.sql` (C-16) — moves a product image to `position = 0`
       *  inside a `security definer` transaction that locks the product row. */
      set_product_cover: {
        Args: { p_product_id: string; p_image_id: string }
        Returns: undefined
      }
      /** `12_functions.sql` (C-15, C-16, F-07) — `security invoker` wrapper over
       *  `private.append_product_images_internal()`. */
      /** Reserves the next free `position` under a row lock and returns the
       *  new row's id (C-16). One call per uploaded file, not per batch. */
      append_product_images: {
        Args: { p_product_id: string; p_row: Json }
        Returns: string
      }
    }
    Enums: {
      /** `02_enums.sql` (§5.1) — Thai baht and Lao kip. */
      product_currency: 'THB' | 'LAK'
      /** `02_enums.sql` (§5.1) — available, reserved, or sold. */
      product_status: 'available' | 'reserved' | 'sold'
      /** `02_enums.sql` (§5.1) — whether the code is tied to a player account. */
      product_binding: 'bound' | 'unbound'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  private: {
    Tables: {
      /** §5.9 — the private schema holds functions only. */
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      /** `12_functions.sql` (F-07) — the real `security definer` admin check.
       *  Not granted to anyone; `public.is_admin()` is the only way in. */
      is_admin_internal: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      /** `12_functions.sql` (F-07) — the real `security definer` image append.
       *  Not granted; `public.append_product_images()` is the wrapper. */
      append_product_images_internal: {
        Args: { p_product_id: string; p_images: Json }
        Returns: Json
      }
      /** `16_views_and_guards.sql` (F-06, C-32) — table roster, read by the CI
       *  connection string because introspection is revoked from `public`. */
      schema_tables: {
        Args: Record<PropertyKey, never>
        Returns: { table_schema: string; table_name: string }[]
      }
      /** `16_views_and_guards.sql` (F-06, C-32) — column roster for one table. */
      schema_columns: {
        Args: { p_table_name: string }
        Returns: {
          table_name: string
          column_name: string
          data_type: string
          is_nullable: 'YES' | 'NO'
        }[]
      }
      /** `16_views_and_guards.sql` (F-06, C-32) — every public table without RLS. */
      tables_missing_rls: {
        Args: Record<PropertyKey, never>
        Returns: { table_name: string }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

/** Convenience alias used by every read path that needs a settings row. */
export type StoreSettings = Database['public']['Tables']['store_settings']['Row']

/** Convenience alias used by the catalog and the product pages. */
export type ProductRow = Database['public']['Tables']['products']['Row']

/** Convenience alias used by the gallery (F-05: the cover is `position === 0`). */
export type ProductImageRow = Database['public']['Tables']['product_images']['Row']
