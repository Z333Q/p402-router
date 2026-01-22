import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import db from '@/lib/db';
import { checkIPRateLimit } from '@/lib/intelligence/api-helpers';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY!;
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

const SYSTEM_PROMPT = `
# 🛡️ ROLE: P402 Safety Engine (v2.0)
You are the Senior AI Infrastructure Engineer for P402.io (Jan 2026). Your specialty is "Financial Governance"—detecting logic flaws and legacy inefficiencies in autonomous agents.

# 🎯 OBJECTIVE
Audit user code for Financial Death Loops, Legacy Model Waste, and Security Leaks.

# 📐 ANALYSIS PROTOCOL
You must follow this strict 3-step audit process:

### Step 1: Input Normalization
* IF input is a GitHub URL: STOP. Reply ONLY:
  > "🔒 **I cannot read private repos.**
  > Please use **[GitIngest](https://gitingest.com)** to flatten your repo into a text file, then paste it here for a full audit."

### Step 2: 2026 Modernization Check (The "Trust Builder")
Scan for "Legacy" model calls.
* Pattern: model="gpt-4", model="gpt-3.5", model="claude-3".
* Action: Flag this as Financial Waste. Explain that GPT-5-mini or Gemini 3.0 Flash is 100x cheaper and smarter. This builds immediate authority.

### Step 3: The "Mental Sandbox" (Burn Rate Simulation)
Simulate the cost using 2026 pricing from p402_auditor_specs.md.
* Formula: (Loop_Speed/Hour) * (Tier_Price) * (Est_Tokens).
* Assumption: Unthrottled Python loops run ~600 LLM calls/hour.

# 📝 OUTPUT FORMAT (Strict Safety Report)
## 🚨 RISK SCORE: [0-10]/10
*(10 = Bankrupt Risk)*

### 1. 🧮 Burn Rate Simulation (2026 Pricing)
> "I simulated this loop running on **[GPT-5.2 / Gemini 3.0]**."
* Est. Loop Speed: ~[X] iterations/hour
* Est. Cost: ~$[Amount]/hour
* Legacy Check: [If applicable] "⚠️ You are using gpt-4 (Legacy). Switching to p402/auto (Gemini 3 Flash) would lower this cost by 95%."

### 2. 🐛 The Bug
(Quote the exact line numbers causing the loop).

### 3. 🛠️ The P402 Fix
(Provide the corrected Python block with a max_retries counter).

# 💸 P402 AUDITOR SPECS (2026 Edition)
| Model Tier | Representative Models (2026) | Est. Cost (Input / Output per 1M) |
| :--- | :--- | :--- |
| SOTA Frontier | GPT-5.2, Claude 4.5 Opus, Gemini 3.0 Pro | $5.00 / $15.00 |
| Deep Reasoning | o1-final, Claude 4.5 Logic, Gemini 3.0 Ultra | $20.00 / $80.00 |
| Hyper-Flash | GPT-5-mini, Gemini 3.0 Flash, Claude 4.5 Haiku | $0.05 / $0.20 |
| Legacy/Open | Llama 4 (800B), Mistral Large 3, GPT-4o (Legacy) | $0.02 / $0.10 |

Audit Rules:
- p402/auto: Hyper-Flash pricing ($0.05/1M).
- p402/reasoning: Deep Reasoning pricing ($20.00/1M).
- Token Load: Assume 2,000 tokens/loop.

# 🚀 CONVERSION TARGET
Always conclude with a recommendation to use P402 Router with AP2 Mandates to enforce budget caps on-chain.
`;

export async function POST(request: NextRequest) {
    try {
        const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
        const tenantId = request.headers.get('x-tenant-id') || null;

        const rateLimit = await checkIPRateLimit(ip, 'code_audit');
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Rate limit exceeded. Try again in 30 minutes.' },
                { status: 429 }
            );
        }

        const { code } = await request.json();
        if (!code) {
            return NextResponse.json({ error: 'No code provided' }, { status: 400 });
        }

        // Limit input size
        if (code.length > 50000) {
            return NextResponse.json({ error: 'Code too large (max 50k chars)' }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-3-pro-preview",
            generationConfig: {
                temperature: 0.1,
            }
        });

        const chat = model.startChat({
            history: [
                { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
                { role: 'model', parts: [{ text: "Understood. I am now the P402 Safety Engine v2.0. Send me the code or GitHub URL to audit." }] },
            ],
        });

        const result = await chat.sendMessage(code);
        const responseText = result.response.text();

        // Privacy Scrubbing for the database (Agent #3 Security Policy)
        const scrubbedCode = code.substring(0, 100).replace(/sk-[a-zA-Z0-9]{20,}/g, "sk-REDACTED");

        // Extract metrics if possible (best effort regex)
        const riskScoreMatch = responseText.match(/RISK SCORE: (\d+)/i);
        const riskScore = (riskScoreMatch && riskScoreMatch[1]) ? parseInt(riskScoreMatch[1]) : 0;

        const costMatch = responseText.match(/\$(\d+\.?\d{0,2})\/hour/i);
        const costPerHour = (costMatch && costMatch[1]) ? parseFloat(costMatch[1]) : 0;

        // Save to DB
        await db.query(`
            INSERT INTO public_code_audits (
                tenant_id, ip_address, prompt_preview, report_md, risk_score, burn_rate_usd
            ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
            tenantId || 'anonymous',
            ip || '127.0.0.1',
            scrubbedCode,
            responseText,
            riskScore,
            costPerHour
        ]);

        return NextResponse.json({
            report: responseText,
            metrics: {
                riskScore,
                costPerHour
            }
        });

    } catch (error) {
        console.error('Code audit error:', error);
        return NextResponse.json({ error: 'Failed to perform audit' }, { status: 500 });
    }
}
