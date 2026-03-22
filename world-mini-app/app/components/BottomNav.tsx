'use client';

import Link from 'next/link';

type Tab = 'chat' | 'agents' | 'fund' | 'settings';

export function BottomNav({ active }: { active: Tab }) {
    const tabs: Array<{ id: Tab; label: string; href: string; icon: string }> = [
        { id: 'chat',     label: 'Chat',     href: '/',         icon: '💬' },
        { id: 'agents',   label: 'Agents',   href: '/agents',   icon: '🤖' },
        { id: 'fund',     label: 'Credits',  href: '/fund',     icon: '⚡' },
        { id: 'settings', label: 'Settings', href: '/settings', icon: '⚙' },
    ];

    return (
        <nav className="bottom-nav">
            {tabs.map(tab => (
                <Link key={tab.id} href={tab.href} className={`nav-item ${active === tab.id ? 'active' : ''}`}>
                    <span style={{ fontSize: 20 }}>{tab.icon}</span>
                    <span>{tab.label}</span>
                </Link>
            ))}
        </nav>
    );
}
