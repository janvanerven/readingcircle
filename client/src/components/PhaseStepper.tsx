import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, BarChart3, BookOpen, CheckCircle, Check, Ban, Trash2 } from 'lucide-react';

const STEPS = [
  { phase: 'draft', icon: Pencil, labelKey: 'meets.phases.draft' },
  { phase: 'voting', icon: BarChart3, labelKey: 'meets.phases.voting' },
  { phase: 'reading', icon: BookOpen, labelKey: 'meets.phases.reading' },
  { phase: 'completed', icon: CheckCircle, labelKey: 'meets.phases.completed' },
] as const;

const confirmMessages: Record<string, string> = {
  voting: 'meetDetail.confirmVoting',
  reading: 'meetDetail.confirmReading',
  completed: 'meetDetail.confirmComplete',
  cancelled: 'meetDetail.confirmCancel',
};

interface PhaseStepperProps {
  currentPhase: string;
  isHostOrAdmin: boolean;
  onPhaseChange: (phase: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onCancel: (phase: 'cancelled') => Promise<void>;
  hasBookAndDate: boolean;
  meetId: string;
}

type StepState = 'completed' | 'current' | 'next' | 'upcoming';

export function PhaseStepper({
  currentPhase,
  isHostOrAdmin,
  onPhaseChange,
  onDelete,
  onCancel,
  hasBookAndDate,
}: PhaseStepperProps) {
  const { t } = useTranslation();
  const [pendingPhase, setPendingPhase] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');

  const currentIndex = STEPS.findIndex(s => s.phase === currentPhase);

  // In draft with book+date selected, next step is reading (skip voting)
  const nextPhase = currentPhase === 'draft' && hasBookAndDate ? 'reading' : STEPS[currentIndex + 1]?.phase;

  function getStepState(stepIndex: number): StepState {
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    // When draft can skip to reading, voting (index 1) is not "next"
    if (nextPhase && STEPS[stepIndex]?.phase === nextPhase) return 'next';
    return 'upcoming';
  }

  const circleClasses: Record<StepState, string> = {
    completed: 'bg-sage text-white',
    current: 'bg-burgundy text-white animate-pulse-ring',
    next: 'border-2 border-warm-gray text-brown-lighter',
    upcoming: 'border-2 border-warm-gray text-brown-lighter/50',
  };

  const nextInteractive = 'hover:border-burgundy hover:text-burgundy cursor-pointer';

  const labelClasses: Record<StepState, string> = {
    completed: 'text-sage-dark',
    current: 'text-burgundy font-bold',
    next: 'text-brown-lighter',
    upcoming: 'text-brown-lighter/50',
  };

  const handleStepClick = (stepIndex: number) => {
    const state = getStepState(stepIndex);
    if (state !== 'next' || !isHostOrAdmin) return;
    setPendingPhase(STEPS[stepIndex]!.phase);
  };

  const handleConfirm = async () => {
    if (!pendingPhase) return;
    setChanging(true);
    try {
      await onPhaseChange(pendingPhase);
      setPendingPhase(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setChanging(false);
    }
  };

  const handleCancel = async () => {
    setChanging(true);
    setError('');
    try {
      await onCancel('cancelled');
      setPendingPhase(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setChanging(false);
    }
  };

  const handleDelete = async () => {
    setError('');
    try {
      await onDelete();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  return (
    <div className="mt-6">
      {/* Stepper */}
      <div className="flex items-center">
        {STEPS.map((step, i) => {
          const state = getStepState(i);
          const Icon = state === 'completed' ? Check : step.icon;
          const isClickable = state === 'next' && isHostOrAdmin;

          return (
            <div key={step.phase} className="flex items-center flex-1 last:flex-none">
              {/* Step circle + label */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => handleStepClick(i)}
                  disabled={!isClickable}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${circleClasses[state]} ${isClickable ? nextInteractive : ''} ${!isClickable ? 'cursor-default' : ''}`}
                  aria-current={state === 'current' ? 'step' : undefined}
                  title={isClickable ? t(step.labelKey) : undefined}
                >
                  <Icon className="w-5 h-5" />
                </button>
                <span className={`text-xs mt-1.5 whitespace-nowrap ${labelClasses[state]} ${state === 'current' ? 'block' : 'hidden sm:block'}`}>
                  {t(step.labelKey)}
                </span>
              </div>

              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 self-start mt-5 ${
                    i < currentIndex
                      ? 'bg-sage'
                      : i === currentIndex
                        ? 'border-t-2 border-dashed border-warm-gray'
                        : 'border-t-2 border-dashed border-warm-gray'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {error && <div className="mt-3 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200">{error}</div>}

      {/* Action buttons (cancel/delete) for host/admin */}
      {isHostOrAdmin && currentPhase !== 'completed' && (
        <div className="flex items-center gap-2 mt-4 justify-end">
          <button
            type="button"
            onClick={() => setPendingPhase('cancelled')}
            className="p-2 text-brown-lighter hover:text-burgundy hover:bg-burgundy/5 rounded-lg transition-colors"
            title={t('meetDetail.cancelMeet')}
            aria-label={t('meetDetail.cancelMeet')}
          >
            <Ban className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-brown-lighter hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title={t('meetDetail.deleteMeet')}
            aria-label={t('meetDetail.deleteMeet')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Host/admin delete button for completed meets */}
      {isHostOrAdmin && currentPhase === 'completed' && (
        <div className="flex items-center gap-2 mt-4 justify-end">
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-brown-lighter hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title={t('meetDetail.deleteMeet')}
            aria-label={t('meetDetail.deleteMeet')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Phase change confirmation */}
      {pendingPhase && pendingPhase !== 'cancelled' && (
        <div className="mt-3 p-4 rounded-lg border bg-cream border-warm-gray">
          <p className="text-sm text-brown mb-3">{t(confirmMessages[pendingPhase]!)}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={changing}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-burgundy hover:bg-burgundy-light text-white disabled:opacity-50"
            >
              {t('meetDetail.confirm')}
            </button>
            <button
              type="button"
              onClick={() => setPendingPhase(null)}
              className="px-4 py-2 text-brown hover:bg-warm-gray-light rounded-lg text-sm"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Cancel confirmation */}
      {pendingPhase === 'cancelled' && (
        <div className="mt-3 p-4 rounded-lg border bg-red-50 border-red-200">
          <p className="text-sm text-red-700 mb-3">{t('meetDetail.confirmCancel')}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={changing}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
            >
              {t('meetDetail.confirm')}
            </button>
            <button
              type="button"
              onClick={() => setPendingPhase(null)}
              className="px-4 py-2 text-brown hover:bg-warm-gray-light rounded-lg text-sm"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 mb-3">{t('meetDetail.confirmDelete')}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
            >
              {t('meetDetail.confirm')}
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 text-brown hover:bg-warm-gray-light rounded-lg text-sm"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(107, 39, 55, 0.3); }
          70% { box-shadow: 0 0 0 6px rgba(107, 39, 55, 0); }
          100% { box-shadow: 0 0 0 0 rgba(107, 39, 55, 0); }
        }
        .animate-pulse-ring {
          animation: pulse-ring 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
