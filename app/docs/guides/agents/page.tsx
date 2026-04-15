import type { Metadata } from 'next';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';
import { AnchorNav } from './_components/AnchorNav';
import { CodeTabs } from './_components/CodeTabs';
import { CalloutBox } from './_components/CalloutBox';
import { ToolsTable } from './_components/ToolsTable';
import { SessionFlow } from './_components/SessionFlow';
import { BudgetTable } from './_components/BudgetTable';
import { BillingGuard } from './_components/BillingGuard';
import type { CodeTab } from './_components/CodeTabs';

export const metadata: Metadata = {
  title: 'Agent Integration Guide | P402',
  description:
    'Connect P402 to OpenClaw, Hermes Agent, or any OpenAI-compatible agent framework for budget-capped AI routing.',
  alternates: { canonical: 'https://p402.io/docs/guides/agents' },
  openGraph: {
    title: 'Agent Integration Guide | P402',
    description:
      'Connect any agent to P402 in minutes. Budget controls, semantic cache, and 300+ models via one endpoint.',
    url: 'https://p402.io/docs/guides/agents',
  },
};

// ─── CODE CONTENT ────────────────────────────────────────────────────────────

const OPENCLAW_TABS: CodeTab[] = [
  {
    label: 'Provider Config',
    language: 'json',
    note: 'Add P402 as an OpenAI-compatible provider in openclaw.json. Every inference call from your agent routes through P402 automatically.',
    code: `{
  "providers": {
    "p402": {
      "type": "openai",
      "baseURL": "https://p402.io/api/v2",
      "apiKey": "\${P402_API_KEY}"
    }
  }
}`,
  },
  {
    label: 'MCP Server',
    language: 'bash',
    note: 'Install the P402 MCP server for active session management. Your agent gains 6 tools to self-manage its budget, compare providers, and monitor health.',
    code: `# Install
npm install -g @p402/mcp-server

# openclaw.json
{
  "mcpServers": {
    "p402": {
      "command": "p402-mcp",
      "env": {
        "P402_API_KEY": "\${P402_API_KEY}"
      }
    }
  }
}`,
  },
  {
    label: 'SDK',
    language: 'typescript',
    note: 'For custom OpenClaw skills that need programmatic session and mandate control.',
    code: `import { P402Client } from '@p402/sdk';

const p402 = new P402Client({
  routerUrl: 'https://p402.io',
  apiKey: process.env.P402_API_KEY,
});

const session = await p402.createSession({ budget_usd: 5 });

const response = await p402.chat({
  messages: [{ role: 'user', content: 'Analyze this document...' }],
  p402: {
    mode: 'balanced',
    cache: true,
    session_id: session.id,
  },
});

console.log(response.p402_metadata);`,
  },
];

const HERMES_TABS: CodeTab[] = [
  {
    label: 'Provider Config',
    language: 'yaml',
    note: 'Add P402 as a custom provider in Hermes. Two options: interactive setup or manual config.',
    code: `# Interactive setup
hermes model
# Choose "Custom endpoint"
# Base URL: https://p402.io/api/v2
# API Key: your P402 API key
# Model: auto

# Or edit ~/.hermes/config.yaml directly:
model:
  provider: "custom"
  default: "auto"

custom_providers:
  p402:
    base_url: "https://p402.io/api/v2"
    api_key: "\${P402_API_KEY}"

# Set in .env
hermes config set P402_API_KEY your-key-here`,
  },
  {
    label: 'MCP Server',
    language: 'json',
    note: 'Hermes has native MCP support. Add P402\'s MCP server for budget-aware tool access.',
    code: `# Install
npm install -g @p402/mcp-server

# Add to Hermes MCP config (via hermes tools or manual config):
{
  "mcpServers": {
    "p402": {
      "command": "p402-mcp",
      "env": {
        "P402_API_KEY": "\${P402_API_KEY}"
      }
    }
  }
}`,
  },
  {
    label: 'CLI',
    language: 'bash',
    note: 'Use the P402 CLI alongside Hermes for session management from your terminal.',
    code: `npm install -g @p402/cli

p402 login
p402 session create --budget 10.00
p402 providers compare
p402 models list`,
  },
];

