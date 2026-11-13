import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type {
  BackupPayloadV1,
  ChoiceKey,
  ErrorReason,
  ExamAttempt,
  QuestionAttemptRecord,
  StudyProgressState,
  ThemeMode,
  WrongBookEntry,
} from '@/types/study';

const STORAGE_KEY = '11408-hub-progress-v1';
const THEME_KEY = '11408-hub-theme';

const EMPTY_STATE: StudyProgressState = {
  completedChapters: {},
  completedKps: {},
  attempts: {},
  wrongBook: {},
  examHistory: [],
};

function readInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {
    // ignore storage errors
  }
  return 'light';
}

function readInitialProgress(): StudyProgressState {
  if (typeof window === 'undefined') return EMPTY_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw) as Partial<StudyProgressState>;
    return {
      completedChapters:
        parsed.completedChapters && typeof parsed.completedChapters === 'object' ? parsed.completedChapters : {},
      completedKps: parsed.completedKps && typeof parsed.completedKps === 'object' ? parsed.completedKps : {},
      attempts: parsed.attempts && typeof parsed.attempts === 'object' ? parsed.attempts : {},
      wrongBook: parsed.wrongBook && typeof parsed.wrongBook === 'object' ? parsed.wrongBook : {},
      examHistory: Array.isArray(parsed.examHistory) ? parsed.examHistory : [],
    };
  } catch {
    return EMPTY_STATE;
  }
}

interface StudyStoreContextValue {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  progress: StudyProgressState;
  toggleChapterDone: (chapterId: string) => void;
  setChapterDone: (chapterId: string, done: boolean) => void;
  toggleKpDone: (kpId: string) => void;
  recordChoiceAttempt: (
    questionId: string,
    choice: ChoiceKey,
    isCorrect: boolean,
    autoAddWrong?: boolean,
  ) => void;
  recordComprehensiveSelfEval: (
    questionId: string,
    score: number,
    maxPoints: number,
  ) => void;
  addToWrongBook: (questionId: string, reason?: ErrorReason, note?: string) => void;
  removeFromWrongBook: (questionId: string) => void;
  updateWrongBookEntry: (
    questionId: string,
    patch: Partial<Pick<WrongBookEntry, 'reason' | 'userNote'>>,
  ) => void;
  recordExamAttempt: (attempt: ExamAttempt) => void;
  exportBackupJson: () => string;
  importBackupJson: (jsonText: string) => { ok: true; summary: string } | { ok: false; error: string };
  resetAllProgress: () => void;
}

const StudyStoreContext = createContext<StudyStoreContextValue | null>(null);

