// Demo mode banner

import { Badge } from '@/components/ui/badge';

export function DemoModeBadge() {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-300">
        <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        DEMO MODE
      </span>
    </div>
  );
}