const FRAMEWORK_TABS: CodeTab[] = [
  {
    label: 'Python',
    language: 'python',
    code: `from openai import OpenAI

client = OpenAI(
    base_url="https://p402.io/api/v2",
    api_key=os.environ["P402_API_KEY"],
)

response = client.chat.completions.create(
    model="auto",
    messages=[{"role": "user", "content": "Explain blockchain in one sentence."}],
    extra_body={
        "p402": {
            "mode": "cost",
            "cache": True,
            "session_id": "sess_xxx",
        }
    },
)

print(response.choices[0].message.content)`,
  },
  {
    label: 'TypeScript',
    language: 'typescript',
    code: `import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://p402.io/api/v2',
  apiKey: process.env.P402_API_KEY,
});

const response = await client.chat.completions.create({
  model: 'auto',
  messages: [{ role: 'user', content: 'Explain blockchain in one sentence.' }],
  // @ts-expect-error p402 extension
  p402: {
    mode: 'cost',
    cache: true,
    session_id: 'sess_xxx',
  },
});

console.log(response.choices[0]?.message.content);`,
  },
  {
    label: 'LangChain',
    language: 'python',
    code: `from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    openai_api_base="https://p402.io/api/v2",
    openai_api_key=os.environ["P402_API_KEY"],
    model_name="auto",
    model_kwargs={
        "p402": {
            "mode": "balanced",
            "cache": True,
            "session_id": "sess_xxx",
        }
    },
)

result = llm.invoke("Summarize the x402 payment protocol.")
print(result.content)`,
  },
  {
    label: 'CrewAI',
    language: 'python',
    code: `from crewai import Agent, Task, Crew
from langchain_openai import ChatOpenAI

p402_llm = ChatOpenAI(
    openai_api_base="https://p402.io/api/v2",
    openai_api_key=os.environ["P402_API_KEY"],
    model_name="auto",
    model_kwargs={
        "p402": {"mode": "cost", "cache": True}
    },
)

researcher = Agent(
    role="Research Analyst",
    goal="Research AI payment protocols",
    llm=p402_llm,
    verbose=True,
)

task = Task(
    description="Research the x402 payment protocol.",
    agent=researcher,
)

crew = Crew(agents=[researcher], tasks=[task])
result = crew.kickoff()`,
  },
  {
    label: 'cURL',
    language: 'bash',
    code: `curl https://p402.io/api/v2/chat/completions \\
  -H "Authorization: Bearer $P402_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "auto",
    "messages": [
      {"role": "user", "content": "Explain blockchain in one sentence."}
    ],
    "p402": {
      "mode": "cost",
      "cache": true,
      "session_id": "sess_xxx"
    }
  }' | jq .`,
  },
  {
    label: '.NET',
    language: 'csharp',
    code: `using OpenAI;
using OpenAI.Chat;
using System.ClientModel;

var client = new ChatClient(
    model: "auto",
    credential: new ApiKeyCredential(Environment.GetEnvironmentVariable("P402_API_KEY")!),
    options: new OpenAIClientOptions
    {
        Endpoint = new Uri("https://p402.io/api/v2"),
    }
);

var messages = new List<ChatMessage>
{
    new UserChatMessage("Explain blockchain in one sentence."),
};

var completion = await client.CompleteChatAsync(messages);
Console.WriteLine(completion.Value.Content[0].Text);`,
  },
];

