import { Pencil, BarChart3, BookOpen, CheckCircle, XCircle } from 'lucide-react';
import type { MeetPhase } from '@readingcircle/shared';
import type { LucideIcon } from 'lucide-react';

export const phaseBorderColors: Record<MeetPhase, string> = {
  draft: 'border-l-brown-lighter',
  voting: 'border-l-burgundy',
  reading: 'border-l-sage',
  completed: 'border-l-sage-light',
  cancelled: 'border-l-warm-gray',
};

export const phaseTextColors: Record<MeetPhase, string> = {
  draft: 'text-brown',
  voting: 'text-burgundy',
  reading: 'text-sage-dark',
  completed: 'text-sage-dark',
  cancelled: 'text-brown-light',
};

export const phaseDotColors: Record<MeetPhase, string> = {
  draft: 'bg-brown-lighter',
  voting: 'bg-burgundy',
  reading: 'bg-sage',
  completed: 'bg-sage-light',
  cancelled: 'bg-warm-gray',
};

export const phaseIcons: Record<MeetPhase, LucideIcon> = {
  draft: Pencil,
  voting: BarChart3,
  reading: BookOpen,
  completed: CheckCircle,
  cancelled: XCircle,
};
