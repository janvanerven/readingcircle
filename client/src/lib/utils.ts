import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import i18n from '../i18n';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function getLocale(): string {
  return i18n.language === 'nl' ? 'nl-NL' : 'en-GB';
}

export function formatDate(isoString: string | null): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  return new Intl.DateTimeFormat(getLocale(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(isoString: string | null): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  return new Intl.DateTimeFormat(getLocale(), {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

/** Format a Date as a value for <input type="datetime-local"> without UTC conversion */
export function toLocalDateTimeInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
