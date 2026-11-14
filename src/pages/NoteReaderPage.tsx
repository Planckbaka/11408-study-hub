import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Circle,
  ClipboardCheck,
  Clock,
  FileCode2,
  Flame,
  GitMerge,
  Layers,
  ListTree,
  Sparkles,
  Target,
} from 'lucide-react';
import {
  CROSS_SUBJECT_LINKS,
  SUBJECT_META,
  SYLLABUS_CHAPTERS,
  getChapterById,
} from '@/data/syllabus';
import { getStudyNoteByChapter } from '@/data/notes';
import { getQuestionsByChapter } from '@/data/questions';
import { useStudyStore } from '@/store/useStudyStore';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn, extractTocHeadings } from '@/lib/utils';
import type { Tier, TocHeading } from '@/types/study';

interface LocationState {
  scrollToHeadingId?: string;
}

function getTierBadgeVariant(tier: Tier) {
  if (tier === 'S') return 'danger' as const;
  if (tier === 'A') return 'warning' as const;
  return 'info' as const;
}

function formatTocDisplayText(text: string): string {
  return text
    .replace(/\$([^$]+)\$/g, (_, inner: string) =>
      inner
        .replace(/\\rightarrow/g, '→')
        .replace(/\\sim/g, '～')
        .replace(/\\Delta\s*/g, 'Δ')
        .replace(/\\text\{([^}]*)\}/g, '$1')
        .replace(/[_^{}\\]/g, '')
        .trim(),
    )
    .trim();
}

