import type { Question, SubjectId } from '@/types/study';
import { CO_01_QUESTIONS } from './co-01';
import { CO_02_QUESTIONS } from './co-02';
import { CO_03_QUESTIONS } from './co-03';
import { CO_04_QUESTIONS } from './co-04';
import { CO_05_QUESTIONS } from './co-05';
import { CO_06_QUESTIONS } from './co-06';
import { CO_07_QUESTIONS } from './co-07';
import { DS_01_QUESTIONS } from './ds-01';
import { DS_02_QUESTIONS } from './ds-02';
import { DS_03_QUESTIONS } from './ds-03';
import { DS_04_QUESTIONS } from './ds-04';
import { DS_05_QUESTIONS } from './ds-05';
import { DS_06_QUESTIONS } from './ds-06';
import { DS_07_QUESTIONS } from './ds-07';
import { DS_08_QUESTIONS } from './ds-08';
import { OS_01_QUESTIONS } from './os-01';
import { OS_02_QUESTIONS } from './os-02';
import { OS_03_QUESTIONS } from './os-03';
import { OS_04_QUESTIONS } from './os-04';
import { OS_05_QUESTIONS } from './os-05';
import { CN_01_QUESTIONS } from './cn-01';
import { CN_02_QUESTIONS } from './cn-02';
import { CN_03_QUESTIONS } from './cn-03';
import { CN_04_QUESTIONS } from './cn-04';
import { CN_05_QUESTIONS } from './cn-05';
import { CN_06_QUESTIONS } from './cn-06';
import { MOCK_EXTRA_QUESTIONS } from './mock-extra';

export const ALL_QUESTIONS: Question[] = [
  ...CO_01_QUESTIONS,
  ...CO_02_QUESTIONS,
  ...CO_03_QUESTIONS,
  ...CO_04_QUESTIONS,
  ...CO_05_QUESTIONS,
  ...CO_06_QUESTIONS,
  ...CO_07_QUESTIONS,
  ...DS_01_QUESTIONS,
  ...DS_02_QUESTIONS,
  ...DS_03_QUESTIONS,
  ...DS_04_QUESTIONS,
  ...DS_05_QUESTIONS,
  ...DS_06_QUESTIONS,
  ...DS_07_QUESTIONS,
  ...DS_08_QUESTIONS,
  ...OS_01_QUESTIONS,
  ...OS_02_QUESTIONS,
  ...OS_03_QUESTIONS,
  ...OS_04_QUESTIONS,
  ...OS_05_QUESTIONS,
  ...CN_01_QUESTIONS,
  ...CN_02_QUESTIONS,
  ...CN_03_QUESTIONS,
  ...CN_04_QUESTIONS,
  ...CN_05_QUESTIONS,
  ...CN_06_QUESTIONS,
  ...MOCK_EXTRA_QUESTIONS,
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