export const StudyStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(readInitialTheme);
  const [progress, setProgress] = useState<StudyProgressState>(readInitialProgress);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // ignore storage errors
    }
  }, [progress]);

  const setTheme = useCallback((next: ThemeMode) => {
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const toggleChapterDone = useCallback((chapterId: string) => {
    setProgress((prev) => {
      const next = { ...prev.completedChapters };
      if (next[chapterId]) {
        delete next[chapterId];
      } else {
        next[chapterId] = true;
      }
      return { ...prev, completedChapters: next };
    });
  }, []);

  const setChapterDone = useCallback((chapterId: string, done: boolean) => {
    setProgress((prev) => {
      const next = { ...prev.completedChapters };
      if (done) {
        next[chapterId] = true;
      } else {
        delete next[chapterId];
      }
      return { ...prev, completedChapters: next };
    });
  }, []);

  const toggleKpDone = useCallback((kpId: string) => {
    setProgress((prev) => {
      const next = { ...prev.completedKps };
      if (next[kpId]) {
        delete next[kpId];
      } else {
        next[kpId] = true;
      }
      return { ...prev, completedKps: next };
    });
  }, []);

  const recordChoiceAttempt = useCallback(
    (questionId: string, choice: ChoiceKey, isCorrect: boolean, autoAddWrong = true) => {
      const now = new Date().toISOString();
      setProgress((prev) => {
        const existing: QuestionAttemptRecord = prev.attempts[questionId] ?? {
          questionId,
          lastAttemptAt: now,
          attempts: 0,
          correctCount: 0,
        };
        const nextAttempt: QuestionAttemptRecord = {
          questionId,
          lastAttemptAt: now,
          attempts: existing.attempts + 1,
          correctCount: existing.correctCount + (isCorrect ? 1 : 0),
          lastChoice: choice,
          lastIsCorrect: isCorrect,
        };

        const nextWrongBook = { ...prev.wrongBook };
        const existingWrong = nextWrongBook[questionId];

        if (!isCorrect && autoAddWrong) {
          nextWrongBook[questionId] = {
            questionId,
            addedAt: existingWrong?.addedAt ?? now,
            lastReviewedAt: now,
            errorCount: (existingWrong?.errorCount ?? 0) + 1,
            retryCorrectStreak: 0,
            reason: existingWrong?.reason ?? '概念辨析',
            userNote: existingWrong?.userNote ?? '',
          };
        } else if (isCorrect && existingWrong) {
          nextWrongBook[questionId] = {
            ...existingWrong,
            lastReviewedAt: now,
            retryCorrectStreak: existingWrong.retryCorrectStreak + 1,
          };
        }

        return {
          ...prev,
          attempts: {
            ...prev.attempts,
            [questionId]: nextAttempt,
          },
          wrongBook: nextWrongBook,
        };
      });
    },
    [],
  );

  const recordComprehensiveSelfEval = useCallback(
    (questionId: string, score: number, maxPoints: number) => {
      const now = new Date().toISOString();
      const isGood = score >= Math.ceil(maxPoints * 0.7);
      setProgress((prev) => {
        const existing: QuestionAttemptRecord = prev.attempts[questionId] ?? {
          questionId,
          lastAttemptAt: now,
          attempts: 0,
          correctCount: 0,
        };
        const nextWrongBook = { ...prev.wrongBook };
        const existingWrong = nextWrongBook[questionId];

        if (!isGood) {
          nextWrongBook[questionId] = {
            questionId,
            addedAt: existingWrong?.addedAt ?? now,
            lastReviewedAt: now,
            errorCount: (existingWrong?.errorCount ?? 0) + 1,
            retryCorrectStreak: 0,
            reason: existingWrong?.reason ?? '方法不会',
            userNote: existingWrong?.userNote ?? '',
          };
        } else if (existingWrong) {
          nextWrongBook[questionId] = {
            ...existingWrong,
            lastReviewedAt: now,
            retryCorrectStreak: existingWrong.retryCorrectStreak + 1,
          };
        }

        return {
          ...prev,
          attempts: {
            ...prev.attempts,
            [questionId]: {
              questionId,
              lastAttemptAt: now,
              attempts: existing.attempts + 1,
              correctCount: existing.correctCount + (isGood ? 1 : 0),
              lastSelfScore: score,
              lastIsCorrect: isGood,
            },
          },
          wrongBook: nextWrongBook,
        };
      });
    },
    [],
  );

  const addToWrongBook = useCallback(
    (questionId: string, reason: ErrorReason = '概念辨析', note = '') => {
      const now = new Date().toISOString();
      setProgress((prev) => {
        const existing = prev.wrongBook[questionId];
        return {
          ...prev,
          wrongBook: {
            ...prev.wrongBook,
            [questionId]: {
              questionId,
              addedAt: existing?.addedAt ?? now,
              lastReviewedAt: now,
              errorCount: existing ? existing.errorCount + 1 : 1,
              retryCorrectStreak: existing?.retryCorrectStreak ?? 0,
              reason: existing?.reason ?? reason,
              userNote: existing?.userNote ?? note,
            },
          },
        };
      });
    },
    [],
  );

  const removeFromWrongBook = useCallback((questionId: string) => {
    setProgress((prev) => {
      const next = { ...prev.wrongBook };
      delete next[questionId];
      return { ...prev, wrongBook: next };
    });
  }, []);

  const updateWrongBookEntry = useCallback(
    (questionId: string, patch: Partial<Pick<WrongBookEntry, 'reason' | 'userNote'>>) => {
      setProgress((prev) => {
        const existing = prev.wrongBook[questionId];
        if (!existing) return prev;
        return {
          ...prev,
          wrongBook: {
            ...prev.wrongBook,
            [questionId]: {
              ...existing,
              ...patch,
              lastReviewedAt: new Date().toISOString(),
            },
          },
        };
      });
    },
    [],
  );

  const recordExamAttempt = useCallback((attempt: ExamAttempt) => {
    setProgress((prev) => ({
      ...prev,
      examHistory: [attempt, ...prev.examHistory].slice(0, 50),
    }));
  }, []);

  const exportBackupJson = useCallback((): string => {
    const payload: BackupPayloadV1 = {
      version: 1,
      exportedAt: new Date().toISOString(),
      theme,
      ...progress,
    };
    return JSON.stringify(payload, null, 2);
  }, [progress, theme]);

  const importBackupJson = useCallback(
    (jsonText: string): { ok: true; summary: string } | { ok: false; error: string } => {
      try {
        const parsed = JSON.parse(jsonText) as Partial<BackupPayloadV1>;
        if (!parsed || typeof parsed !== 'object') {
          return { ok: false, error: '备份文件不是有效的 JSON 对象' };
        }
        if (parsed.version !== 1) {
          return { ok: false, error: `不支持的备份版本: ${String(parsed.version ?? '未知')}` };
        }
        const nextState: StudyProgressState = {
          completedChapters:
            parsed.completedChapters && typeof parsed.completedChapters === 'object'
              ? parsed.completedChapters
              : {},
          completedKps:
            parsed.completedKps && typeof parsed.completedKps === 'object' ? parsed.completedKps : {},
          attempts: parsed.attempts && typeof parsed.attempts === 'object' ? parsed.attempts : {},
          wrongBook: parsed.wrongBook && typeof parsed.wrongBook === 'object' ? parsed.wrongBook : {},
          examHistory: Array.isArray(parsed.examHistory) ? parsed.examHistory : [],
        };
        setProgress(nextState);
        if (parsed.theme === 'light' || parsed.theme === 'dark') {
          setThemeState(parsed.theme);
        }
        const kpCount = Object.keys(nextState.completedKps).length;
        const wrongCount = Object.keys(nextState.wrongBook).length;
        const attemptCount = Object.keys(nextState.attempts).length;
        return {
          ok: true,
          summary: `已恢复 ${kpCount} 个已完成考点、${attemptCount} 条做题记录、${wrongCount} 道错题`,
        };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : 'JSON 解析失败',
        };
      }
    },
    [],
  );

  const resetAllProgress = useCallback(() => {
    setProgress(EMPTY_STATE);
  }, []);

  const value = useMemo<StudyStoreContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      progress,
      toggleChapterDone,
      setChapterDone,
      toggleKpDone,
      recordChoiceAttempt,
      recordComprehensiveSelfEval,
      addToWrongBook,
      removeFromWrongBook,
      updateWrongBookEntry,
      recordExamAttempt,
      exportBackupJson,
      importBackupJson,
      resetAllProgress,
    }),
    [
      theme,
      setTheme,
      toggleTheme,
      progress,
      toggleChapterDone,
      setChapterDone,
      toggleKpDone,
      recordChoiceAttempt,
      recordComprehensiveSelfEval,
      addToWrongBook,
      removeFromWrongBook,
      updateWrongBookEntry,
      recordExamAttempt,
      exportBackupJson,
      importBackupJson,
      resetAllProgress,
    ],
  );

  return <StudyStoreContext.Provider value={value}>{children}</StudyStoreContext.Provider>;
};

export function useStudyStore(): StudyStoreContextValue {
  const ctx = useContext(StudyStoreContext);
  if (!ctx) {
    throw new Error('useStudyStore must be used inside StudyStoreProvider');
  }
  return ctx;
}