const ENV_TABS: CodeTab[] = [
  {
    label: 'Zo Computer',
    language: 'bash',
    code: `# In your Zo Computer app settings
# Add environment variable:
P402_API_KEY=your-key-here

# Or via the Zo CLI:
zo env set P402_API_KEY your-key-here

# Verify
zo env list | grep P402`,
  },
  {
    label: 'VPS',
    language: 'bash',
    code: `# Add to /etc/environment (system-wide) or ~/.bashrc (user)
echo 'export P402_API_KEY=your-key-here' >> ~/.bashrc
source ~/.bashrc

# For systemd services, add to the unit file:
# [Service]
# Environment="P402_API_KEY=your-key-here"

# Or use a .env file with your process manager:
echo 'P402_API_KEY=your-key-here' > /home/agent/.env
# and load with: source /home/agent/.env`,
  },
  {
    label: 'Railway / Render',
    language: 'bash',
    code: `# Railway: Dashboard > Project > Variables
# Add: P402_API_KEY = your-key-here

# Railway CLI:
railway variables set P402_API_KEY=your-key-here

# Render: Dashboard > Service > Environment
# Add: P402_API_KEY = your-key-here

# Render CLI:
render env:set P402_API_KEY=your-key-here --service your-service-name`,
  },
  {
    label: 'Replit',
    language: 'bash',
    code: `# Replit: Secrets tab (padlock icon in sidebar)
# Key: P402_API_KEY
# Value: your-key-here

# Access in code:
# Python:  os.environ["P402_API_KEY"]
# Node.js: process.env.P402_API_KEY

# Replit automatically injects secrets as env vars.
# Never commit secrets to your repl's files.`,
  },
  {
    label: 'Docker',
    language: 'bash',
    code: `# Option 1: --env-file (recommended)
echo 'P402_API_KEY=your-key-here' > .env.agent
docker run --env-file .env.agent your-agent-image

# Option 2: -e flag
docker run -e P402_API_KEY=your-key-here your-agent-image

# Option 3: Docker Compose
# docker-compose.yml:
# services:
#   agent:
#     image: your-agent-image
#     env_file:
#       - .env.agent

# Never bake secrets into Docker images.
# Use secrets or env_file at runtime.`,
  },
];

// ─── SECTION COMPONENTS ──────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-black uppercase tracking-[0.12em] text-neutral-500 font-mono mb-3">
      {'>_'} {children}
    </p>
  );
}

function SectionHeading({ children }: { children: string }) {
  return (
    <h2 className="text-3xl font-black uppercase italic tracking-tight border-b-2 border-black pb-4 mb-8">
      {children}
    </h2>
  );
}

function SubHeading({ children }: { children: string }) {
  return (
    <h3 className="text-base font-black uppercase tracking-wider mb-3 text-neutral-800">
      {children}
    </h3>
  );
}

// ─── PAGE ────────────────────────────────────────────────────────────────────

