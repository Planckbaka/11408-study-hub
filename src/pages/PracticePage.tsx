import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Award,
  BookmarkCheck,
  BookmarkPlus,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardCheck,
  Clock,
  Eye,
  EyeOff,
  FileText,
  Filter,
  History,
  Layers,
  Lightbulb,
  ListChecks,
  Play,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Target,
  Trophy,
  X,
  XCircle,
} from 'lucide-react';
import { ALL_QUESTIONS, QUESTIONS_BY_ID } from '@/data/questions';
import { SUBJECT_META, SUBJECT_ORDER, SYLLABUS_CHAPTERS, getChapterById } from '@/data/syllabus';
import { useStudyStore } from '@/store/useStudyStore';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn, formatDateTime, formatDuration } from '@/lib/utils';
import type {
  ChoiceKey,
  ChoiceQuestion,
  ComprehensiveQuestion,
  ComprehensiveSubQuestion,
  Difficulty,
  ExamAttempt,
  Question,
  SourceTag,
  SubjectId,
} from '@/types/study';

type PracticeTab = 'study' | 'exam';
type ExamScopePreset = 'all_filtered' | 'choice_only' | 'timed_15';
type ExamPhase = 'setup' | 'active' | 'graded';

const SOURCE_TAG_OPTIONS: Array<'ALL' | SourceTag> = ['ALL', '真题同源', '王道课后改编', '易错变式'];
const DIFFICULTY_OPTIONS: Array<'ALL' | Difficulty> = ['ALL', '基础', '进阶', '压轴'];
const TYPE_OPTIONS: Array<{ value: 'ALL' | Question['type']; label: string }> = [
  { value: 'ALL', label: '全部题型' },
  { value: 'single_choice', label: 'single_choice · 单选' },
  { value: 'comprehensive', label: 'comprehensive · 综合' },
];

const TIMED_15_LIMIT_SECONDS = 20 * 60;

function getDifficultyVariant(difficulty: Difficulty): 'info' | 'warning' | 'danger' {
  if (difficulty === '基础') return 'info';
  if (difficulty === '进阶') return 'warning';
  return 'danger';
}

function getSourceTagClass(sourceTag: SourceTag): string {
  switch (sourceTag) {
    case '真题同源':
      return 'border-sky-500/35 bg-sky-500/10 text-sky-700 dark:text-sky-300';
    case '王道课后改编':
      return 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
    case '易错变式':
      return 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  }
}

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

function pickExamQuestions(pool: Question[], scope: ExamScopePreset): Question[] {
  if (scope === 'choice_only') {
    return pool.filter((q): q is ChoiceQuestion => q.type === 'single_choice');
  }
  if (scope === 'timed_15') {
    const choicePool = pool.filter((q): q is ChoiceQuestion => q.type === 'single_choice');
    if (choicePool.length >= 15) {
      return shuffleArray(choicePool).slice(0, 15);
    }
    return shuffleArray(pool).slice(0, 15);
  }
  return [...pool];
}

