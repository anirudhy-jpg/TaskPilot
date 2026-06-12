"use client"

import React from "react"
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import type { WorkspaceAnalytics } from "../types/workspace.types"

interface OverviewChartsProps {
  analytics: WorkspaceAnalytics
}

export function OverviewCharts({ analytics }: OverviewChartsProps) {
  const { tasksByStatus, projectTaskCounts, totalProjects, totalTasks } =
    analytics

  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const hasTaskData = tasksByStatus.some((d) => d.value > 0)
  const hasProjectData = projectTaskCounts.length > 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ── Summary Cards ─────────────────────────────────── */}
      <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Projects"
          value={totalProjects}
          color="text-amber-700 bg-amber-50 border-amber-100/60"
          hoverColor="hover:border-amber-500/20 hover:shadow-[0_12px_24px_-8px_rgba(245,158,11,0.12)]"
          icon="📁"
        />
        <SummaryCard
          label="Total Tasks"
          value={totalTasks}
          color="text-teal-700 bg-teal-50 border-teal-100/60"
          hoverColor="hover:border-teal-500/20 hover:shadow-[0_12px_24px_-8px_rgba(20,184,166,0.12)]"
          icon="📋"
        />
        <SummaryCard
          label="Completed"
          value={tasksByStatus.find((d) => d.name === "Done")?.value || 0}
          color="text-indigo-700 bg-indigo-50 border-indigo-100/60"
          hoverColor="hover:border-indigo-500/20 hover:shadow-[0_12px_24px_-8px_rgba(99,102,241,0.12)]"
          icon="✅"
        />
        <SummaryCard
          label="In Progress"
          value={
            tasksByStatus.find((d) => d.name === "In Progress")?.value || 0
          }
          color="text-amber-700 bg-amber-50 border-amber-100/60"
          hoverColor="hover:border-amber-500/20 hover:shadow-[0_12px_24px_-8px_rgba(245,158,11,0.12)]"
          icon="⏳"
        />
      </div>

      {/* ── Pie Chart — Tasks by Status ───────────────────── */}
      <div className="p-6 rounded-2xl bg-white/75 backdrop-blur-md border border-amber-900/5 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block animate-pulse" />
          Tasks by Status
        </h3>
        {mounted ? (
          hasTaskData ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tasksByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {tasksByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid rgba(45, 74, 62, 0.1)",
                      fontSize: "11px",
                      boxShadow: "0 8px 30px rgba(0,0,0,0.05)",
                      background: "rgba(255, 255, 255, 0.95)",
                      backdropFilter: "blur(4px)",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState message="No tasks yet. Create a project and add tasks to see analytics." />
          )
        ) : (
          <div className="h-64 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
          </div>
        )}
      </div>

      {/* ── Bar Chart — Tasks per Project ─────────────────── */}
      <div className="p-6 rounded-2xl bg-white/75 backdrop-blur-md border border-amber-900/5 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block animate-pulse" />
          Tasks per Project
        </h3>
        {mounted ? (
          hasProjectData ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={projectTaskCounts}
                  margin={{ top: 5, right: 10, left: -15, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(148, 163, 184, 0.08)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={{ stroke: "rgba(148, 163, 184, 0.15)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid rgba(45, 74, 62, 0.1)",
                      fontSize: "11px",
                      boxShadow: "0 8px 30px rgba(0,0,0,0.05)",
                      background: "rgba(255, 255, 255, 0.95)",
                      backdropFilter: "blur(4px)",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  />
                  <Bar
                    dataKey="total"
                    name="Total Tasks"
                    fill="#cbd5e1"
                    radius={[4, 4, 0, 0]}
                    barSize={28}
                  />
                  <Bar
                    dataKey="completed"
                    name="Completed"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                    barSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState message="No projects yet. Create your first project to see task analytics." />
          )
        ) : (
          <div className="h-64 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────

function SummaryCard({
  label,
  value,
  color,
  hoverColor,
  icon,
}: {
  label: string
  value: number
  color: string
  hoverColor: string
  icon: string
}) {
  return (
    <div className={`p-5 rounded-2xl bg-white/70 backdrop-blur-md border border-amber-900/5 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.03)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between ${hoverColor}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
          {label}
        </span>
        <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-sm border shadow-3xs ${color}`}>
          {icon}
        </span>
      </div>
      <div className="text-3xl font-extrabold text-slate-800 tracking-tight">{value}</div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-64 flex items-center justify-center">
      <div className="text-center">
        <div className="text-3xl mb-3">📊</div>
        <p className="text-xs text-slate-500 max-w-[200px]">{message}</p>
      </div>
    </div>
  )
}
