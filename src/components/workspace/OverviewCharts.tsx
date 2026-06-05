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
import type { WorkspaceAnalytics } from "@/types/workspace.types"

interface OverviewChartsProps {
  analytics: WorkspaceAnalytics
}

export function OverviewCharts({ analytics }: OverviewChartsProps) {
  const { tasksByStatus, projectTaskCounts, totalProjects, totalTasks } =
    analytics

  const hasTaskData = tasksByStatus.some((d) => d.value > 0)
  const hasProjectData = projectTaskCounts.length > 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ── Summary Cards ─────────────────────────────────── */}
      <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Projects"
          value={totalProjects}
          color="bg-blue-50 text-blue-700"
          icon="📁"
        />
        <SummaryCard
          label="Total Tasks"
          value={totalTasks}
          color="bg-violet-50 text-violet-700"
          icon="📋"
        />
        <SummaryCard
          label="Completed"
          value={tasksByStatus.find((d) => d.name === "Done")?.value || 0}
          color="bg-emerald-50 text-emerald-700"
          icon="✅"
        />
        <SummaryCard
          label="In Progress"
          value={
            tasksByStatus.find((d) => d.name === "In Progress")?.value || 0
          }
          color="bg-amber-50 text-amber-700"
          icon="⏳"
        />
      </div>

      {/* ── Pie Chart — Tasks by Status ───────────────────── */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-[0_2px_12px_rgba(15,23,42,0.03)]">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#2d4a3e] inline-block" />
          Tasks by Status
        </h3>
        {hasTaskData ? (
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
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
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
        )}
      </div>

      {/* ── Bar Chart — Tasks per Project ─────────────────── */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-[0_2px_12px_rgba(15,23,42,0.03)]">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#2d4a3e] inline-block" />
          Tasks per Project
        </h3>
        {hasProjectData ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={projectTaskCounts}
                margin={{ top: 5, right: 10, left: -15, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={{ stroke: "#e2e8f0" }}
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
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
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
                  fill="#94a3b8"
                  radius={[4, 4, 0, 0]}
                  barSize={28}
                />
                <Bar
                  dataKey="completed"
                  name="Completed"
                  fill="#2d4a3e"
                  radius={[4, 4, 0, 0]}
                  barSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState message="No projects yet. Create your first project to see task analytics." />
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
  icon,
}: {
  label: string
  value: number
  color: string
  icon: string
}) {
  return (
    <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-[0_2px_8px_rgba(15,23,42,0.02)]">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">{icon}</span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
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
