import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatDate(isoString: string | null): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}

export function formatDateTime(isoString: string | null): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  return `${DAYS[d.getDay()]} ${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Format a Date as a value for <input type="datetime-local"> without UTC conversion */
export function toLocalDateTimeInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
