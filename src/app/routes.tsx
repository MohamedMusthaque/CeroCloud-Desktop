import { Routes, Route } from 'react-router-dom'
import { MainLayout } from '@/components/layout/MainLayout'
import { RequirePage } from '@/components/auth/RequirePage'
import { Dashboard } from '@/features/dashboard/Dashboard'
import { Inventory } from '@/features/inventory/Inventory'
import { Sales } from '@/features/sales/Sales'
import { Reports } from '@/features/reports/Reports'
import { Settings } from '@/features/settings/Settings'
import { About } from '@/features/about/About'
import { Suppliers } from '@/features/suppliers/Suppliers'
import { Clients } from '@/features/clients/Clients'
import { Users } from '@/features/users/Users'
import { Expenses } from '@/features/expenses/Expenses'

export function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<MainLayout />}>
                <Route index element={<RequirePage page="dashboard"><Dashboard /></RequirePage>} />
                <Route path="inventory" element={<RequirePage page="inventory"><Inventory /></RequirePage>} />
                <Route path="sales" element={<RequirePage page="sales"><Sales /></RequirePage>} />
                <Route path="suppliers" element={<RequirePage page="suppliers"><Suppliers /></RequirePage>} />
                <Route path="clients" element={<RequirePage page="clients"><Clients /></RequirePage>} />
                <Route path="expenses" element={<RequirePage page="expenses"><Expenses /></RequirePage>} />
                <Route path="reports" element={<RequirePage page="reports"><Reports /></RequirePage>} />
                <Route path="users" element={<RequirePage page="users"><Users /></RequirePage>} />
                <Route path="settings" element={<RequirePage page="settings"><Settings /></RequirePage>} />
                <Route path="about" element={<About />} />
            </Route>
        </Routes>
    )
}
