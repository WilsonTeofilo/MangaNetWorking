import { useEffect, useMemo, useState } from 'react';
import { creatorAnalyticsApi, CreatorAnalyticsDto } from '../../api/creatorAnalyticsApi';

export const PERIODS = [
  { days: 7, label: 'Últimos 7 dias' },
  { days: 28, label: 'Últimos 28 dias' },
  { days: 90, label: 'Últimos 90 dias' },
  { days: 180, label: 'Últimos 180 dias' },
] as const;

export type AnalyticsTab = 'overview' | 'content';

export function comparisonDelta(current: number, previous: number | undefined) {
  if (previous === undefined) return null;
  if (previous === 0) {
    return current === 0
      ? { text: 'sem base anterior', tone: 'flat' as const }
      : { text: 'novo no período', tone: 'up' as const };
  }
  const delta = ((current - previous) / previous) * 100;
  return {
    text: `${delta >= 0 ? '+' : ''}${delta.toLocaleString('pt-BR', {
      maximumFractionDigits: 1,
    })}% vs. período anterior`,
    tone: delta > 0 ? ('up' as const) : delta < 0 ? ('down' as const) : ('flat' as const),
  };
}

export function useCreatorAnalyticsData() {
  const [data, setData] = useState<CreatorAnalyticsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<number>(28);
  const [tab, setTab] = useState<AnalyticsTab>('overview');
  const [expandedWork, setExpandedWork] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    creatorAnalyticsApi
      .getAnalytics(days)
      .then((payload) => {
        if (!active) return;
        setData(payload);
        setLoadedAt(new Date());
      })
      .catch(() => {
        if (active) setError('Entre com uma conta de criador para ver os analytics reais.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [days, refreshKey]);

  const works = data?.works ?? [];
  const viewsPerDay = data?.viewsPerDay ?? [];
  const totals = data?.totals ?? null;
  const comparison = data?.comparison ?? null;
  const realtime = data?.viewsLast48Hours ?? [];
  const realtimeTotal = realtime.reduce((sum, hour) => sum + Number(hour.views), 0);

  const contentWorks = useMemo(
    () => works.filter((work) => work.views > 0 || work.chapters.length > 0 || work.impressions > 0),
    [works]
  );

  const viewsDelta = comparisonDelta(totals?.views ?? 0, comparison?.views);
  const readersDelta = comparisonDelta(totals?.uniqueReaders ?? 0, comparison?.uniqueReaders);

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      await creatorAnalyticsApi.downloadCsv(days);
    } catch {
      setExportError('Não foi possível exportar o CSV agora. Tente novamente.');
    } finally {
      setExporting(false);
    }
  };

  const periodPhrase = `nos últimos ${days} dias`;

  return {
    data,
    loading,
    error,
    days,
    setDays,
    tab,
    setTab,
    expandedWork,
    setExpandedWork,
    refreshKey,
    setRefreshKey,
    loadedAt,
    exporting,
    exportError,
    works,
    viewsPerDay,
    totals,
    comparison,
    realtime,
    realtimeTotal,
    contentWorks,
    viewsDelta,
    readersDelta,
    handleExport,
    periodPhrase,
  };
}