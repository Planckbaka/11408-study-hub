import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  BookMarked,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  ExternalLink,
  FileJson,
  Filter,
  Flame,
  Play,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { QUESTIONS_BY_ID, getQuestionsByChapter } from '@/data/questions';
import { SYLLABUS_CHAPTERS, getChapterById } from '@/data/syllabus';
import { useStudyStore } from '@/store/useStudyStore';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, formatDateTime } from '@/lib/utils';
import type { ErrorReason, Question, WrongBookEntry } from '@/types/study';

const ERROR_REASONS: ErrorReason[] = ['概念辨析', '方法不会', '审题失误', '计算失误', '跨科盲区'];

type MasteryFilter = 'ALL' | 'PENDING' | 'MASTERED';
type ReasonFilter = 'ALL' | ErrorReason;

interface WrongBookItem {
  entry: WrongBookEntry;
  question: Question;
}

interface StatusBanner {
  kind: 'success' | 'error' | 'info';
  message: string;
  copyFallbackJson?: string;
}

const REASON_STYLE_MAP: Record<ErrorReason, string> = {
  概念辨析: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  方法不会: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  审题失误: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  计算失误: 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300',
  跨科盲区: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
};

function stripStemPreview(raw: string): string {
  return raw
    .replace(/```[\s\S]*?```/g, ' [代码/图表] ')
    .replace(/\$+/g, '')
    .replace(/[#>*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

interface WrongQuestionCardProps {
  item: WrongBookItem;
  onUpdateEntry: (
    questionId: string,
    patch: Partial<Pick<WrongBookEntry, 'reason' | 'userNote'>>,
  ) => void;
  onRemove: (questionId: string) => void;
}

const WrongQuestionCard: React.FC<WrongQuestionCardProps> = ({
  item,
  onUpdateEntry,
  onRemove,
}) => {
  const { entry, question } = item;
  const chapterMeta = getChapterById(question.chapterId);
  const isMastered = entry.retryCorrectStreak >= 2;

  const [expanded, setExpanded] = useState(false);
  const [noteDraft, setNoteDraft] = useState(entry.userNote);
  const [savedNotice, setSavedNotice] = useState(false);

  // Sync draft when external updates (e.g. JSON import) overwrite entry.userNote
  useEffect(() => {
    setNoteDraft(entry.userNote);
  }, [entry.userNote]);

  // Debounced auto-save for personal note edits
  useEffect(() => {
    if (noteDraft === entry.userNote) return;
    const timer = window.setTimeout(() => {
      onUpdateEntry(question.id, { userNote: noteDraft });
      setSavedNotice(true);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [entry.userNote, noteDraft, onUpdateEntry, question.id]);

  useEffect(() => {
    if (!savedNotice) return;
    const timer = window.setTimeout(() => setSavedNotice(false), 1800);
    return () => window.clearTimeout(timer);
  }, [savedNotice]);

  const handleSaveNoteNow = () => {
    if (noteDraft !== entry.userNote) {
      onUpdateEntry(question.id, { userNote: noteDraft });
    }
    setSavedNotice(true);
  };

  const stemPreview =
    question.type === 'comprehensive'
      ? `${question.title}（${question.totalPoints} 分）：${stripStemPreview(question.stem)}`
      : stripStemPreview(question.stem);

  return (
    <Card
      className={cn(
        'overflow-hidden transition-colors',
        isMastered ? 'border-emerald-500/30' : 'hover:border-border/80',
      )}
    >
      <CardHeader className="space-y-3 pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                {question.id}
              </Badge>
              <Badge variant="info" className="font-mono text-xs">
                {question.chapterId}
                {chapterMeta ? ` · ${chapterMeta.title}` : ''}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {question.type === 'comprehensive' ? '综合大题' : '单选题'}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {question.difficulty} · {question.sourceTag}
              </Badge>
              {isMastered ? (
                <Badge variant="success" className="gap-1 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>已掌握 · 连对 {entry.retryCorrectStreak} 次</span>
                </Badge>
              ) : (
                <Badge variant="warning" className="text-xs">
                  待重练 · 连对 {entry.retryCorrectStreak}/2 次
                </Badge>
              )}
            </div>

            <CardTitle className="pt-0.5 text-base leading-snug">
              考点：{question.kpTitle}
            </CardTitle>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                累计错题：<strong className="font-mono text-rose-600 dark:text-rose-400">{entry.errorCount}</strong> 次
              </span>
              <span>
                重练连对：<strong className="font-mono text-foreground">{entry.retryCorrectStreak}</strong> 次
              </span>
              <span>最近记录：{formatDateTime(entry.lastReviewedAt ?? entry.addedAt)}</span>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" asChild>
              <Link to={`/practice?chapter=${question.chapterId}&qid=${question.id}`}>
                <ExternalLink className="h-3.5 w-3.5" />
                <span>去单独重做</span>
              </Link>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onRemove(question.id)}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>移出错题本</span>
            </Button>
          </div>
        </div>

        {/* Collapsed preview + toggle */}
        <div className="rounded-lg border bg-muted/30 px-3.5 py-2.5">
          {!expanded && (
            <p className="line-clamp-2 text-sm leading-relaxed text-foreground/85">{stemPreview}</p>
          )}
          <div className={cn('flex items-center justify-between', !expanded && 'mt-2')}>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  <span>收起完整题干与解析</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  <span>展开完整题干与解析</span>
                </>
              )}
            </button>
            <span className="text-[11px] text-muted-foreground">
              {expanded ? '含参考答案与考点解析' : '点击查看题干与解答'}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* Expanded full stem, options/subquestions, and analysis */}
        {expanded && (
          <div className="space-y-4 rounded-xl border bg-background p-4">
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {question.type === 'comprehensive' ? `${question.title}（${question.totalPoints} 分）` : '题干'}
              </div>
              <MarkdownRenderer content={question.stem} compact />
            </div>

            {question.type === 'single_choice' ? (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  {question.options.map((opt) => {
                    const isAnswer = opt.key === question.answer;
                    return (
                      <div
                        key={opt.key}
                        className={cn(
                          'flex items-start gap-2.5 rounded-lg border px-3 py-2 text-sm',
                          isAnswer
                            ? 'border-emerald-500/40 bg-emerald-500/10'
                            : 'border-border/70 bg-muted/20',
                        )}
                      >
                        <span
                          className={cn(
                            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold',
                            isAnswer
                              ? 'bg-emerald-500 text-white'
                              : 'bg-muted text-muted-foreground',
                          )}
                        >
                          {opt.key}
                        </span>
                        <div className="min-w-0 flex-1">
                          <MarkdownRenderer
                            content={opt.text}
                            compact
                            className="prose-p:my-0 prose-p:leading-6"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-2 rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>正确答案：{question.answer}</span>
                  </div>
                  <MarkdownRenderer content={question.analysis} compact />
                  <div className="rounded-md border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-xs text-foreground/90">
                    <strong className="text-sky-700 dark:text-sky-300">核心结论：</strong>
                    {question.keyTakeaway}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2.5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    设问与参考评分要点
                  </div>
                  {question.subQuestions.map((sq) => (
                    <div key={sq.label} className="space-y-2 rounded-lg border bg-muted/20 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-1.5 text-sm font-medium">
                          <span className="shrink-0 font-semibold text-primary">{sq.label}</span>
                          <MarkdownRenderer
                            content={sq.prompt}
                            compact
                            className="prose-p:my-0 prose-p:leading-6"
                          />
                        </div>
                        <Badge variant="outline" className="shrink-0 font-mono text-[11px]">
                          {sq.maxPoints} 分
                        </Badge>
                      </div>
                      <div className="rounded-md border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-xs">
                        <div className="mb-1 font-semibold text-emerald-700 dark:text-emerald-300">
                          参考答案要点：
                        </div>
                        <MarkdownRenderer
                          content={sq.answerKey}
                          compact
                          className="prose-p:my-0 prose-p:leading-5"
                        />
                        <div className="mt-1.5 text-muted-foreground">评分标准：{sq.scoringRubric}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3.5">
                  <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    完整解析过程
                  </div>
                  <MarkdownRenderer content={question.fullSolution} compact />
                </div>

                {question.pitfalls.length > 0 && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
                    <div className="mb-1 font-semibold text-amber-700 dark:text-amber-300">易错点提示</div>
                    <ul className="list-disc space-y-1 pl-4 text-foreground/90">
                      {question.pitfalls.map((pit) => (
                        <li key={pit}>{pit}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Interactive ErrorReason selector & inline userNote editor */}
        <div className="grid gap-4 rounded-xl border bg-muted/20 p-3.5 lg:grid-cols-12">
          <div className="space-y-2 lg:col-span-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground/90">错因归因标签</span>
              <Badge className={cn('text-[11px]', REASON_STYLE_MAP[entry.reason])}>{entry.reason}</Badge>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ERROR_REASONS.map((reason) => {
                const active = entry.reason === reason;
                return (
                  <button
                    key={reason}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onUpdateEntry(question.id, { reason })}
                    className={cn(
                      'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                      active
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    {reason}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2 lg:col-span-7">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor={`note-${question.id}`} className="text-xs font-semibold text-foreground/90">
                个人错题批注
              </label>
              <div className="flex items-center gap-2">
                {noteDraft !== entry.userNote ? (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400">待保存...</span>
                ) : savedNotice ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3 w-3" />
                    <span>已保存</span>
                  </span>
                ) : entry.userNote ? (
                  <span className="text-[11px] text-muted-foreground">已自动同步本地</span>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleSaveNoteNow}
                  className="h-6 gap-1 px-2 text-[11px]"
                >
                  <Save className="h-3 w-3" />
                  <span>保存批注</span>
                </Button>
              </div>
            </div>
            <textarea
              id={`note-${question.id}`}
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              onBlur={() => {
                if (noteDraft !== entry.userNote) {
                  handleSaveNoteNow();
                }
              }}
              rows={2}
              placeholder="记录本题关键卡壳点、公式推导盲区或提醒下次注意的边界条件..."
              className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-xs leading-relaxed placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const WrongBookPage: React.FC = () => {
  const {
    progress,
    removeFromWrongBook,
    updateWrongBookEntry,
    exportBackupJson,
    importBackupJson,
    resetAllProgress,
  } = useStudyStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [chapterFilter, setChapterFilter] = useState<'ALL' | string>('ALL');
  const [reasonFilter, setReasonFilter] = useState<ReasonFilter>('ALL');
  const [masteryFilter, setMasteryFilter] = useState<MasteryFilter>('ALL');

  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pasteJsonText, setPasteJsonText] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [banner, setBanner] = useState<StatusBanner | null>(null);
  const [fallbackCopied, setFallbackCopied] = useState(false);

  const wrongItems = useMemo<WrongBookItem[]>(() => {
    const resolved: WrongBookItem[] = [];
    for (const entry of Object.values(progress.wrongBook)) {
      const question = QUESTIONS_BY_ID[entry.questionId];
      if (question) {
        resolved.push({ entry, question });
      }
    }
    return resolved.sort((a, b) => {
      const timeA = a.entry.lastReviewedAt ?? a.entry.addedAt;
      const timeB = b.entry.lastReviewedAt ?? b.entry.addedAt;
      return timeB.localeCompare(timeA);
    });
  }, [progress.wrongBook]);

  const totalCount = wrongItems.length;
  const masteredCount = useMemo(
    () => wrongItems.filter((item) => item.entry.retryCorrectStreak >= 2).length,
    [wrongItems],
  );
  const pendingCount = totalCount - masteredCount;

  const topErrorReason = useMemo<{ reason: ErrorReason; count: number } | null>(() => {
    if (wrongItems.length === 0) return null;
    const counts = new Map<ErrorReason, number>();
    for (const item of wrongItems) {
      counts.set(item.entry.reason, (counts.get(item.entry.reason) ?? 0) + 1);
    }
    let best: { reason: ErrorReason; count: number } | null = null;
    for (const reason of ERROR_REASONS) {
      const c = counts.get(reason) ?? 0;
      if (c > 0 && (!best || c > best.count)) {
        best = { reason, count: c };
      }
    }
    return best;
  }, [wrongItems]);

  const wrongCountByChapter = useMemo(() => {
    const map: Record<string, number> = {};
    for (const { question } of wrongItems) {
      map[question.chapterId] = (map[question.chapterId] ?? 0) + 1;
    }
    return map;
  }, [wrongItems]);

  const chapterOptions = useMemo(() => {
    const activeChapterIds = new Set(wrongItems.map((item) => item.question.chapterId));
    return SYLLABUS_CHAPTERS.filter(
      (ch) => ch.hasFullNotes || activeChapterIds.has(ch.id) || getQuestionsByChapter(ch.id).length > 0,
    );
  }, [wrongItems]);

  const filteredItems = useMemo(() => {
    return wrongItems.filter(({ entry, question }) => {
      if (chapterFilter !== 'ALL' && question.chapterId !== chapterFilter) return false;
      if (reasonFilter !== 'ALL' && entry.reason !== reasonFilter) return false;
      if (masteryFilter === 'PENDING' && entry.retryCorrectStreak >= 2) return false;
      if (masteryFilter === 'MASTERED' && entry.retryCorrectStreak < 2) return false;
      return true;
    });
  }, [chapterFilter, masteryFilter, reasonFilter, wrongItems]);

  const handleExportJson = async () => {
    const json = exportBackupJson();
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate(),
    ).padStart(2, '0')}`;
    const filename = `11408-study-backup-${dateStr}.json`;

    let downloaded = false;
    try {
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      downloaded = true;
    } catch {
      downloaded = false;
    }

    let copied = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(json);
        copied = true;
      }
    } catch {
      copied = false;
    }

    setFallbackCopied(copied);
    if (downloaded) {
      setBanner({
        kind: 'success',
        message: copied
          ? `已下载备份文件 ${filename}，并同步复制到剪贴板。`
          : `已触发下载 ${filename}。若浏览器拦截了下载，可点击右侧按钮复制 JSON 备份文本。`,
        copyFallbackJson: json,
      });
    } else if (copied) {
      setBanner({
        kind: 'info',
        message: `浏览器限制了文件下载，已为您把备份 JSON 复制到剪贴板（建议保存为 ${filename}）。`,
        copyFallbackJson: json,
      });
    } else {
      setBanner({
        kind: 'error',
        message: `未能自动下载或写入剪贴板，请点击右侧按钮复制 JSON 内容手动保存（建议文件名 ${filename}）。`,
        copyFallbackJson: json,
      });
    }
  };

  const handleCopyFallback = async () => {
    if (!banner?.copyFallbackJson) return;
    try {
      await navigator.clipboard.writeText(banner.copyFallbackJson);
      setFallbackCopied(true);
    } catch {
      setShowPasteBox(true);
      setPasteJsonText(banner.copyFallbackJson);
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const result = importBackupJson(text);
      if (result.ok) {
        setBanner({ kind: 'success', message: `备份恢复成功：${result.summary}` });
        setShowPasteBox(false);
      } else {
        setBanner({ kind: 'error', message: `备份恢复失败：${result.error}` });
      }
    } catch (err) {
      setBanner({
        kind: 'error',
        message: `读取文件失败：${err instanceof Error ? err.message : '未知错误'}`,
      });
    }
  };

  const handlePasteImport = () => {
    const trimmed = pasteJsonText.trim();
    if (!trimmed) {
      setBanner({ kind: 'error', message: '请先在文本框中粘贴 JSON 备份内容。' });
      return;
    }
    const result = importBackupJson(trimmed);
    if (result.ok) {
      setBanner({ kind: 'success', message: `粘贴恢复成功：${result.summary}` });
      setPasteJsonText('');
      setShowPasteBox(false);
    } else {
      setBanner({ kind: 'error', message: `备份恢复失败：${result.error}` });
    }
  };

  const handleConfirmReset = () => {
    resetAllProgress();
    setConfirmReset(false);
    setChapterFilter('ALL');
    setReasonFilter('ALL');
    setMasteryFilter('ALL');
    setBanner({
      kind: 'info',
      message: '已清空全部学习进度、做题统计与错题本记录。',
    });
  };

  const resetFilters = () => {
    setChapterFilter('ALL');
    setReasonFilter('ALL');
    setMasteryFilter('ALL');
  };

  const hasActiveFilters = chapterFilter !== 'ALL' || reasonFilter !== 'ALL' || masteryFilter !== 'ALL';

  return (
    <div className="space-y-6 pb-12">
      {/* Hidden file input always mounted for Action Bar & Empty State triggers */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleFileImport}
      />

      {/* Header */}
      <section className="rounded-2xl border bg-gradient-to-br from-card via-card to-rose-500/5 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="danger" className="gap-1">
                <BookMarked className="h-3.5 w-3.5" />
                <span>本地错题闭环工作台</span>
              </Badge>
              <Badge variant="outline" className="font-mono text-xs">
                连续重练答对 ≥ 2 次判定掌握
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">个人错题本与进度备份</h1>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              刷题错题与自评未达标题目会自动入库，支持按章节/错因/掌握度精准复盘、行内批注与一键 JSON 全量备份恢复。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="gap-2" asChild>
              <Link to="/practice">
                <BookOpen className="h-4 w-4" />
                <span>返回刷题题库</span>
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Top KPI Strip */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>错题本总题数</CardDescription>
            <CardTitle className="font-mono text-2xl">
              {totalCount} <span className="text-sm font-normal text-muted-foreground">道</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">自动收录选择题错题与大题未达标题</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>已攻克掌握（连对 ≥ 2 次）</CardDescription>
            <CardTitle className="font-mono text-2xl text-emerald-600 dark:text-emerald-400">
              {masteredCount} <span className="text-sm font-normal text-muted-foreground">道</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              掌握率 {totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>待重练攻克（连对 &lt; 2 次）</CardDescription>
            <CardTitle className="font-mono text-2xl text-amber-600 dark:text-amber-400">
              {pendingCount} <span className="text-sm font-normal text-muted-foreground">道</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">建议优先点击“错题重练模式”逐一清零</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>最高频错因归因</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              {topErrorReason ? (
                <>
                  <Flame className="h-5 w-5 text-rose-500" />
                  <span>{topErrorReason.reason}</span>
                </>
              ) : (
                <span className="text-muted-foreground">暂无</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {topErrorReason ? `共涉及 ${topErrorReason.count} 道错题` : '入库错题后可一键归因统计'}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Action Bar */}
      <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {totalCount > 0 ? (
              <Button size="sm" className="gap-1.5" asChild>
                <Link to="/practice?mode=wrong-retry">
                  <Play className="h-3.5 w-3.5" />
                  <span>错题重练模式</span>
                </Link>
              </Button>
            ) : (
              <Button type="button" size="sm" disabled className="gap-1.5">
                <Play className="h-3.5 w-3.5" />
                <span>错题重练模式</span>
              </Button>
            )}

            <Button type="button" size="sm" variant="outline" onClick={handleExportJson} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              <span>导出 JSON 备份</span>
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="gap-1.5"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>导入恢复 JSON</span>
            </Button>

            <Button
              type="button"
              size="sm"
              variant={showPasteBox ? 'secondary' : 'ghost'}
              onClick={() => setShowPasteBox((v) => !v)}
              className="gap-1.5 text-xs"
            >
              <FileJson className="h-3.5 w-3.5" />
              <span>{showPasteBox ? '收起粘贴恢复框' : '粘贴 JSON 恢复'}</span>
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!confirmReset ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setConfirmReset(true)}
                className="gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>重置进度</span>
              </Button>
            ) : (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-1.5">
                <span className="text-xs font-medium text-destructive">确认清空全部记录？</span>
                <Button type="button" size="sm" variant="destructive" onClick={handleConfirmReset} className="h-7 px-2.5 text-xs">
                  确认清空
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmReset(false)}
                  className="h-7 px-2.5 text-xs"
                >
                  取消
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Status Banner */}
        {banner && (
          <div
            role="status"
            className={cn(
              'flex flex-col gap-2 rounded-lg border px-3.5 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between',
              banner.kind === 'success' &&
                'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200',
              banner.kind === 'error' &&
                'border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-200',
              banner.kind === 'info' &&
                'border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-200',
            )}
          >
            <div className="flex items-start gap-2">
              {banner.kind === 'success' ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span className="leading-relaxed">{banner.message}</span>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {banner.copyFallbackJson && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleCopyFallback}
                  className="h-7 gap-1 bg-background/80 px-2.5 text-xs"
                >
                  {fallbackCopied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  <span>{fallbackCopied ? '已复制 JSON' : '复制 JSON 文本'}</span>
                </Button>
              )}
              <button
                type="button"
                onClick={() => setBanner(null)}
                aria-label="关闭提示"
                className="rounded p-1 opacity-70 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Inline JSON Paste Restore Box */}
        {showPasteBox && (
          <div className="space-y-2.5 rounded-lg border bg-muted/30 p-3.5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold">粘贴 JSON 备份内容恢复进度</div>
              <span className="text-[11px] text-muted-foreground">支持 version: 1 格式备份数据</span>
            </div>
            <textarea
              value={pasteJsonText}
              onChange={(e) => setPasteJsonText(e.target.value)}
              rows={5}
              placeholder='请在此粘贴导出的 JSON 备份内容（例如 {"version": 1, "completedChapters": ...}）'
              className="w-full rounded-md border border-input bg-background p-3 font-mono text-xs leading-relaxed placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setPasteJsonText('');
                  setShowPasteBox(false);
                }}
                className="h-8 text-xs"
              >
                取消
              </Button>
              <Button type="button" size="sm" onClick={handlePasteImport} className="h-8 gap-1.5 text-xs">
                <Upload className="h-3.5 w-3.5" />
                <span>确认导入恢复</span>
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Empty State or Filter + List */}
      {totalCount === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center space-y-4 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-semibold">错题本当前为空</h2>
              <p className="max-w-md text-sm text-muted-foreground">
                在交互刷题中答错的选择题或自评未达标的综合大题会自动记录到这里；如果你已有备份文件，也可以直接导入恢复。
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              <Button asChild className="gap-1.5">
                <Link to="/practice">
                  <BookOpen className="h-4 w-4" />
                  <span>前往题库刷题</span>
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="gap-1.5"
              >
                <Upload className="h-4 w-4" />
                <span>选择备份文件导入</span>
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowPasteBox(true)}
                className="gap-1.5"
              >
                <FileJson className="h-4 w-4" />
                <span>粘贴备份文本导入</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filter Strip */}
          <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Filter className="h-4 w-4 text-primary" />
                <span>多维筛选错题</span>
                <span className="font-mono text-xs font-normal text-muted-foreground">
                  显示 {filteredItems.length} / {totalCount} 题
                </span>
              </div>
              {hasActiveFilters && (
                <Button type="button" size="sm" variant="ghost" onClick={resetFilters} className="h-7 text-xs">
                  重置筛选条件
                </Button>
              )}
            </div>

            <div className="space-y-2.5">
              {/* Chapter filter */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-xs font-medium text-muted-foreground">章节：</span>
                <button
                  type="button"
                  onClick={() => setChapterFilter('ALL')}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    chapterFilter === 'ALL'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  全部 ({totalCount})
                </button>
                {chapterOptions.map((ch) => {
                  const cnt = wrongCountByChapter[ch.id] ?? 0;
                  const active = chapterFilter === ch.id;
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setChapterFilter(ch.id)}
                      className={cn(
                        'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground',
                      )}
                    >
                      {ch.id}
                      {cnt > 0 ? ` (${cnt})` : ''}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                {/* Reason filter */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-xs font-medium text-muted-foreground">错因：</span>
                  <button
                    type="button"
                    onClick={() => setReasonFilter('ALL')}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                      reasonFilter === 'ALL'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    全部原因
                  </button>
                  {ERROR_REASONS.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setReasonFilter(reason)}
                      className={cn(
                        'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                        reasonFilter === reason
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground',
                      )}
                    >
                      {reason}
                    </button>
                  ))}
                </div>

                {/* Mastery filter */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-xs font-medium text-muted-foreground">掌握度：</span>
                  {(
                    [
                      { key: 'ALL', label: '全部' },
                      { key: 'PENDING', label: '待重练' },
                      { key: 'MASTERED', label: '已连续答对≥2次' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setMasteryFilter(opt.key)}
                      className={cn(
                        'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                        masteryFilter === opt.key
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Filtered list */}
          {filteredItems.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center space-y-3 py-10 text-center">
                <p className="text-sm text-muted-foreground">当前筛选条件下没有匹配的错题记录。</p>
                <Button type="button" size="sm" variant="outline" onClick={resetFilters}>
                  清空筛选条件
                </Button>
              </CardContent>
            </Card>
          ) : (
            <section className="space-y-4">
              {filteredItems.map((item) => (
                <WrongQuestionCard
                  key={item.question.id}
                  item={item}
                  onUpdateEntry={updateWrongBookEntry}
                  onRemove={removeFromWrongBook}
                />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
};
