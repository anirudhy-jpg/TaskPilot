/**
 * Converts total seconds into a string like "2h 15m" or "45m" or "30s"
 */
export function formatSecondsToShortString(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds < 0) return "0m";

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  }
  
  if (minutes > 0) {
    return `${minutes}m`;
  }

  return `${seconds}s`;
}

/**
 * Converts total seconds into a timer string like "01:23:45"
 */
export function formatSecondsToTimer(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds < 0) return "00:00:00";

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hStr = hours.toString().padStart(2, "0");
  const mStr = minutes.toString().padStart(2, "0");
  const sStr = seconds.toString().padStart(2, "0");

  return `${hStr}:${mStr}:${sStr}`;
}

/**
 * Calculates duration in seconds between two dates
 */
export function calculateDurationSeconds(start: string | Date, end: string | Date): number {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  return Math.floor((endTime - startTime) / 1000);
}
