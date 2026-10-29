export const BUSINESS_TIMEZONE = 'Asia/Karachi';

/**
 * Formats a timestamp in 12-hour AM/PM format using Asia/Karachi timezone.
 * Example: "11:45 PM"
 */
export function formatTime12h(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-US', {
      timeZone: BUSINESS_TIMEZONE,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return '—';
  }
}

/**
 * Formats full date and 12-hour AM/PM time in Asia/Karachi.
 * Example: "29 Oct 2026, 11:45 PM"
 */
export function formatDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: BUSINESS_TIMEZONE,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return '—';
  }
}

/**
 * Formats date only in Asia/Karachi.
 * Example: "29 Oct 2026"
 */
export function formatDateOnly(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: BUSINESS_TIMEZONE,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return '—';
  }
}

/**
 * Checks if a given timestamp falls on "Today" in Asia/Karachi timezone.
 */
export function isTodayInKarachi(dateInput: string | Date): boolean {
  try {
    const targetDate = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const now = new Date();
    const targetFormatted = formatDateOnly(targetDate);
    const nowFormatted = formatDateOnly(now);
    return targetFormatted === nowFormatted;
  } catch {
    return false;
  }
}

/**
 * Formats seconds into human-readable duration: "01h 14m 20s" or "08m 45s"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 0 || isNaN(seconds)) return '00m 00s';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hrs > 0) {
    return `${pad(hrs)}h ${pad(mins)}m ${pad(secs)}s`;
  }
  return `${pad(mins)}m ${pad(secs)}s`;
}
