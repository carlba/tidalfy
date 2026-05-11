import { Album, Layers, Mic2, Music2 } from 'lucide-react';
import type { ReactNode } from 'react';

const TYPE_ICON_MAP: Record<string, ReactNode> = {
  album: <Album className="h-3.5 w-3.5 shrink-0" />,
  live: <Mic2 className="h-3.5 w-3.5 shrink-0" />,
  compilation: <Layers className="h-3.5 w-3.5 shrink-0" />,
  single: <Music2 className="h-3.5 w-3.5 shrink-0" />,
};

interface ReleaseSecondaryTypeBadgesProps {
  releaseType?: string | null;
  secondaryTypes?: string[];
}

export function ReleaseSecondaryTypeBadges({
  releaseType,
  secondaryTypes = [],
}: ReleaseSecondaryTypeBadgesProps) {
  const types = [releaseType, ...secondaryTypes].filter((type): type is string =>
    Boolean(type?.trim())
  );
  const uniqueTypes = types.filter((type, index, all) => {
    const normalizedType = type.trim().toLowerCase();
    return all.findIndex(t => t.trim().toLowerCase() === normalizedType) === index;
  });

  if (!uniqueTypes.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {types.map((type, index) => {
        const normalizedType = type.trim().toLowerCase();
        const icon = TYPE_ICON_MAP[normalizedType];

        return (
          <span
            key={`${normalizedType}-${index}`}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            {icon}
            <span>{type}</span>
          </span>
        );
      })}
    </div>
  );
}
