'use client';

import { Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StepItem {
  id: number;
  title: string;
  description: string;
  icon: LucideIcon;
}

interface StepperProps {
  steps: StepItem[];
  currentStep: number;
  className?: string;
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  const progress = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className={cn('w-full', className)}>
      {/* Mobil: progress bar */}
      <div className="mb-6 lg:hidden">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">
            Addım {currentStep} / {steps.length}
          </span>
          <span className="text-muted-foreground">{steps[currentStep - 1]?.title}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand to-brand-dark transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Desktop: xəritə tipli addım yolu */}
      <nav aria-label="Xidmət yaratma addımları" className="hidden lg:block">
        <ol className="relative flex w-full items-start justify-between">
          {/* Arxa xətt — birinci və son ikonun mərkəzləri arasında */}
          <div
            aria-hidden
            className="absolute left-7 right-7 top-7 h-0.5 bg-border"
          />
          <div
            aria-hidden
            className="absolute left-7 top-7 h-0.5 bg-gradient-to-r from-brand to-brand-dark transition-all duration-500 ease-out"
            style={{
              width:
                progress === 0
                  ? '0'
                  : `calc((100% - 3.5rem) * ${progress / 100})`,
            }}
          />

          {steps.map((step) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            const isFirst = step.id === 1;
            const isLast = step.id === steps.length;
            const Icon = step.icon;

            return (
              <li
                key={step.id}
                className={cn(
                  'relative z-10 flex shrink-0 flex-col',
                  isFirst && 'items-start text-left',
                  isLast && 'items-end text-right',
                  !isFirst && !isLast && 'items-center text-center',
                )}
              >
                <div
                  className={cn(
                    'flex h-14 w-14 items-center justify-center rounded-2xl border-2 transition-all duration-300',
                    isCompleted &&
                      'border-brand bg-brand text-brand-foreground shadow-md shadow-brand/20',
                    isCurrent &&
                      'border-brand bg-gradient-to-br from-brand/40 to-brand/15 text-brand-foreground ring-4 ring-brand/20',
                    !isCompleted &&
                      !isCurrent &&
                      'border-border bg-card text-muted-foreground',
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-6 w-6" strokeWidth={2.5} />
                  ) : (
                    <Icon className="h-6 w-6" strokeWidth={1.75} />
                  )}
                </div>

                <div className="mt-3 max-w-[9rem]">
                  <p
                    className={cn(
                      'text-xs font-medium text-muted-foreground',
                      isCurrent || isCompleted ? 'text-brand-dark' : 'text-muted-foreground',
                    )}
                  >
                    Addım {step.id}
                  </p>
                  <p
                    className={cn(
                      'mt-0.5 text-sm font-semibold leading-snug',
                      isCurrent ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {step.title}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
