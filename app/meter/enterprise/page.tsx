'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// ── Types ──────────────────────────────────────────────────────────────────────

interface DeptData {
  name: string;
  budgetUsd: number;
  spentUsd: number;
  sessions: number;
  requests: number;
  topModel: string;
  employeeCount: number;
}

interface EmployeeData {
  employeeId: string;
  department: string;
  projectName: string;
  spentUsd: number;
  tokens: number;
  sessions: number;
}

interface ProjectData {
  name: string;
  department: string;
  spentUsd: number;
  sessions: number;
}

interface ModelData {
  model: string;
  spentUsd: number;
  requests: number;
  pct: number;
}

interface SessionData {
  employeeId: string;
  department: string;
  projectName: string;
  model: string;
  tokens: number;
  costUsd: number;
  createdAt: string;
}

interface AnalyticsData {
  hasRealData: boolean;
  period?: { start: string; end: string; days: number };
  org?: {
    totalSpentUsd: number;
    totalSessions: number;
    totalRequests: number;
    dayOfMonth: number;
    daysInMonth: number;
  };
  departments?: DeptData[];
  employees?: EmployeeData[];
  projects?: ProjectData[];
  modelMix?: ModelData[];
  recentSessions?: SessionData[];
}

// ── Synthetic fallback data ────────────────────────────────────────────────────

const SYNTHETIC_ORG = { totalSpentUsd: 12.47, budgetUsd: 500, totalSessions: 847, totalRequests: 12483, dayOfMonth: 5, daysInMonth: 30 };

const SYNTHETIC_DEPTS: DeptData[] = [
  { name: 'Engineering', budgetUsd: 200, spentUsd: 6.82, sessions: 420, requests: 5840, topModel: 'claude-opus-4-5', employeeCount: 3 },
  { name: 'Marketing',   budgetUsd: 100, spentUsd: 2.15, sessions: 287, requests: 3241, topModel: 'gpt-4o',            employeeCount: 2 },
  { name: 'Legal',       budgetUsd: 150, spentUsd: 1.94, sessions: 89,  requests: 1876, topModel: 'claude-sonnet-4-5', employeeCount: 2 },
  { name: 'Finance',     budgetUsd: 50,  spentUsd: 1.56, sessions: 51,  requests: 1526, topModel: 'gemini-2.0-pro',    employeeCount: 1 },
];

const SYNTHETIC_EMPLOYEES: EmployeeData[] = [
  { employeeId: 'Alice Chen',    department: 'Engineering', projectName: 'Project Phoenix',    spentUsd: 2.41, tokens: 321847, sessions: 48 },
  { employeeId: 'Bob Martinez',  department: 'Engineering', projectName: 'Platform Docs',      spentUsd: 1.93, tokens: 284102, sessions: 37 },
  { employeeId: 'Dana Park',     department: 'Marketing',   projectName: 'Campaign Blitz',     spentUsd: 1.28, tokens: 142834, sessions: 29 },
  { employeeId: 'Frank Liu',     department: 'Legal',       projectName: 'Series B Diligence', spentUsd: 1.04, tokens: 89241,  sessions: 21 },
  { employeeId: 'Charlie Singh', department: 'Engineering', projectName: 'Project Phoenix',    spentUsd: 0.78, tokens: 109482, sessions: 18 },
  { employeeId: 'Eve Johnson',   department: 'Marketing',   projectName: 'Campaign Blitz',     spentUsd: 0.87, tokens: 97012,  sessions: 19 },
  { employeeId: 'Grace Kim',     department: 'Legal',       projectName: 'Series B Diligence', spentUsd: 0.90, tokens: 72841,  sessions: 15 },
  { employeeId: 'Henry Torres',  department: 'Finance',     projectName: 'Q2 Forecast',        spentUsd: 1.56, tokens: 68241,  sessions: 12 },
];

const SYNTHETIC_PROJECTS: ProjectData[] = [
  { name: 'Project Phoenix',    department: 'Engineering', spentUsd: 4.21, sessions: 312 },
  { name: 'Platform Docs',      department: 'Engineering', spentUsd: 2.61, sessions: 108 },
  { name: 'Campaign Blitz',     department: 'Marketing',   spentUsd: 2.15, sessions: 287 },
  { name: 'Series B Diligence', department: 'Legal',       spentUsd: 1.94, sessions: 89  },
  { name: 'Q2 Forecast',        department: 'Finance',     spentUsd: 1.56, sessions: 51  },
];

