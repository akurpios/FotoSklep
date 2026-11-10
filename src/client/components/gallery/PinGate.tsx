import React, { useState, useRef, useEffect } from 'react';
import { Lock, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { useTranslation } from '../../i18n/LanguageContext';

interface PinGateProps {
  projectName?: string;
  onVerify: (pin: string) => Promise<void>;
  isLoading: boolean;
  error?: string | null;
}

export const PinGate: React.FC<PinGateProps> = ({
  projectName = 'Private Photo Session',
  onVerify,
  isLoading,
  error,
}) => {
  const { t } = useTranslation();
  const [digits, setDigits] = useState<string[]>(Array(8).fill(''));
  const [shake, setShake] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus first input on mount
    inputsRef.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (error) {
      setShake(true);
      const timer = setTimeout(() => setShake(false), 500);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const nextDigits = [...digits];
      nextDigits[index] = '';
      setDigits(nextDigits);
      return;
    }

    // Handle paste of whole 8-digit PIN
    if (cleaned.length > 1) {
      const pastedDigits = cleaned.slice(0, 8).split('');
      const nextDigits = [...digits];
      pastedDigits.forEach((d, i) => {
        if (i < 8) nextDigits[i] = d;
      });
      setDigits(nextDigits);
      if (nextDigits.every((d) => d !== '')) {
        onVerify(nextDigits.join(''));
      } else {
        const nextFocus = Math.min(pastedDigits.length, 7);
        inputsRef.current[nextFocus]?.focus();
      }
      return;
    }

    const nextDigits = [...digits];
    nextDigits[index] = cleaned[0];
    setDigits(nextDigits);

    // Auto-advance
    if (index < 7 && cleaned[0]) {
      inputsRef.current[index + 1]?.focus();
    }

    // If 8 digits filled, submit immediately
    if (index === 7 && cleaned[0]) {
      const fullPin = nextDigits.join('');
      if (fullPin.length === 8) {
        onVerify(fullPin);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pin = digits.join('');
    if (pin.length === 8) {
      onVerify(pin);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div
        className={`w-full max-w-md apple-glass-bright rounded-3xl p-8 sm:p-10 border border-white/10 shadow-2xl space-y-8 animate-spring-up ${
          shake ? 'animate-shake border-apple-danger/50' : ''
        }`}
      >
        {/* Top Lock Icon */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-apple-accent shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-white tracking-tight">{t.gate.title}</h1>
            <p className="text-sm font-semibold text-zinc-300">{projectName}</p>
            <p className="text-xs text-zinc-400 mt-1">
              {t.gate.prompt}
            </p>
          </div>
        </div>

        {/* 8-Digit Input Fields */}
        <form onSubmit={handleManualSubmit} className="space-y-6">
          <div className="flex justify-center gap-1.5 sm:gap-2">
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputsRef.current[idx] = el)}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                disabled={isLoading}
                className="w-9 sm:w-11 h-12 sm:h-14 text-center text-xl sm:text-2xl font-bold font-mono text-white bg-zinc-900/90 border border-white/15 rounded-xl focus:outline-none focus:border-apple-accent focus:ring-2 focus:ring-apple-accent/40 transition-all select-all shadow-inner"
              />
            ))}
          </div>

          {error && (
            <p className="text-xs text-apple-danger text-center font-medium animate-pulse">
              {error}
            </p>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isLoading}
              disabled={digits.some((d) => d === '')}
              className="w-full"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              {t.gate.unlockBtn}
            </Button>
          </div>
        </form>

        <div className="text-center pt-2 border-t border-white/5">
          <p className="text-[11px] text-zinc-500">
            {t.gate.help}
          </p>
        </div>
      </div>
    </div>
  );
};
