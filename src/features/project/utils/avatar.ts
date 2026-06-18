export function getProjectInitials(name: string): string {
  if (!name) return "TASK";
  const cleanName = name.replace(/[^a-zA-Z0-9\s]/g, "").trim();
  const words = cleanName.split(/\s+/);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + (words[1] ? words[1][0] : "")).toUpperCase();
}

export function getUserInitials(name?: string | null, email?: string | null): string {

  const display = name || email || "?";
  if (display === "?") return "?";

  if (!name && email) {
    const parts = email.split("@")[0].split(/[\._-]/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
  }

  const parts = display.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
}

export function getAvatarBgColor(identifier: string): string {
  const colors = [
    "bg-amber-500 text-white",
    "bg-blue-500 text-white",
    "bg-zinc-700 text-white",
    "bg-rose-500 text-white",
    "bg-violet-500 text-white",
    "bg-teal-500 text-white",
    "bg-indigo-500 text-white",
    "bg-pink-500 text-white",
  ];
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export function getVisualPriority(task: { priority?: string | null }): "low" | "medium" | "high" {
  return (task.priority || "medium") as "low" | "medium" | "high";
}

