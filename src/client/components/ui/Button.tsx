import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'relative inline-flex items-center justify-center font-medium rounded-xl select-none apple-press focus:outline-none focus-visible:ring-2 focus-visible:ring-apple-accent/70 transition-all';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-6 py-3.5 gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-apple-accent hover:bg-apple-accentHover text-white shadow-lg shadow-blue-500/20 border border-blue-400/30',
    secondary:
      'bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-100 border border-white/10 hover:border-white/20 backdrop-blur-md shadow-sm',
    success:
      'bg-apple-success hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 border border-emerald-400/30',
    danger:
      'bg-apple-danger hover:bg-red-600 text-white shadow-lg shadow-red-500/20 border border-red-400/30',
    ghost:
      'bg-transparent hover:bg-white/10 text-zinc-300 hover:text-white',
  };

  const isDisabled = disabled || loading;

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${
        isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
      } ${className}`}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        icon && <span className="inline-flex shrink-0">{icon}</span>
      )}
      {children}
    </button>
  );
};

