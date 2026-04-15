const MCP_TOOLS = [
  { tool: 'p402_chat', purpose: 'Route a message through the AI router' },
  { tool: 'p402_create_session', purpose: 'Create a budget-capped session' },
  { tool: 'p402_get_session', purpose: 'Check remaining budget' },
  { tool: 'p402_list_models', purpose: 'Browse models and pricing' },
  { tool: 'p402_compare_providers', purpose: 'Compare provider costs' },
  { tool: 'p402_health', purpose: 'Check router health' },
];

export function ToolsTable() {
  return (
    <div className="border-2 border-black overflow-x-auto">
      <table className="w-full min-w-[400px]">
        <thead>
          <tr className="border-b-2 border-black bg-neutral-50">
            <th className="text-left px-4 py-3 text-[11px] font-black uppercase tracking-wider border-r-2 border-black w-1/2">
              Tool
            </th>
            <th className="text-left px-4 py-3 text-[11px] font-black uppercase tracking-wider">
              Purpose
            </th>
          </tr>
        </thead>
        <tbody>
          {MCP_TOOLS.map((row, i) => (
            <tr
              key={row.tool}
              className={i < MCP_TOOLS.length - 1 ? 'border-b-2 border-black' : ''}
            >
              <td className="px-4 py-3 font-mono text-sm border-r-2 border-black text-neutral-800">
                {row.tool}
              </td>
              <td className="px-4 py-3 text-sm text-neutral-700">{row.purpose}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
