import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { parseISO } from 'date-fns'
import { motion } from 'framer-motion'
import { Plus, Search, Eye, Edit2, Trash2, PackageCheck, ClipboardList, Wallet, Users, Clock, HandCoins, TrendingDown, Banknote, ArrowUpCircle, ArrowDownCircle, PackagePlus } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation, paymentMethodLabel } from '@/i18n'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ClearFiltersButton } from '@/components/ui/ClearFiltersButton'
import { DateRangeInputs } from '@/components/ui/DateRangeInputs'
import { ViewModeToggle, type ViewMode } from '@/components/ui/ViewModeToggle'
import { goodsReceiptService, purchaseService, supplierAccountService, supplierPaymentService } from '@/services/purchaseService'
import { supplierService } from '@/services/supplierService'
import { productService } from '@/services/productService'
import { clientService } from '@/services/clientService'
import { companyService } from '@/services/companyService'
import { pdfGenerator } from '@/services/pdfGenerator'
import { cn, formatCurrency } from '@/lib/utils'
import type { Client, GoodsReceipt, Product, Purchase, PurchaseStatus, Supplier, SupplierAccount, SupplierPayment, SupplierPaymentType } from '@/types/database'
import { PurchaseForm } from './PurchaseForm'
import { ReceiveGoodsDialog } from './ReceiveGoodsDialog'
import { SupplierPaymentForm, type SupplierPaymentPreset } from './SupplierPaymentForm'
import { GoodsReceiptForm } from './GoodsReceiptForm'
import { GoodsReceiptsList } from './GoodsReceiptsList'
import { purchaseErrorMessage } from './purchaseErrors'
import { STATUS_STYLES, grnId, statusLabel } from './purchaseUi'

type Section = 'orders' | 'grn' | 'payments' | 'accounts'

