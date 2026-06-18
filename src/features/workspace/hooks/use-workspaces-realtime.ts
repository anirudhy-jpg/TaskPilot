import { useRealtimeList } from "@/lib/realtime/subscribeToTable"
import type { Workspace } from "../types/workspace.types"

/**
 * Maps a raw Supabase workspaces row to the Workspace type.
 */
export function mapRealtimeWorkspace(row: {
  id?: string;
  name?: string;
  owner_id?: string;
  created_at?: string;
  [key: string]: unknown;
}): Workspace {
  return {
    id: row.id as string,
    name: row.name as string,
    ownerId: row.owner_id as string,
    createdAt: row.created_at as string,
  }
}

interface UseWorkspacesRealtimeProps {
  workspaces: Workspace[]
  setWorkspaces: React.Dispatch<React.SetStateAction<Workspace[]>>
  onWorkspaceUpdate?: (workspace: Workspace) => void
  onWorkspaceDelete?: (id: string) => void
}

/**
 * Hook to manage workspaces changes in realtime. Uses RLS-secured subscriptions
 * to receive insert, update, and delete events.
 */
export function useWorkspacesRealtime({
  workspaces,
  setWorkspaces,
  onWorkspaceUpdate,
  onWorkspaceDelete,
}: UseWorkspacesRealtimeProps) {
  useRealtimeList<Workspace>(
    workspaces,
    setWorkspaces,
    {
      table: "workspaces",
      mapRow: mapRealtimeWorkspace,
    },
    {
      onUpdate: (updatedWorkspace) => {
        onWorkspaceUpdate?.(updatedWorkspace)
      },
      onDelete: (deletedId) => {
        onWorkspaceDelete?.(deletedId)
      },
    }
  )
}
