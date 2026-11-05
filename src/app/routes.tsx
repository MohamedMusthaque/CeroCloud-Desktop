import { Routes, Route, Navigate, useParams } from 'react-router-dom'
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
import { UserView } from '@/features/users/UserView'
import { ProductView } from '@/features/inventory/ProductView'
import { CategoryView } from '@/features/inventory/CategoryView'
import { SupplierView } from '@/features/suppliers/SupplierView'
import { ClientView } from '@/features/clients/ClientView'
import { ExpenseView } from '@/features/expenses/ExpenseView'
import { Savings } from '@/features/savings/Savings'
import { Capital } from '@/features/capital/Capital'
import { CapitalView } from '@/features/capital/CapitalView'
import { Purchases } from '@/features/purchases/Purchases'
import { PurchaseView } from '@/features/purchases/PurchaseView'
import { GoodsReceiptView } from '@/features/purchases/GoodsReceiptView'
import { Accounts } from '@/features/accounts/Accounts'
import { AccountView } from '@/features/accounts/AccountView'
import { Zakat } from '@/features/zakat/Zakat'
import { SavingsAccountView } from '@/features/savings/SavingsAccountView'

// Old supplier statement links open the supplier's account
function SupplierAccountRedirect() {
    return <Navigate to={`/accounts/supplier/${useParams().id}`} replace />
}

export function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<MainLayout />}>
                <Route index element={<RequirePage page="dashboard"><Dashboard /></RequirePage>} />
                <Route path="inventory" element={<RequirePage page="inventory"><Inventory /></RequirePage>} />
                <Route path="inventory/categories/:id" element={<RequirePage page="inventory"><CategoryView /></RequirePage>} />
                <Route path="inventory/:id" element={<RequirePage page="inventory"><ProductView /></RequirePage>} />
                <Route path="sales" element={<RequirePage page="sales"><Sales /></RequirePage>} />
                <Route path="suppliers" element={<RequirePage page="suppliers"><Suppliers /></RequirePage>} />
                <Route path="suppliers/:id" element={<RequirePage page="suppliers"><SupplierView /></RequirePage>} />
                <Route path="purchases" element={<RequirePage page="purchases"><Purchases /></RequirePage>} />
                <Route path="purchases/accounts/:id" element={<SupplierAccountRedirect />} />
                <Route path="purchases/grn/:id" element={<RequirePage page="purchases"><GoodsReceiptView /></RequirePage>} />
                <Route path="purchases/:id" element={<RequirePage page="purchases"><PurchaseView /></RequirePage>} />
                <Route path="clients" element={<RequirePage page="clients"><Clients /></RequirePage>} />
                <Route path="clients/:id" element={<RequirePage page="clients"><ClientView /></RequirePage>} />
                <Route path="expenses" element={<RequirePage page="expenses"><Expenses /></RequirePage>} />
                <Route path="expenses/:id" element={<RequirePage page="expenses"><ExpenseView /></RequirePage>} />
                <Route path="savings" element={<RequirePage page="savings"><Savings /></RequirePage>} />
                <Route path="savings/:id" element={<RequirePage page="savings"><SavingsAccountView /></RequirePage>} />
                <Route path="capital" element={<RequirePage page="capital"><Capital /></RequirePage>} />
                <Route path="capital/:id" element={<RequirePage page="capital"><CapitalView /></RequirePage>} />
                <Route path="accounts" element={<RequirePage page="accounts"><Accounts /></RequirePage>} />
                <Route path="accounts/:type/:id" element={<RequirePage page="accounts"><AccountView /></RequirePage>} />
                <Route path="zakat" element={<RequirePage page="zakat"><Zakat /></RequirePage>} />
                <Route path="reports" element={<RequirePage page="reports"><Reports /></RequirePage>} />
                <Route path="users" element={<RequirePage page="users"><Users /></RequirePage>} />
                <Route path="users/:id" element={<RequirePage page="users"><UserView /></RequirePage>} />
                <Route path="settings" element={<RequirePage page="settings"><Settings /></RequirePage>} />
                <Route path="about" element={<About />} />
            </Route>
        </Routes>
    )
}
