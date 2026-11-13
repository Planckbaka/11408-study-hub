import React, { useEffect, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  BookMarked,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Cpu,
  Database,
  Globe,
  HardDrive,
  LayoutDashboard,
  Menu,
  Moon,
  Search,
  Sun,
  X,
} from 'lucide-react';
import { SUBJECT_META, SUBJECT_ORDER, getChaptersBySubject } from '@/data/syllabus';
import { useStudyStore } from '@/store/useStudyStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CommandSearchModal } from '@/components/search/CommandSearchModal';
import { cn } from '@/lib/utils';
import type { SubjectId } from '@/types/study';

const SUBJECT_ICONS: Record<SubjectId, React.FC<{ className?: string }>> = {
  CO: Cpu,
  DS: Database,
  OS: HardDrive,
  CN: Globe,
};

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { theme, toggleTheme, progress } = useStudyStore();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedSubjects, setExpandedSubjects] = useState<Record<SubjectId, boolean>>({
    CO: true,
    DS: false,
    OS: false,
    CN: false,
  });

  const wrongCount = Object.keys(progress.wrongBook).length;

  useEffect(() => {
    const match = /^\/notes\/(CO|DS|OS|CN)/.exec(location.pathname);
    if (match) {
      const subj = match[1] as SubjectId;
      setExpandedSubjects((prev) => ({ ...prev, [subj]: true }));
    }
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const toggleSubject = (subject: SubjectId) => {
    setExpandedSubjects((prev) => ({ ...prev, [subject]: !prev[subject] }));
  };

  const navItems = [
    { to: '/', label: '考纲看板', icon: LayoutDashboard, end: true },
    { to: '/notes/CO/CO-01', label: '精讲笔记', icon: BookOpen, matchPrefix: '/notes' },
    { to: '/practice', label: '交互刷题', icon: ClipboardCheck },
    { to: '/wrong-book', label: '错题本', icon: BookMarked, badge: wrongCount },
    { to: '/stats', label: '真题统计', icon: BarChart3 },
  ];

  const renderSidebarTree = () => (
    <div className="space-y-3 py-3">
      <div className="px-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          11408 四科考纲目录
        </div>
      </div>

      <div className="space-y-1 px-2">
        {SUBJECT_ORDER.map((subjectId) => {
          const meta = SUBJECT_META[subjectId];
          const Icon = SUBJECT_ICONS[subjectId];
          const chapters = getChaptersBySubject(subjectId);
          const doneCount = chapters.filter((c) => progress.completedChapters[c.id]).length;
          const isExpanded = expandedSubjects[subjectId];

          return (
            <div key={subjectId} className="space-y-0.5">
              <button
                type="button"
                onClick={() => toggleSubject(subjectId)}
                className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm font-medium text-foreground/90 transition-colors hover:bg-accent"
              >
                <span className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <Icon className={cn('h-4 w-4', meta.accentClass)} />
                  <span>{meta.name}</span>
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {doneCount}/{chapters.length}
                </span>
              </button>

              {isExpanded && (
                <div className="ml-4 space-y-0.5 border-l pl-2.5">
                  {chapters.map((chapter) => {
                    const isActive = location.pathname === `/notes/${chapter.subject}/${chapter.id}`;
                    const isDone = Boolean(progress.completedChapters[chapter.id]);
                    return (
                      <Link
                        key={chapter.id}
                        to={`/notes/${chapter.subject}/${chapter.id}`}
                        className={cn(
                          'flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs transition-colors',
                          isActive
                            ? 'bg-primary/12 font-medium text-primary dark:bg-primary/20'
                            : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground',
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span
                            className={cn(
                              'inline-block h-1.5 w-1.5 shrink-0 rounded-full',
                              chapter.tier === 'S'
                                ? 'bg-rose-500'
                                : chapter.tier === 'A'
                                  ? 'bg-amber-500'
                                  : 'bg-sky-500',
                            )}
                          />
                          <span className="truncate">
                            {chapter.order}. {chapter.title}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1">
                          {!chapter.hasFullNotes && (
                            <span className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                              纲
                            </span>
                          )}
                          {isDone && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-3 px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="切换目录侧栏"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            <Link to="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 font-mono text-xs font-bold text-sky-400 dark:bg-sky-500/20 dark:text-sky-300">
                408
              </div>
              <span className="hidden text-sm sm:inline-block sm:text-base">11408 Study Hub</span>
              <Badge variant="outline" className="hidden font-mono text-[10px] xl:inline-flex">
                CO 精讲贯通版
              </Badge>
            </Link>

            <nav className="ml-4 hidden items-center gap-1 md:flex">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = item.matchPrefix
                  ? location.pathname.startsWith(item.matchPrefix)
                  : item.end
                    ? location.pathname === item.to
                    : location.pathname.startsWith(item.to);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-accent text-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                    {typeof item.badge === 'number' && item.badge > 0 && (
                      <span className="ml-0.5 rounded-full bg-rose-500/15 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSearchOpen(true)}
              className="h-8 gap-2 px-2.5 text-muted-foreground hover:text-foreground"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden text-xs sm:inline">全局搜索考纲 / 笔记 / 习题</span>
              <span className="text-xs sm:hidden">搜索</span>
              <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] lg:inline-block">
                ⌘K
              </kbd>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="切换亮暗主题"
              title={theme === 'dark' ? '切换为亮色模式' : '切换为暗色模式'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile bottom nav strip */}
        <div className="flex items-center gap-1 overflow-x-auto border-t px-3 py-1.5 md:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.matchPrefix
              ? location.pathname.startsWith(item.matchPrefix)
              : item.end
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium',
                  active ? 'bg-accent text-foreground' : 'text-muted-foreground',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="rounded-full bg-rose-500/15 px-1 font-mono text-[10px] text-rose-600 dark:text-rose-400">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </header>

      {/* Main layout container */}
      <div className="mx-auto flex max-w-[1440px]">
        {/* Desktop collapsible syllabus sidebar */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r bg-background/60 lg:block">
          {renderSidebarTree()}
        </aside>

        {/* Mobile slide-over syllabus drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="fixed inset-0 bg-black/45 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside className="relative z-10 h-full w-72 overflow-y-auto border-r bg-background p-2 shadow-xl">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <span className="text-sm font-semibold">四科目录导航</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {renderSidebarTree()}
            </aside>
          </div>
        )}

        {/* Main view */}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>

      <CommandSearchModal open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
};
