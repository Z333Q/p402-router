'use client';

import { useState, useRef, useCallback } from 'react';
import { useMeterStore } from '../_store/useMeterStore';
import { DEMO_PACKET_CONTENT } from '../_demo/packets/prior-auth-demo';

type IntakeMode = 'text' | 'file';

export function PacketIntakeCard() {
  const { setPacket, setWorkOrder, setSession, setSessionState, setError, sessionState, safeMode } =
    useMeterStore();

  const [mode, setMode] = useState<IntakeMode>('text');
  const [packetText, setPacketText] = useState('');
  const [budgetCap, setBudgetCap] = useState('0.50');
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileData, setFileData] = useState<{ base64Data: string; mimeType: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isIdle = sessionState === 'idle';

  // ── File handling ────────────────────────────────────────────────────────

  function readFileAsBase64(file: File): Promise<{ base64Data: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip the data URI prefix: "data:image/jpeg;base64,..."
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
    setError(null);
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Submit ───────────────────────────────────────────────────────────────

  async function handleSubmit() {
    const hasInput = mode === 'text' ? packetText.trim().length > 0 : fileData !== null;
    if (!hasInput) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Persist packet asset
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

      // 2. Gemini work-order extraction (text or multimodal)
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

      // 3. Create session + Circle wallet
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

      // 4. Open Circle wallet + nanopayment channel (fire-and-forget for UI speed)
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

  function loadDemo() {
    setMode('text');
    setPacketText(DEMO_PACKET_CONTENT);
    setFileData(null);
    setFileName(null);
  }

  const canSubmit = isIdle && !loading && (mode === 'text' ? packetText.trim().length > 0 : fileData !== null);

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

      <div className="p-4 flex flex-col gap-3 flex-1">
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
          <textarea
            className="w-full bg-neutral-900 border-2 border-neutral-700 text-xs font-mono text-neutral-50 p-3 resize-none focus:border-primary focus:outline-none transition-colors"
            rows={10}
            placeholder="Paste de-identified prior authorization case packet here..."
            value={packetText}
            onChange={(e) => setPacketText(e.target.value)}
            disabled={!isIdle || loading}
          />
        ) : (
          <div
            className={`relative border-2 border-dashed transition-colors flex flex-col items-center justify-center gap-2 py-8 cursor-pointer ${dragOver ? 'border-primary bg-neutral-800' : 'border-neutral-700 hover:border-neutral-500'} ${!isIdle || loading ? 'opacity-50 pointer-events-none' : ''}`}
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
            {fileName ? (
              <>
                <div className="text-xs font-mono text-primary font-bold">{fileName}</div>
                <div className="text-[10px] font-mono text-neutral-400">Ready for Gemini multimodal extraction</div>
              </>
            ) : (
              <>
                <div className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
                  Drop or click to upload
                </div>
                <div className="text-[10px] font-mono text-neutral-600">
                  JPEG · PNG · WebP · PDF · max 10 MB
                </div>
              </>
            )}
          </div>
        )}

        {/* Budget row */}
        <div className="flex items-center gap-3">
          <label className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider whitespace-nowrap">
            Budget Cap (USD)
          </label>
          <input
            type="number"
            step="0.10"
            min="0.10"
            max="5.00"
            className="w-24 bg-neutral-900 border-2 border-neutral-700 text-xs font-mono text-neutral-50 px-2 py-1 focus:border-primary focus:outline-none"
            value={budgetCap}
            onChange={(e) => setBudgetCap(e.target.value)}
            disabled={!isIdle || loading}
          />
          <div className="text-[10px] font-mono text-neutral-400">Approval required</div>
          <div className="w-4 h-4 border-2 border-primary bg-primary" />
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-2">
          <button
            className="btn btn-secondary text-xs flex-1"
            onClick={loadDemo}
            disabled={!isIdle || loading}
          >
            Load Demo Packet
          </button>
          <button
            className="btn btn-primary text-xs flex-1"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {loading ? 'Extracting...' : 'Submit →'}
          </button>
        </div>
      </div>
    </div>
  );
}
