import { createClient } from "@/lib/supabase/server";
import { PermissionsService } from "@/lib/permissions";
import type { PinEntityType, UserPin } from "../types";

export class PinService {
  /**
   * Get all pins for a user, optionally filtered by entityType.
   */
  static async getUserPins(
    userId: string,
    entityType?: PinEntityType
  ): Promise<UserPin[]> {
    const supabase = await createClient();
    let query = supabase
      .from("user_pins")
      .select("*")
      .eq("user_id", userId)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (entityType) {
      query = query.eq("entity_type", entityType);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching user pins:", error);
      return [];
    }

    return (data || []).map(mapPin);
  }

  /**
   * Check if a specific entity is pinned by the user.
   */
  static async isPinned(
    userId: string,
    entityType: PinEntityType,
    entityId: string
  ): Promise<boolean> {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("user_pins")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId);

    if (error) {
      console.error("Error checking pin status:", error);
      return false;
    }

    return (count || 0) > 0;
  }

  /**
   * Pin an entity.
   */
  static async pinEntity(
    userId: string,
    entityType: PinEntityType,
    entityId: string
  ): Promise<UserPin> {
    const supabase = await createClient();

    // Verify permission to access the entity before pinning
    let canAccess = false;
    if (entityType === "project") {
      canAccess = await PermissionsService.canViewProject(supabase, userId, entityId);
    } else if (entityType === "task") {
      canAccess = await PermissionsService.canViewTask(supabase, userId, entityId);
    } else if (entityType === "conversation") {
      canAccess = await PermissionsService.canViewConversation(supabase, userId, entityId);
    }

    if (!canAccess) {
      throw new Error(`Unauthorized: Cannot access the ${entityType} to pin it.`);
    }

    // Get max display_order for this user and entity type to append
    const { data: maxOrderData } = await supabase
      .from("user_pins")
      .select("display_order")
      .eq("user_id", userId)
      .eq("entity_type", entityType)
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = (maxOrderData?.display_order || 0) + 1000.0;

    const { data, error } = await supabase
      .from("user_pins")
      .insert({
        user_id: userId,
        entity_type: entityType,
        entity_id: entityId,
        display_order: nextOrder,
      })
      .select()
      .single();

    if (error) {
      // Ignore conflict errors if it's already pinned
      if (error.code === '23505') {
        const { data: existing } = await supabase
          .from("user_pins")
          .select()
          .eq("user_id", userId)
          .eq("entity_type", entityType)
          .eq("entity_id", entityId)
          .single();
        if (existing) return mapPin(existing);
      }
      throw new Error(error.message);
    }

    return mapPin(data);
  }

  /**
   * Unpin an entity.
   */
  static async unpinEntity(
    userId: string,
    entityType: PinEntityType,
    entityId: string
  ): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from("user_pins")
      .delete()
      .eq("user_id", userId)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId);

    if (error) {
      console.error("Error unpinning entity:", error);
      throw new Error(error.message);
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPin(row: any): UserPin {
  return {
    id: row.id,
    userId: row.user_id,
    entityType: row.entity_type as PinEntityType,
    entityId: row.entity_id,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
