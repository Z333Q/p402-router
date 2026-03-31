// Login page bypasses the admin auth layout — no session required here
export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
