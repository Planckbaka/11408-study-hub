import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { StudyStoreProvider } from '@/store/useStudyStore';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardPage } from '@/pages/DashboardPage';
import { NoteReaderPage } from '@/pages/NoteReaderPage';
import { PracticePage } from '@/pages/PracticePage';
import { WrongBookPage } from '@/pages/WrongBookPage';
import { StatsPage } from '@/pages/StatsPage';

export default function App() {
  return (
    <HashRouter>
      <StudyStoreProvider>
        <AppShell>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/notes" element={<Navigate to="/notes/CO/CO-01" replace />} />
            <Route path="/notes/:subject/:chapterId" element={<NoteReaderPage />} />
            <Route path="/practice" element={<PracticePage />} />
            <Route path="/wrong-book" element={<WrongBookPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </StudyStoreProvider>
    </HashRouter>
  );
}