export const NoteReaderPage: React.FC = () => {
  const { chapterId } = useParams<{ subject?: string; chapterId?: string }>();
  const location = useLocation();
  const { progress, toggleChapterDone, toggleKpDone } = useStudyStore();

  const resolvedChapterId = chapterId || 'CO-01';
  const chapter = getChapterById(resolvedChapterId) ?? getChapterById('CO-01') ?? SYLLABUS_CHAPTERS[0];
  const isUnknownRequested = Boolean(chapterId && !getChapterById(chapterId));

  const subj = SUBJECT_META[chapter.subject];
  const note = getStudyNoteByChapter(chapter.id);
  const chapterQuestions = useMemo(() => getQuestionsByChapter(chapter.id), [chapter.id]);

  const tocHeadings = useMemo<TocHeading[]>(
    () => (note ? extractTocHeadings(note.markdown) : []),
    [note],
  );

  const [activeHeadingId, setActiveHeadingId] = useState<string>('');
  const [kpSectionOpen, setKpSectionOpen] = useState(true);
  const [mobileTocOpen, setMobileTocOpen] = useState(false);

  const articleContainerRef = useRef<HTMLDivElement>(null);
  const headingElementsRef = useRef<HTMLElement[]>([]);

  const isChapterDone = Boolean(progress.completedChapters[chapter.id]);
  const doneKpCount = chapter.knowledgePoints.filter((kp) => progress.completedKps[kp.kpId]).length;
  const kpProgressPct =
    chapter.knowledgePoints.length > 0
      ? Math.round((doneKpCount / chapter.knowledgePoints.length) * 100)
      : 0;

  const { prevChapter, nextChapter } = useMemo(() => {
    const idx = SYLLABUS_CHAPTERS.findIndex((c) => c.id === chapter.id);
    return {
      prevChapter: idx > 0 ? SYLLABUS_CHAPTERS[idx - 1] : null,
      nextChapter: idx >= 0 && idx < SYLLABUS_CHAPTERS.length - 1 ? SYLLABUS_CHAPTERS[idx + 1] : null,
    };
  }, [chapter.id]);

  const relatedCrossLinks = useMemo(() => {
    const directIds = new Set(chapter.crossSubjectLinks ?? []);
    return CROSS_SUBJECT_LINKS.filter(
      (item) =>
        directIds.has(item.id) ||
        item.anchorChapterId === chapter.id ||
        item.subjects.includes(chapter.subject),
    );
  }, [chapter.crossSubjectLinks, chapter.id, chapter.subject]);

  const scrollToHeading = useCallback(
    (headingId: string, indexHint?: number) => {
      const idx =
        typeof indexHint === 'number'
          ? indexHint
          : tocHeadings.findIndex((h) => h.id === headingId);
      const byId = document.getElementById(headingId);
      const target = byId ?? (idx >= 0 ? headingElementsRef.current[idx] : undefined);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActiveHeadingId(headingId);
      }
    },
    [tocHeadings],
  );

  // Scroll to top when switching chapters unless a specific heading target was passed in state
  useEffect(() => {
    const state = location.state as LocationState | null;
    if (!state?.scrollToHeadingId) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      setActiveHeadingId(tocHeadings[0]?.id ?? '');
    }
    setMobileTocOpen(false);
  }, [chapter.id, location.state, tocHeadings]);

  // Handle scrollToHeadingId passed via CommandSearchModal navigation state
  useEffect(() => {
    const targetId = (location.state as LocationState | null)?.scrollToHeadingId;
    if (!targetId) return;

    let rafId = 0;
    const timerId = window.setTimeout(() => {
      rafId = window.requestAnimationFrame(() => {
        scrollToHeading(targetId);
      });
    }, 60);

    return () => {
      window.clearTimeout(timerId);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [chapter.id, location.state, scrollToHeading]);

  // IntersectionObserver scroll-spy for TOC active heading
  useEffect(() => {
    if (!note || tocHeadings.length === 0) {
      headingElementsRef.current = [];
      setActiveHeadingId('');
      return;
    }

    const container = articleContainerRef.current;
    if (!container) return;

    const domHeadings = Array.from(container.querySelectorAll<HTMLElement>('h2, h3'));
    headingElementsRef.current = domHeadings;

    const elementToTocId = new Map<Element, string>();
    tocHeadings.forEach((h, index) => {
      const el = document.getElementById(h.id) ?? domHeadings[index];
      if (el) {
        elementToTocId.set(el, h.id);
      }
    });

    const observedElements = Array.from(elementToTocId.keys());
    if (observedElements.length === 0) return;

    setActiveHeadingId((prev) => prev || tocHeadings[0].id);

    const visibleIds = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const tocId = elementToTocId.get(entry.target);
          if (!tocId) continue;
          if (entry.isIntersecting) {
            visibleIds.add(tocId);
          } else {
            visibleIds.delete(tocId);
          }
        }

        if (visibleIds.size > 0) {
          const firstVisible = tocHeadings.find((h) => visibleIds.has(h.id));
          if (firstVisible) {
            setActiveHeadingId(firstVisible.id);
          }
          return;
        }

        // Fallback to the last heading above the sticky header threshold
        let fallbackId = tocHeadings[0].id;
        for (let i = 0; i < tocHeadings.length; i += 1) {
          const h = tocHeadings[i];
          const el = document.getElementById(h.id) ?? domHeadings[i];
          if (el && el.getBoundingClientRect().top <= 130) {
            fallbackId = h.id;
          }
        }
        setActiveHeadingId(fallbackId);
      },
      {
        rootMargin: '-72px 0px -65% 0px',
        threshold: [0, 1],
      },
    );

    observedElements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [note, tocHeadings]);

  return (
    <div className="space-y-6 pb-14">
      {isUnknownRequested && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          <span>
            未找到章节 <code className="rounded bg-background/60 px-1.5 py-0.5 font-mono text-xs">{chapterId}</code>，已自动为您定位到默认章节{' '}
            <strong>{chapter.id} {chapter.title}</strong>。
          </span>
          <Button size="sm" variant="outline" asChild>
            <Link to="/">返回考纲看板</Link>
          </Button>
        </div>
      )}

      {/* Breadcrumb & Primary Header */}
      <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2.5">
            <nav
              aria-label="面包屑导航"
              className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
            >
              <Link to="/" className="font-medium transition-colors hover:text-primary">
                考纲看板
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className={cn('font-medium', subj.accentClass)}>{subj.name}</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="font-semibold text-foreground">{chapter.code}</span>
            </nav>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn('font-mono text-xs', subj.badgeClass)}>
                {chapter.id}
              </Badge>
              <Badge variant={getTierBadgeVariant(chapter.tier)} className="text-xs">
                {chapter.tier} 级考点 · {chapter.tierLabel}
              </Badge>
              {note ? (
                <Badge variant="success" className="text-xs">
                  完整精讲笔记
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  考纲骨架 · 待扩展全稿
                </Badge>
              )}
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {note ? note.title : `${chapter.code} ${chapter.title}`}
            </h1>

            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {note
                ? note.subtitle
                : `${subj.name}核心考纲单元 · 涵盖 ${chapter.syllabusItems.length} 项考纲条目与 ${chapter.knowledgePoints.length} 个原子核心考点。`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              type="button"
              variant={isChapterDone ? 'secondary' : 'default'}
              onClick={() => toggleChapterDone(chapter.id)}
              className={cn(
                isChapterDone &&
                  'border border-emerald-500/35 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300',
              )}
            >
              {isChapterDone ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>本章已完成（点击取消）</span>
                </>
              ) : (
                <>
                  <Circle className="h-4 w-4" />
                  <span>标记本章已完成</span>
                </>
              )}
            </Button>

            <Button variant="outline" asChild>
              <Link to={`/practice?chapter=${chapter.id}`}>
                <ClipboardCheck className="h-4 w-4" />
                <span>
                  刷本章习题
                  {chapterQuestions.length > 0 ? ` (${chapterQuestions.length})` : ''}
                </span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Chapter Stats Strip */}
        <div className="mt-5 grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-muted/25 px-3.5 py-2.5">
            <div className="text-[11px] font-medium text-muted-foreground">考纲分级定位</div>
            <div className="mt-1 flex items-center gap-2 text-sm font-semibold">
              <Badge variant={getTierBadgeVariant(chapter.tier)}>{chapter.tier} 级</Badge>
              <span className="truncate">{chapter.tierLabel}</span>
            </div>
          </div>

          <div className="rounded-xl border bg-muted/25 px-3.5 py-2.5">
            <div className="text-[11px] font-medium text-muted-foreground">2009–2026 真题频次 / 分值</div>
            <div className="mt-1 flex items-baseline gap-2 font-mono text-sm">
              <span className="text-base font-bold text-foreground">
                {chapter.realExamCount2009to2026}
              </span>
              <span className="text-xs text-muted-foreground">次命题 ·</span>
              <span className="text-base font-bold text-primary">
                {chapter.realExamScore2009to2026}
              </span>
              <span className="text-xs text-muted-foreground">累计分</span>
            </div>
          </div>

          <div className="rounded-xl border bg-muted/25 px-3.5 py-2.5">
            <div className="text-[11px] font-medium text-muted-foreground">预计学习耗时</div>
            <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
              <Clock className="h-4 w-4 text-sky-500" />
              <span>{note ? `${note.estimatedMinutes} 分钟精读` : '考纲梳理约 15 分钟'}</span>
              {note && (
                <span className="ml-auto font-mono text-[11px] font-normal text-muted-foreground">
                  {note.updatedAt}
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl border bg-muted/25 px-3.5 py-2.5 sm:col-span-2 lg:col-span-1">
            <div className="text-[11px] font-medium text-muted-foreground">命题权重与备考建议</div>
            <p className="mt-1 text-xs leading-relaxed text-foreground/90">
              {note
                ? note.examWeightSummary
                : `${subj.shortName}选择题 ${subj.mcqRange} · 大题 ${subj.comprehensiveRange}；本章累计权重 ${chapter.realExamScore2009to2026} 分。`}
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Atomic Knowledge Point Check-in Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4 text-primary" />
                <span>原子核心考点掌握打卡区</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {doneKpCount} / {chapter.knowledgePoints.length}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                点击任意考点卡片即可完成/取消掌握打卡，进度实时保存在本地浏览器中
              </CardDescription>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden w-32 items-center gap-2 sm:flex">
                <Progress value={kpProgressPct} className="h-2" />
                <span className="font-mono text-xs text-muted-foreground">{kpProgressPct}%</span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setKpSectionOpen((v) => !v)}
                className="h-8 gap-1 text-xs"
              >
                {kpSectionOpen ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    <span>收起</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    <span>展开</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        {kpSectionOpen && (
          <CardContent className="grid gap-3 md:grid-cols-2">
            {chapter.knowledgePoints.map((kp) => {
              const kpDone = Boolean(progress.completedKps[kp.kpId]);
              return (
                <button
                  key={kp.kpId}
                  type="button"
                  onClick={() => toggleKpDone(kp.kpId)}
                  aria-pressed={kpDone}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-xl border bg-background p-4 text-left transition-all hover:border-primary/45 hover:bg-accent/30',
                    kpDone && 'border-emerald-500/40 bg-emerald-500/5',
                  )}
                >
                  {kpDone ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                  ) : (
                    <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  )}

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold leading-snug text-foreground">
                        {kp.title}
                      </span>
                      <Badge variant={getTierBadgeVariant(kp.tier)} className="px-1.5 py-0 text-[10px]">
                        {kp.tier}级
                      </Badge>
                      <span className="font-mono text-[11px] text-muted-foreground">{kp.kpId}</span>
                      {(kp.realExamCount !== undefined || kp.realExamScore !== undefined) && (
                        <Badge variant="outline" className="ml-auto font-mono text-[10px]">
                          {kp.realExamCount ?? 0} 次 / {kp.realExamScore ?? 0} 分
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs leading-relaxed text-foreground/85">
                      <span className="font-semibold text-sky-700 dark:text-sky-300">核心原理：</span>
                      {kp.corePrinciple}
                    </p>

                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs leading-relaxed text-amber-800 dark:text-amber-200">
                      <span className="font-semibold">易错陷阱：</span>
                      {kp.trap}
                    </div>

                    {kp.years && kp.years.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        <span className="mr-1 text-[10px] text-muted-foreground">真题年份：</span>
                        {kp.years.map((year) => (
                          <span
                            key={year}
                            className="rounded border bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                          >
                            {year}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </CardContent>
        )}
      </Card>

      {/* Main Content Area: Full Note + Sticky TOC OR Skeleton Workbench */}
      {note ? (
        <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_264px] xl:items-start xl:gap-8">
          <div className="min-w-0 space-y-6">
            {/* Core Takeaways Strip */}
            {note.coreTakeaways.length > 0 && (
              <Card className="border-sky-500/30 bg-sky-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm text-sky-700 dark:text-sky-300">
                    <Sparkles className="h-4 w-4" />
                    <span>本章高浓缩必背结论（Core Takeaways）</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <MarkdownRenderer
                    compact
                    content={note.coreTakeaways.map((t) => `- ${t}`).join('\n')}
                    className="prose-ul:my-1 prose-li:my-1"
                  />
                </CardContent>
              </Card>
            )}

            {/* Mobile / Tablet Collapsible TOC */}
            {tocHeadings.length > 0 && (
              <div className="rounded-xl border bg-card xl:hidden">
                <button
                  type="button"
                  onClick={() => setMobileTocOpen((v) => !v)}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold"
                >
                  <span className="flex items-center gap-2">
                    <ListTree className="h-4 w-4 text-primary" />
                    <span>章节目录大纲 ({tocHeadings.length} 节)</span>
                  </span>
                  {mobileTocOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {mobileTocOpen && (
                  <nav aria-label="章节目录" className="space-y-1 border-t px-3 py-3">
                    {tocHeadings.map((h, idx) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => {
                          scrollToHeading(h.id, idx);
                          setMobileTocOpen(false);
                        }}
                        className={cn(
                          'block w-full rounded-md px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-accent',
                          h.level === 3 && 'pl-5 text-muted-foreground',
                          activeHeadingId === h.id && 'bg-primary/10 font-semibold text-primary',
                        )}
                      >
                        {formatTocDisplayText(h.text)}
                      </button>
                    ))}
                  </nav>
                )}
              </div>
            )}

            {/* Full Markdown Study Note */}
            <article
              ref={articleContainerRef}
              className="rounded-2xl border bg-card p-5 shadow-sm sm:p-8"
            >
              <MarkdownRenderer content={note.markdown} />
            </article>

            {/* Related Cross-Subject Links for CO Chapter if available */}
            {relatedCrossLinks.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <GitMerge className="h-4 w-4 text-violet-500" />
                    <span>本章跨学科关联脉络</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  {relatedCrossLinks.map((link) => (
                    <Link
                      key={link.id}
                      to={`/notes/${link.anchorChapterId.slice(0, 2)}/${link.anchorChapterId}`}
                      className="rounded-xl border bg-muted/20 p-3.5 transition-colors hover:border-primary/40 hover:bg-accent/40"
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-primary">{link.id}</span>
                        <div className="flex gap-1">
                          {link.subjects.map((s) => (
                            <Badge key={s} variant="outline" className="px-1.5 py-0 text-[10px]">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-sm font-semibold">{link.title}</div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{link.summary}</p>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sticky Right-hand TOC (Desktop xl+) */}
          {tocHeadings.length > 0 && (
            <aside className="sticky top-20 hidden max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border bg-card p-4 shadow-sm xl:block">
              <div className="mb-3 flex items-center justify-between border-b pb-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <ListTree className="h-3.5 w-3.5 text-primary" />
                  <span>章节目录大纲 (TOC)</span>
                </div>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {tocHeadings.length}
                </span>
              </div>

              <nav aria-label="章节目录大纲" className="space-y-1">
                {tocHeadings.map((h, idx) => {
                  const isActive = activeHeadingId === h.id;
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => {
                        document.getElementById(h.id)?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'start',
                        });
                        if (!document.getElementById(h.id)) {
                          scrollToHeading(h.id, idx);
                        } else {
                          setActiveHeadingId(h.id);
                        }
                      }}
                      className={cn(
                        'block w-full rounded-lg border-l-2 px-2.5 py-1.5 text-left text-xs leading-snug transition-colors',
                        h.level === 2 ? 'font-medium' : 'pl-5 text-[11px]',
                        isActive
                          ? 'border-primary bg-primary/10 font-semibold text-primary'
                          : 'border-transparent text-muted-foreground hover:bg-accent/70 hover:text-foreground',
                      )}
                    >
                      {formatTocDisplayText(h.text)}
                    </button>
                  );
                })}
              </nav>

              <div className="mt-4 border-t pt-3">
                <Button size="sm" variant="outline" className="w-full text-xs" asChild>
                  <Link to={`/practice?chapter=${chapter.id}`}>
                    <ClipboardCheck className="h-3.5 w-3.5" />
                    <span>精读完去刷本章题</span>
                  </Link>
                </Button>
              </div>
            </aside>
          )}
        </div>
      ) : (
        /* Extensible Syllabus Skeleton Workbench View for DS / OS / CN */
        <div className="space-y-6">
          <div className="rounded-2xl border border-dashed border-primary/35 bg-gradient-to-br from-card via-card to-primary/5 p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Layers className="h-4 w-4" />
                  <span>考纲骨架与备考扩展工作台</span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  本章节（{subj.name} · {chapter.id}）已内置官方考纲条目、高频重难点、踩坑清单与原子考点打卡，支持按统一规范随时扩充或覆写精讲全稿与题库。
                </p>
              </div>
              <Button size="sm" variant="outline" asChild className="shrink-0">
                <Link to="/notes/CO/CO-01">
                  <BookOpen className="h-4 w-4" />
                  <span>查看 CO 精讲模板</span>
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Syllabus Items */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="h-4 w-4 text-sky-500" />
                  <span>官方考纲知识覆盖清单</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  对照 408 考试大纲逐条梳理核心要求
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5 text-sm leading-relaxed">
                  {chapter.syllabusItems.map((item, index) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 rounded-lg border bg-muted/20 px-3 py-2.5"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-[11px] font-semibold text-primary">
                        {index + 1}
                      </span>
                      <span className="text-foreground/90">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* High Freq Focus & Traps */}
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Flame className="h-4 w-4 text-rose-500" />
                    <span>高频重难点聚焦</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    命题组高频切入角度与拉分关键点
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm leading-relaxed">
                    {chapter.highFreqFocus.map((focus) => (
                      <li key={focus} className="flex items-start gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                        <span className="text-foreground/90">{focus}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-amber-500/35 bg-amber-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4" />
                    <span>易错陷阱警示</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm leading-relaxed text-amber-900 dark:text-amber-200">
                    {chapter.traps.map((trap) => (
                      <li key={trap} className="flex items-start gap-2">
                        <span className="font-mono font-bold">!</span>
                        <span>{trap}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Cross-Subject Links */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <GitMerge className="h-4 w-4 text-violet-500" />
                <span>跨学科联动专题（{subj.shortName} 关联脉络）</span>
              </CardTitle>
              <CardDescription className="text-xs">
                408 压轴综合题常围绕存储、总线、中断与网络协议跨科串联
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {relatedCrossLinks.map((link) => {
                const isDirect = (chapter.crossSubjectLinks ?? []).includes(link.id);
                return (
                  <Link
                    key={link.id}
                    to={`/notes/${link.anchorChapterId.slice(0, 2)}/${link.anchorChapterId}`}
                    className={cn(
                      'rounded-xl border bg-muted/20 p-3.5 transition-colors hover:border-primary/40 hover:bg-accent/40',
                      isDirect && 'border-violet-500/35 bg-violet-500/5',
                    )}
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-primary">
                        {link.id}
                        {isDirect ? ' · 本章直连' : ''}
                      </span>
                      <div className="flex gap-1">
                        {link.subjects.map((s) => (
                          <Badge key={s} variant="outline" className="px-1.5 py-0 text-[10px]">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-sm font-semibold">{link.title}</div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {link.summary}
                    </p>
                  </Link>
                );
              })}
            </CardContent>
          </Card>

          {/* Open-source Contribution Hint */}
          <Card className="border-border bg-muted/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileCode2 className="h-4 w-4 text-emerald-500" />
                <span>开源共建指南：为 {chapter.id} 扩展完整精讲与题库</span>
              </CardTitle>
              <CardDescription className="text-xs">
                遵循下方静态模块化数据结构，即可无缝接入 KaTeX 公式、Mermaid 图表、目录大纲与练习模式
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 rounded-xl border bg-card p-4">
                <div className="text-xs font-semibold text-foreground">1. 添加精讲笔记模块</div>
                <p className="text-xs text-muted-foreground">
                  新增{' '}
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                    src/data/notes/{chapter.id.toLowerCase()}.ts
                  </code>{' '}
                  （通用路径{' '}
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                    src/data/notes/&lt;chapterId&gt;.ts
                  </code>
                  ），导出满足 <code className="font-mono text-[11px]">StudyNote</code> 类型的常量并注册到{' '}
                  <code className="font-mono text-[11px]">src/data/notes/index.ts</code>。
                </p>
              </div>

              <div className="space-y-2 rounded-xl border bg-card p-4">
                <div className="text-xs font-semibold text-foreground">2. 添加配套精选习题</div>
                <p className="text-xs text-muted-foreground">
                  新增{' '}
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                    src/data/questions/{chapter.id.toLowerCase()}.ts
                  </code>{' '}
                  （通用路径{' '}
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                    src/data/questions/&lt;chapterId&gt;.ts
                  </code>
                  ），汇总至{' '}
                  <code className="font-mono text-[11px]">src/data/questions/index.ts</code>，并在{' '}
                  <code className="font-mono text-[11px]">src/data/syllabus.ts</code> 将{' '}
                  <code className="font-mono text-[11px]">hasFullNotes</code> 设为{' '}
                  <code className="font-mono text-[11px]">true</code>。
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Previous / Next Chapter Navigation */}
      <nav
        aria-label="上下章切换"
        className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between"
      >
        {prevChapter ? (
          <Button variant="outline" asChild className="h-auto justify-start px-4 py-3">
            <Link to={`/notes/${prevChapter.subject}/${prevChapter.id}`} className="flex items-center gap-3">
              <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="text-left">
                <div className="text-[11px] font-normal text-muted-foreground">
                  上一章 · {SUBJECT_META[prevChapter.subject].shortName} {prevChapter.code}
                </div>
                <div className="text-sm font-semibold">
                  {prevChapter.id} {prevChapter.title}
                </div>
              </div>
            </Link>
          </Button>
        ) : (
          <div />
        )}

        {nextChapter ? (
          <Button variant="outline" asChild className="h-auto justify-end px-4 py-3 sm:ml-auto">
            <Link to={`/notes/${nextChapter.subject}/${nextChapter.id}`} className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[11px] font-normal text-muted-foreground">
                  下一章 · {SUBJECT_META[nextChapter.subject].shortName} {nextChapter.code}
                </div>
                <div className="text-sm font-semibold">
                  {nextChapter.id} {nextChapter.title}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          </Button>
        ) : (
          <div />
        )}
      </nav>
    </div>
  );
};
