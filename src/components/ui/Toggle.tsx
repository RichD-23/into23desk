'use client';

import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export default function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
  size = 'md',
}: ToggleProps) {
  const trackSize = size === 'sm' ? 'w-8 h-4' : 'w-10 h-5';
  const thumbSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const thumbTranslate = size === 'sm' ? 'translate-x-4' : 'translate-x-5';

  return (
    <label className={`flex items-center gap-2.5 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
      <div
        className={`relative ${trackSize} rounded-full transition-colors duration-200 ${
          checked ? 'bg-primary' : 'bg-border'
        }`}
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onClick={() => !disabled && onChange(!checked)}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onChange(!checked);
          }
        }}
      >
        <div
          className={`absolute top-0.5 left-0.5 ${thumbSize} rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? thumbTranslate : 'translate-x-0'
          }`}
        />
      </div>
      {label && (
        <span className="text-sm font-500 text-foreground">{label}</span>
      )}
    </label>
  );
}