import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AgentGDD — Estúdio Profissional de Game Design Documents com IA',
  description:
    'Plataforma completa para gerar, auditar, versionar e exportar Game Design Documents (GDD) estruturados de nível estúdio com Supabase e Gemini AI.',
};

/**
 * Root application layout declaring light/dark color-scheme support and semantic skip-link.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className="antialiased">
        <a href="#main-content" className="skip-link no-print">
          Pular para o conteúdo principal
        </a>
        {children}
      </body>
    </html>
  );
}
