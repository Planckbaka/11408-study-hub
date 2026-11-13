import type { StudyNote } from '@/types/study';
import { CO_01_NOTE } from './co-01';
import { CO_02_NOTE } from './co-02';
import { CO_03_NOTE } from './co-03';
import { CO_04_NOTE } from './co-04';
import { CO_05_NOTE } from './co-05';
import { CO_06_NOTE } from './co-06';
import { CO_07_NOTE } from './co-07';

export const STUDY_NOTES_BY_CHAPTER: Record<string, StudyNote> = {
  'CO-01': CO_01_NOTE,
  'CO-02': CO_02_NOTE,
  'CO-03': CO_03_NOTE,
  'CO-04': CO_04_NOTE,
  'CO-05': CO_05_NOTE,
  'CO-06': CO_06_NOTE,
  'CO-07': CO_07_NOTE,
};

export const ALL_STUDY_NOTES: StudyNote[] = Object.values(STUDY_NOTES_BY_CHAPTER);

export function getStudyNoteByChapter(chapterId: string): StudyNote | undefined {
  return STUDY_NOTES_BY_CHAPTER[chapterId];
}
