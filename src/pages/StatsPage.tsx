import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownUp,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Calendar,
  FileSpreadsheet,
  Filter,
  Flame,
  Layers,
  RotateCcw,
  Search,
  Trophy,
} from 'lucide-react';
import { CO_EXAM_DETAIL_ROWS, CO_EXAM_KP_STATS } from '@/data/coExamStats';
import { SYLLABUS_CHAPTERS } from '@/data/syllabus';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { COExamDetailRow, COExamKPStat } from '@/types/study';

type KpSortKey = 'cumulativeScore' | 'occurrences' | 'comprehensiveCount' | 'coveredYearsCount';
type QuestionTypeFilter = 'ALL' | '选择题' | '综合题';

const SORT_OPTIONS: { key: KpSortKey; label: string }[] = [
  { key: 'cumulativeScore', label: '累计分值' },
  { key: 'occurrences', label: '出现次数' },
  { key: 'comprehensiveCount', label: '大题次数' },
  { key: 'coveredYearsCount', label: '覆盖年份数' },
];

function getHeatmapCellClass(score: number, isSelected: boolean): string {
  const ring = isSelected ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : '';
  if (score === 0) {
    return cn(
      'border-border/40 bg-muted/40 text-muted-foreground/50 hover:bg-muted/70',
      ring,
    );
  }
  if (score <= 4) {
    return cn(
      'border-sky-200 bg-sky-100 text-sky-900 hover:bg-sky-200/80 dark:border-sky-800/60 dark:bg-sky-950/60 dark:text-sky-200 dark:hover:bg-sky-900/70',
      ring,
    );
  }
  if (score <= 9) {
    return cn(
      'border-sky-300 bg-sky-200 text-sky-950 hover:bg-sky-300/80 dark:border-sky-700/70 dark:bg-sky-900/70 dark:text-sky-100 dark:hover:bg-sky-800/80',
      ring,
    );
  }
  if (score <= 14) {
    return cn(
      'border-amber-300 bg-amber-200/85 text-amber-950 hover:bg-amber-300/80 dark:border-amber-700/70 dark:bg-amber-900/65 dark:text-amber-100 dark:hover:bg-amber-800/80',
      ring,
    );
  }
  return cn(
    'border-rose-600 bg-rose-500/90 text-white hover:bg-rose-600 dark:border-rose-500 dark:bg-rose-600/85 dark:text-white dark:hover:bg-rose-500',
    ring,
  );
}

