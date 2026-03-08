import React, { useCallback, useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { GameHeaders } from '../../types/chess.types';
import { useI18n } from '../../i18n';

interface GameInfoPanelProps {
  headers: GameHeaders;
  onUpdateHeaders: (updates: Partial<GameHeaders>) => void;
}

type HeaderField = 'White' | 'Black' | 'Event' | 'Site' | 'Date' | 'Result';

const FIELDS: HeaderField[] = ['White', 'Black', 'Event', 'Site', 'Date', 'Result'];

export default function GameInfoPanel({ headers, onUpdateHeaders }: GameInfoPanelProps) {
  const { strings } = useI18n();
  const [draft, setDraft] = useState<GameHeaders>(headers);

  useEffect(() => {
    setDraft(headers);
  }, [headers]);

  const commitField = useCallback(
    (key: HeaderField) => {
      onUpdateHeaders({ [key]: draft[key] });
    },
    [draft, onUpdateHeaders]
  );

  const setResult = useCallback(
    (result: string) => {
      setDraft((current) => ({ ...current, Result: result }));
      onUpdateHeaders({ Result: result });
    },
    [onUpdateHeaders]
  );

  return (
    <div className="rounded-xl border border-surface-700 bg-surface-800/70 p-4">
      <div className="mb-4 flex items-center gap-2">
        <ClipboardList size={14} className="text-accent-500" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-surface-300">
          {strings.gameInfo.title}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <label key={field} className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.16em] text-surface-400">
              {strings.gameInfo.fields[field].label}
            </span>
            <input
              value={draft[field] ?? ''}
              onChange={(event) =>
                setDraft((current) => ({ ...current, [field]: event.target.value }))
              }
              onBlur={() => commitField(field)}
              className="rounded-lg border border-surface-600 bg-surface-900 px-3 py-2 text-sm text-surface-50 outline-none transition-colors focus:border-accent-500/60"
              placeholder={strings.gameInfo.fields[field].placeholder}
            />
          </label>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {['1-0', '0-1', '1/2-1/2', '*'].map((result) => {
          const active = (draft.Result ?? '*') === result;
          return (
            <button
              key={result}
              onClick={() => setResult(result)}
              className={[
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                active
                  ? 'border-accent-500/40 bg-accent-500/15 text-accent-400'
                  : 'border-surface-600 bg-surface-900 text-surface-300 hover:border-surface-500 hover:text-surface-50',
              ].join(' ')}
            >
              {result}
            </button>
          );
        })}
      </div>
    </div>
  );
}
