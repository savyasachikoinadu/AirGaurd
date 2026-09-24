// Mode badge component — replaces DemoModeBadge with LIVE/DEMO awareness

import { Wifi, WifiOff } from 'lucide-react';

interface ModeBadgeProps {
  mode: 'LIVE' | 'DEMO';
}

export function ModeBadge({ mode }: ModeBadgeProps) {
  const isLive = mode === 'LIVE';
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold ring-1 ${
        isLive
          ? 'bg-green-100 text-green-800 ring-green-300'
          : 'bg-amber-100 text-amber-800 ring-amber-300'
      }`}>
        <span className={`inline-block w-2 h-2 rounded-full ${isLive ? 'bg-green-500' : 'bg-amber-500'} ${isLive ? 'animate-pulse' : ''}`} />
        {isLive ? 'LIVE MODE' : 'DEMO MODE'}
      </span>
    </div>
  );
}
