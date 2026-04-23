'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useMeterStore } from '../_store/useMeterStore';
import { DEMO_PACKET_CONTENT, DEMO_PACKET_CONTENT_2 } from '../_demo/packets/prior-auth-demo';
import {
  DEMO_SPECIALTY_DRUG,
  DEMO_SURGICAL_PA,
  DEMO_BEHAVIORAL_HEALTH,
  DEMO_POST_ACUTE,
  HEALTHCARE_SCENARIOS,
  type ScenarioId,
} from '../_demo/packets/healthcare-scenarios';

type IntakeMode = 'text' | 'file';

export function PacketIntakeCard() {
  const { setPacket, setWorkOrder, setSession, setSessionState, setError, sessionState, safeMode } =
    useMeterStore();

  const [mode, setMode] = useState<IntakeMode>('text');
  const [packetText, setPacketText] = useState('');
  const [budgetCap, setBudgetCap] = useState('0.50');
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [loadedScenarioId, setLoadedScenarioId] = useState<ScenarioId | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [fileData, setFileData] = useState<{ base64Data: string; mimeType: string } | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [packetExpanded, setPacketExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isIdle = sessionState === 'idle';

  // Auto-resize textarea as content changes
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(280, el.scrollHeight)}px`;
  }, [packetText]);

  // ── File handling ────────────────────────────────────────────────────────

  function readFileAsBase64(file: File): Promise<{ base64Data: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1] ?? '';
        resolve({ base64Data, mimeType: file.type });
      };
      reader.onerror = () => reject(new Error('file read failed'));
      reader.readAsDataURL(file);
    });
  }

  async function handleFileSelect(file: File) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      setError('Unsupported file type. Use JPEG, PNG, WebP, or PDF.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large (max 10 MB).');
      return;
    }
    const data = await readFileAsBase64(file);
    setFileData(data);
    setFileName(file.name);
    setFileSize(file.size);
    setError(null);

    // Image preview via data URL
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFileSelect(file);
  }

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFileSelect(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function clearFile() {
    setFileData(null);
    setFileName(null);
    setFileSize(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
  }

  // ── Safe mode fast-path ──────────────────────────────────────────────────

  function handleSubmitSafeMode(overrideText?: string) {
    const content = overrideText ?? (packetText.trim() || DEMO_PACKET_CONTENT);
    const isFile = mode === 'file' && fileName != null;
    const sessionId = `safe_${crypto.randomUUID().slice(0, 8)}`;
    const workOrderId = `wo_safe_${crypto.randomUUID().slice(0, 8)}`;

    setPacket(
      {
        id: crypto.randomUUID(),
        tenantId: 'demo',
        assetType: isFile ? (fileData?.mimeType.includes('pdf') ? 'pdf' : 'image') : 'text',
        sourceLabel: isFile ? `upload:${fileName}` : 'demo-safe-mode',
        deidentified: true,
        packetType: 'prior_auth_packet',
        previewText: isFile ? `[${fileName}], simulated extraction in safe mode` : content.slice(0, 300),
        createdAt: new Date().toISOString(),
      },
      content,
    );

    setWorkOrder(
      {
        id: workOrderId,
        tenantId: 'demo',
        sessionId,
        requestId: `req_${crypto.randomUUID().slice(0, 8)}`,
        workflowType: 'prior_auth_review',
        packetFormat: isFile ? (fileData?.mimeType.includes('pdf') ? 'pdf' : 'image') : 'text',
        packetSummary: isFile
          ? `Uploaded document: ${fileName} (${formatBytes(fileSize ?? 0)}), extracted via Gemini multimodal [safe mode simulation]`
          : content.slice(0, 800),
        policySummary: 'Standard utilization management criteria for outpatient diagnostic services.',
        budgetCapUsd: parseFloat(budgetCap) || 0.50,
        approvalRequired: true,
        deidentified: true,
        reviewMode: 'safe',
        executionMode: 'safe',
        toolTrace: isFile
          ? ['parseMultimodalDocument', 'geminiVisionExtract', 'createReviewSession', 'addLedgerEstimate']
          : ['parsePriorAuthDocument', 'createReviewSession', 'addLedgerEstimate'],
        status: 'session_open',
        geminiModel: 'gemini-3.1-flash',
        healthcareExtract: {
          requestId: `req_${crypto.randomUUID().slice(0, 8)}`,
          payerName: 'Demo Payer Organization',
          memberIdMasked: '***-**-7842',
          providerName: 'Demo Medical Group',
          procedureRequested: isFile ? `Document Analysis: ${fileName}` : 'Outpatient Advanced Diagnostic Imaging',
          diagnosisSummary: 'Outpatient diagnostic imaging, standard prior auth category',
          urgencyLevel: 'routine',
          caseType: 'prior_auth',
          extractedConfidence: isFile ? 0.91 : 0.94,
          attachmentCount: isFile ? 1 : 4,
          requiresSpecialistReview: false,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      false,
    );

    setSession(sessionId, parseFloat(budgetCap) || 0.50);
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  async function handleSubmit() {
    const hasInput = mode === 'text' ? packetText.trim().length > 0 : fileData !== null;
    if (!hasInput) return;

    if (safeMode) {
      handleSubmitSafeMode();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const packetRes = await fetch('/api/meter/packet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'text'
            ? { content: packetText, packetType: 'prior_auth_packet', format: 'text', sourceLabel: 'operator-submission' }
            : { content: `[file:${fileName ?? 'upload'}]`, packetType: 'prior_auth_packet', format: fileData?.mimeType.includes('pdf') ? 'pdf' : 'image', sourceLabel: 'operator-upload' }
        ),
      });
      const packetData = await packetRes.json() as { id?: string; error?: string } & Record<string, unknown>;
      if (!packetRes.ok) throw new Error((packetData['error'] as string | undefined) ?? 'packet intake failed');

      setPacket(
        {
          id: (packetData['id'] as string | undefined) ?? crypto.randomUUID(),
          tenantId: 'demo',
          sessionId: undefined,
          assetType: mode === 'text' ? 'text' : (fileData?.mimeType.includes('pdf') ? 'pdf' : 'image'),
          sourceLabel: mode === 'text' ? 'operator-submission' : 'operator-upload',
          deidentified: true,
          packetType: 'prior_auth_packet' as const,
          previewText: mode === 'text' ? packetText.slice(0, 300) : `[${fileName ?? 'uploaded file'}]`,
          createdAt: new Date().toISOString(),
        },
        mode === 'text' ? packetText : `[file:${fileName}]`
      );
      setSessionState('work_order_extracting');

      const woRes = await fetch('/api/meter/work-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'text'
            ? { packetContent: packetText, budgetHintUsd: parseFloat(budgetCap) || 0.50, packetFormat: 'text' }
            : { fileData, budgetHintUsd: parseFloat(budgetCap) || 0.50, packetFormat: fileData?.mimeType.includes('pdf') ? 'pdf' : 'image' }
        ),
      });
      const woData = await woRes.json() as {
        workOrder?: Parameters<typeof setWorkOrder>[0];
        degraded?: boolean;
        degradedReason?: string;
        error?: string;
      };
      if (!woRes.ok) throw new Error(woData.error ?? 'work-order extraction failed');
      if (!woData.workOrder) throw new Error('no work order returned');

      setWorkOrder(woData.workOrder, woData.degraded ?? false, woData.degradedReason);

      const sessRes = await fetch('/api/meter/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budgetCapUsd: woData.workOrder.budgetCapUsd,
          workOrderId: woData.workOrder.id,
        }),
      });
      const sessData = await sessRes.json() as { sessionId?: string; budgetCapUsd?: number; error?: string };
      if (!sessRes.ok) throw new Error(sessData.error ?? 'session creation failed');
      setSession(sessData.sessionId ?? `sess_demo`, sessData.budgetCapUsd ?? 0.50);

      if (sessData.sessionId) {
        fetch('/api/meter/fund', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sessData.sessionId, budgetCapUsd: sessData.budgetCapUsd ?? 0.50, workOrderId: woData.workOrder.id }),
        }).catch(() => null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'submission failed');
      setSessionState('idle');
    } finally {
      setLoading(false);
    }
  }

  function getScenarioContent(id: ScenarioId): string {
    switch (id) {
      case 1: return DEMO_PACKET_CONTENT;
      case 2: return DEMO_PACKET_CONTENT_2;
      case 3: return DEMO_SPECIALTY_DRUG;
      case 4: return DEMO_SURGICAL_PA;
      case 5: return DEMO_BEHAVIORAL_HEALTH;
      case 6: return DEMO_POST_ACUTE;
      default: return DEMO_PACKET_CONTENT;
    }
  }

  function loadScenario(id: ScenarioId) {
    const content = getScenarioContent(id);
    setMode('text');
    setPacketText(content);
    setLoadedScenarioId(id);
    setFileData(null);
    setFileName(null);
    setFileSize(null);
    setImagePreview(null);
    // Scroll textarea into view after state update
    setTimeout(() => textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    if (safeMode) {
      setTimeout(() => handleSubmitSafeMode(content), 0);
    }
  }

  function loadDemo(variant: 1 | 2 = 1) {
    loadScenario(variant);
  }

  function downloadScenario(id: ScenarioId) {
    const scenario = HEALTHCARE_SCENARIOS.find((s) => s.id === id);
    if (!scenario) return;
    const content = getScenarioContent(id);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = scenario.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const canSubmit = isIdle && !loading && (mode === 'text' ? packetText.trim().length > 0 : fileData !== null);
  const lineCount = packetText.split('\n').length;
  const charCount = packetText.length;

  return (
    <div className="card p-0 flex flex-col">
      {/* Header */}
      <div className="section-header px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="badge badge-primary text-[10px]">01</span>
          <span className="text-sm font-bold tracking-wider uppercase">Document Intake</span>
        </div>
        <div className="border border-neutral-600 px-2 py-0.5 text-[10px] font-mono text-neutral-400 uppercase">
          Prior Auth · Gemini Multimodal
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* De-identified notice */}
        <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider border-l-2 border-info pl-2">
          De-identified · Administrative only · No PHI
        </div>

        {/* Mode tabs */}
        <div className="flex border-2 border-neutral-700 w-fit">
          <button
            className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors ${mode === 'text' ? 'bg-primary text-neutral-900 font-bold' : 'text-neutral-400 hover:text-neutral-50'}`}
            onClick={() => setMode('text')}
            disabled={!isIdle || loading}
          >
            Text
          </button>
          <button
            className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors ${mode === 'file' ? 'bg-primary text-neutral-900 font-bold' : 'text-neutral-400 hover:text-neutral-50'}`}
            onClick={() => setMode('file')}
            disabled={!isIdle || loading}
          >
            Image / PDF
          </button>
        </div>

        {/* Input area */}
        {mode === 'text' ? (
          <div className="flex flex-col gap-1">
            <textarea
              ref={textareaRef}
              className="w-full bg-neutral-900 border-2 border-neutral-700 text-xs font-mono text-neutral-50 p-3 focus:border-primary focus:outline-none transition-colors resize-y overflow-y-auto"
              style={{ height: 'auto', minHeight: '280px' }}
              placeholder="Paste de-identified prior authorization case packet here..."
              value={packetText}
              onChange={(e) => setPacketText(e.target.value)}
              disabled={!isIdle || loading}
            />
            {packetText.length > 0 && (
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-mono text-neutral-500">
                  {lineCount} lines · {charCount} chars
                </div>
                <button
                  className="text-[10px] font-mono text-neutral-400 hover:text-primary uppercase tracking-wider transition-colors"
                  onClick={() => setPacketExpanded(!packetExpanded)}
                >
                  {packetExpanded ? '▲ Collapse' : '▼ Show full packet'}
                </button>
              </div>
            )}
            {/* Full packet preview, expands below */}
            {packetExpanded && packetText.length > 0 && (
              <div className="border-2 border-neutral-700 bg-neutral-900 p-3 max-h-[400px] overflow-y-auto">
                <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-2 border-b border-neutral-700 pb-1">
                  Full Packet Content
                </div>
                <pre className="text-[10px] font-mono text-neutral-300 whitespace-pre-wrap leading-relaxed">
                  {packetText}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Drop zone */}
            <div
              className={`relative border-2 border-dashed transition-colors flex flex-col items-center justify-center gap-2 py-6 cursor-pointer ${dragOver ? 'border-primary bg-neutral-800' : 'border-neutral-700 hover:border-neutral-500'} ${!isIdle || loading ? 'opacity-50 pointer-events-none' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={handleFileInputChange}
              />
              {!fileName ? (
                <>
                  <div className="text-2xl text-neutral-600">↑</div>
                  <div className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
                    Drop or click to upload
                  </div>
                  <div className="text-[10px] font-mono text-neutral-600">
                    JPEG · PNG · WebP · PDF · max 10 MB
                  </div>
                  {safeMode && (
                    <div className="text-[10px] font-mono text-warning border border-warning px-2 py-0.5 mt-1">
                      Safe mode · Gemini multimodal simulated
                    </div>
                  )}
                </>
              ) : (
                <div className="text-xs font-mono text-primary font-bold">{fileName}</div>
              )}
            </div>

            {/* File preview card, shown after selection */}
            {fileName && fileData && (
              <div className="border-2 border-primary bg-neutral-900 p-3 flex gap-3">
                {/* Image thumbnail */}
                {imagePreview ? (
                  <div className="flex-shrink-0 w-20 h-20 border-2 border-neutral-700 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex-shrink-0 w-20 h-20 border-2 border-neutral-700 bg-neutral-800 flex flex-col items-center justify-center gap-1">
                    <div className="text-lg font-bold text-neutral-400">PDF</div>
                    <div className="text-[9px] font-mono text-neutral-600 uppercase">document</div>
                  </div>
                )}

                {/* File details */}
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <div className="text-xs font-mono text-primary font-bold truncate">{fileName}</div>
                  <div className="text-[10px] font-mono text-neutral-400 uppercase">
                    {fileData.mimeType} · {formatBytes(fileSize ?? 0)}
                  </div>
                  <div className="text-[10px] font-mono text-neutral-500 mt-1">
                    {safeMode
                      ? 'Ready · Safe mode simulation'
                      : 'Ready for Gemini multimodal extraction'}
                  </div>
                  {safeMode && (
                    <div className="text-[9px] font-mono text-warning mt-0.5">
                      Gemini API bypassed, demo extraction injected
                    </div>
                  )}
                </div>

                {/* Remove button */}
                <button
                  className="flex-shrink-0 text-[10px] font-mono text-neutral-500 hover:text-error uppercase tracking-wider self-start transition-colors"
                  onClick={(e) => { e.stopPropagation(); clearFile(); }}
                  disabled={!isIdle || loading}
                >
                  ✕ Remove
                </button>
              </div>
            )}
          </div>
        )}

        {/* Budget row */}
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider whitespace-nowrap">
            Budget Cap (USD)
          </label>
          <input
            type="number"
            step="0.10"
            min="0.10"
            max="5.00"
            className="w-24 bg-neutral-900 border-2 border-neutral-700 text-xs font-mono text-neutral-50 px-2 focus:border-primary focus:outline-none"
            style={{ height: '32px' }}
            value={budgetCap}
            onChange={(e) => setBudgetCap(e.target.value)}
            disabled={!isIdle || loading}
          />
          <div className="text-[10px] font-mono text-neutral-400">Approval required</div>
          <div className="w-4 h-4 border-2 border-primary bg-primary" />
        </div>

        {/* Demo packet options */}
        <div className="border-t border-neutral-700 pt-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
              Sample Scenarios
            </div>
            <div className="text-[9px] font-mono text-neutral-600 uppercase tracking-wider">
              De-identified · Admin only
            </div>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {HEALTHCARE_SCENARIOS.map((scenario) => (
              <div
                key={scenario.id}
                className="border border-neutral-700 flex items-stretch"
              >
                {/* Category pill */}
                <div className="flex-shrink-0 w-16 flex items-center justify-center border-r border-neutral-700 bg-neutral-800">
                  <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider text-center px-1">
                    {scenario.category}
                  </span>
                </div>

                {/* Load button, fills remaining width */}
                <button
                  className={`flex-1 text-[10px] text-left flex flex-col gap-0.5 py-2 px-3 transition-colors disabled:opacity-40 disabled:pointer-events-none ${loadedScenarioId === scenario.id ? 'bg-neutral-800 border-l-2 border-l-primary' : 'hover:bg-neutral-800'}`}
                  onClick={() => loadScenario(scenario.id)}
                  disabled={!isIdle || loading}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold uppercase text-neutral-50">{scenario.label}</span>
                    {loadedScenarioId === scenario.id && (
                      <span className="text-[9px] font-mono text-primary uppercase tracking-wider">Loaded</span>
                    )}
                  </div>
                  <span className="text-neutral-500 normal-case font-normal">{scenario.sublabel}</span>
                </button>

                {/* Download button */}
                <button
                  className="flex-shrink-0 flex items-center justify-center w-10 border-l border-neutral-700 text-neutral-600 hover:text-primary hover:bg-neutral-800 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  onClick={() => downloadScenario(scenario.id)}
                  disabled={loading}
                  title={`Download ${scenario.filename}`}
                  aria-label={`Download ${scenario.label} sample`}
                >
                  <span className="text-base leading-none">↓</span>
                </button>
              </div>
            ))}
          </div>
          <div className="text-[9px] font-mono text-neutral-600 leading-relaxed">
            Click any row to load the case text directly. Use ↓ to save a copy to disk.
          </div>
        </div>

        {/* Multimodal image demo */}
        <div className="border-t border-neutral-700 pt-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
              Multimodal Image Demo
            </div>
            <div className="text-[9px] font-mono text-warning border border-warning px-2 py-0.5 uppercase">
              Gemini Vision
            </div>
          </div>

          {/* Image preview card */}
          <a
            href="/meter/samples/demo-prior-auth-form.png"
            download="demo-prior-auth-form.png"
            className="border border-neutral-700 flex gap-3 p-2 hover:border-primary hover:bg-neutral-800 transition-colors group"
            aria-label="Download demo prior authorization form image"
          >
            {/* Thumbnail */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/meter/samples/demo-prior-auth-form.png"
              alt="De-identified prior authorization form, multimodal demo"
              className="w-20 h-28 object-cover object-top border border-neutral-700 flex-shrink-0"
            />

            {/* Details */}
            <div className="flex flex-col justify-between flex-1 min-w-0">
              <div>
                <div className="text-[10px] font-bold text-neutral-50 uppercase tracking-wider group-hover:text-primary transition-colors">
                  Prior Auth Form (PNG)
                </div>
                <div className="text-[9px] font-mono text-neutral-500 mt-0.5">
                  Synthetic · De-identified · No PHI
                </div>
                <div className="text-[9px] font-mono text-neutral-600 mt-1.5 leading-relaxed">
                  A realistic-looking PA form rendered for Gemini vision extraction. Upload via the
                  Image/PDF tab to see multimodal structured field extraction in action.
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="text-[9px] font-mono text-warning uppercase tracking-wider">
                  ↓ Download PNG
                </div>
                <div className="text-neutral-700">·</div>
                <div className="text-[9px] font-mono text-neutral-600 uppercase">
                  image/png · ~120 KB
                </div>
              </div>
            </div>
          </a>

          <div className="text-[9px] font-mono text-neutral-600 leading-relaxed">
            Download the PNG, then switch to the{' '}
            <span className="text-neutral-400 font-bold">Image / PDF</span> tab above and upload it.
            Gemini Flash will read the form fields and extract structured healthcare data.
          </div>
        </div>

        {/* Submit */}
        <button
          className="btn btn-primary text-xs w-full"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {loading ? 'Extracting...' : 'Submit to Gemini →'}
        </button>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