export function Purchases() {
    const { t, locale } = useTranslation()
    const [section, setSection] = useState<Section>('orders')
    // Each tab remembers its own layout
    const [views, setViews] = useState<Record<Section, ViewMode>>({ orders: 'list', grn: 'list', payments: 'list', accounts: 'list' })
    const [orders, setOrders] = useState<Purchase[]>([])
    const [payments, setPayments] = useState<SupplierPayment[]>([])
    const [accounts, setAccounts] = useState<SupplierAccount[]>([])
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [receipts, setReceipts] = useState<GoodsReceipt[]>([])
    const [clients, setClients] = useState<Client[]>([])
    const [loading, setLoading] = useState(true)

    // Filters
    const [searchTerm, setSearchTerm] = useState('')
    const [supplierFilter, setSupplierFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState<'all' | PurchaseStatus>('all')
    const [typeFilter, setTypeFilter] = useState<'all' | SupplierPaymentType>('all')
    const [fromDate, setFromDate] = useState('')
    const [toDate, setToDate] = useState('')

    // Modals
    const [formOpen, setFormOpen] = useState(false)
    const [editing, setEditing] = useState<Purchase | null>(null)
    const [receivingId, setReceivingId] = useState<number | null>(null)
    const [paymentOpen, setPaymentOpen] = useState(false)
    const [paymentPreset, setPaymentPreset] = useState<SupplierPaymentPreset>({})
    const [toCancel, setToCancel] = useState<Purchase | null>(null)
    const [grnFormOpen, setGrnFormOpen] = useState(false)
    const [receiptToCancel, setReceiptToCancel] = useState<GoodsReceipt | null>(null)
    const [toDelete, setToDelete] = useState<Purchase | null>(null)
    const [paymentToDelete, setPaymentToDelete] = useState<SupplierPayment | null>(null)

    const loadData = useCallback(async () => {
        try {
            setLoading(true)
            const [orderData, paymentData, accountData, supplierData, productData, receiptData, clientData] = await Promise.all([
                purchaseService.getAll(), supplierPaymentService.getAll(), supplierAccountService.getAll(),
                supplierService.getAll(), productService.getAll(), goodsReceiptService.getAll(), clientService.getAll()
            ])
            setOrders(orderData)
            setPayments(paymentData)
            setAccounts(accountData)
            setSuppliers(supplierData)
            setProducts(productData)
            setReceipts(receiptData)
            setClients(clientData)
        } catch (error) {
            console.error('Error loading purchases:', error)
            toast.error(t('pur.loadError'))
        } finally {
            setLoading(false)
        }
    }, [t])

    useEffect(() => {
        loadData()
    }, [loadData])

    const supplierName = useCallback((id: number) => suppliers.find(s => s.id === id)?.name ?? '', [suppliers])

    const stats = useMemo(() => {
        const pending = orders.filter(o => o.status === 'ordered')
        return {
            pendingCount: pending.length,
            pendingValue: pending.reduce((sum, o) => sum + o.total, 0),
            advances: accounts.reduce((sum, a) => sum + a.open_advances, 0),
            credit: accounts.reduce((sum, a) => sum + Math.max(a.available, 0), 0),
            owed: accounts.reduce((sum, a) => sum + Math.max(-a.available, 0), 0)
        }
    }, [orders, accounts])

    const term = searchTerm.trim().toLowerCase()

    // Order and payment dates are 'YYYY-MM-DD', so string comparison orders by day
    const filteredOrders = useMemo(() => orders.filter(o =>
        (supplierFilter === 'all' || String(o.supplier_id) === supplierFilter) &&
        (statusFilter === 'all' || o.status === statusFilter) &&
        (!fromDate || o.order_date >= fromDate) && (!toDate || o.order_date <= toDate) &&
        (!term || `#${o.id}`.includes(term) || o.supplier_name?.toLowerCase().includes(term) || o.notes?.toLowerCase().includes(term))
    ), [orders, supplierFilter, statusFilter, fromDate, toDate, term])

    const filteredPayments = useMemo(() => payments.filter(p =>
        (supplierFilter === 'all' || String(p.supplier_id) === supplierFilter) &&
        (typeFilter === 'all' || p.type === typeFilter) &&
        (!fromDate || p.payment_date >= fromDate) && (!toDate || p.payment_date <= toDate) &&
        (!term || p.supplier_name?.toLowerCase().includes(term) || p.notes?.toLowerCase().includes(term))
    ), [payments, supplierFilter, typeFilter, fromDate, toDate, term])

    const filteredAccounts = useMemo(() => accounts.filter(a =>
        (supplierFilter === 'all' || String(a.supplier_id) === supplierFilter) &&
        (!term || supplierName(a.supplier_id).toLowerCase().includes(term))
    ), [accounts, supplierFilter, term, supplierName])

    const filteredReceipts = useMemo(() => receipts.filter(r =>
        (!fromDate || r.receipt_date >= fromDate) && (!toDate || r.receipt_date <= toDate) &&
        (!term || `grn-${grnId(r.id)}`.includes(term) || `#${r.id}`.includes(term) || r.client_name.toLowerCase().includes(term) ||
            r.notes?.toLowerCase().includes(term) || r.items?.some(i => i.product_name?.toLowerCase().includes(term)))
    ), [receipts, fromDate, toDate, term])

    const printReceipt = (receipt: GoodsReceipt) => {
        toast.promise(pdfGenerator.generateGoodsReceipt(receipt, companyService.getSettings()), {
            loading: t('rep.export.generating'), success: t('rep.export.success'), error: t('rep.export.error')
        })
    }

    const hasFilters = !!(term || supplierFilter !== 'all' || statusFilter !== 'all' || typeFilter !== 'all' || fromDate || toDate)
    const clearFilters = () => {
        setSearchTerm('')
        setSupplierFilter('all')
        setStatusFilter('all')
        setTypeFilter('all')
        setFromDate('')
        setToDate('')
    }

    const formatDay = (day: string) => parseISO(day).toLocaleDateString(locale)
    const itemsLabel = (count: number) => count === 1 ? t('pur.itemsCountOne') : t('pur.itemsCount', { count })

    const openPayment = (preset: SupplierPaymentPreset = {}) => {
        setPaymentPreset(preset)
        setPaymentOpen(true)
    }

    const runAction = async (action: () => Promise<unknown>, success: string) => {
        try {
            await action()
            toast.success(success)
            loadData()
        } catch (error) {
            toast.error(purchaseErrorMessage(error, t))
        }
    }

    const filterInputClass = "px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
    const iconButton = "p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{t('pur.title')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{t('pur.subtitle')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setGrnFormOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all font-medium"
                    >
                        <PackagePlus className="w-5 h-5" />
                        {t('pur.newGrn')}
                    </button>
                    <button
                        onClick={() => openPayment()}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all font-medium"
                    >
                        <Banknote className="w-5 h-5" />
                        {t('pur.recordPayment')}
                    </button>
                    <button
                        onClick={() => { setEditing(null); setFormOpen(true) }}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all duration-200 font-medium shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
                    >
                        <Plus className="w-5 h-5" />
                        {t('pur.newOrder')}
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label={t('pur.statPending')} value={String(stats.pendingCount)} hint={t('pur.statPendingHint', { amount: formatCurrency(stats.pendingValue) })} icon={Clock} color="bg-amber-500" />
                <StatCard label={t('pur.statAdvances')} value={formatCurrency(stats.advances)} hint={t('pur.statAdvancesHint')} icon={HandCoins} color="bg-purple-500" />
                <StatCard label={t('pur.statCredit')} value={formatCurrency(stats.credit)} hint={t('pur.statCreditHint')} icon={Wallet} color="bg-blue-500" />
                <StatCard label={t('pur.statOwed')} value={formatCurrency(stats.owed)} hint={t('pur.statOwedHint')} icon={TrendingDown} color="bg-red-500" />
            </div>

            {/* Section tabs */}
            <div className="flex flex-wrap p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
                {([
                    { id: 'orders', label: t('pur.section.orders'), icon: ClipboardList },
                    { id: 'grn', label: t('pur.section.grn'), icon: PackagePlus },
                    { id: 'payments', label: t('pur.section.payments'), icon: Banknote },
                    { id: 'accounts', label: t('pur.section.accounts'), icon: Users }
                ] as const).map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setSection(tab.id)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            section === tab.id
                                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        )}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md border border-gray-300 dark:border-gray-700 flex flex-col lg:flex-row gap-3 lg:items-center flex-wrap">
                <div className="relative w-full lg:max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder={section === 'orders' ? t('pur.searchOrders') : section === 'grn' ? t('grn.searchPlaceholder') : t('pur.searchPayments')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={cn(filterInputClass, "w-full pl-10 pr-4 placeholder-gray-500")}
                    />
                </div>
                {section !== 'grn' && (
                    <select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} aria-label={t('pur.col.supplier')} className={filterInputClass}>
                        <option value="all">{t('pur.allSuppliers')}</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                )}
                {section === 'orders' && (
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | PurchaseStatus)} aria-label={t('pur.col.status')} className={filterInputClass}>
                        <option value="all">{t('pur.allStatuses')}</option>
                        {(['ordered', 'received', 'cancelled'] as const).map(s => <option key={s} value={s}>{statusLabel(s, t)}</option>)}
                    </select>
                )}
                {section === 'payments' && (
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as 'all' | SupplierPaymentType)} aria-label={t('supPay.col.type')} className={filterInputClass}>
                        <option value="all">{t('pur.allTypes')}</option>
                        <option value="payment">{t('supPay.typeShort.payment')}</option>
                        <option value="refund">{t('supPay.typeShort.refund')}</option>
                    </select>
                )}
                {section !== 'accounts' && (
                    <DateRangeInputs
                        value={{ from: fromDate || undefined, to: toDate || undefined }}
                        onChange={(range) => { setFromDate(range.from ?? ''); setToDate(range.to ?? '') }}
                        inputClassName={filterInputClass}
                        showClear={false}
                    />
                )}
                <ClearFiltersButton visible={hasFilters} onClick={clearFilters} />
                <ViewModeToggle
                    value={views[section]}
                    onChange={(mode) => setViews(prev => ({ ...prev, [section]: mode }))}
                    activeClassName="text-indigo-600"
                    className="lg:ml-auto self-end lg:self-auto"
                />
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3">
                    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-gray-500">{t('pur.loading')}</p>
                </div>
            ) : section === 'orders' ? (
                filteredOrders.length === 0 ? (
                    <EmptyState icon={ClipboardList} title={orders.length === 0 ? t('pur.emptyOrders') : t('pur.noOrderResults')} description={orders.length === 0 ? t('pur.emptyOrdersDesc') : undefined} />
                ) : views.orders === 'grid' ? (
                    <CardGrid>
                        {filteredOrders.map(order => (
                            <OrderCard
                                key={order.id}
                                order={order}
                                formatDay={formatDay}
                                itemsLabel={itemsLabel}
                                onReceive={() => setReceivingId(order.id!)}
                                onEdit={() => { setEditing(order); setFormOpen(true) }}
                                onRemove={() => order.status === 'ordered' && order.paid ? setToCancel(order) : setToDelete(order)}
                            />
                        ))}
                    </CardGrid>
                ) : (
                    <TableCard>
                        <thead className={theadClass}>
                            <tr>
                                <th className="px-4 py-3">{t('pur.col.order')}</th>
                                <th className="px-4 py-3">{t('pur.col.date')}</th>
                                <th className="px-4 py-3">{t('pur.col.supplier')}</th>
                                <th className="px-4 py-3">{t('pur.col.items')}</th>
                                <th className="px-4 py-3">{t('pur.col.status')}</th>
                                <th className="px-4 py-3 text-right">{t('pur.col.value')}</th>
                                <th className="px-4 py-3 text-right">{t('pur.col.paid')}</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                            {filteredOrders.map(order => {
                                const style = STATUS_STYLES[order.status]
                                const isOpen = order.status === 'ordered'
                                return (
                                    <tr key={order.id} className="group hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <Link to={`/purchases/${order.id}`} className="font-bold text-gray-900 dark:text-white hover:text-primary hover:underline">#{order.id}</Link>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">{formatDay(order.order_date)}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{order.supplier_name}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">{itemsLabel(order.items_count ?? 0)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold", style.badge)}>
                                                <style.icon className="w-3.5 h-3.5" />
                                                {statusLabel(order.status, t)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white whitespace-nowrap">{formatCurrency(order.total)}</td>
                                        <td className="px-4 py-3 text-right whitespace-nowrap text-gray-600 dark:text-gray-300">{formatCurrency(order.paid ?? 0)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end items-center gap-1">
                                                {isOpen && (
                                                    <button
                                                        onClick={() => setReceivingId(order.id!)}
                                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors whitespace-nowrap"
                                                    >
                                                        <PackageCheck className="w-3.5 h-3.5" />
                                                        {t('pur.receive')}
                                                    </button>
                                                )}
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                                    <Link to={`/purchases/${order.id}`} className={iconButton} title={t('view.view')}><Eye className="w-4 h-4" /></Link>
                                                    {isOpen && (
                                                        <button onClick={() => { setEditing(order); setFormOpen(true) }} className={iconButton} title={t('common.edit')}>
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {order.status !== 'received' && (
                                                        <button
                                                            // An order with an advance keeps its history: cancel it instead of deleting
                                                            onClick={() => isOpen && order.paid ? setToCancel(order) : setToDelete(order)}
                                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                            title={isOpen && order.paid ? t('pur.cancelOrder') : t('common.delete')}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </TableCard>
                )
            ) : section === 'grn' ? (
                filteredReceipts.length === 0 ? (
                    <EmptyState icon={PackagePlus} title={receipts.length === 0 ? t('grn.empty') : t('grn.noResults')} description={receipts.length === 0 ? t('grn.emptyDesc') : undefined} />
                ) : (
                    <GoodsReceiptsList
                        receipts={filteredReceipts}
                        viewMode={views.grn}
                        formatDay={formatDay}
                        onPrint={printReceipt}
                        onCancel={setReceiptToCancel}
                    />
                )
            ) : section === 'payments' ? (
                filteredPayments.length === 0 ? (
                    <EmptyState icon={Banknote} title={payments.length === 0 ? t('pur.emptyPayments') : t('pur.noPaymentResults')} description={payments.length === 0 ? t('pur.emptyPaymentsDesc') : undefined} />
                ) : views.payments === 'grid' ? (
                    <CardGrid>
                        {filteredPayments.map(payment => (
                            <PaymentCard key={payment.id} payment={payment} formatDay={formatDay} onDelete={() => setPaymentToDelete(payment)} />
                        ))}
                    </CardGrid>
                ) : (
                    <TableCard>
                        <thead className={theadClass}>
                            <tr>
                                <th className="px-4 py-3">{t('pur.col.date')}</th>
                                <th className="px-4 py-3">{t('pur.col.supplier')}</th>
                                <th className="px-4 py-3">{t('supPay.col.type')}</th>
                                <th className="px-4 py-3">{t('supPay.col.order')}</th>
                                <th className="px-4 py-3">{t('supPay.col.method')}</th>
                                <th className="px-4 py-3">{t('supPay.col.notes')}</th>
                                <th className="px-4 py-3">{t('supPay.col.recordedBy')}</th>
                                <th className="px-4 py-3 text-right">{t('supPay.col.amount')}</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                            {filteredPayments.map(payment => (
                                <PaymentRow key={payment.id} payment={payment} formatDay={formatDay} onDelete={() => setPaymentToDelete(payment)} showSupplier />
                            ))}
                        </tbody>
                    </TableCard>
                )
            ) : filteredAccounts.length === 0 ? (
                <EmptyState icon={Users} title={t('pur.acc.empty')} />
            ) : views.accounts === 'grid' ? (
                <CardGrid>
                    {filteredAccounts.map(account => (
                        <AccountCard
                            key={account.supplier_id}
                            account={account}
                            name={supplierName(account.supplier_id)}
                            onRecordPayment={() => openPayment({
                                supplierId: account.supplier_id,
                                type: account.available > 0 ? 'refund' : 'payment',
                                amount: account.available !== 0 ? Math.abs(account.available) : undefined
                            })}
                        />
                    ))}
                </CardGrid>
            ) : (
                <TableCard>
                    <thead className={theadClass}>
                        <tr>
                            <th className="px-4 py-3">{t('pur.col.supplier')}</th>
                            <th className="px-4 py-3 text-right">{t('pur.acc.paid')}</th>
                            <th className="px-4 py-3 text-right">{t('pur.acc.refunded')}</th>
                            <th className="px-4 py-3 text-right">{t('pur.acc.received')}</th>
                            <th className="px-4 py-3 text-right">{t('pur.acc.advances')}</th>
                            <th className="px-4 py-3 text-right">{t('pur.acc.balance')}</th>
                            <th className="px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                        {filteredAccounts.map(account => (
                            <tr key={account.supplier_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                <td className="px-4 py-3">
                                    <Link to={`/suppliers/${account.supplier_id}`} className="font-bold text-gray-900 dark:text-white hover:text-primary hover:underline">
                                        {supplierName(account.supplier_id)}
                                    </Link>
                                </td>
                                <td className="px-4 py-3 text-right whitespace-nowrap text-gray-600 dark:text-gray-300">{formatCurrency(account.total_paid)}</td>
                                <td className="px-4 py-3 text-right whitespace-nowrap text-gray-600 dark:text-gray-300">{formatCurrency(account.total_refunded)}</td>
                                <td className="px-4 py-3 text-right whitespace-nowrap text-gray-600 dark:text-gray-300">{formatCurrency(account.total_received)}</td>
                                <td className="px-4 py-3 text-right whitespace-nowrap text-gray-600 dark:text-gray-300">{formatCurrency(account.open_advances)}</td>
                                <td className="px-4 py-3 text-right whitespace-nowrap"><AccountBalance account={account} /></td>
                                <td className="px-4 py-3 text-right">
                                    <button
                                        onClick={() => openPayment({
                                            supplierId: account.supplier_id,
                                            type: account.available > 0 ? 'refund' : 'payment',
                                            amount: account.available !== 0 ? Math.abs(account.available) : undefined
                                        })}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-primary hover:bg-primary/10 transition-colors whitespace-nowrap"
                                    >
                                        {t('pur.recordPayment')}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </TableCard>
            )}

            <GoodsReceiptForm
                isOpen={grnFormOpen}
                clients={clients}
                products={products}
                onClose={() => setGrnFormOpen(false)}
                onSaved={() => { setSection('grn'); loadData() }}
            />

            <ConfirmDialog
                isOpen={!!receiptToCancel}
                title={t('grn.cancelTitle')}
                description={t('grn.cancelDesc', { number: t('grn.number', { id: grnId(receiptToCancel?.id) }) })}
                confirmText={t('grn.cancelConfirm')}
                variant="danger"
                onConfirm={() => { const id = receiptToCancel!.id!; setReceiptToCancel(null); runAction(() => goodsReceiptService.cancel(id), t('grn.cancelled')) }}
                onCancel={() => setReceiptToCancel(null)}
            />

            <PurchaseForm
                isOpen={formOpen}
                purchase={editing}
                suppliers={suppliers}
                products={products}
                onClose={() => { setFormOpen(false); setEditing(null) }}
                onSaved={loadData}
            />

            <ReceiveGoodsDialog purchaseId={receivingId} onClose={() => setReceivingId(null)} onReceived={loadData} />

            <SupplierPaymentForm
                isOpen={paymentOpen}
                suppliers={suppliers}
                orders={orders}
                preset={paymentPreset}
                onClose={() => setPaymentOpen(false)}
                onSaved={loadData}
            />

            <ConfirmDialog
                isOpen={!!toCancel}
                title={t('pur.cancelTitle')}
                description={t('pur.cancelDesc', { id: toCancel?.id ?? '' })}
                confirmText={t('pur.cancelConfirm')}
                variant="danger"
                onConfirm={() => { const id = toCancel!.id!; setToCancel(null); runAction(() => purchaseService.cancel(id), t('pur.cancelled')) }}
                onCancel={() => setToCancel(null)}
            />

            <ConfirmDialog
                isOpen={!!toDelete}
                title={t('pur.deleteTitle')}
                description={t('pur.deleteDesc', { id: toDelete?.id ?? '' })}
                confirmText={t('pur.deleteConfirm')}
                variant="danger"
                onConfirm={() => { const id = toDelete!.id!; setToDelete(null); runAction(() => purchaseService.delete(id), t('pur.deleted')) }}
                onCancel={() => setToDelete(null)}
            />

            <ConfirmDialog
                isOpen={!!paymentToDelete}
                title={t('supPay.deleteTitle')}
                description={paymentToDelete ? t('supPay.deleteDesc', {
                    type: t(`supPay.typeShort.${paymentToDelete.type}`).toLowerCase(),
                    amount: formatCurrency(paymentToDelete.amount),
                    date: formatDay(paymentToDelete.payment_date),
                    supplier: paymentToDelete.supplier_name ?? ''
                }) : ''}
                confirmText={t('supPay.deleteConfirm')}
                variant="danger"
                onConfirm={() => { const id = paymentToDelete!.id!; setPaymentToDelete(null); runAction(() => supplierPaymentService.delete(id), t('supPay.deleted')) }}
                onCancel={() => setPaymentToDelete(null)}
            />
        </div>
    )
}

const theadClass = "bg-gray-50 dark:bg-gray-900/50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
const cardClass = "group bg-white dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-700 shadow-md hover:shadow-xl transition-all p-5 flex flex-col"
const cardIconButton = "p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
const cardDeleteButton = "p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"

function CardGrid({ children }: { children: React.ReactNode }) {
    return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{children}</div>
}

function CardMotion({ children }: { children: React.ReactNode }) {
    return (
        <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={cardClass}>
            {children}
        </motion.div>
    )
}

interface OrderCardProps {
    order: Purchase
    formatDay: (day: string) => string
    itemsLabel: (count: number) => string
    onReceive: () => void
    onEdit: () => void
    // Cancel when the order has an advance, delete otherwise
    onRemove: () => void
}

function OrderCard({ order, formatDay, itemsLabel, onReceive, onEdit, onRemove }: OrderCardProps) {
    const { t } = useTranslation()
    const style = STATUS_STYLES[order.status]
    const isOpen = order.status === 'ordered'
    return (
        <CardMotion>
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <Link to={`/purchases/${order.id}`} className="font-black text-lg text-gray-900 dark:text-white hover:text-primary">#{order.id}</Link>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate" title={order.supplier_name}>{order.supplier_name}</p>
                </div>
                <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shrink-0", style.badge)}>
                    <style.icon className="w-3.5 h-3.5" />
                    {statusLabel(order.status, t)}
                </span>
            </div>

            <div className="mt-4 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('pur.col.value')}</p>
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{itemsLabel(order.items_count ?? 0)}</span>
                </div>
                <p className="text-2xl font-black text-gray-900 dark:text-white truncate">{formatCurrency(order.total)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {t('pur.col.paid')}: <span className="font-semibold text-gray-700 dark:text-gray-200">{formatCurrency(order.paid ?? 0)}</span>
                </p>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDay(order.order_date)}</span>
                <div className="flex items-center gap-1">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <Link to={`/purchases/${order.id}`} className={cardIconButton} title={t('view.view')}><Eye className="w-4 h-4" /></Link>
                        {isOpen && <button onClick={onEdit} className={cardIconButton} title={t('common.edit')}><Edit2 className="w-4 h-4" /></button>}
                        {order.status !== 'received' && (
                            <button onClick={onRemove} className={cardDeleteButton} title={isOpen && order.paid ? t('pur.cancelOrder') : t('common.delete')}>
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    {isOpen && (
                        <button
                            onClick={onReceive}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors whitespace-nowrap"
                        >
                            <PackageCheck className="w-3.5 h-3.5" />
                            {t('pur.receive')}
                        </button>
                    )}
                </div>
            </div>
        </CardMotion>
    )
}

function PaymentCard({ payment, formatDay, onDelete }: { payment: SupplierPayment; formatDay: (day: string) => string; onDelete: () => void }) {
    const { t } = useTranslation()
    const isPayment = payment.type === 'payment'
    return (
        <CardMotion>
            <div className="flex items-start justify-between gap-2">
                <span className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold",
                    isPayment ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400" : "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                )}>
                    {isPayment ? <ArrowUpCircle className="w-3.5 h-3.5" /> : <ArrowDownCircle className="w-3.5 h-3.5" />}
                    {t(`supPay.typeShort.${payment.type}`)}
                </span>
                <button onClick={onDelete} className={cn(cardDeleteButton, "opacity-0 group-hover:opacity-100 focus:opacity-100")} title={t('common.delete')}>
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            <div className="mt-3 flex-1 min-w-0">
                <p className={cn("text-2xl font-black truncate", isPayment ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400")}>
                    {isPayment ? '-' : '+'}{formatCurrency(payment.amount)}
                </p>
                <div className="flex items-center gap-2 mt-1 min-w-0">
                    <span className="font-bold text-gray-900 dark:text-white truncate" title={payment.supplier_name}>{payment.supplier_name}</span>
                    {payment.purchase_id && (
                        <Link to={`/purchases/${payment.purchase_id}`} className="text-xs font-bold text-primary hover:underline shrink-0">#{payment.purchase_id}</Link>
                    )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
                    {payment.notes || <span className="italic opacity-70">{t('expType.noDescription')}</span>}
                </p>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="whitespace-nowrap">{formatDay(payment.payment_date)}</span>
                <span className="truncate">{paymentMethodLabel(payment.payment_method)}{payment.created_by ? ` · ${payment.created_by}` : ''}</span>
            </div>
        </CardMotion>
    )
}

function AccountCard({ account, name, onRecordPayment }: { account: SupplierAccount; name: string; onRecordPayment: () => void }) {
    const { t } = useTranslation()
    const figures = [
        { label: t('pur.acc.paid'), value: account.total_paid },
        { label: t('pur.acc.refunded'), value: account.total_refunded },
        { label: t('pur.acc.received'), value: account.total_received },
        { label: t('pur.acc.advances'), value: account.open_advances }
    ]
    return (
        <CardMotion>
            <Link to={`/suppliers/${account.supplier_id}`} className="font-bold text-gray-900 dark:text-white hover:text-primary truncate" title={name}>{name}</Link>

            <div className="mt-3 flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('pur.acc.balance')}</p>
                <p className="text-xl truncate"><AccountBalance account={account} /></p>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 mt-3">
                    {figures.map(figure => (
                        <div key={figure.label} className="min-w-0">
                            <dt className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{figure.label}</dt>
                            <dd className="text-sm font-semibold text-gray-900 dark:text-white truncate">{formatCurrency(figure.value)}</dd>
                        </div>
                    ))}
                </dl>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                <button
                    onClick={onRecordPayment}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                >
                    <Banknote className="w-4 h-4" />
                    {t('pur.recordPayment')}
                </button>
            </div>
        </CardMotion>
    )
}

function TableCard({ children }: { children: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-300 dark:border-gray-700 overflow-x-auto">
            <table className="w-full text-sm">{children}</table>
        </div>
    )
}

// Credit (supplier holds money for us), owed (we owe the supplier) or settled
export function AccountBalance({ account }: { account: SupplierAccount }) {
    const { t } = useTranslation()
    if (account.available > 0) return <span className="font-bold text-blue-600 dark:text-blue-400">{t('pur.acc.credit', { amount: formatCurrency(account.available) })}</span>
    if (account.available < 0) return <span className="font-bold text-red-600 dark:text-red-400">{t('pur.acc.owed', { amount: formatCurrency(-account.available) })}</span>
    return <span className="font-bold text-green-600 dark:text-green-400">{t('pur.acc.settled')}</span>
}

// Shared by the Payments tab and the order / supplier pages
export function PaymentRow({ payment, formatDay, onDelete, showSupplier }: { payment: SupplierPayment; formatDay: (day: string) => string; onDelete: () => void; showSupplier?: boolean }) {
    const { t, locale } = useTranslation()
    const isPayment = payment.type === 'payment'
    const wasEdited = payment.updated_by && payment.updated_at && payment.updated_at !== payment.created_at
    return (
        <tr className="group hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
            <td className="px-4 py-3 whitespace-nowrap text-gray-900 dark:text-white">{formatDay(payment.payment_date)}</td>
            {showSupplier && <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{payment.supplier_name}</td>}
            <td className="px-4 py-3 whitespace-nowrap">
                <span className={cn("inline-flex items-center gap-1 text-xs font-bold", isPayment ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400")}>
                    {isPayment ? <ArrowUpCircle className="w-3.5 h-3.5" /> : <ArrowDownCircle className="w-3.5 h-3.5" />}
                    {t(`supPay.typeShort.${payment.type}`)}
                </span>
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
                {payment.purchase_id
                    ? <Link to={`/purchases/${payment.purchase_id}`} className="text-primary hover:underline">#{payment.purchase_id}</Link>
                    : <span className="text-gray-400">-</span>}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">{paymentMethodLabel(payment.payment_method)}</td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-xs truncate" title={payment.notes}>{payment.notes || '-'}</td>
            <td
                className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300"
                title={wasEdited ? new Date(payment.updated_at!).toLocaleString(locale) : undefined}
            >
                {payment.created_by || '-'}
            </td>
            <td className={cn("px-4 py-3 text-right font-bold whitespace-nowrap", isPayment ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400")}>
                {isPayment ? '-' : '+'}{formatCurrency(payment.amount)}
            </td>
            <td className="px-4 py-3">
                <div className="flex justify-end opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button
                        onClick={onDelete}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title={t('common.delete')}
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </td>
        </tr>
    )
}

function StatCard({ label, value, hint, icon: Icon, color }: { label: string; value: string; hint?: string; icon: React.ElementType; color: string }) {
    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4 min-w-0">
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", color, "bg-opacity-10")}>
                <Icon className={cn("w-6 h-6", color.replace('bg-', 'text-'))} />
            </div>
            <div className="min-w-0">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white truncate" title={value}>{value}</p>
                {hint && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{hint}</p>}
            </div>
        </div>
    )
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description?: string }) {
    return (
        <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
            {description && <p className="text-gray-500 mt-2">{description}</p>}
        </div>
    )
}
