import { RealtimePostgresChangesPayload } from "@supabase/supabase-js"

export type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*"

export interface RealtimeConfig<T> {
  table: string
  filter?: string
  schema?: string
  keyField?: keyof T
  mapRow?: (row: { [key: string]: unknown }) => T
}

export interface RealtimeCallbacks<T> {
  onInsert?: (item: T, payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>) => void
  onUpdate?: (item: T, payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>) => void
  onDelete?: (id: string, payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>) => void
}
