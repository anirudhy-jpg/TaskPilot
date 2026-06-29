"use server";

import { revalidatePath } from "next/cache";
import { PinService } from "../services/pin.service";
import { PermissionsService } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { PinEntityType } from "../types";

export async function togglePin(
  entityType: PinEntityType,
  entityId: string,
  isPinned: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const userId = await PermissionsService.getCurrentUserId(supabase);

    if (isPinned) {
      await PinService.pinEntity(userId, entityType, entityId);
    } else {
      await PinService.unpinEntity(userId, entityType, entityId);
    }

    // Revalidate relevant cache paths based on entity type
    if (entityType === "project") {
      revalidatePath(`/projects`);
      revalidatePath(`/projects/${entityId}`);
    } else if (entityType === "task") {
      revalidatePath(`/projects`);
    } else if (entityType === "conversation") {
      revalidatePath(`/chat`);
    }

    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to toggle pin";
    console.error(`Error toggling pin for ${entityType}: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}
