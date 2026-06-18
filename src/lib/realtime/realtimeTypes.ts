import { RealtimePostgresChangesPayload } from "@supabase/supabase-js"

export type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*"

export interface RealtimeConfig<T> {
  table: string
  filter?: string
  schema?: string
  keyField?: keyof T
  mapRow?: (row: Record<string, any>) => T
}

export interface RealtimeCallbacks<T> {
  onInsert?: (item: T, payload: RealtimePostgresChangesPayload<Record<string, any>>) => void
  onUpdate?: (item: T, payload: RealtimePostgresChangesPayload<Record<string, any>>) => void
  onDelete?: (id: string, payload: RealtimePostgresChangesPayload<Record<string, any>>) => void
}
