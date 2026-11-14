import type { StudyNote } from '@/types/study';
import { CO_01_NOTE } from './co-01';
import { CO_02_NOTE } from './co-02';
import { CO_03_NOTE } from './co-03';
import { CO_04_NOTE } from './co-04';
import { CO_05_NOTE } from './co-05';
import { CO_06_NOTE } from './co-06';
import { CO_07_NOTE } from './co-07';
import { DS_01_NOTE } from './ds-01';
import { DS_02_NOTE } from './ds-02';
import { DS_03_NOTE } from './ds-03';
import { DS_04_NOTE } from './ds-04';
import { DS_05_NOTE } from './ds-05';
import { DS_06_NOTE } from './ds-06';
import { DS_07_NOTE } from './ds-07';
import { DS_08_NOTE } from './ds-08';
import { OS_01_NOTE } from './os-01';
import { OS_02_NOTE } from './os-02';
import { OS_03_NOTE } from './os-03';
import { OS_04_NOTE } from './os-04';
import { OS_05_NOTE } from './os-05';
import { CN_01_NOTE } from './cn-01';
import { CN_02_NOTE } from './cn-02';
import { CN_03_NOTE } from './cn-03';
import { CN_04_NOTE } from './cn-04';
import { CN_05_NOTE } from './cn-05';
import { CN_06_NOTE } from './cn-06';

export const STUDY_NOTES_BY_CHAPTER: Record<string, StudyNote> = {
  'CO-01': CO_01_NOTE,
  'CO-02': CO_02_NOTE,
  'CO-03': CO_03_NOTE,
  'CO-04': CO_04_NOTE,
  'CO-05': CO_05_NOTE,
  'CO-06': CO_06_NOTE,
  'CO-07': CO_07_NOTE,
  'DS-01': DS_01_NOTE,
  'DS-02': DS_02_NOTE,
  'DS-03': DS_03_NOTE,
  'DS-04': DS_04_NOTE,
  'DS-05': DS_05_NOTE,
  'DS-06': DS_06_NOTE,
  'DS-07': DS_07_NOTE,
  'DS-08': DS_08_NOTE,
  'OS-01': OS_01_NOTE,
  'OS-02': OS_02_NOTE,
  'OS-03': OS_03_NOTE,
  'OS-04': OS_04_NOTE,
  'OS-05': OS_05_NOTE,
  'CN-01': CN_01_NOTE,
  'CN-02': CN_02_NOTE,
  'CN-03': CN_03_NOTE,
  'CN-04': CN_04_NOTE,
  'CN-05': CN_05_NOTE,
  'CN-06': CN_06_NOTE,
};

export const ALL_STUDY_NOTES: StudyNote[] = Object.values(STUDY_NOTES_BY_CHAPTER);

export function getStudyNoteByChapter(chapterId: string): StudyNote | undefined {
  return STUDY_NOTES_BY_CHAPTER[chapterId];
}