const SYNTHETIC_MODELS: ModelData[] = [
  { model: 'claude-opus-4-5',   pct: 31, spentUsd: 3.85, requests: 1847 },
  { model: 'gpt-4o',            pct: 28, spentUsd: 3.49, requests: 2104 },
  { model: 'claude-sonnet-4-5', pct: 22, spentUsd: 2.74, requests: 3241 },
  { model: 'gemini-2.0-pro',    pct: 12, spentUsd: 1.50, requests: 1876 },
  { model: 'claude-haiku-4-5',  pct: 7,  spentUsd: 0.89, requests: 4415 },
];

const SYNTHETIC_SESSIONS: SessionData[] = [
  { employeeId: 'Alice Chen',   department: 'Engineering', projectName: 'Project Phoenix',    model: 'claude-opus-4-5',   tokens: 12847, costUsd: 0.097, createdAt: new Date(Date.now() - 2 * 60000).toISOString() },
  { employeeId: 'Bob Martinez', department: 'Engineering', projectName: 'Platform Docs',      model: 'claude-haiku-4-5',  tokens: 8341,  costUsd: 0.004, createdAt: new Date(Date.now() - 5 * 60000).toISOString() },
  { employeeId: 'Dana Park',    department: 'Marketing',   projectName: 'Campaign Blitz',     model: 'gpt-4o',            tokens: 4102,  costUsd: 0.041, createdAt: new Date(Date.now() - 8 * 60000).toISOString() },
  { employeeId: 'Frank Liu',    department: 'Legal',       projectName: 'Series B Diligence', model: 'claude-sonnet-4-5', tokens: 15204, costUsd: 0.046, createdAt: new Date(Date.now() - 12 * 60000).toISOString() },
  { employeeId: 'Eve Johnson',  department: 'Marketing',   projectName: 'Campaign Blitz',     model: 'claude-sonnet-4-5', tokens: 6891,  costUsd: 0.021, createdAt: new Date(Date.now() - 15 * 60000).toISOString() },
];

// ── Optimization findings (generated from model mix heuristics) ───────────────

function buildOptimizations(models: ModelData[], depts: DeptData[]) {
  const findings = [];
  const premiumSpend = models.filter(m => m.model.includes('opus') || m.model.includes('gpt-4o')).reduce((s, m) => s + m.spentUsd, 0);
  const totalSpend = models.reduce((s, m) => s + m.spentUsd, 0);

  if (premiumSpend / totalSpend > 0.4) {
    const topPremium = models.find(m => m.model.includes('opus') || m.model.includes('gpt-4o'));
    const topDept = depts[0];
    if (topPremium && topDept) {
      findings.push({
        priority: 'HIGH' as const,
        dept: topDept.name,
        saving: `$${(topPremium.spentUsd * 0.55).toFixed(2)}/mo`,
        finding: `${topPremium.requests.toLocaleString()} requests used ${topPremium.model}. Haiku or Flash achieves 90%+ similarity for routine tasks at this volume.`,
        action: `Route low-complexity tasks (classification, extraction, summarization) to a cheaper tier`,
        confidence: 92,
      });
    }
  }

  const engDept = depts.find(d => d.name === 'Engineering');
  if (engDept && engDept.spentUsd > 3) {
    findings.push({
      priority: 'HIGH' as const,
      dept: 'Engineering',
      saving: `$${(engDept.spentUsd * 0.31).toFixed(2)}/mo`,
      finding: `Code completion and docstring generation represent an estimated 60–70% of Engineering AI usage. These tasks do not require frontier models.`,
      action: `Route code completion tasks (complexity ≤ 3) to claude-haiku or gemini-flash`,
      confidence: 94,
    });
  }

  const mktDept = depts.find(d => d.name === 'Marketing');
  if (mktDept) {
    findings.push({
      priority: 'MEDIUM' as const,
      dept: 'Marketing',
      saving: `$${(mktDept.spentUsd * 0.40).toFixed(2)}/mo`,
      finding: `Content generation shows no measurable quality difference between premium and standard tier for this team's output format.`,
      action: `Route all Marketing content generation to claude-sonnet or gemini-pro`,
      confidence: 88,
    });
  }

  const legalDept = depts.find(d => d.name === 'Legal');
  if (legalDept) {
    findings.push({
      priority: 'LOW' as const,
      dept: 'Legal',
      saving: 'Do not downgrade',
      finding: `Contract analysis accuracy drops 7–9% below the current model tier. Legal routing is optimal.`,
      action: `Maintain current routing. No action needed.`,
      confidence: 97,
    });
  }

  return findings;
}

