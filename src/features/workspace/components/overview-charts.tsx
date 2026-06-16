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
          color="text-amber-400 bg-amber-500/10 border-amber-500/20"
          hoverColor="hover:border-amber-500/30 hover:shadow-[0_8px_30px_rgb(245,158,11,0.05)]"
          icon="📁"
        />
        <SummaryCard
          label="Total Tasks"
          value={totalTasks}
          color="text-teal-400 bg-teal-500/10 border-teal-500/20"
          hoverColor="hover:border-teal-500/30 hover:shadow-[0_8px_30px_rgb(20,184,166,0.05)]"
          icon="📋"
        />
        <SummaryCard
          label="Completed"
          value={tasksByStatus.find((d) => d.name === "Done")?.value || 0}
          color="text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
          hoverColor="hover:border-indigo-500/30 hover:shadow-[0_8px_30px_rgb(99,102,241,0.05)]"
          icon="✅"
        />
        <SummaryCard
          label="In Progress"
          value={
            tasksByStatus.find((d) => d.name === "In Progress")?.value || 0
          }
          color="text-amber-400 bg-amber-500/10 border-amber-500/20"
          hoverColor="hover:border-amber-500/30 hover:shadow-[0_8px_30px_rgb(245,158,11,0.05)]"
          icon="⏳"
        />
      </div>

      {/* ── Pie Chart — Tasks by Status ───────────────────── */}
      <div className="p-6 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-slate-800/80 shadow-sm">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
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
                      border: "1px solid #334155",
                      fontSize: "11px",
                      background: "#0f172a",
                      color: "#fff",
                    }}
                    itemStyle={{ color: "#fff" }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: "11px", paddingTop: "12px", color: "#94a3b8" }}
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
      <div className="p-6 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-slate-800/80 shadow-sm">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
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
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={{ stroke: "rgba(148, 163, 184, 0.15)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #334155",
                      fontSize: "11px",
                      background: "#0f172a",
                      color: "#fff",
                    }}
                    itemStyle={{ color: "#fff" }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: "11px", paddingTop: "8px", color: "#94a3b8" }}
                  />
                  <Bar
                    dataKey="total"
                    name="Total Tasks"
                    fill="#334155"
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
    <div className={`p-5 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-slate-800/80 shadow-sm hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between ${hoverColor}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
          {label}
        </span>
        <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-sm border shadow-3xs ${color}`}>
          {icon}
        </span>
      </div>
      <div className="text-3xl font-extrabold text-white tracking-tight">{value}</div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-64 flex items-center justify-center">
      <div className="text-center">
        <div className="text-3xl mb-3">📊</div>
        <p className="text-xs text-slate-400 max-w-[200px]">{message}</p>
      </div>
    </div>
  )
}
