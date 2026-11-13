import type { Question, SubjectId } from '@/types/study';
import { CO_01_QUESTIONS } from './co-01';
import { CO_02_QUESTIONS } from './co-02';
import { CO_03_QUESTIONS } from './co-03';
import { CO_04_QUESTIONS } from './co-04';
import { CO_05_QUESTIONS } from './co-05';
import { CO_06_QUESTIONS } from './co-06';
import { CO_07_QUESTIONS } from './co-07';

export const ALL_QUESTIONS: Question[] = [
  ...CO_01_QUESTIONS,
  ...CO_02_QUESTIONS,
  ...CO_03_QUESTIONS,
  ...CO_04_QUESTIONS,
  ...CO_05_QUESTIONS,
  ...CO_06_QUESTIONS,
  ...CO_07_QUESTIONS,
];

export const QUESTIONS_BY_ID: Record<string, Question> = Object.fromEntries(
  ALL_QUESTIONS.map((q) => [q.id, q]),
);

export function getQuestionsByChapter(chapterId: string): Question[] {
  return ALL_QUESTIONS.filter((q) => q.chapterId === chapterId);
}

export function getQuestionsBySubject(subject: SubjectId): Question[] {
  return ALL_QUESTIONS.filter((q) => q.subject === subject);
}
