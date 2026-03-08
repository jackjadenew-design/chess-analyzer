import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Library, Loader2, X } from 'lucide-react';

import { useI18n } from '../../i18n';
import { MASTER_LIBRARY } from '../../data/masterLibrary';
import { MasterCollection, MasterGame, MasterSummary } from '../../types/master-games';

interface MasterGamesPanelProps {
  onLoadPgn: (pgn: string) => void | Promise<void>;
}

const BASE_URL = import.meta.env.BASE_URL;

export default function MasterGamesPanel({ onLoadPgn }: MasterGamesPanelProps) {
  const { language, strings } = useI18n();
  const [selectedMaster, setSelectedMaster] = useState<MasterSummary | null>(null);
  const [selectedOpeningGroup, setSelectedOpeningGroup] = useState('');
  const [loadingMasterId, setLoadingMasterId] = useState<string | null>(null);
  const [loadingGameId, setLoadingGameId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [collections, setCollections] = useState<Record<string, MasterCollection>>({});

  const collection = selectedMaster ? collections[selectedMaster.id] : null;

  const localizeOpeningGroup = (group: string) => {
    if (language !== 'zh') return group;

    const labels: Record<string, string> = {
      'Closed Games': '封闭类开局',
      'Open Games': '开放类开局',
      'Semi-Open Games': '半开放类开局',
      'Flank Openings': '侧翼开局',
      'Indian Defences': '印度防御',
      'Women’s Rapid World Championship': '女子快棋世锦赛',
      Miscellaneous: '其他',
    };

    return labels[group] ?? group;
  };

  const openingGroups = useMemo(() => {
    if (!collection) return [];
    const groups = collection.games.reduce<Map<string, number>>((acc, game) => {
      acc.set(game.openingGroup, (acc.get(game.openingGroup) ?? 0) + 1);
      return acc;
    }, new Map());

    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [collection]);

  const visibleGames = useMemo(() => {
    if (!collection) return [];
    if (!selectedOpeningGroup) return collection.games;
    return collection.games.filter((game) => game.openingGroup === selectedOpeningGroup);
  }, [collection, selectedOpeningGroup]);

  useEffect(() => {
    if (!openingGroups.length) {
      setSelectedOpeningGroup('');
      return;
    }
    if (!openingGroups.some(([group]) => group === selectedOpeningGroup)) {
      setSelectedOpeningGroup(openingGroups[0][0]);
    }
  }, [openingGroups, selectedOpeningGroup]);

  const openMaster = async (master: MasterSummary) => {
    setSelectedMaster(master);
    setError(null);

    if (collections[master.id]) {
      return;
    }

    setLoadingMasterId(master.id);
    try {
      const response = await fetch(`${BASE_URL}masters/${master.id}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load ${master.id}`);
      }
      const payload = (await response.json()) as MasterCollection;
      setCollections((current) => ({ ...current, [master.id]: payload }));
    } catch (loadError) {
      console.error(loadError);
      setError(strings.pgn.parseFileFailed);
    } finally {
      setLoadingMasterId(null);
    }
  };

  const loadGame = async (game: MasterGame) => {
    setLoadingGameId(game.id);
    try {
      await onLoadPgn(game.pgn);
      setSelectedMaster(null);
    } finally {
      setLoadingGameId(null);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-surface-700 bg-surface-800/70 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Library size={14} className="text-accent-500" />
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-surface-300">
            {strings.masters.title}
          </span>
        </div>

        <p className="mb-4 text-xs leading-5 text-surface-400">{strings.masters.subtitle}</p>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {MASTER_LIBRARY.map((master) => (
            <button
              key={master.id}
              onClick={() => void openMaster(master)}
              className="rounded-xl border border-surface-600 bg-surface-900 px-3 py-2 text-left transition-colors hover:border-accent-400/40 hover:bg-surface-800"
            >
              <div className="text-sm font-medium text-surface-50">{master.name}</div>
              <div className="mt-1 text-[11px] text-surface-400">
                {master.gameCount} {strings.masters.loadGames}
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedMaster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4">
          <div className="flex h-[min(78vh,760px)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-surface-600 bg-surface-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-surface-700 px-5 py-4">
              <div>
                <div className="text-lg font-semibold text-surface-50">{selectedMaster.name}</div>
                <div className="mt-1 text-xs text-surface-400">
                  {collection?.games.length ?? selectedMaster.gameCount} {strings.masters.availableGames}
                  {collection?.source ? ` · ${strings.masters.source}: ${collection.source}` : ''}
                </div>
              </div>
              <button
                onClick={() => setSelectedMaster(null)}
                className="rounded-xl p-2 text-surface-400 transition-colors hover:bg-surface-700 hover:text-surface-50"
              >
                <X size={18} />
              </button>
            </div>

            {loadingMasterId === selectedMaster.id ? (
              <div className="flex flex-1 items-center justify-center gap-2 text-surface-400">
                <Loader2 size={16} className="animate-spin" />
                {strings.masters.loading}
              </div>
            ) : error ? (
              <div className="flex flex-1 items-center justify-center px-6 text-sm text-red-400">
                {error}
              </div>
            ) : (
              <div className="grid min-h-0 flex-1 gap-0 md:grid-cols-[220px_minmax(0,1fr)]">
                <div className="border-b border-surface-700 p-4 md:border-b-0 md:border-r">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-surface-400">
                    {strings.masters.openingTypes}
                  </div>
                  <div className="flex max-h-full flex-col gap-2 overflow-y-auto">
                    {openingGroups.map(([group, count]) => {
                      const active = group === selectedOpeningGroup;
                      return (
                        <button
                          key={group}
                          onClick={() => setSelectedOpeningGroup(group)}
                          className={[
                            'rounded-xl border px-3 py-2 text-left transition-colors',
                            active
                              ? 'border-accent-500/40 bg-accent-500/10 text-accent-400'
                              : 'border-surface-600 bg-surface-900 text-surface-300 hover:border-surface-500 hover:text-surface-50',
                          ].join(' ')}
                        >
                          <div className="text-sm font-medium">{localizeOpeningGroup(group)}</div>
                          <div className="mt-1 text-[11px] text-surface-400">{count}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="min-h-0 p-4">
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-surface-400">
                    <BookOpen size={12} />
                    {strings.masters.availableGames}
                  </div>

                  <div className="grid max-h-full gap-3 overflow-y-auto pr-1">
                    {visibleGames.length === 0 ? (
                      <div className="rounded-xl border border-surface-700 bg-surface-900 p-4 text-sm text-surface-400">
                        {strings.masters.noGames}
                      </div>
                    ) : (
                      visibleGames.map((game) => (
                        <button
                          key={game.id}
                          onClick={() => void loadGame(game)}
                          disabled={loadingGameId === game.id}
                          title={strings.masters.openGame}
                          className="rounded-2xl border border-surface-700 bg-surface-900 p-4 text-left transition-colors hover:border-accent-400/40 hover:bg-surface-800 disabled:cursor-wait disabled:opacity-70"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-surface-50">
                              {game.white} {strings.app.vs} {game.black}
                            </span>
                            <span className="rounded-full bg-accent-500/10 px-2 py-0.5 text-[11px] text-accent-400">
                              {game.result}
                            </span>
                            {game.eco && (
                              <span className="rounded-full bg-surface-800 px-2 py-0.5 text-[11px] text-surface-300">
                                {game.eco}
                              </span>
                            )}
                          </div>

                          <div className="mt-2 text-xs text-surface-400">
                            {game.event}
                            {game.site ? ` · ${game.site}` : ''}
                            {game.date ? ` · ${game.date}` : ''}
                            {game.round
                              ? language === 'zh'
                                ? ` · 第${game.round}轮`
                                : ` · R${game.round}`
                              : ''}
                          </div>

                          <div className="mt-2 flex items-center justify-between gap-3">
                            <span className="text-xs text-surface-300">
                              {localizeOpeningGroup(game.openingGroup)}
                            </span>
                            {loadingGameId === game.id && (
                              <span className="inline-flex items-center gap-1 text-xs text-accent-400">
                                <Loader2 size={12} className="animate-spin" />
                                {strings.masters.loading}
                              </span>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
