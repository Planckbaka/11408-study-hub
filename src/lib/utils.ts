import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { TocHeading } from '@/types/study';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function slugifyHeading(raw: string): string {
  const cleaned = raw
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\$[^$]+\$/g, '')
    .trim()
    .toLowerCase();

  const slug = cleaned
    .replace(/[^\p{L}\p{N}\s_-]+/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return slug || 'section';
}

export function createHeadingIdGenerator() {
  const counts = new Map<string, number>();
  return (text: string): string => {
    const base = slugifyHeading(text);
    const seen = counts.get(base) ?? 0;
    counts.set(base, seen + 1);
    return seen === 0 ? base : `${base}-${seen}`;
  };
}

export function extractTocHeadings(markdown: string): TocHeading[] {
  const headings: TocHeading[] = [];
  const nextId = createHeadingIdGenerator();
  const lines = markdown.split('\n');
  let inFence = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = /^(#{2,3})\s+(.+?)\s*#*$/.exec(trimmed);
    if (!match) continue;
    const level = match[1].length as 2 | 3;
    const rawText = match[2]
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .trim();
    headings.push({
      id: nextId(rawText),
      text: rawText,
      level,
    });
  }

  return headings;
}

/**
 * Normalize LaTeX delimiters \(...\) and \[...\] to $...$ and $$...$$
 * while leaving fenced code blocks and inline code spans untouched.
 */
export function normalizeMathDelimiters(markdown: string): string {
  const lines = markdown.split('\n');
  const out: string[] = [];
  let inFence = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      inFence = !inFence;
      out.push(line);
      continue;
    }
    if (inFence) {
      out.push(line);
      continue;
    }

    // Split on inline backticks so we never rewrite code spans
    const segments = line.split(/(`[^`]*`)/g);
    const transformed = segments
      .map((seg, idx) => {
        if (idx % 2 === 1) return seg;
        return seg
          .replace(/\\\[/g, '$$$$')
          .replace(/\\\]/g, '$$$$')
          .replace(/\\\((.+?)\\\)/g, (_, inner: string) => `$${inner.trim()}$`);
      })
      .join('');
    out.push(transformed);
  }

  return out.join('\n');
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
