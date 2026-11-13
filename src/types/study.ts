export type SubjectId = 'DS' | 'CO' | 'OS' | 'CN';

export type Tier = 'S' | 'A' | 'B';

export type SourceTag = '王道课后改编' | '真题同源' | '易错变式';

export type Difficulty = '基础' | '进阶' | '压轴';

export type ErrorReason = '概念辨析' | '方法不会' | '审题失误' | '计算失误' | '跨科盲区';

export type ChoiceKey = 'A' | 'B' | 'C' | 'D';

export type ThemeMode = 'light' | 'dark';

export interface SubjectMeta {
  id: SubjectId;
  code: string;
  name: string;
  shortName: string;
  scoreShare: number;
  mcqRange: string;
  comprehensiveRange: string;
  accentClass: string;
  badgeClass: string;
  description: string;
}

export interface KnowledgePoint {
  kpId: string;
  title: string;
  tier: Tier;
  realExamCount?: number;
  realExamScore?: number;
  years?: number[];
  corePrinciple: string;
  trap: string;
}

export interface SyllabusChapter {
  id: string;
  subject: SubjectId;
  order: number;
  code: string;
  title: string;
  tier: Tier;
  tierLabel: string;
  realExamScore2009to2026: number;
  realExamCount2009to2026: number;
  syllabusItems: string[];
  highFreqFocus: string[];
  traps: string[];
  knowledgePoints: KnowledgePoint[];
  hasFullNotes: boolean;
  crossSubjectLinks?: string[];
}

export interface StudyNote {
  chapterId: string;
  subject: SubjectId;
  title: string;
  subtitle: string;
  estimatedMinutes: number;
  updatedAt: string;
  examWeightSummary: string;
  coreTakeaways: string[];
  markdown: string;
}

export interface BaseQuestion {
  id: string;
  subject: SubjectId;
  chapterId: string;
  kpId: string;
  kpTitle: string;
  sourceTag: SourceTag;
  difficulty: Difficulty;
}

export interface ChoiceQuestion extends BaseQuestion {
  type: 'single_choice';
  stem: string;
  options: { key: ChoiceKey; text: string }[];
  answer: ChoiceKey;
  analysis: string;
  keyTakeaway: string;
}

export interface ComprehensiveSubQuestion {
  label: string;
  prompt: string;
  maxPoints: number;
  answerKey: string;
  scoringRubric: string;
}

export interface ComprehensiveQuestion extends BaseQuestion {
  type: 'comprehensive';
  title: string;
  totalPoints: number;
  stem: string;
  hints: string[];
  subQuestions: ComprehensiveSubQuestion[];
  fullSolution: string;
  pitfalls: string[];
}

export type Question = ChoiceQuestion | ComprehensiveQuestion;

export interface COExamKPStat {
  kpName: string;
  chapterId: string;
  occurrences: number;
  cumulativeScore: number;
  choiceCount: number;
  comprehensiveCount: number;
  coveredYearsCount: number;
  years: number[];
}

export interface COExamDetailRow {
  year: number;
  questionNo: string;
  questionType: '选择题' | '综合题';
  score: number;
  kpName: string;
  chapterId: string;
  chapterIds: string[];
}

export interface WrongBookEntry {
  questionId: string;
  addedAt: string;
  lastReviewedAt?: string;
  errorCount: number;
  retryCorrectStreak: number;
  reason: ErrorReason;
  userNote: string;
}

export interface QuestionAttemptRecord {
  questionId: string;
  lastAttemptAt: string;
  attempts: number;
  correctCount: number;
  lastChoice?: ChoiceKey;
  lastSelfScore?: number;
  lastIsCorrect?: boolean;
}

export interface ExamAttempt {
  id: string;
  createdAt: string;
  title: string;
  durationSeconds: number;
  totalChoice: number;
  correctChoice: number;
  choiceScore: number;
  choiceMaxScore: number;
  selfEvalScore: number;
  selfEvalMaxScore: number;
  questionIds: string[];
  wrongIds: string[];
}

export interface StudyProgressState {
  completedChapters: Record<string, boolean>;
  completedKps: Record<string, boolean>;
  attempts: Record<string, QuestionAttemptRecord>;
  wrongBook: Record<string, WrongBookEntry>;
  examHistory: ExamAttempt[];
}

export interface BackupPayloadV1 extends StudyProgressState {
  version: 1;
  exportedAt: string;
  theme?: ThemeMode;
}

export interface TocHeading {
  id: string;
  text: string;
  level: 2 | 3;
}