export default function AgentIntegrationGuide() {
  return (
    <div className="min-h-screen bg-white text-black selection:bg-primary selection:text-black">
      <TopNav />
      <AnchorNav />

      <main className="max-w-[1200px] mx-auto px-6">

        {/* ── PAGE HEADING ── */}
        <div className="py-20 border-b-2 border-black mb-20">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-neutral-500 font-mono mb-5">
            {'>_'} DOCS / HOW-TO GUIDES / AGENT INTEGRATION
          </p>
          <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tight leading-tight mb-6">
            YOUR AGENT.<br />
            <span className="heading-accent">OUR INFRASTRUCTURE.</span>
          </h1>
          <div className="border-l-[4px] border-black pl-5 mt-6 max-w-2xl">
            <p className="text-lg text-neutral-600 leading-relaxed">
              Connect P402 to OpenClaw, Hermes Agent, or any OpenAI-compatible agent framework.
              Budget caps, semantic caching, and 300+ model routing with zero code changes.
            </p>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            SECTION 1: OPENCLAW
        ══════════════════════════════════════════════════ */}
        <section id="openclaw" className="mb-24 scroll-mt-32">
          <SectionLabel>OPENCLAW</SectionLabel>
          <SectionHeading>24/7 AGENT WITH BUDGET CONTROLS.</SectionHeading>

          <p className="text-base text-neutral-600 leading-relaxed mb-10 max-w-3xl">
            OpenClaw is an open-source personal AI agent (MIT, 200K+ GitHub stars) that runs as a
            persistent daemon and connects to WhatsApp, Telegram, Slack, Discord, and 20+ messaging
            platforms. It is model-agnostic and accepts any OpenAI-compatible provider. P402 plugs
            in as a base URL swap.
          </p>

          <CodeTabs tabs={OPENCLAW_TABS} />

          {/* Provider Config callout */}
          <div className="mt-6 space-y-4">
            <CalloutBox variant="lime" title="What you get">
              <ul className="space-y-2 text-sm">
                {[
                  'Automatic model selection (cost / quality / speed / balanced)',
                  'Semantic cache: identical queries return at zero cost in <50ms',
                  'Billing guard: 6-layer spending protection',
                  '300+ models via OpenRouter, no per-provider config',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-primary font-black mt-0.5">+</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CalloutBox>

            <CalloutBox variant="neutral" title="Recommended mode">
              <p className="text-sm text-neutral-700 leading-relaxed">
                Most OpenClaw agents should use <span className="font-mono font-bold">cost</span> mode.
                Autonomous agents burn tokens on heartbeats, tool calls, and sub-agent tasks. Cost
                mode selects the cheapest capable model per request.
              </p>
            </CalloutBox>
          </div>

          {/* MCP tools table */}
          <div className="mt-12">
            <SubHeading>MCP Tools</SubHeading>
            <ToolsTable />
          </div>

          {/* SOUL.md */}
          <div className="mt-12">
            <SubHeading>SOUL.md Addition</SubHeading>
            <p className="text-sm text-neutral-600 mb-4">
              Add this to your agent&apos;s <span className="font-mono">SOUL.md</span> for autonomous budget management:
            </p>
            <div className="border-2 border-black">
              <div className="bg-[#141414] relative">
                <pre className="p-6 text-[#F5F5F5] font-mono text-sm overflow-x-auto leading-relaxed whitespace-pre">{`## Budget Management
Before any task that may consume significant tokens (code generation,
research, long-form writing), check your P402 session balance using the
p402_get_session tool. If remaining budget is below $1.00, notify the
user and suggest funding the session. Default to cost routing mode for
routine tasks.`}</pre>
              </div>
            </div>
          </div>
        </section>

        <hr className="border-t-2 border-black mb-24" />

        {/* ══════════════════════════════════════════════════
            SECTION 2: HERMES AGENT
        ══════════════════════════════════════════════════ */}
        <section id="hermes-agent" className="mb-24 scroll-mt-32">
          <SectionLabel>HERMES AGENT</SectionLabel>
          <SectionHeading>SELF-IMPROVING AGENT, CONTROLLED SPEND.</SectionHeading>

          <p className="text-base text-neutral-600 leading-relaxed mb-10 max-w-3xl">
            Hermes Agent (by Nous Research, 61K+ GitHub stars) is a Python-based autonomous agent
            with a built-in learning loop, skill system, and support for 6 terminal backends. It
            configures providers in{' '}
            <span className="font-mono">~/.hermes/config.yaml</span> and supports any
            OpenAI-compatible endpoint via custom providers.
          </p>

          <CodeTabs tabs={HERMES_TABS} />

          {/* Fallback chain callout */}
          <div className="mt-6 space-y-4">
            <CalloutBox variant="neutral" title="Fallback chain">
              <p className="text-sm text-neutral-700 leading-relaxed mb-4">
                Hermes supports provider fallback. Use P402 as primary with a direct provider as
                backup:
              </p>
              <div className="border-2 border-black bg-[#141414]">
                <pre className="p-4 text-[#F5F5F5] font-mono text-sm whitespace-pre">{`fallback_model:
  provider: "openrouter"
  model: "anthropic/claude-sonnet-4-6"`}</pre>
              </div>
            </CalloutBox>

            <CalloutBox variant="lime" title="Migration note">
              <p className="text-sm leading-relaxed">
                If you are migrating from OpenClaw to Hermes, run{' '}
                <span className="font-mono font-bold">hermes claw migrate</span> first. Your P402
                provider config will carry over automatically if it was stored in OpenClaw&apos;s config.
              </p>
            </CalloutBox>
          </div>

          {/* MCP tools table (reused) */}
          <div className="mt-12">
            <SubHeading>MCP Tools</SubHeading>
            <ToolsTable />
          </div>
        </section>

        <hr className="border-t-2 border-black mb-24" />

        {/* ══════════════════════════════════════════════════
            SECTION 3: ANY FRAMEWORK
        ══════════════════════════════════════════════════ */}
        <section id="any-framework" className="mb-24 scroll-mt-32">
          <SectionLabel>UNIVERSAL INTEGRATION</SectionLabel>
          <SectionHeading>TWO VALUES. ANY FRAMEWORK.</SectionHeading>

          <p className="text-base text-neutral-600 leading-relaxed mb-10 max-w-3xl">
            P402 is an OpenAI-compatible API. Change <span className="font-mono">baseURL</span> and{' '}
            <span className="font-mono">apiKey</span>. That is the entire integration. The{' '}
            <span className="font-mono">p402</span> options block (routing mode, caching, session
            binding) is optional -- P402 defaults to balanced mode with caching enabled.
          </p>

          <CodeTabs tabs={FRAMEWORK_TABS} />

          {/* Budget sizing table */}
          <div className="mt-12">
            <SubHeading>Budget Sizing Guide</SubHeading>
            <BudgetTable />
          </div>
        </section>

        <hr className="border-t-2 border-black mb-24" />

        {/* ══════════════════════════════════════════════════
            SECTION 4: ENVIRONMENT SETUP
        ══════════════════════════════════════════════════ */}
        <section id="environment" className="mb-24 scroll-mt-32">
          <SectionLabel>ENVIRONMENT</SectionLabel>
          <SectionHeading>SECRETS AND HOSTING.</SectionHeading>

          <CodeTabs tabs={ENV_TABS} />

          {/* Verification */}
          <div className="mt-10">
            <SubHeading>Verification</SubHeading>
            <div className="border-2 border-black bg-[#141414]">
              <pre className="p-6 text-[#F5F5F5] font-mono text-sm overflow-x-auto whitespace-pre">{`curl -s https://p402.io/api/v2/health \\
  -H "Authorization: Bearer $P402_API_KEY" | jq .`}</pre>
            </div>
          </div>

          <div className="mt-6">
            <CalloutBox variant="neutral" title="Multi-agent note">
              <p className="text-sm text-neutral-700 leading-relaxed">
                A single P402 API key serves multiple agents. Use separate{' '}
                <span className="font-mono font-bold">session_id</span> values per agent to track
                spend independently.
              </p>
            </CalloutBox>
          </div>
        </section>

        <hr className="border-t-2 border-black mb-24" />

        {/* ══════════════════════════════════════════════════
            SECTION 5: SESSION LIFECYCLE
        ══════════════════════════════════════════════════ */}
        <section id="sessions" className="mb-24 scroll-mt-32">
          <SectionLabel>SESSION LIFECYCLE</SectionLabel>
          <SectionHeading>CREATE. FUND. USE. MONITOR.</SectionHeading>

          <SessionFlow />

          {/* Session states */}
          <div className="mt-10">
            <SubHeading>Session States</SubHeading>
            <div className="flex flex-wrap gap-0 border-2 border-black">
              {['active', 'exhausted', 'expired', 'ended', 'revoked'].map((s, i, arr) => (
                <span
                  key={s}
                  className={`px-4 py-2 font-mono text-sm font-bold ${
                    s === 'active' ? 'bg-primary text-black' : 'bg-white text-neutral-700'
                  } ${i < arr.length - 1 ? 'border-r-2 border-black' : ''}`}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Billing guard */}
          <div className="mt-10">
            <SubHeading>Billing Guard -- 6 Layers</SubHeading>
            <BillingGuard />
          </div>
        </section>

      </main>

      {/* ── FOOTER CTA ── */}
      <div className="border-t-2 border-black bg-neutral-900 text-white">
        <div className="max-w-[1200px] mx-auto px-6 py-20 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-neutral-500 font-mono mb-3">
              {'>_'} READY TO CONNECT
            </p>
            <h2 className="text-4xl font-black uppercase italic tracking-tight">
              START IN <span className="heading-accent">MINUTES.</span>
            </h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="https://p402.io/login"
              className="inline-flex items-center h-12 px-8 bg-primary text-black font-black text-[13px] uppercase tracking-wider border-2 border-primary hover:bg-white hover:border-white transition-colors"
            >
              Get API Key
            </a>
            <a
              href="/docs/api"
              className="inline-flex items-center h-12 px-8 bg-transparent text-white font-black text-[13px] uppercase tracking-wider border-2 border-white hover:bg-white hover:text-black transition-colors"
            >
              API Reference
            </a>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
