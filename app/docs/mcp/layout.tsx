export const metadata = {
    title: 'MCP Server Integration | P402 Router',
    description: 'Model Context Protocol (MCP) server for P402. Add multi-provider AI routing, USDC micropayments, and spending controls to Claude and other MCP-compatible agents and tools.',
    alternates: { canonical: 'https://p402.io/docs/mcp' },
    openGraph: {
        title: 'P402 MCP Server — AI Routing for Claude and MCP Agents',
        description: 'Install the P402 MCP server to give Claude and other agents access to 300+ AI models with automatic cost optimization and USDC payment settlement.',
        url: 'https://p402.io/docs/mcp',
    },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
