'use client';

import mermaid from 'mermaid';
import { useEffect, useId, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

let mermaidInitialized = false;

function MermaidBlock({ chart }: { chart: string }) {
  const reactId = useId().replace(/:/g, '');
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    async function renderChart() {
      try {
        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            securityLevel: 'strict',
          });
          mermaidInitialized = true;
        }
        const { svg: rendered } = await mermaid.render(`mmd-${reactId}`, chart);
        if (active) {
          setSvg(rendered);
          setFailed(false);
        }
      } catch {
        if (active) setFailed(true);
      }
    }
    renderChart();
    return () => {
      active = false;
    };
  }, [chart, reactId]);

  if (failed || !svg) {
    return (
      <pre
        className="my-3 overflow-x-auto rounded-lg border p-3 text-xs"
        style={{
          borderColor: 'var(--border-subtle)',
          backgroundColor: 'var(--bg-elevated)',
        }}
      >
        <code>{chart}</code>
      </pre>
    );
  }

  return (
    <figure
      className="my-4 overflow-x-auto rounded-xl border p-4"
      style={{
        borderColor: 'var(--border-subtle)',
        backgroundColor: 'var(--bg-elevated)',
      }}
    >
      <div
        className="flex justify-center"
        aria-label="Diagrama Mermaid do fluxo de jogo"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <figcaption className="mt-2 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
        Diagrama visual gerado pelo fluxo do GDD
      </figcaption>
    </figure>
  );
}

/**
 * Renders GDD Markdown with GitHub Flavored tables and live Mermaid diagrams.
 */
export function MarkdownRenderer({ content }: { content: string }) {
  if (!content.trim()) {
    return (
      <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
        Esta seção ainda não possui conteúdo. Clique em &ldquo;Gerar GDD Completo com IA&rdquo; ou edite manualmente.
      </p>
    );
  }

  return (
    <div className="gdd-prose text-sm sm:text-base">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props) {
            const { className, children } = props;
            const match = /language-(\w+)/.exec(className || '');
            const lang = match?.[1];
            const raw = String(children).replace(/\n$/, '');

            if (lang === 'mermaid') {
              return <MermaidBlock chart={raw} />;
            }

            return <code className={className}>{children}</code>;
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto">
                <table>{children}</table>
              </div>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
