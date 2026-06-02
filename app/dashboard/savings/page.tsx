'use client'
// Legacy route preserved for bookmarks and SEO. The canonical path is
// /dashboard/optimize/savings-report. Both render the same SavingsView.
import { SavingsView } from '../_components/SavingsView'

export default function SavingsPage() {
    return <SavingsView />
}
