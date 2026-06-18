import { cache } from "react"
import { ProfileService } from "@/features/auth/services/profile.service"
import { WorkspaceService } from "@/features/workspace/services/workspace.service"
import { ProjectService } from "@/features/project/services/project.service"
import { MemberService } from "@/features/workspace/services/member.service"

export const getCachedProfile = cache((userId: string) =>
  ProfileService.getProfile(userId)
)

export const getCachedWorkspaceForUser = cache((userId: string) =>
  WorkspaceService.getWorkspaceForUser(userId)
)

export const getCachedProjectsByWorkspace = cache((workspaceId: string, userId?: string, userRole?: string) =>
  ProjectService.getProjectsByWorkspace(workspaceId, userId, userRole)
)

export const getCachedMembersByWorkspace = cache((workspaceId: string) =>
  MemberService.getMembersByWorkspace(workspaceId)
)
