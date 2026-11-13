import React, { useEffect, useId, useState } from 'react';
import mermaid from 'mermaid';
import { Check, Code2, Copy } from 'lucide-react';
import { useStudyStore } from '@/store/useStudyStore';
import { Button } from '@/components/ui/button';

let renderQueue: Promise<void> = Promise.resolve();
let activeTheme: 'light' | 'dark' | null = null;

function enqueueMermaidRender(
  id: string,
  code: string,
  theme: 'light' | 'dark',
): Promise<string> {
  const job = renderQueue.then(async () => {
    if (activeTheme !== theme) {
      mermaid.initialize({
        startOnLoad: false,
        theme: theme === 'dark' ? 'dark' : 'default',
        securityLevel: 'loose',
        fontFamily: 'Inter, "PingFang SC", "Microsoft YaHei", sans-serif',
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
        },
        sequence: {
          useMaxWidth: true,
        },
      });
      activeTheme = theme;
    }
    const { svg } = await mermaid.render(id, code.trim());
    return svg;
  });

  renderQueue = job.then(
    () => undefined,
    () => undefined,
  );
  return job;
}

interface MermaidBlockProps {
  code: string;
}

export const MermaidBlock: React.FC<MermaidBlockProps> = ({ code }) => {
  const { theme } = useStudyStore();
  const rawId = useId();
  const safeBaseId = `mmd-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showSource, setShowSource] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const renderId = `${safeBaseId}-${theme}-${Date.now().toString(36)}`;
    setError(null);

    enqueueMermaidRender(renderId, code, theme)
      .then((renderedSvg) => {
        if (!cancelled) {
          setSvg(renderedSvg);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Mermaid 图表渲染失败');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [code, safeBaseId, theme]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore clipboard failures
    }
  };

  return (
    <div className="my-5 overflow-hidden rounded-xl border bg-card/80 shadow-sm">
      <div className="flex items-center justify-between border-b bg-muted/40 px-3.5 py-2 text-xs text-muted-foreground">
        <span className="font-mono font-medium uppercase tracking-wider text-foreground/75">
          Mermaid 架构 / 时序图
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setShowSource((v) => !v)}
          >
            <Code2 className="h-3.5 w-3.5" />
            <span>{showSource ? '查看图示' : '源码'}</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? '已复制' : '复制'}</span>
          </Button>
        </div>
      </div>

      {showSource ? (
        <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-foreground/90">
          <code>{code}</code>
        </pre>
      ) : error ? (
        <div className="mermaid-error space-y-2 p-4 text-sm text-rose-600 dark:text-rose-400">
          <p className="font-medium">图表语法渲染异常：{error}</p>
          <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs text-foreground">
            <code>{code}</code>
          </pre>
        </div>
      ) : svg ? (
        <div
          className="mermaid-rendered flex justify-center overflow-x-auto p-4 [&_svg]:h-auto [&_svg]:max-w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">
          正在渲染结构图...
        </div>
      )}
    </div>
  );
};
