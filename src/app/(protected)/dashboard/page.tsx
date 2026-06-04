import React from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProfileService } from "@/services/profile.service"
import { logoutAction } from "@/actions/auth/auth.actions"
import { Button } from "@/components/ui/button"
import { LogOut, LayoutDashboard, User, Settings, FolderKanban, Users } from "lucide-react"
import { Logo } from "@/components/ui/logo"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Fetch user profile from profiles table
  let profile = null
  try {
    profile = await ProfileService.getProfile(user.id)
    if (!profile && user.email) {
      // Auto-create profile if missing (e.g., signed up via GitHub OAuth)
      profile = await ProfileService.createProfile(
        user.id,
        user.email,
        user.user_metadata?.full_name || user.user_metadata?.name || undefined
      )
    }
  } catch (err) {
    console.error("Error loading profile:", err)
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans w-full">
      {/* Full Width Navbar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50 w-full">
        <div className="w-full px-6 h-16 flex items-center justify-between">
          <Logo size="md" />

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
              <div className="w-6 h-6 rounded-full bg-[#2d4a3e]/10 flex items-center justify-center text-[#2d4a3e] text-xs font-semibold uppercase">
                {profile?.fullName?.[0] || profile?.email?.[0] || user.email?.[0] || "?"}
              </div>
              <span className="text-xs font-semibold text-slate-600 hidden sm:inline-block truncate max-w-[150px]">
                {profile?.fullName || profile?.email || user.email}
              </span>
            </div>

            <form action={logoutAction}>
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="text-slate-500 hover:text-slate-900 hover:bg-slate-50 cursor-pointer"
              >
                <LogOut size={18} />
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Full-Screen Layout Area */}
      <div className="flex-1 flex overflow-hidden w-full">
        {/* Full-Height Sidebar Navigation */}
        <aside className="w-64 border-r border-slate-200 bg-slate-50 p-4 flex flex-col gap-1 shrink-0 select-none hidden md:flex">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
            Workspace
          </div>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 font-semibold transition-all shadow-sm"
          >
            <LayoutDashboard size={16} className="text-[#2d4a3e]" />
            <span className="text-xs">Overview</span>
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/50 transition-all"
          >
            <FolderKanban size={16} />
            <span className="text-xs">Projects</span>
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/50 transition-all"
          >
            <Users size={16} />
            <span className="text-xs">Members</span>
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/50 transition-all"
          >
            <Settings size={16} />
            <span className="text-xs">Settings</span>
          </a>
        </aside>

        {/* Dashboard Scrollable Work Area */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto bg-[#f8fafc] flex flex-col gap-6">
          {/* Welcome Card */}
          <div className="p-8 rounded-xl bg-white border border-slate-200 relative overflow-hidden shadow-[0_4px_20px_rgba(15,23,42,0.02)]">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Welcome back, {profile?.fullName || user.email || "Pilot"}!
            </h1>
            <p className="text-slate-600 text-sm max-w-xl leading-relaxed">
              You have successfully authenticated with Supabase Auth. Your account is fully secured and ready to manage workspaces, projects, and tasks.
            </p>
          </div>

          {/* Details & Info Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Account Details */}
            <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-2 text-[#2d4a3e] font-semibold">
                <User size={18} />
                <h3 className="text-sm font-bold">Account Information</h3>
              </div>
              <div className="divide-y divide-slate-200">
                {profile?.fullName && (
                  <div className="py-2.5 flex justify-between text-xs">
                    <span className="text-slate-500">Full Name</span>
                    <span className="text-slate-900 font-semibold">{profile.fullName}</span>
                  </div>
                )}
                <div className="py-2.5 flex justify-between text-xs">
                  <span className="text-slate-500">User ID</span>
                  <span className="font-mono text-slate-900 text-[10px]">{user.id}</span>
                </div>
                <div className="py-2.5 flex justify-between text-xs">
                  <span className="text-slate-500">Email Address</span>
                  <span className="text-slate-900 font-semibold">{user.email}</span>
                </div>
                <div className="py-2.5 flex justify-between text-xs">
                  <span className="text-slate-500">Auth Method</span>
                  <span className="text-slate-900 font-semibold capitalize">
                    {user.app_metadata.provider || "Email"}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between text-xs">
                  <span className="text-slate-500">Created At</span>
                  <span className="text-slate-900 font-semibold">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-2 text-[#2d4a3e] font-semibold">
                <Settings size={18} />
                <h3 className="text-sm font-bold">Next Development Phase</h3>
              </div>
              <p className="text-slate-600 text-xs leading-relaxed">
                Next, you'll be building out Phase 2: the Workspace system, including multi-tenancy, inviting members with roles, and real-time collaboration.
              </p>
              <div className="mt-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg p-3">
                👉 Your server actions, client validations, and DB service are configured inside the <code className="font-mono text-slate-900 font-bold">src/</code> directory structure.
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
