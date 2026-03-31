// Root admin layout — no auth here.
// Auth is enforced in app/admin/(protected)/layout.tsx so that /admin/login is never auth-gated.
export const metadata = { title: 'Admin — P402', robots: 'noindex,nofollow' };

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