export const StatsPage: React.FC = () => {
  const coChapters = useMemo(
    () => SYLLABUS_CHAPTERS.filter((ch) => ch.subject === 'CO'),
    [],
  );

  const chapterById = useMemo(
    () => Object.fromEntries(coChapters.map((c) => [c.id, c])),
    [coChapters],
  );

  const allYears = useMemo(() => {
    const unique = Array.from(new Set(CO_EXAM_DETAIL_ROWS.map((r) => r.year)));
    return unique.sort((a, b) => a - b);
  }, []);

  const topKp = useMemo(() => {
    return [...CO_EXAM_KP_STATS].sort((a, b) => b.cumulativeScore - a.cumulativeScore)[0];
  }, []);

  const [chapterFilter, setChapterFilter] = useState<'ALL' | string>('ALL');
  const [kpSearch, setKpSearch] = useState('');
  const [sortKey, setSortKey] = useState<KpSortKey>('cumulativeScore');
  const [sortAsc, setSortAsc] = useState(false);

  const [yearOrderDesc, setYearOrderDesc] = useState(false);
  const [inspectorYear, setInspectorYear] = useState<'ALL' | number>(2026);
  const [inspectorChapter, setInspectorChapter] = useState<'ALL' | string>('ALL');
  const [inspectorType, setInspectorType] = useState<QuestionTypeFilter>('ALL');

  // 7-chapter CO distribution summary
  const chapterSummaries = useMemo(() => {
    return coChapters.map((ch) => {
      const matchingRows = CO_EXAM_DETAIL_ROWS.filter((r) => r.chapterIds.includes(ch.id));
      const totalScore = matchingRows.reduce((sum, r) => sum + r.score, 0);
      const choiceCount = matchingRows.filter((r) => r.questionType === '选择题').length;
      const compCount = matchingRows.filter((r) => r.questionType === '综合题').length;
      const kpCount = CO_EXAM_KP_STATS.filter((kp) => kp.chapterId === ch.id).length;
      return {
        chapter: ch,
        totalScore,
        occurrences: matchingRows.length,
        choiceCount,
        compCount,
        kpCount,
      };
    });
  }, [coChapters]);

  const maxChapterScore = useMemo(
    () => Math.max(...chapterSummaries.map((item) => item.totalScore), 1),
    [chapterSummaries],
  );

  const totalUniqueDetailScore = useMemo(
    () => CO_EXAM_DETAIL_ROWS.reduce((sum, r) => sum + r.score, 0),
    [],
  );

  // Filtered & sorted 31 KP stats
  const filteredKps = useMemo<COExamKPStat[]>(() => {
    const q = kpSearch.trim().toLowerCase();
    const list = CO_EXAM_KP_STATS.filter((row) => {
      if (chapterFilter !== 'ALL' && row.chapterId !== chapterFilter) return false;
      if (q && !row.kpName.toLowerCase().includes(q) && !row.chapterId.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
    return list.sort((a, b) => {
      const diff = b[sortKey] - a[sortKey];
      if (diff !== 0) return sortAsc ? -diff : diff;
      return b.cumulativeScore - a.cumulativeScore;
    });
  }, [chapterFilter, kpSearch, sortAsc, sortKey]);

  const maxKpMetricValue = useMemo(() => {
    return Math.max(...CO_EXAM_KP_STATS.map((row) => row[sortKey]), 1);
  }, [sortKey]);

  // Matrix lookup: cell[year][chapterId] -> { score, count, compCount }
  const matrixData = useMemo(() => {
    const map = new Map<string, { score: number; count: number; compCount: number }>();
    const yearTotals = new Map<number, { score: number; count: number }>();

    for (const row of CO_EXAM_DETAIL_ROWS) {
      const yPrev = yearTotals.get(row.year) ?? { score: 0, count: 0 };
      yearTotals.set(row.year, { score: yPrev.score + row.score, count: yPrev.count + 1 });

      for (const cid of row.chapterIds) {
        const key = `${row.year}-${cid}`;
        const prev = map.get(key) ?? { score: 0, count: 0, compCount: 0 };
        map.set(key, {
          score: prev.score + row.score,
          count: prev.count + 1,
          compCount: prev.compCount + (row.questionType === '综合题' ? 1 : 0),
        });
      }
    }
    return { map, yearTotals };
  }, []);

  const displayedYears = useMemo(
    () => (yearOrderDesc ? [...allYears].reverse() : allYears),
    [allYears, yearOrderDesc],
  );

  // Filtered detail rows for inspector
  const inspectedRows = useMemo<COExamDetailRow[]>(() => {
    return CO_EXAM_DETAIL_ROWS.filter((row) => {
      if (inspectorYear !== 'ALL' && row.year !== inspectorYear) return false;
      if (inspectorChapter !== 'ALL' && !row.chapterIds.includes(inspectorChapter)) return false;
      if (inspectorType !== 'ALL' && row.questionType !== inspectorType) return false;
      return true;
    });
  }, [inspectorChapter, inspectorType, inspectorYear]);

  const inspectedSummary = useMemo(() => {
    const totalScore = inspectedRows.reduce((sum, r) => sum + r.score, 0);
    const choiceCount = inspectedRows.filter((r) => r.questionType === '选择题').length;
    const compCount = inspectedRows.filter((r) => r.questionType === '综合题').length;
    return { totalScore, choiceCount, compCount };
  }, [inspectedRows]);

  const handleSelectChapterSummary = (cid: string) => {
    const next = chapterFilter === cid ? 'ALL' : cid;
    setChapterFilter(next);
    setInspectorChapter(next);
  };

  const handleSortClick = (key: KpSortKey) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const handleInspectCell = (year: number, cid: string) => {
    if (inspectorYear === year && inspectorChapter === cid) {
      setInspectorChapter('ALL');
    } else {
      setInspectorYear(year);
      setInspectorChapter(cid);
    }
  };

  const handleInspectYearRow = (year: number) => {
    if (inspectorYear === year && inspectorChapter === 'ALL') {
      setInspectorYear('ALL');
    } else {
      setInspectorYear(year);
      setInspectorChapter('ALL');
    }
  };

  const handleInspectChapterCol = (cid: string) => {
    if (inspectorChapter === cid && inspectorYear === 'ALL') {
      setInspectorChapter('ALL');
      setChapterFilter('ALL');
    } else {
      setInspectorYear('ALL');
      setInspectorChapter(cid);
      setChapterFilter(cid);
    }
  };

  return (
    <div className="space-y-8 pb-14">
      {/* Header Banner */}
      <section className="rounded-2xl border bg-gradient-to-br from-card via-card to-sky-500/5 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default" className="gap-1">
                <BarChart3 className="h-3.5 w-3.5" />
                <span>408 计组 18 年真题数据引擎</span>
              </Badge>
              <Badge variant="outline" className="font-mono text-xs">
                2009–2026 · 31 KPs · 235 Rows
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              计算机组成原理 2009–2026 真题热力统计与考点透视
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              基于 18 年真题 235 条逐题明细与 31 个官方考纲核心考点口径，量化各章节分值权重、大题命题规律与跨章联动频率，点击任意章节条或热力格子即可反查原题号与分值分布。
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/notes/CO/CO-03">
                <BookOpen className="h-4 w-4" />
                <span>直达第一高地 · 存储系统</span>
              </Link>
            </Button>
            <Button asChild>
              <Link to="/practice">
                <Flame className="h-4 w-4" />
                <span>进入实战刷题</span>
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Top KPI Strip */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-sky-500" />
              <span>真题覆盖跨度</span>
            </CardDescription>
            <CardTitle className="font-mono text-2xl">
              {allYears.length} <span className="text-sm font-normal text-muted-foreground">年</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              完整收录 {allYears[0]}–{allYears[allYears.length - 1]} 年全部 408 计组真题
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-violet-500" />
              <span>官方计组核心考点</span>
            </CardDescription>
            <CardTitle className="font-mono text-2xl">
              {CO_EXAM_KP_STATS.length}{' '}
              <span className="text-sm font-normal text-muted-foreground">个考点</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              横向覆盖第 1～7 章全考纲高频/冷门原子主题
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
              <span>逐题真题明细记录</span>
            </CardDescription>
            <CardTitle className="font-mono text-2xl">
              {CO_EXAM_DETAIL_ROWS.length}{' '}
              <span className="text-sm font-normal text-muted-foreground">条</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              逐题独立计分累计 <span className="font-mono font-semibold text-foreground">{totalUniqueDetailScore}</span> 分
            </p>
          </CardContent>
        </Card>

        <Card className="border-rose-500/30 bg-rose-500/5">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
              <Trophy className="h-3.5 w-3.5" />
              <span>18 年累计分值榜首考点</span>
            </CardDescription>
            <CardTitle className="flex items-baseline justify-between gap-2 text-lg">
              <Link
                to={`/notes/CO/${topKp.chapterId}`}
                className="truncate hover:text-primary hover:underline"
              >
                {topKp.kpName}
              </Link>
              <span className="shrink-0 font-mono text-xl font-bold text-rose-600 dark:text-rose-400">
                {topKp.cumulativeScore} 分
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              共现 <span className="font-mono font-semibold text-foreground">{topKp.occurrences}</span> 次（
              {topKp.choiceCount} 选 / {topKp.comprehensiveCount} 大题）· 覆盖{' '}
              <span className="font-mono font-semibold text-foreground">{topKp.coveredYearsCount}</span> 年
            </p>
          </CardContent>
        </Card>
      </section>

      {/* 7-Chapter CO Distribution Clickable Summary Bars */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span>计组 7 章真题分值分布（点击章节条联动筛选下方榜单与明细）</span>
              </CardTitle>
              <CardDescription className="text-xs">
                分值按各章涉及真题（含跨章联动题）统计；再次点击同一章节条可取消筛选
              </CardDescription>
            </div>
            {chapterFilter !== 'ALL' && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setChapterFilter('ALL');
                  setInspectorChapter('ALL');
                }}
                className="h-8 gap-1.5 text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>重置章节筛选 ({chapterFilter})</span>
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-1">
          {chapterSummaries.map(({ chapter, totalScore, occurrences, choiceCount, compCount, kpCount }) => {
            const isSelected = chapterFilter === chapter.id;
            const pct = Math.round((totalScore / maxChapterScore) * 100);
            return (
              <button
                key={chapter.id}
                type="button"
                onClick={() => handleSelectChapterSummary(chapter.id)}
                aria-pressed={isSelected}
                className={cn(
                  'group flex w-full flex-col gap-2 rounded-xl border bg-background px-4 py-3 text-left transition-all hover:border-primary/50 hover:bg-accent/35 xl:flex-row xl:items-center xl:gap-4',
                  isSelected && 'border-primary bg-primary/5 ring-1 ring-primary',
                )}
              >
                <div className="flex min-w-0 items-center justify-between gap-2 xl:w-64 xl:shrink-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <Badge
                      variant={
                        chapter.tier === 'S' ? 'danger' : chapter.tier === 'A' ? 'warning' : 'info'
                      }
                      className="shrink-0 font-mono text-[11px]"
                    >
                      {chapter.id}
                    </Badge>
                    <span className="truncate text-sm font-semibold group-hover:text-primary">
                      {chapter.code} {chapter.title}
                    </span>
                  </div>
                </div>

                <div className="flex-1">
                  <Progress
                    value={pct}
                    className={cn('h-2.5', isSelected && 'bg-primary/20')}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 text-xs xl:w-80 xl:shrink-0 xl:justify-end">
                  <span className="font-mono text-muted-foreground">
                    {kpCount} 考点 · {occurrences} 题次 ({choiceCount}选/{compCount}大)
                  </span>
                  <span className="font-mono text-sm font-bold text-foreground">
                    {totalScore} 分
                  </span>
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Interactive 31 Core KP High-Frequency Ranking Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <Flame className="h-4 w-4 text-rose-500" />
                <span>31 核心考点高频统计表</span>
                <Badge variant="outline" className="font-mono text-xs">
                  显示 {filteredKps.length} / {CO_EXAM_KP_STATS.length}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                支持按章节筛选、关键字检索及按「累计分值 / 出现次数 / 大题次数 / 覆盖年份数」多维排序；点击年份标签可快速定位该年真题
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={kpSearch}
                  onChange={(e) => setKpSearch(e.target.value)}
                  placeholder="搜索考点名称..."
                  className="h-8 pl-8 text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-muted/40 p-1">
                {SORT_OPTIONS.map((opt) => {
                  const active = sortKey === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => handleSortClick(opt.key)}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                        active
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <span>{opt.label}</span>
                      {active && (
                        <ArrowDownUp className="h-3 w-3 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Chapter Filter Chips */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-1">
            <span className="mr-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              <span>章节：</span>
            </span>
            <Button
              type="button"
              size="sm"
              variant={chapterFilter === 'ALL' ? 'default' : 'outline'}
              onClick={() => setChapterFilter('ALL')}
              className="h-7 px-2.5 text-xs"
            >
              全部 7 章
            </Button>
            {coChapters.map((ch) => (
              <Button
                key={ch.id}
                type="button"
                size="sm"
                variant={chapterFilter === ch.id ? 'default' : 'outline'}
                onClick={() => setChapterFilter(ch.id)}
                className="h-7 px-2.5 text-xs"
              >
                {ch.id} {ch.title}
              </Button>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {filteredKps.length === 0 ? (
            <div className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
              当前筛选条件下暂无匹配的核心考点。
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredKps.map((row, idx) => {
                const chapter = chapterById[row.chapterId];
                const barPct = Math.round((row[sortKey] / maxKpMetricValue) * 100);
                return (
                  <div
                    key={row.kpName}
                    className="rounded-xl border bg-background p-3.5 transition-colors hover:border-primary/40"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex h-5 w-6 items-center justify-center rounded bg-muted font-mono text-[11px] font-semibold text-muted-foreground">
                            #{idx + 1}
                          </span>
                          <span className="text-sm font-semibold text-foreground">
                            {row.kpName}
                          </span>
                          <Badge variant="outline" className="font-mono text-[11px]">
                            {row.chapterId} {chapter ? chapter.code : ''}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3">
                          <Progress value={barPct} className="h-2 max-w-md flex-1" />
                          <span className="font-mono text-xs text-muted-foreground">
                            {sortKey === 'cumulativeScore' && `${row.cumulativeScore} 分`}
                            {sortKey === 'occurrences' && `${row.occurrences} 次`}
                            {sortKey === 'comprehensiveCount' && `${row.comprehensiveCount} 次大题`}
                            {sortKey === 'coveredYearsCount' && `${row.coveredYearsCount} 年`}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1">
                          <span className="mr-1 text-[11px] text-muted-foreground">考查年份：</span>
                          {row.years.map((y) => (
                            <button
                              key={y}
                              type="button"
                              onClick={() => {
                                setInspectorYear(y);
                                setInspectorChapter(row.chapterId);
                              }}
                              title={`点击查看 ${y} 年 ${row.chapterId} 真题明细`}
                              className={cn(
                                'rounded border px-1.5 py-0.5 font-mono text-[10px] transition-colors',
                                inspectorYear === y &&
                                  (inspectorChapter === 'ALL' || inspectorChapter === row.chapterId)
                                  ? 'border-primary bg-primary/15 font-semibold text-primary'
                                  : 'bg-muted/50 text-muted-foreground hover:border-primary/50 hover:text-foreground',
                              )}
                            >
                              {y}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 border-t pt-2.5 lg:border-t-0 lg:pt-0">
                        <div className="grid grid-cols-4 gap-2 rounded-lg border bg-muted/25 px-3 py-1.5 text-center font-mono text-xs">
                          <div>
                            <div className="text-[10px] text-muted-foreground">累计分</div>
                            <div className="font-bold text-primary">{row.cumulativeScore}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-muted-foreground">出现</div>
                            <div className="font-semibold">
                              {row.occurrences}
                              <span className="text-[10px] font-normal text-muted-foreground">
                                ({row.choiceCount}选)
                              </span>
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-muted-foreground">大题</div>
                            <div
                              className={cn(
                                'font-semibold',
                                row.comprehensiveCount > 0 && 'text-rose-600 dark:text-rose-400',
                              )}
                            >
                              {row.comprehensiveCount}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-muted-foreground">年份</div>
                            <div className="font-semibold">{row.coveredYearsCount}/18</div>
                          </div>
                        </div>

                        <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
                          <Link to={`/notes/CO/${row.chapterId}`}>
                            <span>精讲笔记</span>
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Interactive 18 Years x 7 Chapters Heatmap Matrix */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-sky-500" />
                <span>2009–2026 计组真题 18 年 × 7 章得分热力矩阵</span>
              </CardTitle>
              <CardDescription className="text-xs">
                点击任意单元格查看该年该章原题明细；点击左侧年份或顶部章节列头可按单年或单章展开全量检索
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setYearOrderDesc((v) => !v)}
                className="h-8 gap-1.5 text-xs"
              >
                <ArrowDownUp className="h-3.5 w-3.5" />
                <span>{yearOrderDesc ? '2026 → 2009 倒序' : '2009 → 2026 正序'}</span>
              </Button>
            </div>
          </div>

          {/* Heatmap Legend */}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span>热力图例（该年该章分值）：</span>
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-4 rounded border border-border/40 bg-muted/40" /> 0 分
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-4 rounded border border-sky-200 bg-sky-100 dark:border-sky-800 dark:bg-sky-950/60" /> 1–4 分
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-4 rounded border border-sky-300 bg-sky-200 dark:border-sky-700 dark:bg-sky-900/70" /> 5–9 分
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-4 rounded border border-amber-300 bg-amber-200/85 dark:border-amber-700 dark:bg-amber-900/65" /> 10–14 分
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-4 rounded border border-rose-600 bg-rose-500/90 dark:border-rose-500 dark:bg-rose-600/85" /> 15+ 分（大题主战场）
            </span>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[740px] border-collapse text-xs">
              <thead>
                <tr className="border-b bg-muted/60">
                  <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">
                    年份
                  </th>
                  {coChapters.map((ch) => {
                    const activeCol = inspectorChapter === ch.id;
                    return (
                      <th key={ch.id} className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleInspectChapterCol(ch.id)}
                          className={cn(
                            'inline-flex flex-col items-center rounded-md px-2 py-1 transition-colors hover:bg-accent',
                            activeCol && 'bg-primary/15 text-primary',
                          )}
                        >
                          <span className="font-mono text-[11px] font-bold">{ch.id}</span>
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {ch.title.slice(0, 4)}
                          </span>
                        </button>
                      </th>
                    );
                  })}
                  <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground">
                    年度合计
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedYears.map((year) => {
                  const yTotal = matrixData.yearTotals.get(year) ?? { score: 0, count: 0 };
                  const isYearActive = inspectorYear === year;
                  return (
                    <tr
                      key={year}
                      className={cn(
                        'border-b last:border-b-0 transition-colors',
                        isYearActive ? 'bg-primary/5' : 'hover:bg-muted/20',
                      )}
                    >
                      <td className="px-3 py-1.5">
                        <button
                          type="button"
                          onClick={() => handleInspectYearRow(year)}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-xs font-semibold transition-colors hover:bg-accent',
                            isYearActive && inspectorChapter === 'ALL'
                              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                              : isYearActive
                                ? 'bg-primary/15 text-primary'
                                : 'text-foreground',
                          )}
                        >
                          <span>{year}</span>
                        </button>
                      </td>

                      {coChapters.map((ch) => {
                        const cell = matrixData.map.get(`${year}-${ch.id}`) ?? {
                          score: 0,
                          count: 0,
                          compCount: 0,
                        };
                        const isCellSelected =
                          inspectorYear === year && inspectorChapter === ch.id;
                        return (
                          <td key={ch.id} className="px-1.5 py-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleInspectCell(year, ch.id)}
                              title={`${year} 年 ${ch.id} ${ch.title}：${cell.score} 分（${cell.count} 题，含 ${cell.compCount} 道大题）`}
                              className={cn(
                                'flex h-9 w-full items-center justify-center gap-1 rounded-lg border font-mono text-xs font-semibold transition-all',
                                getHeatmapCellClass(cell.score, isCellSelected),
                              )}
                            >
                              <span>{cell.score > 0 ? cell.score : '—'}</span>
                              {cell.compCount > 0 && (
                                <span
                                  className={cn(
                                    'rounded px-1 text-[9px] font-bold',
                                    cell.score >= 15
                                      ? 'bg-white/20 text-white'
                                      : 'bg-foreground/10 text-current',
                                  )}
                                >
                                  大
                                </span>
                              )}
                            </button>
                          </td>
                        );
                      })}

                      <td className="px-3 py-1.5 text-right font-mono text-xs">
                        <span className="font-bold text-foreground">{yTotal.score}</span>
                        <span className="ml-1 text-[10px] text-muted-foreground">
                          ({yTotal.count}题)
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            注：标记「大」的格子表示该年该章命制了综合应用大题；个别跨章综合题/选择题会同时计入其关联章节列（行末「年度合计」为当年去重真题实得总分）。
          </p>
        </CardContent>
      </Card>

      {/* Clickable Detail Inspector */}
      <Card className="border-primary/25">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                <span>真题逐题明细检视器（CO_EXAM_DETAIL_ROWS）</span>
                <Badge variant="default" className="font-mono text-xs">
                  {inspectorYear === 'ALL' ? '2009–2026 全部年份' : `${inspectorYear} 年`}
                </Badge>
                <Badge variant="outline" className="font-mono text-xs">
                  {inspectorChapter === 'ALL'
                    ? '全部 7 章'
                    : `${inspectorChapter} ${chapterById[inspectorChapter]?.title ?? ''}`}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                共命中 <strong className="font-mono text-foreground">{inspectedRows.length}</strong> 条记录 · 合计{' '}
                <strong className="font-mono text-primary">{inspectedSummary.totalScore}</strong> 分（选择题{' '}
                {inspectedSummary.choiceCount} 题 · 综合题 {inspectedSummary.compCount} 题）
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
                {(['ALL', '选择题', '综合题'] as QuestionTypeFilter[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setInspectorType(t)}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                      inspectorType === t
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {t === 'ALL' ? '全部题型' : t}
                  </button>
                ))}
              </div>

              {(inspectorYear !== 'ALL' ||
                inspectorChapter !== 'ALL' ||
                inspectorType !== 'ALL') && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setInspectorYear('ALL');
                    setInspectorChapter('ALL');
                    setInspectorType('ALL');
                  }}
                  className="h-8 text-xs"
                >
                  查看全部 {CO_EXAM_DETAIL_ROWS.length} 条
                </Button>
              )}
            </div>
          </div>

          {/* Quick Year & Chapter Selectors inside Inspector */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t pt-3">
            <span className="mr-1 text-xs text-muted-foreground">快速选年：</span>
            <button
              type="button"
              onClick={() => setInspectorYear('ALL')}
              className={cn(
                'rounded-md border px-2 py-0.5 font-mono text-[11px] transition-colors',
                inspectorYear === 'ALL'
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:text-foreground',
              )}
            >
              全部
            </button>
            {allYears.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setInspectorYear(y)}
                className={cn(
                  'rounded-md border px-2 py-0.5 font-mono text-[11px] transition-colors',
                  inspectorYear === y
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:text-foreground',
                )}
              >
                {y}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {inspectedRows.length === 0 ? (
            <div className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
              该筛选组合下无真题记录（例如当年该章未独立命题），请尝试切换年份、章节或点击「查看全部」。
            </div>
          ) : (
            <div className="max-h-[460px] overflow-auto rounded-xl border">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead className="sticky top-0 z-10 border-b bg-muted/95 text-left text-xs font-semibold text-muted-foreground backdrop-blur-sm">
                  <tr>
                    <th className="px-3.5 py-2.5">年份</th>
                    <th className="px-3.5 py-2.5">题号</th>
                    <th className="px-3.5 py-2.5">题型</th>
                    <th className="px-3.5 py-2.5">分值</th>
                    <th className="px-3.5 py-2.5">考点与关联章节</th>
                  </tr>
                </thead>
                <tbody>
                  {inspectedRows.map((row, idx) => (
                    <tr
                      key={`${row.year}-${row.questionNo}-${idx}`}
                      className="border-b last:border-b-0 hover:bg-muted/30"
                    >
                      <td className="px-3.5 py-2.5 font-mono text-xs font-semibold">
                        {row.year}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-xs">
                        第 {row.questionNo} 题
                      </td>
                      <td className="px-3.5 py-2.5">
                        <Badge
                          variant={row.questionType === '综合题' ? 'danger' : 'info'}
                          className="text-[11px]"
                        >
                          {row.questionType}
                        </Badge>
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-xs font-bold text-primary">
                        {row.score} 分
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-medium text-foreground">
                            {row.kpName}
                          </span>
                          <div className="flex flex-wrap items-center gap-1">
                            {row.chapterIds.map((cid) => (
                              <Link
                                key={cid}
                                to={`/notes/CO/${cid}`}
                                className="inline-flex items-center gap-0.5 rounded border bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                              >
                                <span>{cid}</span>
                                <ArrowUpRight className="h-2.5 w-2.5" />
                              </Link>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
