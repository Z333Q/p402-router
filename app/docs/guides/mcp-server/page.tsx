import type { Metadata } from 'next';
import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Set Up the MCP Server | P402 How-To Guides',
  description:
    'Connect Claude Desktop, Cursor, or any MCP-compatible host to P402 in under 5 minutes. No SDK, no code changes.',
  alternates: { canonical: 'https://p402.io/docs/guides/mcp-server' },
  openGraph: {
    title: 'Set Up MCP Server | P402',
    description: 'Connect any MCP host to P402 cost-optimised AI routing in minutes.',
    url: 'https://p402.io/docs/guides/mcp-server',
  },
};

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-black uppercase tracking-[0.12em] text-neutral-500 font-mono mb-3">
      {'>_'} {children}
    </p>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <div className="w-9 h-9 bg-primary border-2 border-black flex items-center justify-center font-black text-sm shrink-0">
      {n}
    </div>
  );
}

function CodeBlock({ code, language = '' }: { code: string; language?: string }) {
  return (
    <div className="border-2 border-black bg-[#141414] overflow-x-auto">
      {language && (
        <div className="px-4 py-1.5 border-b border-neutral-700 text-[10px] font-black uppercase tracking-widest text-neutral-500 font-mono">
          {language}
        </div>
      )}
      <pre className="p-6 text-[#F5F5F5] font-mono text-sm leading-relaxed whitespace-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Callout({
  children,
  variant = 'neutral',
  title,
}: {
  children: React.ReactNode;
  variant?: 'lime' | 'neutral' | 'warn';
  title?: string;
}) {
  const bg =
    variant === 'lime' ? 'bg-[#E9FFD0]' : variant === 'warn' ? 'bg-amber-50' : 'bg-neutral-50';
  return (
    <div className={`border-2 border-black p-5 ${bg}`}>
      {title && (
        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

// ─── TOOLS TABLE ─────────────────────────────────────────────────────────────

const TOOLS = [
  { name: 'p402_chat', desc: 'Send a cost-optimised chat completion via P402 routing.' },
  { name: 'p402_create_session', desc: 'Create a budget-capped session and return its ID.' },
  { name: 'p402_get_session', desc: 'Inspect a session — balance, spend, request count.' },
  { name: 'p402_list_models', desc: 'List all 300+ routable models and their live prices.' },
  { name: 'p402_compare_providers', desc: 'Side-by-side cost/latency/quality comparison for a prompt.' },
  { name: 'p402_health', desc: 'Check P402 and provider health status.' },
];

// ─── PAGE ────────────────────────────────────────────────────────────────────

export default function McpServerPage() {
  return (
    <div className="min-h-screen bg-white text-black selection:bg-primary selection:text-black">
      <TopNav />

      <div className="border-b-2 border-black bg-neutral-50">
        <div className="max-w-[860px] mx-auto px-6 py-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-neutral-500">
          <Link href="/docs" className="hover:text-black no-underline transition-colors">Docs</Link>
          <span>/</span>
          <span>How-To Guides</span>
          <span>/</span>
          <span className="text-black">Set Up MCP Server</span>
        </div>
      </div>

      <main className="max-w-[860px] mx-auto px-6 py-20">

        <div className="border-b-2 border-black pb-16 mb-16">
          <SectionLabel>DOCS / HOW-TO GUIDES</SectionLabel>
          <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tight leading-tight mb-6">
            SET UP THE<br />
            <span className="heading-accent">MCP SERVER.</span>
          </h1>
          <div className="border-l-[4px] border-black pl-5 max-w-xl">
            <p className="text-lg text-neutral-600 leading-relaxed">
              Connect Claude Desktop, Cursor, or any MCP-compatible host to P402 routing —
              no SDK, no code changes to your existing agents.
            </p>
          </div>
        </div>

        {/* ── HOW IT WORKS ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-4">How It Works</h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            The P402 MCP server exposes six tools over the Model Context Protocol (MCP).
            When your AI host calls <span className="font-mono">p402_chat</span>, P402 routes
            the request to the cheapest capable provider, applies your session budget, and
            returns an OpenAI-compatible response — all transparently.
          </p>
          <div className="border-2 border-black p-6 bg-neutral-50 font-mono text-sm">
            <div className="flex items-center gap-3 text-neutral-600">
              <span className="font-bold text-black">Claude Desktop</span>
              <span>→</span>
              <span className="font-bold text-black">P402 MCP Server</span>
              <span>→</span>
              <span className="font-bold text-black">Cheapest Provider</span>
            </div>
            <div className="mt-2 text-xs text-neutral-500">
              (DeepSeek · Groq · Mistral · OpenAI · Anthropic · 9 more)
            </div>
          </div>
        </div>

        {/* ── STEP 1: INSTALL ── */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-6">
            <StepNumber n={1} />
            <h2 className="text-2xl font-black uppercase italic tracking-tight">Run the Server</h2>
          </div>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            The server ships as an npm package. No global install needed — <span className="font-mono">npx</span> handles it.
          </p>
          <CodeBlock
            language="bash"
            code={`P402_API_KEY=your_key npx -y @p402/mcp-server@latest`}
          />
          <p className="mt-4 text-sm text-neutral-600">
            The server starts on <span className="font-mono">stdio</span> (default) or{' '}
            <span className="font-mono">--transport sse --port 3100</span> for HTTP SSE mode.
          </p>
        </div>

        {/* ── STEP 2: CLAUDE DESKTOP ── */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-6">
            <StepNumber n={2} />
            <h2 className="text-2xl font-black uppercase italic tracking-tight">Configure Claude Desktop</h2>
          </div>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            Open <span className="font-mono">claude_desktop_config.json</span> and add the P402 server block.
            Claude Desktop auto-restarts the server on each session.
          </p>
          <div className="mb-3 text-xs font-black uppercase tracking-widest text-neutral-500">
            macOS: <span className="font-mono normal-case">~/Library/Application Support/Claude/claude_desktop_config.json</span>
          </div>
          <div className="mb-3 text-xs font-black uppercase tracking-widest text-neutral-500">
            Windows: <span className="font-mono normal-case">%APPDATA%\Claude\claude_desktop_config.json</span>
          </div>
          <CodeBlock
            language="json"
            code={`{
  "mcpServers": {
    "p402": {
      "command": "npx",
      "args": ["-y", "@p402/mcp-server@latest"],
      "env": {
        "P402_API_KEY": "your_p402_api_key_here"
      }
    }
  }
}`}
          />
          <div className="mt-4">
            <Callout variant="neutral" title="Restart Claude Desktop">
              <p className="text-sm text-neutral-700">
                After saving the config, fully quit and reopen Claude Desktop.
                You should see a hammer icon (🔨) in the composer — that&apos;s the MCP tools menu.
              </p>
            </Callout>
          </div>
        </div>

        {/* ── STEP 3: CURSOR ── */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-6">
            <StepNumber n={3} />
            <h2 className="text-2xl font-black uppercase italic tracking-tight">Configure Cursor</h2>
          </div>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            In Cursor: <strong>Settings → MCP → Add Server</strong>. Use the stdio transport.
          </p>
          <CodeBlock
            language="json"
            code={`{
  "mcpServers": {
    "p402": {
      "command": "npx",
      "args": ["-y", "@p402/mcp-server@latest"],
      "env": { "P402_API_KEY": "your_key" }
    }
  }
}`}
          />
        </div>

        {/* ── STEP 4: CUSTOM HOST ── */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-6">
            <StepNumber n={4} />
            <h2 className="text-2xl font-black uppercase italic tracking-tight">Custom MCP Host (SSE)</h2>
          </div>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            For programmatic access, start the server in HTTP SSE mode and connect with the
            official MCP TypeScript SDK.
          </p>
          <CodeBlock
            language="bash"
            code={`# Terminal 1 — start the server
P402_API_KEY=your_key npx -y @p402/mcp-server@latest --transport sse --port 3100`}
          />
          <div className="mt-4">
            <CodeBlock
              language="typescript"
              code={`// Terminal 2 — connect via SDK
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

const client = new Client({ name: 'my-agent', version: '1.0' }, { capabilities: {} });
const transport = new SSEClientTransport(new URL('http://localhost:3100/sse'));

await client.connect(transport);

// Call p402_chat
const result = await client.callTool({
  name: 'p402_chat',
  arguments: {
    messages: [{ role: 'user', content: 'What is EIP-3009?' }],
    mode: 'cost',
    cache: true,
    session_id: 'YOUR_SESSION_ID',   // optional
  },
});

console.log(result.content[0].text);`}
            />
          </div>
        </div>

        {/* ── AVAILABLE TOOLS ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-6">Available Tools</h2>
          <div className="border-2 border-black overflow-hidden">
            <div className="grid grid-cols-[1fr_2fr] bg-black text-white text-[10px] font-black uppercase tracking-widest">
              <div className="px-4 py-3">Tool</div>
              <div className="px-4 py-3 border-l border-neutral-700">Description</div>
            </div>
            {TOOLS.map((tool, i) => (
              <div
                key={tool.name}
                className={`grid grid-cols-[1fr_2fr] text-sm ${i < TOOLS.length - 1 ? 'border-b border-neutral-200' : ''}`}
              >
                <div className="px-4 py-3 font-mono font-bold text-[13px] bg-neutral-50">
                  {tool.name}
                </div>
                <div className="px-4 py-3 text-neutral-600 border-l border-neutral-200">
                  {tool.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── ENVIRONMENT VARIABLES ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-4">Environment Variables</h2>
          <div className="border-2 border-black overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_2fr] bg-black text-white text-[10px] font-black uppercase tracking-widest">
              <div className="px-4 py-3">Variable</div>
              <div className="px-4 py-3 border-l border-neutral-700">Default</div>
              <div className="px-4 py-3 border-l border-neutral-700">Description</div>
            </div>
            {[
              { name: 'P402_API_KEY', default: '(required)', desc: 'Your P402 API key.' },
              { name: 'P402_DEFAULT_MODE', default: 'cost', desc: 'Routing mode: cost | quality | speed | balanced.' },
              { name: 'P402_DEFAULT_CACHE', default: 'true', desc: 'Enable semantic caching by default.' },
              { name: 'P402_SESSION_ID', default: '(none)', desc: 'Pin all calls to a specific session.' },
            ].map((row, i) => (
              <div
                key={row.name}
                className={`grid grid-cols-[1fr_1fr_2fr] text-sm ${i < 3 ? 'border-b border-neutral-200' : ''}`}
              >
                <div className="px-4 py-3 font-mono font-bold text-[13px] bg-neutral-50">{row.name}</div>
                <div className="px-4 py-3 font-mono text-neutral-500 border-l border-neutral-200">{row.default}</div>
                <div className="px-4 py-3 text-neutral-600 border-l border-neutral-200">{row.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── WHAT'S NEXT ── */}
        <div className="border-t-2 border-black pt-16">
          <Callout variant="lime" title="What's next">
            <ul className="space-y-3">
              {[
                { label: 'Manage Sessions — budgets, stats, and lifecycle', href: '/docs/guides/sessions' },
                { label: 'Choose routing modes (cost / quality / speed / balanced)', href: '/docs/guides/routing-modes' },
                { label: 'Full MCP tools reference', href: '/docs/mcp' },
                { label: 'Connect your agent via SDK', href: '/docs/guides/agents' },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="flex items-start gap-2 text-[15px] font-bold text-black no-underline group">
                    <span className="text-neutral-600 group-hover:text-black transition-colors shrink-0">→</span>
                    <span className="border-b-2 border-black group-hover:border-primary transition-colors">{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Callout>
        </div>

      </main>
      <Footer />
    </div>
  );
}