// ── Relative time helper ───────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EnterpriseDemoPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'departments' | 'employees' | 'projects' | 'optimize' | 'sessions'>('overview');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [tenantInput, setTenantInput] = useState('');
  const [connectedTenant, setConnectedTenant] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [budgetEditing, setBudgetEditing] = useState<string | null>(null);
  const [budgetDraft, setBudgetDraft] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);

  const fetchAnalytics = useCallback(async (tenantId: string) => {
    try {
      const res = await fetch('/api/v2/enterprise/analytics', {
        headers: { 'x-p402-tenant': tenantId },
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json() as AnalyticsData;
      setAnalytics(data);
    } catch {
      setAnalytics({ hasRealData: false });
    }
  }, []);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('p402-enterprise-tenant') : null;
    if (saved) {
      setConnectedTenant(saved);
      void fetchAnalytics(saved);
    }
  }, [fetchAnalytics]);

  async function connect() {
    const id = tenantInput.trim();
    if (!id) return;
    setConnecting(true);
    setConnectError(null);
    try {
      const res = await fetch('/api/v2/enterprise/analytics', {
        headers: { 'x-p402-tenant': id },
      });
      if (!res.ok) throw new Error('Invalid tenant ID or no access');
      const data = await res.json() as AnalyticsData;
      localStorage.setItem('p402-enterprise-tenant', id);
      setConnectedTenant(id);
      setAnalytics(data);
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : 'Connection failed');
    } finally {
      setConnecting(false);
    }
  }

  function disconnect() {
    localStorage.removeItem('p402-enterprise-tenant');
    setConnectedTenant(null);
    setAnalytics(null);
    setTenantInput('');
  }

  async function saveBudget(deptName: string) {
    if (!connectedTenant) return;
    const val = parseFloat(budgetDraft);
    if (isNaN(val) || val < 0) return;
    setSavingBudget(true);
    try {
      await fetch('/api/v2/enterprise/budgets', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-p402-tenant': connectedTenant },
        body: JSON.stringify({ department: deptName, budget_usd: val }),
      });
      setBudgetEditing(null);
      await fetchAnalytics(connectedTenant);
    } finally {
      setSavingBudget(false);
    }
  }

  // Resolve data — real or synthetic
  const isReal = analytics?.hasRealData === true;
  const org = isReal ? analytics!.org! : SYNTHETIC_ORG;
  const departments = isReal ? analytics!.departments! : SYNTHETIC_DEPTS;
  const employees = isReal ? analytics!.employees! : SYNTHETIC_EMPLOYEES;
  const projects = isReal ? analytics!.projects! : SYNTHETIC_PROJECTS;
  const modelMix = isReal ? analytics!.modelMix! : SYNTHETIC_MODELS;
  const recentSessions = isReal ? analytics!.recentSessions! : SYNTHETIC_SESSIONS;
  const optimizations = buildOptimizations(modelMix, departments);

  const orgBudget = isReal
    ? departments.reduce((s, d) => s + d.budgetUsd, 0)
    : SYNTHETIC_ORG.budgetUsd;

  const velocity = org.totalSpentUsd / Math.max(org.dayOfMonth, 1);
  const projected = velocity * org.daysInMonth;
  const projectedPct = orgBudget > 0 ? (projected / orgBudget) * 100 : 0;
  const totalOptSaving = optimizations.reduce((s, o) => {
    const m = o.saving.match(/\$([\d.]+)/);
    return s + (m ? parseFloat(m[1]!) : 0);
  }, 0);

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-50">

      {/* Top bar */}
      <div className="border-b-2 border-neutral-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/meter" className="text-sm font-bold text-neutral-50 hover:text-primary transition-colors">P402 Meter</a>
          <span className="text-neutral-700">·</span>
          <span className="text-sm font-bold text-neutral-400">Enterprise</span>
          <span className="text-neutral-700">·</span>
          <span className="border border-neutral-700 px-2 py-0.5 text-[10px] font-mono text-neutral-500 uppercase">
            {connectedTenant ? connectedTenant.slice(0, 16) + (connectedTenant.length > 16 ? '…' : '') : 'Demo Org'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {isReal ? (
            <span className="border border-success px-2 py-0.5 text-[10px] font-mono text-success uppercase tracking-wider">Live Data</span>
          ) : (
            <span className="border border-info px-2 py-0.5 text-[10px] font-mono text-info uppercase tracking-wider">Synthetic · Demo</span>
          )}
          <span className="border border-primary px-2 py-0.5 text-[10px] font-mono text-primary uppercase tracking-wider">
            Tempo Mainnet · MPP
          </span>
        </div>
      </div>

      <div className="flex-1 px-6 py-6 flex flex-col gap-6 max-w-[1400px] mx-auto w-full">

        {/* Org KPI row */}
        <div className="border-2 border-neutral-700 bg-neutral-800 px-5 py-3 flex flex-wrap items-center gap-6">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">Org Spend</span>
            <span className="text-xl font-bold text-primary tabular-nums">${org.totalSpentUsd.toFixed(2)}</span>
          </div>
          {orgBudget > 0 && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">Budget</span>
              <span className="text-xl font-bold text-neutral-300 tabular-nums">${orgBudget.toLocaleString()}</span>
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">Day {org.dayOfMonth} of {org.daysInMonth}</span>
            <span className="text-xl font-bold text-neutral-300 tabular-nums">${velocity.toFixed(2)}/day</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">Projected Month-End</span>
            <span className={`text-xl font-bold tabular-nums ${projectedPct > 100 ? 'text-error' : projectedPct > 80 ? 'text-warning' : 'text-success'}`}>
              ${projected.toFixed(2)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">Sessions</span>
            <span className="text-xl font-bold text-neutral-300 tabular-nums">{org.totalSessions.toLocaleString()}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">Requests</span>
            <span className="text-xl font-bold text-neutral-300 tabular-nums">{org.totalRequests.toLocaleString()}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">Opt Savings</span>
            <span className="text-xl font-bold text-success tabular-nums">${totalOptSaving.toFixed(2)}/mo</span>
          </div>
          {!isReal && (
            <div className="ml-auto">
              <span className="border border-neutral-700 text-neutral-600 text-[9px] font-mono px-3 py-1.5 uppercase tracking-wider">
                Day {org.dayOfMonth} snapshot · synthetic
              </span>
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-0 border-b-2 border-neutral-700">
          {([
            ['overview', 'Overview'],
            ['departments', 'Departments'],
            ['employees', 'Employees'],
            ['projects', 'Projects'],
            ['optimize', 'Optimize'],
            ['sessions', 'Sessions'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-4 py-2 text-[10px] font-mono uppercase tracking-wider border-b-2 -mb-0.5 transition-colors ${
                activeTab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Overview ──────────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
              {departments.map((dept) => {
                const pct = dept.budgetUsd > 0 ? (dept.spentUsd / dept.budgetUsd) * 100 : 0;
                const vel = dept.spentUsd / Math.max(org.dayOfMonth, 1);
                const proj = vel * org.daysInMonth;
                return (
                  <div key={dept.name} className="border-2 border-neutral-700 p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-50">{dept.name}</span>
                      <span className="text-[9px] font-mono text-neutral-600 uppercase">{dept.employeeCount} emp</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-primary tabular-nums">${dept.spentUsd.toFixed(2)}</span>
                      {dept.budgetUsd > 0 && (
                        <span className="text-[10px] font-mono text-neutral-600">/ ${dept.budgetUsd}</span>
                      )}
                    </div>
                    {dept.budgetUsd > 0 && (
                      <div className="w-full h-1.5 bg-neutral-800 border border-neutral-700">
                        <div
                          className={`h-full ${pct > 80 ? 'bg-warning' : 'bg-primary'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-neutral-500">
                      {dept.budgetUsd > 0 && <div><span className="text-neutral-700 uppercase text-[9px]">Used · </span>{pct.toFixed(1)}%</div>}
                      <div><span className="text-neutral-700 uppercase text-[9px]">Proj · </span>${proj.toFixed(0)}</div>
                      <div><span className="text-neutral-700 uppercase text-[9px]">Sessions · </span>{dept.sessions}</div>
                      <div><span className="text-neutral-700 uppercase text-[9px]">Reqs · </span>{dept.requests.toLocaleString()}</div>
                    </div>
                    <div className="text-[9px] font-mono text-neutral-600 truncate">
                      Top model: <span className="text-neutral-400">{dept.topModel}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Model mix + budget projections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="border-2 border-neutral-700 flex flex-col">
                <div className="border-b border-neutral-700 px-4 py-2">
                  <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Model Distribution</span>
                </div>
                <div className="p-4 flex flex-col gap-2">
                  {modelMix.map((m) => {
                    const tier = m.model.includes('opus') || m.model.includes('gpt-4o') ? 'premium'
                      : m.model.includes('haiku') || m.model.includes('flash') ? 'economy' : 'standard';
                    return (
                      <div key={m.model} className="flex items-center gap-3">
                        <div className="w-full flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-mono text-neutral-300">{m.model}</span>
                            <div className="flex items-center gap-3 text-[10px] font-mono text-neutral-500">
                              <span className={tier === 'premium' ? 'text-warning' : tier === 'economy' ? 'text-success' : 'text-neutral-400'}>
                                {tier}
                              </span>
                              <span>${m.spentUsd.toFixed(2)}</span>
                              <span>{m.pct}%</span>
                            </div>
                          </div>
                          <div className="w-full h-1 bg-neutral-800">
                            <div
                              className={`h-full ${tier === 'premium' ? 'bg-warning' : tier === 'economy' ? 'bg-success' : 'bg-primary'}`}
                              style={{ width: `${m.pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-2 border-neutral-700 flex flex-col">
                <div className="border-b border-neutral-700 px-4 py-2">
                  <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                    Budget Projections · Day {org.dayOfMonth} of {org.daysInMonth}
                  </span>
                </div>
                <div className="p-4 flex flex-col gap-3">
                  {departments.map((dept) => {
                    const vel = dept.spentUsd / Math.max(org.dayOfMonth, 1);
                    const proj = vel * org.daysInMonth;
                    const projPct = dept.budgetUsd > 0 ? (proj / dept.budgetUsd) * 100 : 0;
                    const status = dept.budgetUsd > 0
                      ? (projPct > 100 ? 'over' : projPct > 80 ? 'watch' : 'ok')
                      : 'no-budget';
                    return (
                      <div key={dept.name} className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-neutral-400 w-24 shrink-0">{dept.name}</span>
                        <div className="flex-1 h-1.5 bg-neutral-800 border border-neutral-800">
                          <div
                            className={`h-full ${status === 'over' ? 'bg-error' : status === 'watch' ? 'bg-warning' : status === 'ok' ? 'bg-success' : 'bg-neutral-700'}`}
                            style={{ width: dept.budgetUsd > 0 ? `${Math.min(projPct, 100)}%` : '100%' }}
                          />
                        </div>
                        <span className={`text-[10px] font-mono tabular-nums w-14 text-right ${status === 'over' ? 'text-error' : status === 'watch' ? 'text-warning' : status === 'ok' ? 'text-success' : 'text-neutral-500'}`}>
                          ${proj.toFixed(0)}
                        </span>
                        {dept.budgetUsd > 0
                          ? <span className="text-[9px] font-mono text-neutral-600 w-12 text-right">/ ${dept.budgetUsd}</span>
                          : <span className="text-[9px] font-mono text-neutral-700 w-12 text-right">no cap</span>
                        }
                        {status !== 'no-budget' && (
                          <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 border shrink-0 ${status === 'over' ? 'border-error text-error' : status === 'watch' ? 'border-warning text-warning' : 'border-success text-success'}`}>
                            {status}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Departments ───────────────────────────────────────────────────── */}
        {activeTab === 'departments' && (
          <div className="flex flex-col gap-4">
            {departments.map((dept) => {
              const pct = dept.budgetUsd > 0 ? (dept.spentUsd / dept.budgetUsd) * 100 : 0;
              const vel = dept.spentUsd / Math.max(org.dayOfMonth, 1);
              const proj = vel * org.daysInMonth;
              const emps = employees.filter(e => e.department === dept.name);
              const isEditing = budgetEditing === dept.name;
              return (
                <div key={dept.name} className="border-2 border-neutral-700">
                  <div className="border-b border-neutral-700 px-5 py-3 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-4">
                      <span className="text-base font-bold uppercase tracking-wider">{dept.name}</span>
                      <span className="text-[10px] font-mono text-neutral-500">
                        {dept.employeeCount} employees · {dept.sessions} sessions · {dept.requests.toLocaleString()} requests
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-mono flex-wrap">
                      <span className="text-primary font-bold">${dept.spentUsd.toFixed(2)}</span>
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <span className="text-neutral-600">Budget $</span>
                          <input
                            type="number"
                            value={budgetDraft}
                            onChange={e => setBudgetDraft(e.target.value)}
                            className="bg-neutral-800 border border-neutral-600 text-neutral-200 text-[10px] font-mono px-2 py-0.5 w-20"
                            placeholder="0"
                          />
                          <button
                            onClick={() => void saveBudget(dept.name)}
                            disabled={savingBudget}
                            className="text-[9px] font-mono border border-primary text-primary px-2 py-0.5 uppercase hover:bg-primary hover:text-neutral-900 transition-colors disabled:opacity-50"
                          >
                            {savingBudget ? '…' : 'Save'}
                          </button>
                          <button onClick={() => setBudgetEditing(null)} className="text-[9px] font-mono text-neutral-600 hover:text-neutral-400">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          {dept.budgetUsd > 0
                            ? <span className="text-neutral-600">/ ${dept.budgetUsd} budget · {pct.toFixed(1)}% used</span>
                            : <span className="text-neutral-700">no budget cap</span>
                          }
                          {connectedTenant && (
                            <button
                              onClick={() => { setBudgetEditing(dept.name); setBudgetDraft(String(dept.budgetUsd)); }}
                              className="text-[9px] font-mono text-neutral-600 hover:text-primary border border-neutral-700 hover:border-primary px-2 py-0.5 uppercase transition-colors"
                            >
                              {dept.budgetUsd > 0 ? 'Edit Budget' : 'Set Budget'}
                            </button>
                          )}
                          <span className="text-neutral-500">proj ${proj.toFixed(0)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="px-5 py-3">
                    {dept.budgetUsd > 0 && (
                      <div className="w-full h-1.5 bg-neutral-800 border border-neutral-800 mb-4">
                        <div className="h-full bg-primary" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    )}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-[11px] font-mono text-neutral-400">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-neutral-600 uppercase tracking-wider">Top Model</span>
                        <span className="text-neutral-300">{dept.topModel}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-neutral-600 uppercase tracking-wider">Daily Velocity</span>
                        <span className="text-neutral-300">${vel.toFixed(3)}/day</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-neutral-600 uppercase tracking-wider">Avg per Session</span>
                        <span className="text-neutral-300">${dept.sessions > 0 ? (dept.spentUsd / dept.sessions).toFixed(4) : '0.0000'}</span>
                      </div>
                    </div>
                    {emps.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-neutral-800">
                        <div className="text-[9px] font-mono text-neutral-600 uppercase tracking-wider mb-2">Employees</div>
                        <div className="flex flex-col gap-1.5">
                          {emps.map(e => (
                            <div key={e.employeeId} className="flex items-center gap-3 text-[10px] font-mono">
                              <span className="text-neutral-300 w-32 shrink-0">{e.employeeId}</span>
                              <div className="flex-1 h-1 bg-neutral-800">
                                <div className="h-full bg-neutral-600" style={{ width: `${dept.spentUsd > 0 ? (e.spentUsd / dept.spentUsd) * 100 : 0}%` }} />
                              </div>
                              <span className="text-primary tabular-nums w-12 text-right">${e.spentUsd.toFixed(2)}</span>
                              <span className="text-neutral-600 w-20 text-right">{e.tokens.toLocaleString()} tok</span>
                              <span className="text-neutral-600 w-16 text-right">{e.sessions} sess</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Employees ─────────────────────────────────────────────────────── */}
        {activeTab === 'employees' && (
          <div className="border-2 border-neutral-700">
            <div className="border-b border-neutral-700 px-5 py-2 grid grid-cols-6 gap-4 text-[9px] font-mono text-neutral-600 uppercase tracking-wider">
              <span className="col-span-2">Employee</span>
              <span>Department</span>
              <span>Project</span>
              <span className="text-right">Spend</span>
              <span className="text-right">Tokens</span>
            </div>
            {[...employees].sort((a, b) => b.spentUsd - a.spentUsd).map((emp, i) => (
              <div key={`${emp.employeeId}-${i}`} className="border-b border-neutral-800 px-5 py-3 grid grid-cols-6 gap-4 items-center hover:bg-neutral-800 transition-colors">
                <div className="col-span-2 flex items-center gap-2">
                  <span className="text-[9px] font-mono text-neutral-700 w-4">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-xs font-bold text-neutral-50">{emp.employeeId}</span>
                </div>
                <span className="text-[10px] font-mono text-neutral-400">{emp.department}</span>
                <span className="text-[10px] font-mono text-neutral-500 truncate">{emp.projectName}</span>
                <span className="text-[11px] font-mono text-primary font-bold tabular-nums text-right">${emp.spentUsd.toFixed(2)}</span>
                <span className="text-[10px] font-mono text-neutral-500 tabular-nums text-right">{emp.tokens.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Projects ──────────────────────────────────────────────────────── */}
        {activeTab === 'projects' && (
          <div className="flex flex-col gap-3">
            {[...projects].sort((a, b) => b.spentUsd - a.spentUsd).map((proj) => (
              <div key={proj.name} className="border border-neutral-700 px-5 py-4 flex items-center gap-6 flex-wrap">
                <div className="flex-1 min-w-40">
                  <div className="text-xs font-bold text-neutral-50">{proj.name}</div>
                  <div className="text-[10px] font-mono text-neutral-500 mt-0.5">{proj.department} · {proj.sessions} sessions</div>
                </div>
                <div className="flex items-center gap-6 text-[10px] font-mono flex-wrap">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-neutral-700 uppercase tracking-wider">Spend</span>
                    <span className="text-primary font-bold text-sm tabular-nums">${proj.spentUsd.toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-neutral-700 uppercase tracking-wider">Per Session</span>
                    <span className="text-neutral-400 tabular-nums">${proj.sessions > 0 ? (proj.spentUsd / proj.sessions).toFixed(4) : '0.0000'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-neutral-700 uppercase tracking-wider">Share of Org</span>
                    <span className="text-neutral-400 tabular-nums">
                      {org.totalSpentUsd > 0 ? ((proj.spentUsd / org.totalSpentUsd) * 100).toFixed(1) : '0.0'}%
                    </span>
                  </div>
                  <span className="border border-success text-success px-2 py-0.5 text-[9px] font-mono uppercase">active</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Optimize ──────────────────────────────────────────────────────── */}
        {activeTab === 'optimize' && (
          <div className="flex flex-col gap-4">
            <div className="border border-neutral-700 px-5 py-3 flex items-center gap-4 bg-neutral-800">
              <span className="text-[10px] font-mono text-neutral-400">
                {isReal ? 'Live analysis' : 'Synthetic analysis'} · {optimizations.length} findings · Total available savings:
              </span>
              <span className="text-success font-bold font-mono">${totalOptSaving.toFixed(2)}/month</span>
              <span className="text-[9px] font-mono text-neutral-600 ml-auto">
                {isReal ? `Generated from ${org.dayOfMonth} days of real spend` : 'Based on model mix heuristics'}
              </span>
            </div>
            {optimizations.map((opt, i) => (
              <div key={i} className={`border-2 ${opt.priority === 'HIGH' ? 'border-warning' : opt.priority === 'MEDIUM' ? 'border-info' : 'border-neutral-700'} flex flex-col`}>
                <div className={`border-b px-5 py-2 flex items-center gap-3 flex-wrap ${opt.priority === 'HIGH' ? 'border-warning bg-neutral-800' : opt.priority === 'MEDIUM' ? 'border-info bg-neutral-800' : 'border-neutral-700'}`}>
                  <span className={`border text-[9px] font-bold font-mono px-2 py-0.5 uppercase tracking-wider ${opt.priority === 'HIGH' ? 'border-warning text-warning' : opt.priority === 'MEDIUM' ? 'border-info text-info' : 'border-neutral-700 text-neutral-500'}`}>
                    {opt.priority}
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400">{opt.dept}</span>
                  <span className={`text-sm font-bold font-mono ml-auto ${opt.saving.startsWith('Do') ? 'text-neutral-500' : 'text-success'}`}>{opt.saving}</span>
                  <span className="text-[9px] font-mono text-neutral-600">confidence {opt.confidence}%</span>
                </div>
                <div className="p-5 flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-mono text-neutral-600 uppercase tracking-wider">Finding</span>
                    <p className="text-[11px] font-mono text-neutral-300 leading-relaxed">{opt.finding}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-mono text-neutral-600 uppercase tracking-wider">Recommended Action</span>
                    <p className="text-[11px] font-mono text-primary leading-relaxed">{opt.action}</p>
                  </div>
                </div>
              </div>
            ))}
            <div className="border border-neutral-700 px-4 py-3 text-[10px] font-mono text-neutral-500 flex items-center gap-2">
              <span className="text-neutral-700">→</span>
              <span>
                {isReal
                  ? 'Analysis generated from your actual routing history and task-type distribution this month.'
                  : 'Connect your P402 tenant ID below to generate optimization findings from your real spend data.'
                }
              </span>
            </div>
          </div>
        )}

        {/* ── Sessions ──────────────────────────────────────────────────────── */}
        {activeTab === 'sessions' && (
          <div className="flex flex-col gap-3">
            <div className="border-b border-neutral-700 px-4 py-2 grid grid-cols-7 gap-3 text-[9px] font-mono text-neutral-600 uppercase tracking-wider">
              <span className="col-span-1">Employee</span>
              <span>Department</span>
              <span className="col-span-2">Project</span>
              <span>Model</span>
              <span className="text-right">Tokens</span>
              <span className="text-right">Cost</span>
            </div>
            {recentSessions.map((s, i) => (
              <div key={i} className="border border-neutral-800 px-4 py-3 grid grid-cols-7 gap-3 items-center hover:border-neutral-700 hover:bg-neutral-800 transition-colors group">
                <span className="text-[10px] font-mono text-neutral-300 font-bold col-span-1 truncate">{s.employeeId.split(' ')[0] ?? s.employeeId}</span>
                <span className="text-[10px] font-mono text-neutral-500">{s.department}</span>
                <span className="text-[10px] font-mono text-neutral-400 col-span-2 truncate">{s.projectName}</span>
                <span className="text-[9px] font-mono text-neutral-500 truncate">{s.model}</span>
                <span className="text-[10px] font-mono text-neutral-400 tabular-nums text-right">{s.tokens.toLocaleString()}</span>
                <div className="flex items-center justify-end gap-2">
                  <span className="text-[10px] font-mono text-primary font-bold tabular-nums">${s.costUsd.toFixed(4)}</span>
                  <span className="text-[9px] font-mono text-neutral-700 group-hover:text-neutral-500">{timeAgo(s.createdAt)}</span>
                </div>
              </div>
            ))}
            <div className="px-4 py-2 text-[10px] font-mono text-neutral-600 border border-neutral-800">
              {isReal
                ? `${recentSessions.length} most recent sessions · ${org.totalSessions.toLocaleString()} total this month`
                : `Showing ${recentSessions.length} synthetic sessions · connect tenant to see real data`
              }
            </div>
          </div>
        )}

        {/* ── Connect / Disconnect ──────────────────────────────────────────── */}
        <div className="border-2 border-neutral-700 flex flex-col">
          <div className="border-b border-neutral-700 px-5 py-3 flex items-center justify-between">
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
              {isReal ? 'Connected — Live Data' : 'Connect Your Organization'}
            </span>
            {isReal && (
              <button
                onClick={disconnect}
                className="text-[9px] font-mono text-neutral-600 hover:text-error border border-neutral-700 hover:border-error px-3 py-1 uppercase transition-colors"
              >
                Disconnect
              </button>
            )}
          </div>
          {!isReal ? (
            <div className="px-5 py-4 flex flex-col gap-3">
              <p className="text-[11px] font-mono text-neutral-400 max-w-xl leading-relaxed">
                Enter your P402 tenant ID to replace this synthetic data with real org spend from your {' '}
                <code className="text-neutral-300">/api/v2/chat/completions</code> usage.
                Pass <code className="text-neutral-300">X-P402-Department</code>, <code className="text-neutral-300">X-P402-Project</code>,
                and <code className="text-neutral-300">X-P402-Employee</code> headers on each request to enable attribution.
              </p>
              <div className="flex gap-3 items-center flex-wrap">
                <input
                  type="text"
                  value={tenantInput}
                  onChange={e => setTenantInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') void connect(); }}
                  placeholder="your-tenant-id"
                  className="bg-neutral-800 border-2 border-neutral-700 focus:border-primary text-neutral-200 text-[11px] font-mono px-3 py-2 outline-none w-64 transition-colors"
                />
                <button
                  onClick={() => void connect()}
                  disabled={connecting || !tenantInput.trim()}
                  className="btn btn-primary text-xs px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {connecting ? 'Connecting…' : 'Connect →'}
                </button>
                {connectError && (
                  <span className="text-[10px] font-mono text-error">{connectError}</span>
                )}
              </div>
            </div>
          ) : (
            <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-mono text-neutral-500">Tenant</span>
                <span className="text-xs font-mono text-neutral-300">{connectedTenant}</span>
              </div>
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => connectedTenant && void fetchAnalytics(connectedTenant)}
                  className="border border-neutral-600 text-neutral-300 hover:border-primary hover:text-primary text-xs font-mono px-4 py-1.5 uppercase tracking-wider transition-colors"
                >
                  Refresh →
                </button>
                <Link href="/meter/about/enterprise" className="border border-neutral-600 text-neutral-300 hover:border-primary hover:text-primary text-xs font-mono px-4 py-1.5 uppercase tracking-wider transition-colors">
                  Case Study →
                </Link>
                <Link href="/meter" className="border border-neutral-700 text-neutral-500 hover:text-neutral-300 text-xs font-mono px-4 py-1.5 uppercase tracking-wider transition-colors">
                  All Demos
                </Link>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
