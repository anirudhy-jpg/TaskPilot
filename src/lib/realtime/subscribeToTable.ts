import { useEffect } from "react"
import { createRealtimeChannel } from "./createRealtimeChannel"
import { RealtimeConfig, RealtimeCallbacks, RealtimeEvent } from "./realtimeTypes"
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js"

export interface UseRealtimeSubscriptionOptions {
  table: string
  filter?: string
  schema?: string
  event?: RealtimeEvent
  onPayload: (payload: RealtimePostgresChangesPayload<Record<string, any>>) => void
}

/**
 * Low-level React Hook to subscribe to a table's changes and handle raw payloads.
 */
export function useRealtimeSubscription({
  table,
  filter,
  schema = "public",
  event = "*",
  onPayload,
}: UseRealtimeSubscriptionOptions) {
  useEffect(() => {
    const { unsubscribe } = createRealtimeChannel({
      table,
      filter,
      schema,
      event,
      onPayload,
    })
    return unsubscribe
  }, [table, filter, schema, event, onPayload])
}

/**
 * High-level React Hook that automatically subscribes to a Supabase table
 * and reconciles flat array states (INSERT, UPDATE, DELETE).
 */
export function useRealtimeList<T>(
  state: T[],
  setState: React.Dispatch<React.SetStateAction<T[]>>,
  config: RealtimeConfig<T>,
  callbacks?: RealtimeCallbacks<T>
) {
  const { table, filter, schema = "public", keyField = "id" as keyof T, mapRow } = config

  useEffect(() => {
    const { unsubscribe } = createRealtimeChannel({
      table,
      filter,
      schema,
      event: "*",
      onPayload: (payload) => {
        const { eventType, new: newRow, old: oldRow } = payload

        if (eventType === "INSERT") {
          const rawItem = newRow
          const mappedItem = mapRow ? mapRow(rawItem) : (rawItem as unknown as T)
          
          setState((prev) => {
            const exists = prev.some((item) => item[keyField] === mappedItem[keyField])
            if (exists) return prev
            return [...prev, mappedItem]
          })
          
          callbacks?.onInsert?.(mappedItem, payload)
        } else if (eventType === "UPDATE") {
          const rawItem = newRow
          const mappedItem = mapRow ? mapRow(rawItem) : (rawItem as unknown as T)

          setState((prev) =>
            prev.map((item) => (item[keyField] === mappedItem[keyField] ? mappedItem : item))
          )

          callbacks?.onUpdate?.(mappedItem, payload)
        } else if (eventType === "DELETE") {
          const id = oldRow[keyField as string] as string
          
          setState((prev) => prev.filter((item) => item[keyField] !== id))

          callbacks?.onDelete?.(id, payload)
        }
      },
    })

    return unsubscribe
  }, [table, filter, schema, keyField, mapRow, setState, callbacks])
}
