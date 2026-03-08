'use client';

import { useState, useEffect } from 'react';

export interface DeploymentTimerProps {
  expiresAt: string;
  onComplete?: () => void;
  className?: string;
}

export default function DeploymentTimer({
  expiresAt,
  onComplete,
  className = '',
}: DeploymentTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const expires = new Date(expiresAt).getTime();
      const remaining = Math.max(0, Math.ceil((expires - now) / 1000));

      setTimeRemaining(remaining);

      if (remaining === 0 && onComplete) {
        onComplete();
      }
    };

    // Update immediately
    updateTimer();

    // Then update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onComplete]);

  if (timeRemaining === 0) return null;

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  // Calculate progress percentage (180s = 100%)
  const totalSeconds = 180;
  const progress = ((totalSeconds - timeRemaining) / totalSeconds) * 100;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Timer display */}
      <div className="flex items-center gap-2 text-sm">
        <div className="flex items-center gap-1.5">
          <div className="animate-pulse h-2 w-2 rounded-full bg-orange-500" />
          <span className="text-orange-700 font-medium">
            Deploying...
          </span>
        </div>
        <span className="text-gray-600">
          {formatted} remaining
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-orange-500 h-full transition-all duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
