import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  ClipboardCheck,
  Flame,
  GitMerge,
  Layers,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  CROSS_SUBJECT_LINKS,
  SUBJECT_META,
  SUBJECT_ORDER,
  SYLLABUS_CHAPTERS,
  getChaptersBySubject,
} from '@/data/syllabus';
import { CO_EXAM_KP_STATS } from '@/data/coExamStats';
import { ALL_QUESTIONS, getQuestionsByChapter } from '@/data/questions';
import { useStudyStore } from '@/store/useStudyStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { SubjectId, Tier } from '@/types/study';

export const DashboardPage: React.FC = () => {
  const { progress, toggleChapterDone, toggleKpDone } = useStudyStore();
  const [subjectFilter, setSubjectFilter] = useState<'ALL' | SubjectId>('ALL');
  const [tierFilter, setTierFilter] = useState<'ALL' | Tier>('ALL');
  const [searchText, setSearchText] = useState('');
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({
    'CO-03': true,
    'CO-05': true,
  });

  const totalChapters = SYLLABUS_CHAPTERS.length;
  const completedChaptersCount = SYLLABUS_CHAPTERS.filter((c) => progress.completedChapters[c.id]).length;

  const allKps = useMemo(() => SYLLABUS_CHAPTERS.flatMap((c) => c.knowledgePoints), []);
  const completedKpsCount = allKps.filter((kp) => progress.completedKps[kp.kpId]).length;

  const attemptedEntries = Object.values(progress.attempts);
  const attemptedCount = attemptedEntries.length;
  const totalCorrect = attemptedEntries.filter((a) => a.lastIsCorrect).length;
  const accuracyPct = attemptedCount > 0 ? Math.round((totalCorrect / attemptedCount) * 100) : 0;

  const wrongBookCount = Object.keys(progress.wrongBook).length;

  const topCoStats = useMemo(
    () => [...CO_EXAM_KP_STATS].sort((a, b) => b.cumulativeScore - a.cumulativeScore).slice(0, 8),
    [],
  );

  const filteredChapters = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return SYLLABUS_CHAPTERS.filter((ch) => {
      if (subjectFilter !== 'ALL' && ch.subject !== subjectFilter) return false;
      if (tierFilter !== 'ALL' && ch.tier !== tierFilter) return false;
      if (!q) return true;
      const haystack = `${ch.id} ${ch.title} ${ch.tierLabel} ${ch.syllabusItems.join(' ')} ${ch.knowledgePoints
        .map((k) => `${k.title} ${k.corePrinciple}`)
        .join(' ')}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [searchText, subjectFilter, tierFilter]);

  const toggleExpandChapter = (chapterId: string) => {
    setExpandedChapters((prev) => ({ ...prev, [chapterId]: !prev[chapterId] }));
  };

  const getTierBadgeVariant = (tier: Tier) => {
    if (tier === 'S') return 'danger' as const;
    if (tier === 'A') return 'warning' as const;
    return 'info' as const;
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Workbench Hero */}
      <section className="rounded-2xl border bg-gradient-to-br from-card via-card to-sky-500/5 p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default" className="gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                <span>2027 考研 11408 开源备考工作台</span>
              </Badge>
              <Badge variant="outline" className="font-mono text-xs">
                四科 26 章全精讲 + {ALL_QUESTIONS.length} 题全贯通
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              四科考纲全景矩阵与交互式备考控制台
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              紧扣 11408 四科考纲与 2009–2026 真题命题规律，整合 DS/CO/OS/CN 全 26 章精讲、KaTeX 公式与 Mermaid 图谱、王道模拟/真题同源/跨科变式题库及本地错题本。
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Button asChild>
              <Link to="/notes/CO/CO-03">
                <BookOpen className="h-4 w-4" />
                <span>精讲笔记 · 存储系统</span>
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/practice">
                <ClipboardCheck className="h-4 w-4" />
                <span>进入刷题 / 模考</span>
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link to="/stats">
                <BarChart3 className="h-4 w-4" />
                <span>18 年真题统计</span>
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Top KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>四科考纲章节进度</CardDescription>
            <CardTitle className="font-mono text-2xl">
              {completedChaptersCount} <span className="text-sm font-normal text-muted-foreground">/ {totalChapters} 章</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress value={(completedChaptersCount / totalChapters) * 100} />
            <p className="text-xs text-muted-foreground">覆盖 DS(8) / CO(7) / OS(5) / CN(6) 全 26 章精讲</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>原子核心考点打卡</CardDescription>
            <CardTitle className="font-mono text-2xl">
              {completedKpsCount} <span className="text-sm font-normal text-muted-foreground">/ {allKps.length} 项</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress value={allKps.length > 0 ? (completedKpsCount / allKps.length) * 100 : 0} />
            <p className="text-xs text-muted-foreground">展开下方章节即可逐项核销考纲原子点</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>交互题库已刷与正确率</CardDescription>
            <CardTitle className="font-mono text-2xl">
              {attemptedCount}{' '}
              <span className="text-sm font-normal text-muted-foreground">/ {ALL_QUESTIONS.length} 题</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress value={attemptedCount > 0 ? accuracyPct : 0} />
            <p className="text-xs text-muted-foreground">
              当前近一次作答正确/自评达标率：<span className="font-mono font-semibold text-foreground">{accuracyPct}%</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>个人错题本与备份</CardDescription>
            <CardTitle className="font-mono text-2xl text-rose-600 dark:text-rose-400">
              {wrongBookCount} <span className="text-sm font-normal text-muted-foreground">道待攻克</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted-foreground">已保存本地 localStorage</span>
            <Link
              to="/wrong-book"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <span>去重练 / 导出</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Four Subject Summary Strip */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {SUBJECT_ORDER.map((subjId) => {
          const meta = SUBJECT_META[subjId];
          const chs = getChaptersBySubject(subjId);
          const doneCh = chs.filter((c) => progress.completedChapters[c.id]).length;
          const pct = Math.round((doneCh / chs.length) * 100);
          return (
            <Card
              key={subjId}
              className={cn(
                'transition-all hover:border-primary/40',
                subjectFilter === subjId && 'border-primary ring-1 ring-primary/30',
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge className={meta.badgeClass}>{meta.scoreShare} 分占比</Badge>
                  <span className="font-mono text-xs text-muted-foreground">{chs.length} 章</span>
                </div>
                <CardTitle className="pt-1 text-base">{meta.name}</CardTitle>
                <CardDescription className="text-xs">
                  单选 {meta.mcqRange} · 大题 {meta.comprehensiveRange}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {meta.description}
                </p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">完成 {doneCh}/{chs.length}</span>
                    <span className="font-mono font-medium">{pct}%</span>
                  </div>
                  <Progress value={pct} />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={subjectFilter === subjId ? 'default' : 'outline'}
                    className="h-7 flex-1 text-xs"
                    onClick={() => setSubjectFilter((prev) => (prev === subjId ? 'ALL' : subjId))}
                  >
                    {subjectFilter === subjId ? '显示全部科目' : '筛选本科章节'}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" asChild>
                    <Link to={`/notes/${subjId}/${chs[0].id}`}>进入</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {/* Main 26-Chapter Syllabus Matrix */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold">全科 26 章考纲全景矩阵</h2>
            <div className="ml-1 flex flex-wrap gap-1">
              {(['ALL', 'CO', 'DS', 'OS', 'CN'] as const).map((tab) => (
                <Button
                  key={tab}
                  type="button"
                  size="sm"
                  variant={subjectFilter === tab ? 'default' : 'ghost'}
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setSubjectFilter(tab)}
                >
                  {tab === 'ALL' ? '全部' : SUBJECT_META[tab].shortName}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-lg border bg-background p-0.5">
              {(['ALL', 'S', 'A', 'B'] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setTierFilter(tier)}
                  className={cn(
                    'rounded-md px-2 py-1 text-xs font-medium transition-colors',
                    tierFilter === tier ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {tier === 'ALL' ? '全级别' : `${tier}级`}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-56">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="过滤章节/知识点..."
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {filteredChapters.map((chapter) => {
            const subj = SUBJECT_META[chapter.subject];
            const isChapterDone = Boolean(progress.completedChapters[chapter.id]);
            const isExpanded = Boolean(expandedChapters[chapter.id]);
            const doneKps = chapter.knowledgePoints.filter((k) => progress.completedKps[k.kpId]).length;
            const chapterQuestions = getQuestionsByChapter(chapter.id);

            return (
              <Card key={chapter.id} className="overflow-hidden transition-colors hover:border-border/90">
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => toggleChapterDone(chapter.id)}
                      className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-primary"
                      aria-label={`标记 ${chapter.id} ${chapter.title} 完成状态`}
                    >
                      {isChapterDone ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </button>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={subj.badgeClass}>{subj.shortName}</Badge>
                        <span className="font-mono text-xs text-muted-foreground">{chapter.id}</span>
                        <Link
                          to={`/notes/${chapter.subject}/${chapter.id}`}
                          className={cn(
                            'text-base font-semibold hover:text-primary hover:underline',
                            isChapterDone && 'text-muted-foreground line-through',
                          )}
                        >
                          {chapter.code} · {chapter.title}
                        </Link>
                        <Badge variant={getTierBadgeVariant(chapter.tier)}>
                          {chapter.tier}级 · {chapter.tierLabel}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          2009–2026 真题提及：<strong className="text-foreground">{chapter.realExamCount2009to2026}</strong> 次 /{' '}
                          <strong className="text-foreground">{chapter.realExamScore2009to2026}</strong> 分
                        </span>
                        <span>
                          原子考点：<strong className="font-mono text-foreground">{doneKps}/{chapter.knowledgePoints.length}</strong>
                        </span>
                        {chapter.hasFullNotes ? (
                          <Badge variant="success" className="text-[11px]">
                            精讲全稿 + {chapterQuestions.length} 题
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[11px]">
                            考纲骨架可扩展
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pl-8 sm:pl-0">
                    <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
                      <Link to={`/notes/${chapter.subject}/${chapter.id}`}>
                        {chapter.hasFullNotes ? '阅读笔记' : '查看考纲'}
                      </Link>
                    </Button>
                    {chapterQuestions.length > 0 && (
                      <Button size="sm" variant="secondary" className="h-8 text-xs" asChild>
                        <Link to={`/practice?chapter=${chapter.id}`}>刷本章题 ({chapterQuestions.length})</Link>
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs"
                      onClick={() => toggleExpandChapter(chapter.id)}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="space-y-4 border-t bg-muted/20 p-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          官方考纲覆盖范围
                        </h4>
                        <ul className="space-y-1 text-xs leading-relaxed text-foreground/90">
                          {chapter.syllabusItems.map((item) => (
                            <li key={item} className="flex items-start gap-2">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          高频重难点 &amp; 防踩坑警示
                        </h4>
                        <ul className="space-y-1 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                          {chapter.traps.map((trap) => (
                            <li key={trap} className="flex items-start gap-2">
                              <span className="font-mono font-bold">!</span>
                              <span>{trap}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        原子核心考点打卡清单
                      </h4>
                      <div className="grid gap-2 md:grid-cols-2">
                        {chapter.knowledgePoints.map((kp) => {
                          const kpDone = Boolean(progress.completedKps[kp.kpId]);
                          return (
                            <div
                              key={kp.kpId}
                              onClick={() => toggleKpDone(kp.kpId)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  toggleKpDone(kp.kpId);
                                }
                              }}
                              className={cn(
                                'flex cursor-pointer items-start gap-2.5 rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/40',
                                kpDone && 'border-emerald-500/35 bg-emerald-500/5',
                              )}
                            >
                              {kpDone ? (
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                              ) : (
                                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                              )}
                              <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-xs font-semibold">{kp.title}</span>
                                  {kp.realExamCount && (
                                    <Badge variant="outline" className="font-mono text-[10px]">
                                      考 {kp.realExamCount} 次 / {kp.realExamScore} 分
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[11px] leading-relaxed text-muted-foreground">
                                  {kp.corePrinciple}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      {/* Bottom Dual Panels: Top CO Exam KPs + Cross-Subject Architecture */}
      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Flame className="h-4 w-4 text-rose-500" />
                <span>计组 2009–2026 高频考点分值榜 Top 8</span>
              </CardTitle>
              <CardDescription className="text-xs">直接统计自 18 年真题 235 条考点明细数据集</CardDescription>
            </div>
            <Button size="sm" variant="ghost" className="text-xs" asChild>
              <Link to="/stats">完整榜单 →</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {topCoStats.map((item) => {
              const pct = Math.round((item.cumulativeScore / topCoStats[0].cumulativeScore) * 100);
              return (
                <div key={item.kpName} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <Link
                      to={`/notes/CO/${item.chapterId}`}
                      className="font-medium hover:text-primary hover:underline"
                    >
                      {item.kpName}
                    </Link>
                    <span className="font-mono text-muted-foreground">
                      <strong className="text-foreground">{item.cumulativeScore}</strong> 分 · {item.occurrences} 次（{item.choiceCount}选/{item.comprehensiveCount}大）
                    </span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <GitMerge className="h-4 w-4 text-violet-500" />
              <span>跨学科全链路贯通专题（408 压轴突破点）</span>
            </CardTitle>
            <CardDescription className="text-xs">串联计组硬件通路、OS 内核机制与计网/算法底层</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2.5 sm:grid-cols-2">
            {CROSS_SUBJECT_LINKS.map((link) => (
              <Link
                key={link.id}
                to={`/notes/${link.anchorChapterId.slice(0, 2)}/${link.anchorChapterId}`}
                className="rounded-xl border bg-muted/20 p-3 transition-colors hover:border-primary/40 hover:bg-accent/40"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-semibold text-primary">{link.id}</span>
                  <div className="flex gap-1">
                    {link.subjects.map((s) => (
                      <Badge key={s} variant="outline" className="px-1.5 py-0 text-[10px]">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="text-xs font-semibold leading-snug">{link.title}</div>
                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                  {link.summary}
                </p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
};
