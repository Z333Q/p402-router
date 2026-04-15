const BUDGET_ROWS = [
  { type: 'Heartbeat / monitoring', budget: '$1 - $5', mode: 'cost' },
  { type: 'Research / browsing', budget: '$5 - $20', mode: 'balanced' },
  { type: 'Coding agent', budget: '$10 - $50', mode: 'balanced or quality' },
  { type: 'Multi-agent orchestrator', budget: '$20 - $100', mode: 'balanced' },
];

export function BudgetTable() {
  return (
    <div className="border-2 border-black overflow-x-auto">
      <table className="w-full min-w-[480px]">
        <thead>
          <tr className="border-b-2 border-black bg-neutral-50">
            <th className="text-left px-4 py-3 text-[11px] font-black uppercase tracking-wider border-r-2 border-black">
              Agent Type
            </th>
            <th className="text-left px-4 py-3 text-[11px] font-black uppercase tracking-wider border-r-2 border-black">
              Starting Budget
            </th>
            <th className="text-left px-4 py-3 text-[11px] font-black uppercase tracking-wider">
              Routing Mode
            </th>
          </tr>
        </thead>
        <tbody>
          {BUDGET_ROWS.map((row, i) => (
            <tr
              key={row.type}
              className={i < BUDGET_ROWS.length - 1 ? 'border-b-2 border-black' : ''}
            >
              <td className="px-4 py-3 text-sm font-medium border-r-2 border-black">{row.type}</td>
              <td className="px-4 py-3 text-sm font-mono border-r-2 border-black">{row.budget}</td>
              <td className="px-4 py-3 text-sm font-mono text-neutral-700">{row.mode}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
