import { useEffect, useRef } from "react";
import { createRealtimeChannel } from "./createRealtimeChannel";
import {
  RealtimeConfig,
  RealtimeCallbacks,
  RealtimeEvent,
} from "./realtimeTypes";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export interface UseRealtimeSubscriptionOptions {
  table: string;
  filter?: string;
  schema?: string;
  event?: RealtimeEvent;
  onPayload: (
    payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>,
  ) => void;
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
  const onPayloadRef = useRef(onPayload);
  useEffect(() => {
    onPayloadRef.current = onPayload;
  }, [onPayload]);

  useEffect(() => {
    const { unsubscribe } = createRealtimeChannel({
      table,
      filter,
      schema,
      event,
      onPayload: (payload) => onPayloadRef.current(payload),
    });
    return unsubscribe;
  }, [table, filter, schema, event]);
}

/**
 * High-level React Hook that automatically subscribes to a Supabase table
 * and reconciles flat array states (INSERT, UPDATE, DELETE).
 */
export function useRealtimeList<T extends object>(
  state: T[],
  setState: React.Dispatch<React.SetStateAction<T[]>>,
  config: RealtimeConfig<T>,
  callbacks?: RealtimeCallbacks<T>,
) {
  const {
    table,
    filter,
    schema = "public",
    keyField = "id" as keyof T,
    mapRow,
  } = config;

  // Use refs to avoid resubscribing when callbacks/mapRow/setState/keyField change references
  const callbacksRef = useRef(callbacks);
  const mapRowRef = useRef(mapRow);
  const setStateRef = useRef(setState);
  const keyFieldRef = useRef(keyField);

  useEffect(() => {
    callbacksRef.current = callbacks;
    mapRowRef.current = mapRow;
    setStateRef.current = setState;
    keyFieldRef.current = keyField;
  }, [callbacks, mapRow, setState, keyField]);

  useEffect(() => {
    const { unsubscribe } = createRealtimeChannel({
      table,
      filter,
      schema,
      event: "*",
      onPayload: (payload) => {
        const { eventType, new: newRow, old: oldRow } = payload;
        const currentMapRow = mapRowRef.current;
        const currentKeyField = keyFieldRef.current;
        const currentCallbacks = callbacksRef.current;

        if (eventType === "INSERT") {
          const rawItem = newRow;
          const mappedItem = currentMapRow
            ? currentMapRow(rawItem)
            : (rawItem as unknown as T);

          setStateRef.current((prev) => {
            const exists = prev.some(
              (item) => item[currentKeyField] === mappedItem[currentKeyField],
            );
            if (exists) return prev;
            return [...prev, mappedItem];
          });

          currentCallbacks?.onInsert?.(mappedItem, payload);
        } else if (eventType === "UPDATE") {
          const rawItem = newRow;
          const mappedItem = currentMapRow
            ? currentMapRow(rawItem)
            : (rawItem as unknown as T);

          setStateRef.current((prev) =>
            prev.map((item) => {
              if (item[currentKeyField] === mappedItem[currentKeyField]) {
                const merged = { ...item, ...mappedItem };
                // Keep existing tasks if the update payload didn't explicitly include tasks
                if (
                  !("tasks" in rawItem) &&
                  "tasks" in item &&
                  Array.isArray((item as Record<string, unknown>).tasks) &&
                  ((item as Record<string, unknown>).tasks as unknown[]).length > 0
                ) {
                  (merged as Record<string, unknown>).tasks = (item as Record<string, unknown>).tasks;
                }
                // Keep existing memberUserIds if the update payload didn't explicitly include member_user_ids or memberUserIds
                if (
                  !("member_user_ids" in rawItem) &&
                  !("memberUserIds" in rawItem) &&
                  "memberUserIds" in item &&
                  Array.isArray((item as Record<string, unknown>).memberUserIds) &&
                  ((item as Record<string, unknown>).memberUserIds as unknown[]).length > 0
                ) {
                  (merged as Record<string, unknown>).memberUserIds = (item as Record<string, unknown>).memberUserIds;
                }
                return merged;
              }
              return item;
            }),
          );

          currentCallbacks?.onUpdate?.(mappedItem, payload);
        } else if (eventType === "DELETE") {
          const id = oldRow[currentKeyField as string] as string;

          setStateRef.current((prev) => prev.filter((item) => item[currentKeyField] !== id));

          currentCallbacks?.onDelete?.(id, payload);
        }
      },
    });

    return unsubscribe;
  }, [table, filter, schema]);
}
