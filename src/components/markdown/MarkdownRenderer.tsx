import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { AlertTriangle, Check, Copy, Flame, Info, Lightbulb } from 'lucide-react';
import { cn, createHeadingIdGenerator, normalizeMathDelimiters } from '@/lib/utils';
import { MermaidBlock } from '@/components/markdown/MermaidBlock';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  compact?: boolean;
}

function extractPlainText(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractPlainText).join('');
  }
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return extractPlainText(node.props.children);
  }
  return '';
}

const CALLOUT_STYLES = {
  IMPORTANT: {
    label: '高频考点提示',
    icon: Flame,
    wrapper:
      'border-sky-500/40 bg-sky-500/8 text-foreground dark:bg-sky-950/35 dark:border-sky-500/35',
    title: 'text-sky-700 dark:text-sky-300',
  },
  WARNING: {
    label: '易错陷阱警示',
    icon: AlertTriangle,
    wrapper:
      'border-amber-500/45 bg-amber-500/10 text-foreground dark:bg-amber-950/30 dark:border-amber-500/35',
    title: 'text-amber-700 dark:text-amber-300',
  },
  TIP: {
    label: '解题口诀 / 技巧',
    icon: Lightbulb,
    wrapper:
      'border-emerald-500/40 bg-emerald-500/8 text-foreground dark:bg-emerald-950/30 dark:border-emerald-500/35',
    title: 'text-emerald-700 dark:text-emerald-300',
  },
  NOTE: {
    label: '核心辨析说明',
    icon: Info,
    wrapper:
      'border-border bg-muted/60 text-foreground dark:bg-muted/35',
    title: 'text-foreground',
  },
} as const;

type CalloutType = keyof typeof CALLOUT_STYLES;

function stripCalloutTagFromChildren(
  children: React.ReactNode,
  tag: string,
): React.ReactNode {
  const arr = React.Children.toArray(children);
  if (arr.length === 0) return children;
  const first = arr[0];
  if (React.isValidElement<{ children?: React.ReactNode }>(first)) {
    const innerArr = React.Children.toArray(first.props.children);
    if (innerArr.length > 0 && typeof innerArr[0] === 'string') {
      const strippedFirstString = innerArr[0].replace(
        new RegExp(`^\\s*\\[!${tag}\\]\\s*`),
        '',
      );
      const updatedInner = [strippedFirstString, ...innerArr.slice(1)];
      const clonedFirst = React.cloneElement(first, {
        ...first.props,
        children: updatedInner,
      });
      return [clonedFirst, ...arr.slice(1)];
    }
  }
  return children;
}

const CodePreBlock: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [copied, setCopied] = useState(false);
  const childArray = React.Children.toArray(children);
  const firstChild = childArray[0];

  if (React.isValidElement<{ className?: string; children?: React.ReactNode }>(firstChild)) {
    const className = firstChild.props.className ?? '';
    const rawCode = extractPlainText(firstChild.props.children).replace(/\n$/, '');

    if (className.includes('language-mermaid')) {
      return <MermaidBlock code={rawCode} />;
    }

    const langMatch = /language-([a-zA-Z0-9_-]+)/.exec(className);
    const languageLabel = langMatch ? langMatch[1] : 'code';

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(rawCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        // ignore clipboard failure
      }
    };

    return (
      <div className="my-4 overflow-hidden rounded-xl border bg-muted/35 shadow-sm dark:bg-slate-950/70">
        <div className="flex items-center justify-between border-b bg-muted/50 px-3.5 py-1.5 text-xs text-muted-foreground">
          <span className="font-mono uppercase tracking-wider">{languageLabel}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs hover:bg-accent hover:text-foreground"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? '已复制' : '复制'}</span>
          </button>
        </div>
        <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed">{children}</pre>
      </div>
    );
  }

  return <pre className="my-4 overflow-x-auto rounded-lg border bg-muted/40 p-4 font-mono text-sm">{children}</pre>;
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className,
  compact = false,
}) => {
  const normalizedContent = useMemo(() => normalizeMathDelimiters(content), [content]);
  // Fresh deterministic heading ID generator on every render (StrictMode-safe)
  const nextHeadingId = createHeadingIdGenerator();

  return (
    <div
      className={cn(
        'prose max-w-none prose-slate dark:prose-invert',
        'prose-headings:scroll-mt-20 prose-headings:font-semibold prose-headings:tracking-tight',
        'prose-h2:mt-9 prose-h2:border-b prose-h2:pb-2 prose-h2:text-xl',
        'prose-h3:mt-6 prose-h3:text-base',
        'prose-p:leading-7 prose-li:leading-7',
        'prose-code:before:content-none prose-code:after:content-none',
        compact && 'prose-sm prose-p:leading-6 prose-li:leading-6 prose-h2:mt-5 prose-h3:mt-4',
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, [rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={{
          h2: ({ children, ...props }) => {
            const id = nextHeadingId(extractPlainText(children));
            return (
              <h2 id={id} {...props}>
                {children}
              </h2>
            );
          },
          h3: ({ children, ...props }) => {
            const id = nextHeadingId(extractPlainText(children));
            return (
              <h3 id={id} {...props}>
                {children}
              </h3>
            );
          },
          pre: ({ children }) => <CodePreBlock>{children}</CodePreBlock>,
          code: ({ className: codeClassName, children, ...props }) => {
            const isBlock = Boolean(codeClassName?.includes('language-') || codeClassName?.includes('hljs'));
            if (isBlock) {
              return (
                <code className={codeClassName} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code
                className="rounded-md border border-border/70 bg-muted/70 px-1.5 py-0.5 font-mono text-[0.86em] font-medium text-foreground"
                {...props}
              >
                {children}
              </code>
            );
          },
          table: ({ children, ...props }) => (
            <div className="my-5 overflow-x-auto rounded-xl border shadow-sm">
              <table className="m-0 w-full border-collapse text-sm" {...props}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <thead className="bg-muted/65 text-left text-xs font-semibold uppercase tracking-wide" {...props}>
              {children}
            </thead>
          ),
          th: ({ children, ...props }) => (
            <th className="border-b px-3.5 py-2.5 font-semibold text-foreground" {...props}>
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="border-b border-border/60 px-3.5 py-2.5 align-top text-foreground/90" {...props}>
              {children}
            </td>
          ),
          blockquote: ({ children, ...props }) => {
            const plain = extractPlainText(children).trimStart();
            const match = /^\[!(IMPORTANT|WARNING|TIP|NOTE)\]/.exec(plain);
            if (match) {
              const kind = match[1] as CalloutType;
              const style = CALLOUT_STYLES[kind];
              const Icon = style.icon;
              const stripped = stripCalloutTagFromChildren(children, kind);
              return (
                <div
                  className={cn(
                    'not-prose my-5 rounded-xl border px-4 py-3.5 text-sm shadow-sm',
                    style.wrapper,
                  )}
                >
                  <div className={cn('mb-1.5 flex items-center gap-2 font-semibold', style.title)}>
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{style.label}</span>
                  </div>
                  <div className="space-y-1.5 leading-relaxed [&>p:last-child]:mb-0 [&>p]:my-1">
                    {stripped}
                  </div>
                </div>
              );
            }

            return (
              <blockquote
                className="my-4 border-l-4 border-primary/50 bg-muted/35 px-4 py-2 text-foreground/90 not-italic"
                {...props}
              >
                {children}
              </blockquote>
            );
          },
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
};
