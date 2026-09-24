// Source badge component - shows data origin clearly

import type { DataSource } from '@/lib/types';
import { getDataSourceLabel, getDataSourceColor } from '@/lib/ui/utils';
import { Badge } from '@/components/ui/badge';

interface SourceBadgeProps {
  source: DataSource;
  size?: 'sm' | 'xs';
}

export function SourceBadge({ source, size = 'sm' }: SourceBadgeProps) {
  const label = getDataSourceLabel(source);
  const color = getDataSourceColor(source);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'}`}
      style={{ backgroundColor: `${color}15`, color }}
    >
      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
