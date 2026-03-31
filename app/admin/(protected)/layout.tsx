import { redirect } from 'next/navigation';
import { requireAdminAccess, AdminAuthError } from '@/lib/admin/auth';
import { AdminSidebar } from '../_components/AdminSidebar';
import { AdminHeader } from '../_components/AdminHeader';

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
    let ctx;
    try {
        ctx = await requireAdminAccess();
    } catch (e) {
        if (e instanceof AdminAuthError) redirect('/admin/login');
        throw e;
    }

    return (
        <div data-theme="admin" className="min-h-screen bg-[#0A0A0A] text-white flex">
            <AdminSidebar role={ctx.admin.role} />
            <div className="flex-1 flex flex-col lg:ml-60">
                <AdminHeader admin={ctx.admin} />
                <main className="flex-1 p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