export const PracticePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const {
    progress,
    recordChoiceAttempt,
    recordComprehensiveSelfEval,
    addToWrongBook,
    removeFromWrongBook,
    recordExamAttempt,
  } = useStudyStore();

  // Top mode tab
  const [activeTab, setActiveTab] = useState<PracticeTab>('study');

  // Filter state
  const [subjectFilter, setSubjectFilter] = useState<'ALL' | SubjectId>('ALL');
  const [chapterFilter, setChapterFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | SourceTag>('ALL');
  const [difficultyFilter, setDifficultyFilter] = useState<'ALL' | Difficulty>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | Question['type']>('ALL');
  const [wrongOnly, setWrongOnly] = useState<boolean>(false);
  const [keyword, setKeyword] = useState<string>('');

  // Study mode state
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [studyChoiceSession, setStudyChoiceSession] = useState<
    Record<string, { choice: ChoiceKey; submitted: boolean }>
  >({});
  const [studyAnalysisVisible, setStudyAnalysisVisible] = useState<Record<string, boolean>>({});
  const [hintsShownCount, setHintsShownCount] = useState<Record<string, number>>({});
  const [studyCompDrafts, setStudyCompDrafts] = useState<Record<string, string>>({});
  const [revealedSubs, setRevealedSubs] = useState<Record<string, Record<number, boolean>>>({});
  const [subScores, setSubScores] = useState<Record<string, Record<number, number>>>({});
  const [fullSolutionOpen, setFullSolutionOpen] = useState<Record<string, boolean>>({});
  const [compSavedFeedback, setCompSavedFeedback] = useState<
    Record<string, { score: number; maxPoints: number } | undefined>
  >({});

  // Exam mode state
  const [examPhase, setExamPhase] = useState<ExamPhase>('setup');
  const [examScope, setExamScope] = useState<ExamScopePreset>('all_filtered');
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [examTitle, setExamTitle] = useState<string>('');
  const [examTimeLimitSec, setExamTimeLimitSec] = useState<number | null>(null);
  const [examElapsedSec, setExamElapsedSec] = useState<number>(0);
  const [examCurrentIdx, setExamCurrentIdx] = useState<number>(0);
  const [examDraftChoices, setExamDraftChoices] = useState<Record<string, ChoiceKey>>({});
  const [examDraftNotes, setExamDraftNotes] = useState<Record<string, string>>({});
  const [examDraftCheckpoints, setExamDraftCheckpoints] = useState<Record<string, boolean>>({});
  const [examConfirmSubmit, setExamConfirmSubmit] = useState<boolean>(false);
  const [examResultSummary, setExamResultSummary] = useState<ExamAttempt | null>(null);
  const [examReviewFilter, setExamReviewFilter] = useState<'all' | 'wrong'>('all');
  const [examGradedSubScores, setExamGradedSubScores] = useState<Record<string, Record<number, number>>>({});
  const [examGradedCompSaved, setExamGradedCompSaved] = useState<Record<string, boolean>>({});
  const [examGradedCompSolutionOpen, setExamGradedCompSolutionOpen] = useState<Record<string, boolean>>({});

  // Sync URL query parameters reactively (supports initial load, Cmd+K navigation, and WrongBook links)
  const searchKey = searchParams.toString();
  useEffect(() => {
    const params = new URLSearchParams(searchKey);
    const paramChapter = params.get('chapter');
    const paramQid = params.get('qid');
    const paramMode = params.get('mode');
    const paramTab = params.get('tab');

    if (paramTab === 'exam') {
      setActiveTab('exam');
    } else if (paramQid || paramMode === 'wrong-retry' || paramChapter || searchKey === '') {
      setActiveTab('study');
    }

    if (paramMode === 'wrong-retry') {
      setWrongOnly(true);
      if (paramChapter) {
        const ch = getChapterById(paramChapter);
        setChapterFilter(paramChapter);
        setSubjectFilter(ch ? ch.subject : 'ALL');
      } else {
        setChapterFilter('ALL');
        setSubjectFilter('ALL');
      }
      setSourceFilter('ALL');
      setDifficultyFilter('ALL');
      setTypeFilter('ALL');
      setKeyword('');
    } else if (paramChapter || paramQid) {
      setWrongOnly(false);
      if (paramChapter) {
        const ch = getChapterById(paramChapter);
        setChapterFilter(paramChapter);
        setSubjectFilter(ch ? ch.subject : 'ALL');
      } else if (paramQid && QUESTIONS_BY_ID[paramQid]) {
        setChapterFilter('ALL');
        setSubjectFilter('ALL');
      }
      if (paramQid) {
        setSourceFilter('ALL');
        setDifficultyFilter('ALL');
        setTypeFilter('ALL');
        setKeyword('');
        setSelectedQuestionId(paramQid);
      }
    } else if (searchKey === '') {
      setWrongOnly(false);
      setSubjectFilter('ALL');
      setChapterFilter('ALL');
      setSourceFilter('ALL');
      setDifficultyFilter('ALL');
      setTypeFilter('ALL');
      setKeyword('');
    }
  }, [searchKey]);

  // Exam timer tick when active and on exam tab
  useEffect(() => {
    if (examPhase !== 'active' || activeTab !== 'exam') return;
    const timerId = window.setInterval(() => {
      setExamElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [examPhase, activeTab]);

  // Available chapters for dropdown
  const chapterOptions = useMemo(() => {
    const list =
      subjectFilter === 'ALL'
        ? SYLLABUS_CHAPTERS
        : SYLLABUS_CHAPTERS.filter((c) => c.subject === subjectFilter);
    return list;
  }, [subjectFilter]);

  const questionCountByChapter = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const q of ALL_QUESTIONS) {
      counts[q.chapterId] = (counts[q.chapterId] ?? 0) + 1;
    }
    return counts;
  }, []);

  const wrongBookCount = Object.keys(progress.wrongBook).length;

  // Filtered questions list
  const filteredQuestions = useMemo(() => {
    const tokens = keyword.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return ALL_QUESTIONS.filter((q) => {
      if (subjectFilter !== 'ALL' && q.subject !== subjectFilter) return false;
      if (chapterFilter !== 'ALL' && q.chapterId !== chapterFilter) return false;
      if (sourceFilter !== 'ALL' && q.sourceTag !== sourceFilter) return false;
      if (difficultyFilter !== 'ALL' && q.difficulty !== difficultyFilter) return false;
      if (typeFilter !== 'ALL' && q.type !== typeFilter) return false;
      if (wrongOnly && !progress.wrongBook[q.id]) return false;
      if (tokens.length > 0) {
        const titlePart = q.type === 'comprehensive' ? q.title : '';
        const haystack = `${q.id} ${q.chapterId} ${q.kpTitle} ${q.sourceTag} ${q.difficulty} ${titlePart} ${q.stem}`.toLowerCase();
        if (!tokens.every((tok) => haystack.includes(tok))) return false;
      }
      return true;
    });
  }, [
    subjectFilter,
    chapterFilter,
    sourceFilter,
    difficultyFilter,
    typeFilter,
    wrongOnly,
    keyword,
    progress.wrongBook,
  ]);

  const filteredChoiceCount = useMemo(
    () => filteredQuestions.filter((q) => q.type === 'single_choice').length,
    [filteredQuestions],
  );
  const filteredCompCount = filteredQuestions.length - filteredChoiceCount;

  // Resolve current Study Mode index safely
  const studyIndex = useMemo(() => {
    if (filteredQuestions.length === 0) return -1;
    if (selectedQuestionId) {
      const idx = filteredQuestions.findIndex((q) => q.id === selectedQuestionId);
      if (idx >= 0) return idx;
    }
    return 0;
  }, [filteredQuestions, selectedQuestionId]);

  const currentQuestion = studyIndex >= 0 ? filteredQuestions[studyIndex] : undefined;

  const hasActiveFilters =
    subjectFilter !== 'ALL' ||
    chapterFilter !== 'ALL' ||
    sourceFilter !== 'ALL' ||
    difficultyFilter !== 'ALL' ||
    typeFilter !== 'ALL' ||
    wrongOnly ||
    keyword.trim().length > 0;

  const handleResetFilters = () => {
    setSubjectFilter('ALL');
    setChapterFilter('ALL');
    setSourceFilter('ALL');
    setDifficultyFilter('ALL');
    setTypeFilter('ALL');
    setWrongOnly(false);
    setKeyword('');
  };

  const handleSelectSubject = (subj: 'ALL' | SubjectId) => {
    setSubjectFilter(subj);
    if (subj !== 'ALL' && chapterFilter !== 'ALL') {
      const ch = getChapterById(chapterFilter);
      if (ch && ch.subject !== subj) {
        setChapterFilter('ALL');
      }
    }
  };

  const handleSelectQuestionIndex = (idx: number) => {
    const target = filteredQuestions[idx];
    if (target) {
      setSelectedQuestionId(target.id);
    }
  };

  const handleToggleWrongBook = (questionId: string) => {
    if (progress.wrongBook[questionId]) {
      removeFromWrongBook(questionId);
    } else {
      addToWrongBook(questionId, '概念辨析', '');
    }
  };

  // Study Mode handlers for Single Choice
  const handleSelectStudyChoice = (q: ChoiceQuestion, chosenKey: ChoiceKey) => {
    const existing = studyChoiceSession[q.id];
    if (existing?.submitted) return;
    const isCorrect = chosenKey === q.answer;
    setStudyChoiceSession((prev) => ({
      ...prev,
      [q.id]: { choice: chosenKey, submitted: true },
    }));
    setStudyAnalysisVisible((prev) => ({ ...prev, [q.id]: true }));
    recordChoiceAttempt(q.id, chosenKey, isCorrect, true);
  };

  const handleResetStudyChoice = (questionId: string) => {
    setStudyChoiceSession((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
    setStudyAnalysisVisible((prev) => ({ ...prev, [questionId]: false }));
  };

  // Study Mode handlers for Comprehensive
  const handleRevealNextHint = (q: ComprehensiveQuestion) => {
    setHintsShownCount((prev) => {
      const curr = prev[q.id] ?? 0;
      if (curr >= q.hints.length) return prev;
      return { ...prev, [q.id]: curr + 1 };
    });
  };

  const handleToggleSubAnswer = (questionId: string, subIdx: number) => {
    setRevealedSubs((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] ?? {}),
        [subIdx]: !prev[questionId]?.[subIdx],
      },
    }));
  };

  const handleRevealAllSubs = (q: ComprehensiveQuestion, open: boolean) => {
    const nextMap: Record<number, boolean> = {};
    q.subQuestions.forEach((_sub, idx) => {
      nextMap[idx] = open;
    });
    setRevealedSubs((prev) => ({
      ...prev,
      [q.id]: nextMap,
    }));
  };

  const handleSetSubScore = (questionId: string, subIdx: number, score: number) => {
    setSubScores((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] ?? {}),
        [subIdx]: score,
      },
    }));
    setCompSavedFeedback((prev) => ({ ...prev, [questionId]: undefined }));
  };

  const handleSaveCompSelfEval = (q: ComprehensiveQuestion) => {
    const scoresMap = subScores[q.id] ?? {};
    const totalSelfScore = q.subQuestions.reduce((sum, _sub, idx) => sum + (scoresMap[idx] ?? 0), 0);
    recordComprehensiveSelfEval(q.id, totalSelfScore, q.totalPoints);
    setCompSavedFeedback((prev) => ({
      ...prev,
      [q.id]: { score: totalSelfScore, maxPoints: q.totalPoints },
    }));
  };

  // Exam Mode calculations and handlers
  const scopePreviewCounts = useMemo(() => {
    const allCount = filteredQuestions.length;
    const choiceOnlyCount = filteredChoiceCount;
    const timed15Count = Math.min(15, choiceOnlyCount >= 15 ? choiceOnlyCount : allCount);
    return {
      all_filtered: allCount,
      choice_only: choiceOnlyCount,
      timed_15: timed15Count,
    };
  }, [filteredQuestions.length, filteredChoiceCount]);

  const handleStartExam = () => {
    const chosen = pickExamQuestions(filteredQuestions, examScope);
    if (chosen.length === 0) return;

    const scopeLabel =
      examScope === 'all_filtered'
        ? '当前筛选全卷模考'
        : examScope === 'choice_only'
          ? '客观单选题快速测'
          : '20 分钟限时抽测 15 题';
    const subTag = chapterFilter !== 'ALL' ? chapterFilter : subjectFilter !== 'ALL' ? subjectFilter : '全库';

    setExamQuestions(chosen);
    setExamTitle(`${subTag} · ${scopeLabel}（${chosen.length} 题）`);
    setExamTimeLimitSec(examScope === 'timed_15' ? TIMED_15_LIMIT_SECONDS : null);
    setExamElapsedSec(0);
    setExamCurrentIdx(0);
    setExamDraftChoices({});
    setExamDraftNotes({});
    setExamDraftCheckpoints({});
    setExamConfirmSubmit(false);
    setExamResultSummary(null);
    setExamGradedSubScores({});
    setExamGradedCompSaved({});
    setExamGradedCompSolutionOpen({});
    setExamReviewFilter('all');
    setExamPhase('active');
  };

  const isExamQuestionAnswered = (q: Question): boolean => {
    if (q.type === 'single_choice') {
      return Boolean(examDraftChoices[q.id]);
    }
    return Boolean(examDraftCheckpoints[q.id]) || (examDraftNotes[q.id]?.trim().length ?? 0) > 0;
  };

  const examAnsweredCount = useMemo(
    () => examQuestions.filter((q) => isExamQuestionAnswered(q)).length,
    [examQuestions, examDraftChoices, examDraftCheckpoints, examDraftNotes],
  );

  const handleSubmitExam = () => {
    const choiceList = examQuestions.filter((q): q is ChoiceQuestion => q.type === 'single_choice');
    const compList = examQuestions.filter((q): q is ComprehensiveQuestion => q.type === 'comprehensive');

    let correctChoice = 0;
    const wrongIds: string[] = [];

    for (const cq of choiceList) {
      const chosen = examDraftChoices[cq.id];
      const isCorrect = chosen === cq.answer;
      if (isCorrect) {
        correctChoice += 1;
      } else {
        wrongIds.push(cq.id);
      }
      if (chosen) {
        recordChoiceAttempt(cq.id, chosen, isCorrect, false);
      }
    }

    const choiceScore = correctChoice * 2;
    const choiceMaxScore = choiceList.length * 2;
    const selfEvalMaxScore = compList.reduce((sum, q) => sum + q.totalPoints, 0);

    const attempt: ExamAttempt = {
      id: `exam-${Date.now()}`,
      createdAt: new Date().toISOString(),
      title: examTitle,
      durationSeconds: examElapsedSec,
      totalChoice: choiceList.length,
      correctChoice,
      choiceScore,
      choiceMaxScore,
      selfEvalScore: 0,
      selfEvalMaxScore,
      questionIds: examQuestions.map((q) => q.id),
      wrongIds,
    };

    recordExamAttempt(attempt);
    setExamResultSummary(attempt);
    setExamConfirmSubmit(false);
    setExamPhase('graded');
  };

  const remainingWrongToAddCount = useMemo(() => {
    if (!examResultSummary) return 0;
    return examResultSummary.wrongIds.filter((qid) => !progress.wrongBook[qid]).length;
  }, [examResultSummary, progress.wrongBook]);

  const handleBulkAddWrongToBook = () => {
    if (!examResultSummary) return;
    for (const qid of examResultSummary.wrongIds) {
      if (!progress.wrongBook[qid]) {
        addToWrongBook(qid, '概念辨析', '');
      }
    }
  };

  const examChoiceQuestions = useMemo(
    () => examQuestions.filter((q): q is ChoiceQuestion => q.type === 'single_choice'),
    [examQuestions],
  );
  const examCompQuestions = useMemo(
    () => examQuestions.filter((q): q is ComprehensiveQuestion => q.type === 'comprehensive'),
    [examQuestions],
  );

  const liveExamCompSelfScore = useMemo(() => {
    return examCompQuestions.reduce((total, cq) => {
      const map = examGradedSubScores[cq.id] ?? {};
      const qSum = cq.subQuestions.reduce((s, _sub, idx) => s + (map[idx] ?? 0), 0);
      return total + qSum;
    }, 0);
  }, [examCompQuestions, examGradedSubScores]);

  const handleSaveExamCompSelfEval = (cq: ComprehensiveQuestion) => {
    const map = examGradedSubScores[cq.id] ?? {};
    const score = cq.subQuestions.reduce((s, _sub, idx) => s + (map[idx] ?? 0), 0);
    recordComprehensiveSelfEval(cq.id, score, cq.totalPoints);
    setExamGradedCompSaved((prev) => ({ ...prev, [cq.id]: true }));
  };

  const showFilterToolbar = activeTab === 'study' || examPhase === 'setup';

  return (
    <div className="space-y-6 pb-14">
      {/* Page Header + Top Mode Switcher */}
      <section className="rounded-2xl border bg-gradient-to-br from-card via-card to-sky-500/5 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default" className="gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                <span>交互式刷题与全真模考</span>
              </Badge>
              {wrongOnly && (
                <Badge variant="danger" className="gap-1">
                  <BookmarkCheck className="h-3.5 w-3.5" />
                  <span>错题重练队列 ({wrongBookCount})</span>
                </Badge>
              )}
              <Badge variant="outline" className="font-mono text-xs">
                题库共 {ALL_QUESTIONS.length} 题
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              11408 交互题库与实战演练工作台
            </h1>
            <p className="text-sm text-muted-foreground">
              支持单题即选即批、综合大题渐进式分步提示与踩分点自评，以及全真隐藏答案限时模考与一键收录错题。
            </p>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as PracticeTab)}
            className="w-full lg:w-auto"
          >
            <TabsList className="grid h-10 w-full grid-cols-2 lg:w-[320px]">
              <TabsTrigger value="study" className="gap-1.5">
                <Lightbulb className="h-4 w-4" />
                <span>学习模式</span>
              </TabsTrigger>
              <TabsTrigger value="exam" className="gap-1.5">
                <ClipboardCheck className="h-4 w-4" />
                <span>刷题/模考模式</span>
                {examPhase === 'active' && (
                  <span className="ml-1 inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </section>

      {/* Rich Filter Toolbar (visible in Study Mode and Exam Setup) */}
      {showFilterToolbar && (
        <Card>
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Filter className="h-3.5 w-3.5" />
                  <span>科目筛选：</span>
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant={subjectFilter === 'ALL' ? 'default' : 'outline'}
                  onClick={() => handleSelectSubject('ALL')}
                >
                  全部科目
                </Button>
                {SUBJECT_ORDER.map((subjId) => {
                  const meta = SUBJECT_META[subjId];
                  const active = subjectFilter === subjId;
                  return (
                    <Button
                      key={subjId}
                      type="button"
                      size="sm"
                      variant={active ? 'default' : 'outline'}
                      onClick={() => handleSelectSubject(subjId)}
                      className="gap-1"
                    >
                      <span className="font-mono">{meta.code}</span>
                      <span>{meta.shortName}</span>
                    </Button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={wrongOnly ? 'destructive' : 'outline'}
                  onClick={() => setWrongOnly((v) => !v)}
                  className="gap-1.5"
                >
                  <BookmarkCheck className="h-3.5 w-3.5" />
                  <span>仅看错题本</span>
                  <span className="rounded bg-background/20 px-1.5 py-0.5 font-mono text-[11px]">
                    {wrongBookCount}
                  </span>
                </Button>

                {hasActiveFilters && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleResetFilters}
                    className="gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>重置筛选</span>
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {/* Chapter Dropdown */}
              <div className="space-y-1">
                <label htmlFor="practice-chapter-select" className="text-[11px] font-medium text-muted-foreground">
                  章节范围
                </label>
                <select
                  id="practice-chapter-select"
                  value={chapterFilter}
                  onChange={(e) => {
                    const nextCh = e.target.value;
                    setChapterFilter(nextCh);
                    if (nextCh !== 'ALL') {
                      const found = getChapterById(nextCh);
                      if (found && subjectFilter === 'ALL') {
                        setSubjectFilter(found.subject);
                      }
                    }
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="ALL">全部章节</option>
                  {chapterOptions.map((ch) => {
                    const cnt = questionCountByChapter[ch.id] ?? 0;
                    return (
                      <option key={ch.id} value={ch.id}>
                        {ch.id} {ch.title} ({cnt}题)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* SourceTag Dropdown */}
              <div className="space-y-1">
                <label htmlFor="practice-source-select" className="text-[11px] font-medium text-muted-foreground">
                  题目来源
                </label>
                <select
                  id="practice-source-select"
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value as 'ALL' | SourceTag)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {SOURCE_TAG_OPTIONS.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag === 'ALL' ? '全部来源' : tag}
                    </option>
                  ))}
                </select>
              </div>

              {/* Difficulty Dropdown */}
              <div className="space-y-1">
                <label htmlFor="practice-diff-select" className="text-[11px] font-medium text-muted-foreground">
                  难度分级
                </label>
                <select
                  id="practice-diff-select"
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value as 'ALL' | Difficulty)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {DIFFICULTY_OPTIONS.map((diff) => (
                    <option key={diff} value={diff}>
                      {diff === 'ALL' ? '全部难度' : diff}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type Dropdown */}
              <div className="space-y-1">
                <label htmlFor="practice-type-select" className="text-[11px] font-medium text-muted-foreground">
                  题型过滤
                </label>
                <select
                  id="practice-type-select"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as 'ALL' | Question['type'])}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Keyword Search */}
              <div className="space-y-1">
                <label htmlFor="practice-keyword-input" className="text-[11px] font-medium text-muted-foreground">
                  关键词搜索
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="practice-keyword-input"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="题号、考点、Cache、流水线..."
                    className="pl-8 pr-8"
                  />
                  {keyword && (
                    <button
                      type="button"
                      onClick={() => setKeyword('')}
                      aria-label="清空搜索关键词"
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center gap-2">
                <span>
                  当前匹配{' '}
                  <strong className="font-mono text-foreground">{filteredQuestions.length}</strong> 道题
                </span>
                <span className="text-border">|</span>
                <span>
                  单选 <strong className="font-mono text-foreground">{filteredChoiceCount}</strong> 题 · 综合大题{' '}
                  <strong className="font-mono text-foreground">{filteredCompCount}</strong> 题
                </span>
              </div>
              {wrongOnly && (
                <Link
                  to="/wrong-book"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  <span>管理错题本与备份</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PracticeTab)}>
        {/* ===================== STUDY MODE ===================== */}
        <TabsContent value="study" className="mt-0 space-y-5">
          {filteredQuestions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center space-y-4 py-14 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Target className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-semibold">
                    {wrongOnly ? '错题重练队列为空' : '当前筛选条件下暂无匹配题目'}
                  </h3>
                  <p className="max-w-md text-sm text-muted-foreground">
                    {wrongOnly
                      ? '你当前还没有待复习的错题（或在筛选条件下无错题）。可在做题时手动收入错题本，或前往错题本导入备份。'
                      : '尝试放宽章节、来源、难度筛选或清空关键词搜索。'}
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {hasActiveFilters && (
                    <Button type="button" onClick={handleResetFilters}>
                      查看全部可用题库
                    </Button>
                  )}
                  {wrongOnly && (
                    <Button variant="outline" asChild>
                      <Link to="/wrong-book">前往错题本</Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Question Selector Palette Strip */}
              <Card>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                      <span className="inline-flex items-center gap-1 text-foreground">
                        <Layers className="h-3.5 w-3.5 text-primary" />
                        <span>选题面板（第 {studyIndex + 1} / {filteredQuestions.length} 题）</span>
                      </span>
                      <span className="hidden text-border sm:inline">|</span>
                      <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2.5 w-2.5 rounded-sm border bg-background" />
                          <span>未作答</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2.5 w-2.5 rounded-sm border border-emerald-500/50 bg-emerald-500/20" />
                          <span>答对/达标</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2.5 w-2.5 rounded-sm border border-rose-500/50 bg-rose-500/20" />
                          <span>答错/待巩固</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2.5 w-2.5 rounded-sm border border-violet-500/50 bg-violet-500/15" />
                          <span>综合大题</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={studyIndex <= 0}
                        onClick={() => handleSelectQuestionIndex(studyIndex - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span>上一题</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={studyIndex >= filteredQuestions.length - 1}
                        onClick={() => handleSelectQuestionIndex(studyIndex + 1)}
                      >
                        <span>下一题</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {filteredQuestions.map((q, idx) => {
                      const attempt = progress.attempts[q.id];
                      const isCurrent = idx === studyIndex;
                      const inWrong = Boolean(progress.wrongBook[q.id]);
                      const isComp = q.type === 'comprehensive';

                      let statusClass =
                        'border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground';
                      if (attempt?.lastIsCorrect === true) {
                        statusClass =
                          'border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
                      } else if (attempt?.lastIsCorrect === false) {
                        statusClass =
                          'border-rose-500/50 bg-rose-500/15 text-rose-700 dark:text-rose-300';
                      } else if (isComp) {
                        statusClass =
                          'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300';
                      }

                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => handleSelectQuestionIndex(idx)}
                          title={`${q.id} · ${q.kpTitle}`}
                          className={cn(
                            'relative flex h-8 min-w-[2.1rem] items-center justify-center rounded-md border px-1.5 font-mono text-xs font-medium transition-all',
                            statusClass,
                            isCurrent && 'ring-2 ring-primary ring-offset-2 ring-offset-background font-bold',
                          )}
                        >
                          <span>{idx + 1}</span>
                          {isComp && (
                            <span className="ml-0.5 text-[9px] opacity-80">综</span>
                          )}
                          {inWrong && (
                            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-rose-500 ring-1 ring-background" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Current Active Question Detail Card */}
              {currentQuestion && (
                <Card className="overflow-hidden">
                  <CardHeader className="space-y-3 border-b bg-muted/25 pb-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="font-mono font-semibold">
                          {currentQuestion.id}
                        </Badge>
                        <Link to={`/notes/${currentQuestion.subject}/${currentQuestion.chapterId}`}>
                          <Badge variant="secondary" className="gap-1 hover:bg-secondary/80">
                            <BookOpen className="h-3 w-3" />
                            <span>{currentQuestion.chapterId}</span>
                          </Badge>
                        </Link>
                        <Badge variant="outline" className="max-w-full truncate">
                          {currentQuestion.kpTitle}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(getSourceTagClass(currentQuestion.sourceTag))}
                        >
                          {currentQuestion.sourceTag}
                        </Badge>
                        <Badge variant={getDifficultyVariant(currentQuestion.difficulty)}>
                          {currentQuestion.difficulty}
                        </Badge>
                        {currentQuestion.type === 'comprehensive' ? (
                          <Badge className="border-violet-500/35 bg-violet-500/15 text-violet-700 dark:text-violet-300">
                            综合大题 · {currentQuestion.totalPoints} 分
                          </Badge>
                        ) : (
                          <Badge variant="outline">单选题 · 2 分</Badge>
                        )}
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant={progress.wrongBook[currentQuestion.id] ? 'secondary' : 'outline'}
                        onClick={() => handleToggleWrongBook(currentQuestion.id)}
                        className={cn(
                          'gap-1.5 shrink-0',
                          progress.wrongBook[currentQuestion.id] &&
                            'border-rose-500/35 bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 dark:text-rose-300',
                        )}
                      >
                        {progress.wrongBook[currentQuestion.id] ? (
                          <>
                            <BookmarkCheck className="h-4 w-4" />
                            <span>已在错题本·移出</span>
                          </>
                        ) : (
                          <>
                            <BookmarkPlus className="h-4 w-4" />
                            <span>加入错题本</span>
                          </>
                        )}
                      </Button>
                    </div>

                    {/* History & Wrong-Book Retry Info Bar */}
                    {(progress.attempts[currentQuestion.id] || progress.wrongBook[currentQuestion.id]) && (
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {progress.attempts[currentQuestion.id] && (
                          <span>
                            历史作答：共{' '}
                            <strong className="font-mono text-foreground">
                              {progress.attempts[currentQuestion.id].attempts}
                            </strong>{' '}
                            次
                            {currentQuestion.type === 'single_choice' ? (
                              <>
                                {' · '}上次选{' '}
                                <strong className="font-mono text-foreground">
                                  {progress.attempts[currentQuestion.id].lastChoice}
                                </strong>
                                （
                                {progress.attempts[currentQuestion.id].lastIsCorrect ? (
                                  <span className="text-emerald-600 dark:text-emerald-400">正确</span>
                                ) : (
                                  <span className="text-rose-600 dark:text-rose-400">错误</span>
                                )}
                                ）
                              </>
                            ) : (
                              progress.attempts[currentQuestion.id].lastSelfScore !== undefined && (
                                <>
                                  {' · '}上次自评{' '}
                                  <strong className="font-mono text-foreground">
                                    {progress.attempts[currentQuestion.id].lastSelfScore} /{' '}
                                    {currentQuestion.totalPoints}
                                  </strong>{' '}
                                  分
                                </>
                              )
                            )}
                          </span>
                        )}
                        {progress.wrongBook[currentQuestion.id] && (
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-rose-700 dark:text-rose-300">
                            <span>错因：{progress.wrongBook[currentQuestion.id].reason}</span>
                            <span>·</span>
                            <span>
                              重练连续答对 {progress.wrongBook[currentQuestion.id].retryCorrectStreak} 次
                            </span>
                          </span>
                        )}
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-6 p-5 sm:p-6">
                    {currentQuestion.type === 'single_choice' ? (
                      <StudySingleChoiceBody
                        question={currentQuestion}
                        sessionState={studyChoiceSession[currentQuestion.id]}
                        analysisVisible={Boolean(studyAnalysisVisible[currentQuestion.id])}
                        onSelectChoice={(choice) => handleSelectStudyChoice(currentQuestion, choice)}
                        onResetChoice={() => handleResetStudyChoice(currentQuestion.id)}
                        onToggleAnalysis={() =>
                          setStudyAnalysisVisible((prev) => ({
                            ...prev,
                            [currentQuestion.id]: !prev[currentQuestion.id],
                          }))
                        }
                      />
                    ) : (
                      <StudyComprehensiveBody
                        question={currentQuestion}
                        hintsShown={hintsShownCount[currentQuestion.id] ?? 0}
                        draftText={studyCompDrafts[currentQuestion.id] ?? ''}
                        revealedSubs={revealedSubs[currentQuestion.id] ?? {}}
                        subScores={subScores[currentQuestion.id] ?? {}}
                        fullSolutionOpen={Boolean(fullSolutionOpen[currentQuestion.id])}
                        savedFeedback={compSavedFeedback[currentQuestion.id]}
                        onRevealNextHint={() => handleRevealNextHint(currentQuestion)}
                        onResetHints={() =>
                          setHintsShownCount((prev) => ({ ...prev, [currentQuestion.id]: 0 }))
                        }
                        onDraftChange={(text) =>
                          setStudyCompDrafts((prev) => ({ ...prev, [currentQuestion.id]: text }))
                        }
                        onToggleSub={(idx) => handleToggleSubAnswer(currentQuestion.id, idx)}
                        onRevealAllSubs={(open) => handleRevealAllSubs(currentQuestion, open)}
                        onSetSubScore={(idx, score) =>
                          handleSetSubScore(currentQuestion.id, idx, score)
                        }
                        onToggleFullSolution={() =>
                          setFullSolutionOpen((prev) => ({
                            ...prev,
                            [currentQuestion.id]: !prev[currentQuestion.id],
                          }))
                        }
                        onSaveSelfEval={() => handleSaveCompSelfEval(currentQuestion)}
                      />
                    )}

                    {/* Bottom Prev/Next Navigation */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={studyIndex <= 0}
                        onClick={() => handleSelectQuestionIndex(studyIndex - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span>上一题</span>
                      </Button>

                      <span className="font-mono text-xs text-muted-foreground">
                        {studyIndex + 1} / {filteredQuestions.length}
                      </span>

                      <Button
                        type="button"
                        variant="outline"
                        disabled={studyIndex >= filteredQuestions.length - 1}
                        onClick={() => handleSelectQuestionIndex(studyIndex + 1)}
                      >
                        <span>下一题</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ===================== EXAM MODE ===================== */}
        <TabsContent value="exam" className="mt-0 space-y-6">
          {/* SETUP PANEL */}
          {examPhase === 'setup' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ClipboardCheck className="h-5 w-5 text-primary" />
                    <span>配置本次刷题 / 模拟考试范围</span>
                  </CardTitle>
                  <CardDescription>
                    模考过程中将隐藏参考答案与解析，全程计时并保留草稿记录，交卷后统一自动批改单选并支持综合大题自评与错题一键收纳。
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-3 md:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => setExamScope('all_filtered')}
                      className={cn(
                        'flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all',
                        examScope === 'all_filtered'
                          ? 'border-primary bg-primary/10 ring-1 ring-primary'
                          : 'hover:bg-accent/50',
                      )}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="font-semibold text-sm">使用当前筛选结果全部题</span>
                        <Badge variant="outline" className="font-mono">
                          {scopePreviewCounts.all_filtered} 题
                        </Badge>
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        按上方筛选条件顺序完整作答所有单选与综合大题，适合整章验收或错题队列集中闭卷重测。
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExamScope('choice_only')}
                      className={cn(
                        'flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all',
                        examScope === 'choice_only'
                          ? 'border-primary bg-primary/10 ring-1 ring-primary'
                          : 'hover:bg-accent/50',
                      )}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="font-semibold text-sm">仅客观单选题快速测</span>
                        <Badge variant="outline" className="font-mono">
                          {scopePreviewCounts.choice_only} 题
                        </Badge>
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        仅抽取当前筛选范围中的客观选择题（每题 2 分），交卷后秒出正确率与错题汇总。
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExamScope('timed_15')}
                      className={cn(
                        'flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all',
                        examScope === 'timed_15'
                          ? 'border-primary bg-primary/10 ring-1 ring-primary'
                          : 'hover:bg-accent/50',
                      )}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="font-semibold text-sm">20 分钟限时抽测 15 题</span>
                        <Badge variant="outline" className="font-mono">
                          {scopePreviewCounts.timed_15} 题
                        </Badge>
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        从当前筛选范围随机抽样最多 15 题（优先客观单选），附带 20:00 限时参考节奏条。
                      </p>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/35 px-4 py-3">
                    <div className="text-sm">
                      <span className="text-muted-foreground">本次将生成试卷：</span>
                      <strong className="font-mono text-foreground">
                        {scopePreviewCounts[examScope]} 题
                      </strong>
                      {scopePreviewCounts[examScope] === 0 && (
                        <span className="ml-2 text-xs text-rose-600 dark:text-rose-400">
                          当前筛选范围内暂无可用题目，请先调整上方筛选条件
                        </span>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="lg"
                      disabled={scopePreviewCounts[examScope] === 0}
                      onClick={handleStartExam}
                      className="gap-2"
                    >
                      <Play className="h-4 w-4" />
                      <span>开始模考</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Exam History */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <History className="h-4 w-4 text-primary" />
                    <span>近期模考战绩记录（localStorage 本地持久化）</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {progress.examHistory.length === 0 ? (
                    <div className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
                      暂无模考记录，点击上方「开始模考」并交卷后将在此展示历次正确率与耗时轨迹。
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {progress.examHistory.slice(0, 10).map((item) => {
                        const acc =
                          item.totalChoice > 0
                            ? Math.round((item.correctChoice / item.totalChoice) * 100)
                            : null;
                        return (
                          <div
                            key={item.id}
                            className="flex flex-col gap-2 rounded-xl border bg-card p-3.5 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold">{item.title}</span>
                                <Badge variant="outline" className="font-mono text-[11px]">
                                  {formatDateTime(item.createdAt)}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  用时 {formatDuration(item.durationSeconds)}
                                </span>
                                {item.totalChoice > 0 && (
                                  <span>
                                    单选{' '}
                                    <strong className="font-mono text-foreground">
                                      {item.correctChoice}/{item.totalChoice}
                                    </strong>{' '}
                                    ({item.choiceScore}/{item.choiceMaxScore} 分)
                                  </span>
                                )}
                                {item.selfEvalMaxScore > 0 && (
                                  <span>
                                    含综合大题满分{' '}
                                    <strong className="font-mono text-foreground">
                                      {item.selfEvalMaxScore}
                                    </strong>{' '}
                                    分
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {acc !== null && (
                                <Badge
                                  variant={acc >= 80 ? 'success' : acc >= 60 ? 'warning' : 'danger'}
                                  className="font-mono"
                                >
                                  单选正确率 {acc}%
                                </Badge>
                              )}
                              {item.wrongIds.length > 0 && (
                                <Badge variant="outline" className="font-mono text-rose-600 dark:text-rose-400">
                                  错 {item.wrongIds.length} 题
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ACTIVE EXAM VIEW */}
          {examPhase === 'active' && examQuestions.length > 0 && (
            <div className="space-y-5">
              {/* Top Active Exam Bar */}
              <Card className="border-primary/30 bg-card">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="default">闭卷模考中</Badge>
                      <span className="text-sm font-semibold">{examTitle}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        已作答进度：
                        <strong className="ml-1 font-mono text-foreground">
                          {examAnsweredCount} / {examQuestions.length}
                        </strong>
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Clock
                          className={cn(
                            'h-3.5 w-3.5',
                            examTimeLimitSec && examElapsedSec > examTimeLimitSec
                              ? 'text-rose-500'
                              : 'text-primary',
                          )}
                        />
                        <span
                          className={cn(
                            'font-semibold',
                            examTimeLimitSec && examElapsedSec > examTimeLimitSec
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-foreground',
                          )}
                        >
                          {formatDuration(examElapsedSec)}
                        </span>
                        {examTimeLimitSec && (
                          <span>/ 限时 {formatDuration(examTimeLimitSec)}</span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setExamPhase('setup')}
                    >
                      退出本次模考
                    </Button>

                    {!examConfirmSubmit ? (
                      <Button
                        type="button"
                        onClick={() => {
                          if (examAnsweredCount < examQuestions.length) {
                            setExamConfirmSubmit(true);
                          } else {
                            handleSubmitExam();
                          }
                        }}
                        className="gap-1.5"
                      >
                        <Send className="h-4 w-4" />
                        <span>交卷并统一批改</span>
                      </Button>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/45 bg-amber-500/10 px-3 py-1.5 text-xs">
                        <span className="font-medium text-amber-800 dark:text-amber-300">
                          还有 {examQuestions.length - examAnsweredCount} 题未作答，确认交卷？
                        </span>
                        <Button type="button" size="sm" variant="default" onClick={handleSubmitExam}>
                          确认交卷
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setExamConfirmSubmit(false)}
                        >
                          继续作答
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Main Exam Split Layout: Question Area + Floating/Sticky Palette */}
              <div className="grid gap-5 lg:grid-cols-[1fr_280px] lg:items-start">
                {/* Active Question Card */}
                {(() => {
                  const activeQ = examQuestions[examCurrentIdx];
                  if (!activeQ) return null;
                  return (
                    <Card>
                      <CardHeader className="space-y-2 border-b bg-muted/25 pb-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="default" className="font-mono">
                              第 {examCurrentIdx + 1} / {examQuestions.length} 题
                            </Badge>
                            <Badge variant="outline" className="font-mono">
                              {activeQ.id}
                            </Badge>
                            <Badge variant="secondary">{activeQ.chapterId}</Badge>
                            <Badge variant={getDifficultyVariant(activeQ.difficulty)}>
                              {activeQ.difficulty}
                            </Badge>
                          </div>
                          <Badge variant="outline" className="font-mono">
                            {activeQ.type === 'comprehensive'
                              ? `综合大题 · ${activeQ.totalPoints} 分`
                              : '单选题 · 2 分'}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-5 p-5 sm:p-6">
                        {activeQ.type === 'comprehensive' && (
                          <h3 className="text-base font-semibold">{activeQ.title}</h3>
                        )}

                        <MarkdownRenderer content={activeQ.stem} compact />

                        {activeQ.type === 'single_choice' ? (
                          <div className="space-y-2.5">
                            {activeQ.options.map((opt) => {
                              const isSelected = examDraftChoices[activeQ.id] === opt.key;
                              return (
                                <button
                                  key={opt.key}
                                  type="button"
                                  onClick={() => {
                                    setExamDraftChoices((prev) => ({
                                      ...prev,
                                      [activeQ.id]: opt.key,
                                    }));
                                    setExamConfirmSubmit(false);
                                  }}
                                  className={cn(
                                    'flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-all',
                                    isSelected
                                      ? 'border-primary bg-primary/10 ring-1 ring-primary'
                                      : 'border-border bg-card hover:bg-accent/50',
                                  )}
                                >
                                  <span
                                    className={cn(
                                      'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border font-mono text-xs font-semibold',
                                      isSelected
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'border-border bg-muted/60 text-foreground',
                                    )}
                                  >
                                    {opt.key}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <MarkdownRenderer
                                      content={opt.text}
                                      compact
                                      className="[&>p:first-child]:mt-0 [&>p:last-child]:mb-0 [&>p]:my-0"
                                    />
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="space-y-2 rounded-xl border bg-muted/25 p-4">
                              <div className="text-xs font-semibold text-muted-foreground">
                                各小问设问清单（答案与解析将在交卷后统一展示）：
                              </div>
                              <div className="space-y-2">
                                {activeQ.subQuestions.map((sub, sIdx) => (
                                  <div key={sIdx} className="flex items-start gap-2 text-sm">
                                    <span className="shrink-0 font-semibold text-primary">
                                      {sub.label}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <MarkdownRenderer
                                        content={sub.prompt}
                                        compact
                                        className="[&>p:first-child]:mt-0 [&>p:last-child]:mb-0 [&>p]:my-0"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <label
                                  htmlFor={`exam-note-${activeQ.id}`}
                                  className="text-xs font-medium text-muted-foreground"
                                >
                                  草稿与求解步骤记录（交卷后将与参考答案并排对照自评）
                                </label>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={examDraftCheckpoints[activeQ.id] ? 'default' : 'outline'}
                                  onClick={() =>
                                    setExamDraftCheckpoints((prev) => ({
                                      ...prev,
                                      [activeQ.id]: !prev[activeQ.id],
                                    }))
                                  }
                                  className="gap-1.5"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span>
                                    {examDraftCheckpoints[activeQ.id]
                                      ? '已标记完成作答'
                                      : '纸笔完成·打勾标记'}
                                  </span>
                                </Button>
                              </div>
                              <textarea
                                id={`exam-note-${activeQ.id}`}
                                rows={5}
                                value={examDraftNotes[activeQ.id] ?? ''}
                                onChange={(e) =>
                                  setExamDraftNotes((prev) => ({
                                    ...prev,
                                    [activeQ.id]: e.target.value,
                                  }))
                                }
                                placeholder="在此输入解题关键推导、公式或分步结论（若在草稿纸上作答，也可点击右侧「纸笔完成·打勾标记」）..."
                                className="w-full rounded-xl border border-input bg-background p-3 text-sm leading-relaxed shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={examCurrentIdx <= 0}
                            onClick={() => setExamCurrentIdx((i) => Math.max(0, i - 1))}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            <span>上一题</span>
                          </Button>

                          {examCurrentIdx < examQuestions.length - 1 ? (
                            <Button
                              type="button"
                              onClick={() =>
                                setExamCurrentIdx((i) => Math.min(examQuestions.length - 1, i + 1))
                              }
                            >
                              <span>下一题</span>
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              onClick={() => {
                                if (examAnsweredCount < examQuestions.length) {
                                  setExamConfirmSubmit(true);
                                } else {
                                  handleSubmitExam();
                                }
                              }}
                              className="gap-1.5"
                            >
                              <Send className="h-4 w-4" />
                              <span>到达末题·交卷批改</span>
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* Floating / Sticky Exam Question Palette */}
                <Card className="lg:sticky lg:top-20">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-1.5">
                        <ListChecks className="h-4 w-4 text-primary" />
                        <span>答题卡导航</span>
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {examAnsweredCount}/{examQuestions.length}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Progress
                      value={
                        examQuestions.length > 0
                          ? (examAnsweredCount / examQuestions.length) * 100
                          : 0
                      }
                    />
                    <div className="grid grid-cols-5 gap-1.5">
                      {examQuestions.map((q, idx) => {
                        const answered = isExamQuestionAnswered(q);
                        const isCurr = idx === examCurrentIdx;
                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => setExamCurrentIdx(idx)}
                            className={cn(
                              'flex h-8 items-center justify-center rounded-md border font-mono text-xs font-medium transition-all',
                              answered
                                ? 'border-sky-500/50 bg-sky-500/15 text-sky-700 dark:text-sky-300'
                                : 'border-border bg-background text-muted-foreground hover:bg-accent',
                              isCurr && 'ring-2 ring-primary ring-offset-2 ring-offset-background font-bold',
                            )}
                          >
                            {idx + 1}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2.5 w-2.5 rounded-sm border border-sky-500/50 bg-sky-500/20" />
                        <span>已作答</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2.5 w-2.5 rounded-sm border bg-background" />
                        <span>未作答</span>
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="default"
                      className="w-full gap-1.5"
                      onClick={() => {
                        if (examAnsweredCount < examQuestions.length) {
                          setExamConfirmSubmit(true);
                        } else {
                          handleSubmitExam();
                        }
                      }}
                    >
                      <Send className="h-4 w-4" />
                      <span>交卷并统一批改</span>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* GRADED RESULT VIEW */}
          {examPhase === 'graded' && examResultSummary && (
            <div className="space-y-6">
              {/* Summary Score Card */}
              <Card className="border-primary/30 bg-gradient-to-br from-card via-card to-emerald-500/5">
                <CardContent className="space-y-5 p-5 sm:p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="success" className="gap-1">
                          <Trophy className="h-3.5 w-3.5" />
                          <span>模考已交卷批改</span>
                        </Badge>
                        <Badge variant="outline" className="font-mono">
                          耗时 {formatDuration(examResultSummary.durationSeconds)}
                        </Badge>
                      </div>
                      <h2 className="text-xl font-bold">{examResultSummary.title}</h2>
                      <p className="text-xs text-muted-foreground">
                        已自动写入本地模考历史记录；客观题每题 2 分已精确判分，综合大题可在下方对照答案进行自评打分。
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {examResultSummary.wrongIds.length > 0 && (
                        <Button
                          type="button"
                          variant={remainingWrongToAddCount === 0 ? 'secondary' : 'destructive'}
                          onClick={handleBulkAddWrongToBook}
                          disabled={remainingWrongToAddCount === 0}
                          className="gap-1.5"
                        >
                          <BookmarkPlus className="h-4 w-4" />
                          <span>
                            {remainingWrongToAddCount === 0
                              ? `已将 ${examResultSummary.wrongIds.length} 道错题全部纳入错题本`
                              : `将所有答错单选加入错题本 (${remainingWrongToAddCount})`}
                          </span>
                        </Button>
                      )}
                      <Button type="button" variant="outline" onClick={() => setExamPhase('setup')}>
                        返回模考配置
                      </Button>
                      <Button variant="secondary" asChild>
                        <Link to="/wrong-book">前往错题本</Link>
                      </Button>
                    </div>
                  </div>

                  {/* Score Metrics Grid */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border bg-background/70 p-4">
                      <div className="text-xs text-muted-foreground">客观单选正确率</div>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="font-mono text-2xl font-bold">
                          {examResultSummary.totalChoice > 0
                            ? `${Math.round(
                                (examResultSummary.correctChoice / examResultSummary.totalChoice) *
                                  100,
                              )}%`
                            : '—'}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {examResultSummary.correctChoice} / {examResultSummary.totalChoice} 题
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl border bg-background/70 p-4">
                      <div className="text-xs text-muted-foreground">客观题得分（2 分/题）</div>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                          {examResultSummary.choiceScore}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          / {examResultSummary.choiceMaxScore} 分
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl border bg-background/70 p-4">
                      <div className="text-xs text-muted-foreground">综合大题自评总分</div>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="font-mono text-2xl font-bold text-violet-600 dark:text-violet-400">
                          {examResultSummary.selfEvalMaxScore > 0 ? liveExamCompSelfScore : '—'}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {examResultSummary.selfEvalMaxScore > 0
                            ? `/ ${examResultSummary.selfEvalMaxScore} 分`
                            : '本次无综合大题'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Choice Review Section */}
              {examChoiceQuestions.length > 0 && (
                <Card>
                  <CardHeader className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="text-base">
                        客观单选题逐题批改解析（{examChoiceQuestions.length} 题）
                      </CardTitle>
                      <CardDescription>
                        答对 {examResultSummary.correctChoice} 题 · 答错/未答{' '}
                        {examResultSummary.wrongIds.length} 题
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant={examReviewFilter === 'all' ? 'default' : 'outline'}
                        onClick={() => setExamReviewFilter('all')}
                      >
                        全部 ({examChoiceQuestions.length})
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={examReviewFilter === 'wrong' ? 'destructive' : 'outline'}
                        onClick={() => setExamReviewFilter('wrong')}
                      >
                        仅看错题/未答 ({examResultSummary.wrongIds.length})
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 p-5">
                    {examChoiceQuestions
                      .filter(
                        (cq) =>
                          examReviewFilter === 'all' || examDraftChoices[cq.id] !== cq.answer,
                      )
                      .map((cq) => {
                        const chosen = examDraftChoices[cq.id];
                        const isCorrect = chosen === cq.answer;
                        const inWrongBook = Boolean(progress.wrongBook[cq.id]);

                        return (
                          <div
                            key={cq.id}
                            className={cn(
                              'space-y-3 rounded-xl border p-4',
                              isCorrect
                                ? 'border-emerald-500/35 bg-emerald-500/5'
                                : 'border-rose-500/35 bg-rose-500/5',
                            )}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="font-mono">
                                  {cq.id}
                                </Badge>
                                <Badge variant="secondary">{cq.chapterId}</Badge>
                                {isCorrect ? (
                                  <Badge variant="success" className="gap-1">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>答对 (+2 分)</span>
                                  </Badge>
                                ) : (
                                  <Badge variant="danger" className="gap-1">
                                    <XCircle className="h-3.5 w-3.5" />
                                    <span>
                                      {chosen ? `错选 ${chosen}` : '未作答'} · 正确答案 {cq.answer}
                                    </span>
                                  </Badge>
                                )}
                              </div>

                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleToggleWrongBook(cq.id)}
                                className="gap-1"
                              >
                                {inWrongBook ? (
                                  <>
                                    <BookmarkCheck className="h-3.5 w-3.5 text-rose-500" />
                                    <span>已在错题本</span>
                                  </>
                                ) : (
                                  <>
                                    <BookmarkPlus className="h-3.5 w-3.5" />
                                    <span>加入错题本</span>
                                  </>
                                )}
                              </Button>
                            </div>

                            <MarkdownRenderer content={cq.stem} compact />

                            <div className="grid gap-2 sm:grid-cols-2">
                              {cq.options.map((opt) => {
                                const isAns = opt.key === cq.answer;
                                const isUserWrong = chosen === opt.key && !isAns;
                                return (
                                  <div
                                    key={opt.key}
                                    className={cn(
                                      'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm',
                                      isAns
                                        ? 'border-emerald-500/60 bg-emerald-500/15'
                                        : isUserWrong
                                          ? 'border-rose-500/60 bg-rose-500/15'
                                          : 'border-border bg-background/70 opacity-80',
                                    )}
                                  >
                                    <span className="mt-0.5 font-mono text-xs font-bold">
                                      {opt.key}.
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <MarkdownRenderer
                                        content={opt.text}
                                        compact
                                        className="[&>p:first-child]:mt-0 [&>p:last-child]:mb-0 [&>p]:my-0"
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="space-y-2 rounded-lg border bg-background/85 p-3.5">
                              <MarkdownRenderer content={cq.analysis} compact />
                              <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-300">
                                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                <span>核心口诀：{cq.keyTakeaway}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </CardContent>
                </Card>
              )}

              {/* Comprehensive Self-Evaluation Review Section */}
              {examCompQuestions.length > 0 && (
                <Card>
                  <CardHeader className="border-b pb-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Award className="h-5 w-5 text-violet-500" />
                      <span>综合大题对照自评打分台（{examCompQuestions.length} 题）</span>
                    </CardTitle>
                    <CardDescription>
                      对照你交卷时的草稿思路与分步踩分点逐小问打分，点击保存即可将自评结果同步至个人学习档案。
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 p-5">
                    {examCompQuestions.map((cq) => {
                      const scoresMap = examGradedSubScores[cq.id] ?? {};
                      const qScore = cq.subQuestions.reduce(
                        (s, _sub, idx) => s + (scoresMap[idx] ?? 0),
                        0,
                      );
                      const isSaved = Boolean(examGradedCompSaved[cq.id]);
                      const solOpen = Boolean(examGradedCompSolutionOpen[cq.id]);

                      return (
                        <div key={cq.id} className="space-y-4 rounded-xl border p-4 sm:p-5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className="font-mono">
                                {cq.id}
                              </Badge>
                              <Badge variant="secondary">{cq.chapterId}</Badge>
                              <span className="font-semibold text-sm">{cq.title}</span>
                            </div>
                            <Badge className="border-violet-500/35 bg-violet-500/15 font-mono text-violet-700 dark:text-violet-300">
                              自评 {qScore} / {cq.totalPoints} 分
                            </Badge>
                          </div>

                          <MarkdownRenderer content={cq.stem} compact />

                          <div className="rounded-lg border bg-muted/35 p-3">
                            <div className="mb-1 text-xs font-semibold text-muted-foreground">
                              我的模考草稿记录：
                            </div>
                            <p className="whitespace-pre-wrap text-sm">
                              {examDraftNotes[cq.id]?.trim()
                                ? examDraftNotes[cq.id]
                                : examDraftCheckpoints[cq.id]
                                  ? '（已标记纸笔完成作答，无在线文字草稿）'
                                  : '（交卷时未填写草稿）'}
                            </p>
                          </div>

                          <div className="space-y-3">
                            {cq.subQuestions.map((sub, sIdx) => (
                              <ComprehensiveSubQuestionItem
                                key={sIdx}
                                sub={sub}
                                isAnswerOpen
                                selectedScore={scoresMap[sIdx] ?? 0}
                                onSelectScore={(pts) => {
                                  setExamGradedSubScores((prev) => ({
                                    ...prev,
                                    [cq.id]: { ...(prev[cq.id] ?? {}), [sIdx]: pts },
                                  }));
                                  setExamGradedCompSaved((prev) => ({
                                    ...prev,
                                    [cq.id]: false,
                                  }));
                                }}
                              />
                            ))}
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setExamGradedCompSolutionOpen((prev) => ({
                                  ...prev,
                                  [cq.id]: !prev[cq.id],
                                }))
                              }
                              className="gap-1.5"
                            >
                              {solOpen ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                              <span>{solOpen ? '收起完整权威解析' : '展开完整权威解析与易错避坑'}</span>
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              variant={isSaved ? 'secondary' : 'default'}
                              onClick={() => handleSaveExamCompSelfEval(cq)}
                              className="gap-1.5"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              <span>
                                {isSaved
                                  ? `已保存自评 (${qScore}/${cq.totalPoints} 分)`
                                  : `保存本题自评成绩 (${qScore}/${cq.totalPoints} 分)`}
                              </span>
                            </Button>
                          </div>

                          {solOpen && (
                            <ComprehensiveSolutionBox
                              fullSolution={cq.fullSolution}
                              pitfalls={cq.pitfalls}
                            />
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

/* ============================================================================
 * Study Mode Subcomponents
 * ========================================================================== */

interface StudySingleChoiceBodyProps {
  question: ChoiceQuestion;
  sessionState?: { choice: ChoiceKey; submitted: boolean };
  analysisVisible: boolean;
  onSelectChoice: (choice: ChoiceKey) => void;
  onResetChoice: () => void;
  onToggleAnalysis: () => void;
}

const StudySingleChoiceBody: React.FC<StudySingleChoiceBodyProps> = ({
  question,
  sessionState,
  analysisVisible,
  onSelectChoice,
  onResetChoice,
  onToggleAnalysis,
}) => {
  const isSubmitted = Boolean(sessionState?.submitted);
  const chosenKey = sessionState?.choice;

  return (
    <div className="space-y-5">
      <MarkdownRenderer content={question.stem} compact />

      <div className="space-y-2.5">
        {question.options.map((opt) => {
          const isChosen = chosenKey === opt.key;
          const isAnswer = opt.key === question.answer;

          let cardClass = 'border-border bg-card hover:border-primary/50 hover:bg-accent/40';
          let keyClass = 'border-border bg-muted/60 text-foreground';

          if (isSubmitted) {
            if (isAnswer) {
              cardClass = 'border-emerald-500/70 bg-emerald-500/10 ring-1 ring-emerald-500/40';
              keyClass = 'border-emerald-500 bg-emerald-500 text-white';
            } else if (isChosen && !isAnswer) {
              cardClass = 'border-rose-500/70 bg-rose-500/10 ring-1 ring-rose-500/40';
              keyClass = 'border-rose-500 bg-rose-500 text-white';
            } else {
              cardClass = 'border-border bg-card/60 opacity-75';
            }
          }

          return (
            <button
              key={opt.key}
              type="button"
              disabled={isSubmitted}
              onClick={() => onSelectChoice(opt.key)}
              className={cn(
                'flex w-full items-start justify-between gap-3 rounded-xl border p-3.5 text-left transition-all disabled:cursor-default',
                cardClass,
              )}
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span
                  className={cn(
                    'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border font-mono text-xs font-bold',
                    keyClass,
                  )}
                >
                  {opt.key}
                </span>
                <div className="min-w-0 flex-1">
                  <MarkdownRenderer
                    content={opt.text}
                    compact
                    className="[&>p:first-child]:mt-0 [&>p:last-child]:mb-0 [&>p]:my-0"
                  />
                </div>
              </div>

              {isSubmitted && isAnswer && (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              )}
              {isSubmitted && isChosen && !isAnswer && (
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {isSubmitted ? (
            <>
              <Badge
                variant={chosenKey === question.answer ? 'success' : 'danger'}
                className="px-2.5 py-1 text-xs"
              >
                {chosenKey === question.answer
                  ? `回答正确！标准答案 ${question.answer}`
                  : `你选了 ${chosenKey}，标准答案是 ${question.answer}（已自动记录错题）`}
              </Badge>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onResetChoice}
                className="gap-1"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>重选/再刷一次</span>
              </Button>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">
              点击上方任意选项即可立即判分并记录学习进度
            </span>
          )}
        </div>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onToggleAnalysis}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          {analysisVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          <span>{analysisVisible ? '收起解析' : '查看解析'}</span>
        </Button>
      </div>

      {analysisVisible && (
        <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>题目精解与推导</span>
          </div>
          <MarkdownRenderer content={question.analysis} compact />
          <div className="flex items-start gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3.5 py-2.5 text-xs font-medium text-emerald-800 dark:text-emerald-300">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
            <span>一句话口诀：{question.keyTakeaway}</span>
          </div>
        </div>
      )}
    </div>
  );
};

interface StudyComprehensiveBodyProps {
  question: ComprehensiveQuestion;
  hintsShown: number;
  draftText: string;
  revealedSubs: Record<number, boolean>;
  subScores: Record<number, number>;
  fullSolutionOpen: boolean;
  savedFeedback?: { score: number; maxPoints: number };
  onRevealNextHint: () => void;
  onResetHints: () => void;
  onDraftChange: (text: string) => void;
  onToggleSub: (subIdx: number) => void;
  onRevealAllSubs: (open: boolean) => void;
  onSetSubScore: (subIdx: number, score: number) => void;
  onToggleFullSolution: () => void;
  onSaveSelfEval: () => void;
}

const StudyComprehensiveBody: React.FC<StudyComprehensiveBodyProps> = ({
  question,
  hintsShown,
  draftText,
  revealedSubs,
  subScores,
  fullSolutionOpen,
  savedFeedback,
  onRevealNextHint,
  onResetHints,
  onDraftChange,
  onToggleSub,
  onRevealAllSubs,
  onSetSubScore,
  onToggleFullSolution,
  onSaveSelfEval,
}) => {
  const totalHints = question.hints.length;
  const totalSelfScore = question.subQuestions.reduce(
    (sum, _sub, idx) => sum + (subScores[idx] ?? 0),
    0,
  );
  const passThreshold = Math.ceil(question.totalPoints * 0.7);
  const anySubOpen = question.subQuestions.some((_sub, idx) => Boolean(revealedSubs[idx]));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-bold tracking-tight">{question.title}</h2>
        <MarkdownRenderer content={question.stem} compact />
      </div>

      {/* Progressive Hints Panel */}
      {totalHints > 0 && (
        <div className="space-y-3 rounded-xl border border-amber-500/35 bg-amber-500/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
              <Lightbulb className="h-4 w-4" />
              <span>渐进式分步思路提示</span>
            </div>
            <div className="flex items-center gap-2">
              {hintsShown > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={onResetHints}
                  className="h-8 text-xs text-muted-foreground"
                >
                  收起提示
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={hintsShown >= totalHints}
                onClick={onRevealNextHint}
                className="border-amber-500/40 bg-background/80"
              >
                {hintsShown >= totalHints
                  ? `已显示全部提示 (${hintsShown}/${totalHints})`
                  : `显示下一条提示 (${hintsShown}/${totalHints})`}
              </Button>
            </div>
          </div>

          {hintsShown > 0 && (
            <div className="space-y-2">
              {question.hints.slice(0, hintsShown).map((hint, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 rounded-lg border border-amber-500/25 bg-background/85 px-3.5 py-2.5 text-sm"
                >
                  <Badge variant="warning" className="mt-0.5 shrink-0 font-mono text-[11px]">
                    Hint {idx + 1}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <MarkdownRenderer
                      content={hint}
                      compact
                      className="[&>p:first-child]:mt-0 [&>p:last-child]:mb-0 [&>p]:my-0"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Optional Scratchpad */}
      <div className="space-y-1.5">
        <label
          htmlFor={`study-comp-draft-${question.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
        >
          <FileText className="h-3.5 w-3.5" />
          <span>做题草稿板（可在展开答案前写下关键计算结果）</span>
        </label>
        <textarea
          id={`study-comp-draft-${question.id}`}
          rows={3}
          value={draftText}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder="记录你的分步推导过程或暂存中间数值..."
          className="w-full rounded-xl border border-input bg-background p-3 text-sm leading-relaxed shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* Sub-questions + Self-Evaluation Scorer */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Award className="h-4 w-4 text-violet-500" />
            <span>分步参考答案与自评打分器</span>
          </h3>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onRevealAllSubs(anySubOpen ? false : true)}
          >
            {anySubOpen ? '全部收起答案' : '一键展开全部小问答案'}
          </Button>
        </div>

        <div className="space-y-3">
          {question.subQuestions.map((sub, idx) => (
            <ComprehensiveSubQuestionItem
              key={idx}
              sub={sub}
              isAnswerOpen={Boolean(revealedSubs[idx])}
              onToggleAnswer={() => onToggleSub(idx)}
              selectedScore={subScores[idx] ?? 0}
              onSelectScore={(pts) => onSetSubScore(idx, pts)}
            />
          ))}
        </div>
      </div>

      {/* Save Self Eval Bar */}
      <div className="flex flex-col gap-3 rounded-xl border bg-muted/35 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-sm">
            <span>当前累计自评总分：</span>
            <strong className="font-mono text-lg text-primary">
              {totalSelfScore} / {question.totalPoints} 分
            </strong>
          </div>
          <p className="text-xs text-muted-foreground">
            达到 {passThreshold} 分（70%）视为掌握达标；低于 {passThreshold} 分保存时将自动收入错题本以便重点二刷。
          </p>
        </div>

        <Button type="button" onClick={onSaveSelfEval} className="gap-1.5 shrink-0">
          <CheckCircle2 className="h-4 w-4" />
          <span>保存自评成绩</span>
        </Button>
      </div>

      {savedFeedback && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium',
            savedFeedback.score >= passThreshold
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
          )}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>
            已保存自评成绩：{savedFeedback.score} / {savedFeedback.maxPoints} 分（
            {savedFeedback.score >= passThreshold
              ? '已达到 70% 掌握门槛'
              : '未达 70% 门槛，已自动记入错题本'}
            ）。
          </span>
        </div>
      )}

      {/* Full Authority Solution & Pitfalls Toggle */}
      <div className="space-y-3">
        <Button
          type="button"
          variant="outline"
          onClick={onToggleFullSolution}
          className="w-full justify-between"
        >
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>展开完整权威解析与易错避坑</span>
          </span>
          {fullSolutionOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        {fullSolutionOpen && (
          <ComprehensiveSolutionBox
            fullSolution={question.fullSolution}
            pitfalls={question.pitfalls}
          />
        )}
      </div>
    </div>
  );
};

interface ComprehensiveSubQuestionItemProps {
  sub: ComprehensiveSubQuestion;
  isAnswerOpen: boolean;
  onToggleAnswer?: () => void;
  selectedScore: number;
  onSelectScore: (score: number) => void;
}

const ComprehensiveSubQuestionItem: React.FC<ComprehensiveSubQuestionItemProps> = ({
  sub,
  isAnswerOpen,
  onToggleAnswer,
  selectedScore,
  onSelectScore,
}) => {
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-2 text-sm font-medium">
          <span className="shrink-0 font-bold text-primary">{sub.label}</span>
          <div className="min-w-0 flex-1">
            <MarkdownRenderer
              content={sub.prompt}
              compact
              className="[&>p:first-child]:mt-0 [&>p:last-child]:mb-0 [&>p]:my-0"
            />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            满分 {sub.maxPoints} 分
          </Badge>
          {onToggleAnswer && (
            <Button
              type="button"
              size="sm"
              variant={isAnswerOpen ? 'secondary' : 'outline'}
              onClick={onToggleAnswer}
              className="h-7 gap-1 px-2.5 text-xs"
            >
              {isAnswerOpen ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              <span>{isAnswerOpen ? '隐藏答案' : '核对答案'}</span>
            </Button>
          )}
        </div>
      </div>

      {isAnswerOpen && (
        <div className="space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
          <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            参考答案：
          </div>
          <MarkdownRenderer
            content={sub.answerKey}
            compact
            className="[&>p:first-child]:mt-0 [&>p:last-child]:mb-0 [&>p]:my-0"
          />
          <div className="border-t border-emerald-500/20 pt-1.5 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">踩分标准：</span>
            {sub.scoringRubric}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs text-muted-foreground">小问自评给分：</span>
          {Array.from({ length: sub.maxPoints + 1 }, (_, pts) => (
            <button
              key={pts}
              type="button"
              onClick={() => onSelectScore(pts)}
              className={cn(
                'h-7 min-w-[2rem] rounded-md border px-2 font-mono text-xs font-medium transition-colors',
                selectedScore === pts
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background hover:bg-accent',
              )}
            >
              {pts}
            </button>
          ))}
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          已选 <strong className="text-foreground">{selectedScore}</strong> / {sub.maxPoints} 分
        </span>
      </div>
    </div>
  );
};

interface ComprehensiveSolutionBoxProps {
  fullSolution: string;
  pitfalls: string[];
}

const ComprehensiveSolutionBox: React.FC<ComprehensiveSolutionBoxProps> = ({
  fullSolution,
  pitfalls,
}) => {
  return (
    <div className="space-y-4 rounded-xl border bg-muted/25 p-4 sm:p-5">
      <MarkdownRenderer content={fullSolution} compact />

      {pitfalls.length > 0 && (
        <div className="space-y-2 rounded-xl border border-amber-500/45 bg-amber-500/10 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>高频失分点与易错避坑</span>
          </div>
          <ul className="list-disc space-y-1.5 pl-5 text-sm">
            {pitfalls.map((pitfall, idx) => (
              <li key={idx}>
                <MarkdownRenderer
                  content={pitfall}
                  compact
                  className="[&>p:first-child]:mt-0 [&>p:last-child]:mb-0 [&>p]:my-0"
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
