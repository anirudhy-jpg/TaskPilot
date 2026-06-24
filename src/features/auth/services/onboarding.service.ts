import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { ProfileService } from "./profile.service"
import { WorkspaceService } from "@/features/workspace/services/workspace.service"

/**
 * OnboardingService
 *
 * Guarantees that every authenticated user has:
 *   1. A `profiles` row
 *   2. A `workspaces` row (owned by them)
 *   3. A `workspace_members` row linking them to their workspace with role "owner"
 *
 * All operations are idempotent — safe to call on every login.
 * Designed to run inside the OAuth callback route BEFORE any redirect
 * into the protected app.
 */
export class OnboardingService {
  /**
   * Main entry point. Call this after a successful session exchange.
   *
   * @param user - The authenticated Supabase User object
   */
  static async ensureUserOnboarded(user: User): Promise<void> {
    const userId = user.id
    const email = user.email ?? ""

    // Pull rich metadata that OAuth providers (GitHub, Google, etc.) populate
    const meta = user.user_metadata ?? {}
    const fullName: string | null =
      meta.full_name ?? meta.name ?? null
    const avatarUrl: string | null =
      meta.avatar_url ?? meta.picture ?? null

    // ── Step 1: Ensure profile ────────────────────────────────────────────
    // upsertProfile creates the row on first login and is a no-op thereafter.
    // After the upsert, backfill any NULL avatar/name fields from OAuth metadata
    // so existing email-signup users who later connect GitHub get their avatar.
    await ProfileService.upsertProfile(userId, email, fullName, avatarUrl)
    await ProfileService.backfillProfileFromOAuth(userId, fullName, avatarUrl)

    // ── Step 2: Check for existing workspace membership ───────────────────
    // If the user already has at least one workspace_members row, they are
    // fully onboarded. Exit early — no further action needed.
    const supabase = await createClient()

    const { data: existingMembership, error: memberCheckErr } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle()

    if (memberCheckErr) {
      console.error("[Onboarding] Error checking workspace membership:", memberCheckErr)
      // Non-fatal at this stage — let the user through and log for investigation
      return
    }

    if (existingMembership) {
      // User is fully onboarded — nothing to repair
      return
    }

    // ── Step 3: Check for orphan workspace (workspace without membership) ─
    // This handles the legacy case: the workspace row exists (created before
    // the membership-throw fix) but the workspace_members row was never written.
    const { data: orphanWorkspace, error: orphanCheckErr } = await supabase
      .from("workspaces")
      .select("id")
      .eq("owner_id", userId)
      .limit(1)
      .maybeSingle()

    if (orphanCheckErr) {
      console.error("[Onboarding] Error checking for orphan workspace:", orphanCheckErr)
    }

    if (orphanWorkspace) {
      // Workspace exists but membership is missing — repair it
      console.warn(
        `[Onboarding] Repairing missing owner membership for user ${userId} on workspace ${orphanWorkspace.id}`
      )
      await WorkspaceService.ensureOwnerMembership(orphanWorkspace.id, userId)
      return
    }

    // ── Step 3.5: Identity Linking Workaround ─────────────────────────────
    // To enforce strictly 1 workspace per email (e.g. if the user signs in with GitHub
    // but already has an email/password account with a workspace), we check if another
    // profile with the same email is already in a workspace.
    if (email) {
      const { data: profilesWithSameEmail } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .neq("id", userId)

      if (profilesWithSameEmail && profilesWithSameEmail.length > 0) {
        const otherProfileIds = profilesWithSameEmail.map(p => p.id)

        // Find if any of these alternate profiles belong to a workspace
        const { data: sharedMembership } = await supabase
          .from("workspace_members")
          .select("workspace_id, role")
          .in("user_id", otherProfileIds)
          .limit(1)
          .maybeSingle()

        if (sharedMembership) {
          console.warn(
            `[Onboarding] Email ${email} already belongs to workspace ${sharedMembership.workspace_id}. Linking new identity ${userId}.`
          )
          // Add this new user identity to the exact same workspace
          const { error: linkErr } = await supabase
            .from("workspace_members")
            .insert({
              workspace_id: sharedMembership.workspace_id,
              user_id: userId,
              role: sharedMembership.role, // Inherit role from their other identity
            })
            
          if (!linkErr) {
            return // Successfully linked, onboarding complete!
          } else {
            console.error("[Onboarding] Failed to link identity to existing workspace:", linkErr)
          }
        }
      }
    }

    // ── Step 4: First-time user — create workspace + membership ──────────
    // No workspace and no membership exists yet. Create a default workspace.
    // WorkspaceService.createWorkspace now THROWS if membership creation fails,
    // so a partial state (workspace without membership) can no longer be silently created.
    const displayName =
      fullName ??
      email.split("@")[0] ??
      "My"

    const workspaceName = `${displayName}'s Workspace`

    try {
      await WorkspaceService.createWorkspace(workspaceName, userId)
    } catch (err) {
      console.error("[Onboarding] Failed to create default workspace:", err)
      // Re-throw so the callback can redirect to an error page instead of
      // silently dropping the user into a broken workspace state.
      throw err
    }
  }
}
