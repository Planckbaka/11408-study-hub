import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CornerDownLeft, FileQuestion, Hash, Search, Target } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { SUBJECT_META, SYLLABUS_CHAPTERS } from '@/data/syllabus';
import { ALL_STUDY_NOTES } from '@/data/notes';
import { ALL_QUESTIONS } from '@/data/questions';
import { cn, extractTocHeadings } from '@/lib/utils';

interface SearchResultItem {
  id: string;
  kind: 'chapter' | 'kp' | 'heading' | 'question';
  title: string;
  subtitle: string;
  badge: string;
  route: string;
  headingId?: string;
  searchText: string;
}

interface CommandSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CommandSearchModal: React.FC<CommandSearchModalProps> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const corpus = useMemo<SearchResultItem[]>(() => {
    const items: SearchResultItem[] = [];

    for (const ch of SYLLABUS_CHAPTERS) {
      const subj = SUBJECT_META[ch.subject];
      items.push({
        id: `ch-${ch.id}`,
        kind: 'chapter',
        title: `${ch.id} ${ch.title}`,
        subtitle: `${subj.name} · ${ch.code} · ${ch.tierLabel}`,
        badge: subj.shortName,
        route: `/notes/${ch.subject}/${ch.id}`,
        searchText: `${ch.id} ${ch.title} ${subj.name} ${ch.syllabusItems.join(' ')}`.toLowerCase(),
      });

      for (const kp of ch.knowledgePoints) {
        items.push({
          id: `kp-${kp.kpId}`,
          kind: 'kp',
          title: kp.title,
          subtitle: `${ch.id} ${ch.title} · ${kp.corePrinciple}`,
          badge: `${kp.tier}级考点`,
          route: `/notes/${ch.subject}/${ch.id}`,
          searchText: `${kp.kpId} ${kp.title} ${kp.corePrinciple} ${kp.trap} ${ch.title}`.toLowerCase(),
        });
      }
    }

    for (const note of ALL_STUDY_NOTES) {
      const headings = extractTocHeadings(note.markdown);
      for (const h of headings) {
        items.push({
          id: `hd-${note.chapterId}-${h.id}`,
          kind: 'heading',
          title: h.text,
          subtitle: `${note.chapterId} ${note.title} 笔记小节`,
          badge: '笔记小节',
          route: `/notes/${note.subject}/${note.chapterId}`,
          headingId: h.id,
          searchText: `${h.text} ${note.title} ${note.chapterId}`.toLowerCase(),
        });
      }
    }

    for (const q of ALL_QUESTIONS) {
      const qTitle =
        q.type === 'comprehensive'
          ? q.title
          : q.stem.replace(/[`$#*>\n]+/g, ' ').slice(0, 68);
      items.push({
        id: `q-${q.id}`,
        kind: 'question',
        title: `${q.id} · ${qTitle}`,
        subtitle: `${q.chapterId} · ${q.kpTitle} · ${q.sourceTag}`,
        badge: q.type === 'comprehensive' ? '综合大题' : '选择题',
        route: `/practice?chapter=${q.chapterId}&qid=${q.id}`,
        searchText: `${q.id} ${q.kpTitle} ${q.sourceTag} ${q.difficulty} ${q.stem}`.toLowerCase(),
      });
    }

    return items;
  }, []);

  const results = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return corpus.slice(0, 12);
    }
    const tokens = trimmed.split(/\s+/).filter(Boolean);
    return corpus
      .filter((item) => tokens.every((tok) => item.searchText.includes(tok)))
      .slice(0, 24);
  }, [corpus, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 20);
    } else {
      setQuery('');
    }
  }, [open]);

  const handleSelect = (item: SearchResultItem) => {
    onOpenChange(false);
    if (item.headingId) {
      navigate(item.route, { state: { scrollToHeadingId: item.headingId } });
    } else {
      navigate(item.route);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = results[selectedIndex];
      if (target) handleSelect(target);
    }
  };

  const renderIcon = (kind: SearchResultItem['kind']) => {
    switch (kind) {
      case 'chapter':
        return <BookOpen className="h-4 w-4 text-sky-500" />;
      case 'kp':
        return <Target className="h-4 w-4 text-emerald-500" />;
      case 'heading':
        return <Hash className="h-4 w-4 text-violet-500" />;
      case 'question':
        return <FileQuestion className="h-4 w-4 text-amber-500" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="overflow-hidden border bg-popover p-0">
        <div className="flex items-center border-b px-4 py-3">
          <Search className="mr-3 h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索考纲章节、核心考点（如 Cache / 补码 / 流水线 / DMA）、笔记小节或题目..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="ml-2 hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-block">
            ESC
          </kbd>
        </div>

        <div className="max-h-[380px] overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              未找到匹配 “{query}” 的考纲章节、笔记或题目
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                    idx === selectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
                  )}
                >
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span className="mt-0.5 shrink-0">{renderIcon(item.kind)}</span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{item.title}</div>
                      <div className="truncate text-xs text-muted-foreground">{item.subtitle}</div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline" className="text-[11px]">
                      {item.badge}
                    </Badge>
                    {idx === selectedIndex && <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t bg-muted/35 px-4 py-2 text-[11px] text-muted-foreground">
          <span>↑↓ 选择 · Enter 跳转</span>
          <span>共索引 {corpus.length} 条学习条目</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};
