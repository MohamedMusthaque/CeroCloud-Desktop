
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, DollarSign, ShoppingBag, Loader2, Package, Search, PackagePlus } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import type { Client, GoodsReceipt, Sale } from '@/types/database'
import { useTranslation, paymentMethodLabel } from '@/i18n'
import { goodsReceiptService } from '@/services/purchaseService'
import { ViewLink } from '@/components/view/ViewPage'
import { grnId } from '@/features/purchases/purchaseUi'

interface ClientHistoryModalProps {
    isOpen: boolean
    onClose: () => void
    client: Client | null
}

// Sales: what the client bought from us. Receipts: goods the client sold to us (GRNs)
type HistoryTab = 'sales' | 'receipts'

export function ClientHistoryModal({ isOpen, onClose, client }: ClientHistoryModalProps) {
    const { t, locale } = useTranslation()
    const [sales, setSales] = useState<Sale[]>([])
    const [receipts, setReceipts] = useState<GoodsReceipt[]>([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [tab, setTab] = useState<HistoryTab>('sales')

    useEffect(() => {
        if (isOpen && client) {
            setLoading(true)
            setTab('sales')
            setSearchTerm('')
            Promise.all([
                window.electronAPI.sales.getByCustomerName(client.name).catch((err) => {
                    console.error("Error fetching client history:", err)
                    return [] as Sale[]
                }),
                goodsReceiptService.getAll().catch((err) => {
                    console.error("Error fetching client goods received notes:", err)
                    return [] as GoodsReceipt[]
                })
            ])
                .then(([salesData, receiptsData]) => {
                    setSales(salesData)
                    setReceipts(receiptsData.filter(r => r.client_id === client.id))
                })
                .finally(() => setLoading(false))
        }
    }, [isOpen, client])

    // Compute statistics
    const totalSpent = sales.reduce((acc, sale) => acc + (sale.status === 'completed' ? sale.total : 0), 0)
    const totalPurchases = sales.filter(s => s.status === 'completed').length
    const lastPurchase = sales.length > 0 ? new Date(sales[0].created_at!).toLocaleDateString(locale) : t('common.na')

    const receiptsDone = receipts.filter(r => r.status === 'completed')
    const totalPaid = receiptsDone.reduce((acc, r) => acc + r.total, 0)
    const formatDay = (day: string) => new Date(`${day}T00:00:00`).toLocaleDateString(locale)
    const lastReceipt = receipts.length > 0 ? formatDay(receipts[0].receipt_date) : t('common.na')

    // Filter sales
    const term = searchTerm.toLowerCase()
    const filteredSales = sales.filter(s =>
        s.id?.toString().includes(searchTerm) ||
        s.created_at?.includes(searchTerm) ||
        s.items.some(i => i.product_name.toLowerCase().includes(term))
    )
    const filteredReceipts = receipts.filter(r =>
        `grn-${grnId(r.id)}`.includes(term) ||
        r.receipt_date.includes(searchTerm) ||
        r.items?.some(i => (i.product_name ?? '').toLowerCase().includes(term))
    )

    const stats = tab === 'sales'
        ? [
            { label: t('cliHistory.totalSpent'), value: formatCurrency(totalSpent), icon: DollarSign, tone: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" },
            { label: t('cliHistory.totalPurchases'), value: totalPurchases, icon: ShoppingBag, tone: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" },
            { label: t('cliHistory.lastPurchase'), value: lastPurchase, icon: Calendar, tone: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" }
        ]
        : [
            { label: t('grnView.totalPaid'), value: formatCurrency(totalPaid), icon: DollarSign, tone: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" },
            { label: t('grnView.count'), value: receiptsDone.length, icon: PackagePlus, tone: "bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400" },
            { label: t('grnView.last'), value: lastReceipt, icon: Calendar, tone: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" }
        ]

    const tabs: { id: HistoryTab; label: string; icon: React.ElementType; count: number }[] = [
        { id: 'sales', label: t('cliHistory.title'), icon: ShoppingBag, count: sales.length },
        { id: 'receipts', label: t('grnView.historyTab'), icon: PackagePlus, count: receipts.length }
    ]

    const emptyState = (title: string, description: string, Icon: React.ElementType) => (
        <div className="text-center py-10">
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <Icon className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-gray-900 dark:text-white font-medium">{title}</h3>
            <p className="text-gray-500 text-sm">{description}</p>
        </div>
    )

    return createPortal(
        <AnimatePresence>
            {isOpen && client && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-4xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="bg-slate-900 dark:bg-slate-950 px-6 py-4 flex items-center justify-between shrink-0">
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    {tab === 'sales' ? <ShoppingBag className="w-5 h-5 text-indigo-400" /> : <PackagePlus className="w-5 h-5 text-emerald-400" />}
                                    {tab === 'sales' ? t('cliHistory.title') : t('grnView.clientSection')}
                                </h2>
                                <p className="text-slate-400 text-sm mt-1">{client.name}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="px-6 pt-3 flex gap-2 border-b border-gray-200 dark:border-gray-700 shrink-0">
                            {tabs.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => { setTab(item.id); setSearchTerm('') }}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 -mb-px border-b-2 text-sm font-semibold transition-colors",
                                        tab === item.id
                                            ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                                            : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                    )}
                                >
                                    <item.icon className="w-4 h-4" />
                                    {item.label}
                                    <span className="px-1.5 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{item.count}</span>
                                </button>
                            ))}
                        </div>

                        {/* Stats Banner */}
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-indigo-100 dark:border-indigo-900/30 shrink-0">
                            {stats.map(stat => (
                                <div key={stat.label} className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-indigo-100 dark:border-gray-700 flex items-center gap-3">
                                    <div className={cn("p-2 rounded-full", stat.tone)}>
                                        <stat.icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{stat.label}</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">{stat.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Search & List */}
                        <div className="flex-1 overflow-hidden flex flex-col bg-gray-50 dark:bg-gray-900/50">
                            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder={tab === 'sales' ? t('cliHistory.searchPlaceholder') : t('grnView.searchPlaceholder')}
                                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                        <p>{t('cliHistory.loading')}</p>
                                    </div>
                                ) : tab === 'sales' ? (
                                    filteredSales.length === 0 ? emptyState(t('cliHistory.empty'), t('cliHistory.emptyDesc'), ShoppingBag) : (
                                        filteredSales.map((sale) => (
                                            <div key={sale.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/30 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-700">
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <span className="font-mono text-sm font-bold text-gray-700 dark:text-gray-300">#{sale.id}</span>
                                                        <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {new Date(sale.created_at!).toLocaleString(locale)}
                                                        </span>
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded-full text-xs font-medium capitalize border",
                                                            sale.status === 'completed'
                                                                ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                                                                : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
                                                        )}>
                                                            {sale.status === 'completed' ? t('cliHistory.completed') : t('cliHistory.cancelled')}
                                                        </span>
                                                    </div>
                                                    <span className="font-bold text-gray-900 dark:text-white">
                                                        {formatCurrency(sale.total)}
                                                    </span>
                                                </div>
                                                <div className="p-4">
                                                    <table className="w-full text-sm">
                                                        <thead>
                                                            <tr className="text-left text-xs text-gray-400 border-b border-gray-100 dark:border-gray-700">
                                                                <th className="font-medium pb-2 pl-8">{t('cliHistory.product')}</th>
                                                                <th className="font-medium pb-2 text-right">{t('cliHistory.qty')}</th>
                                                                <th className="font-medium pb-2 text-right">{t('cliHistory.price')}</th>
                                                                <th className="font-medium pb-2 text-right">{t('cliHistory.subtotal')}</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                                            {sale.items.map((item, idx) => (
                                                                <tr key={idx} className="group">
                                                                    <td className="py-2 pl-2 flex items-center gap-2">
                                                                        <div className="w-6 h-6 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                                                            <Package className="w-3 h-3 text-gray-500" />
                                                                        </div>
                                                                        <span className="text-gray-700 dark:text-gray-300 font-medium">{item.product_name}</span>
                                                                    </td>
                                                                    <td className="py-2 text-right text-gray-600 dark:text-gray-400">{item.quantity}</td>
                                                                    <td className="py-2 text-right text-gray-600 dark:text-gray-400">{formatCurrency(item.unit_price)}</td>
                                                                    <td className="py-2 text-right font-medium text-gray-800 dark:text-gray-200">{formatCurrency(item.subtotal)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ))
                                    )
                                ) : (
                                    filteredReceipts.length === 0 ? emptyState(t('grnView.clientNone'), t('grnView.historyEmptyDesc'), PackagePlus) : (
                                        filteredReceipts.map((receipt) => (
                                            <div key={receipt.id} className={cn(
                                                "bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow",
                                                receipt.status === 'cancelled' && "opacity-70"
                                            )}>
                                                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/30 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-700">
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <ViewLink to={`/purchases/grn/${receipt.id}`} page="purchases" className="font-mono text-sm font-bold text-gray-700 dark:text-gray-300">
                                                            {t('grn.number', { id: grnId(receipt.id) })}
                                                        </ViewLink>
                                                        <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {formatDay(receipt.receipt_date)}
                                                        </span>
                                                        <span className="text-sm text-gray-500 dark:text-gray-400">{paymentMethodLabel(receipt.payment_method)}</span>
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded-full text-xs font-medium border",
                                                            receipt.status === 'completed'
                                                                ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                                                                : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
                                                        )}>
                                                            {t(`grn.status.${receipt.status}`)}
                                                        </span>
                                                    </div>
                                                    <span className={cn("font-bold", receipt.status === 'cancelled' ? "text-gray-400 line-through" : "text-gray-900 dark:text-white")}>
                                                        {formatCurrency(receipt.total)}
                                                    </span>
                                                </div>
                                                <div className="p-4">
                                                    <table className="w-full text-sm">
                                                        <thead>
                                                            <tr className="text-left text-xs text-gray-400 border-b border-gray-100 dark:border-gray-700">
                                                                <th className="font-medium pb-2 pl-8">{t('cliHistory.product')}</th>
                                                                <th className="font-medium pb-2 text-right">{t('cliHistory.qty')}</th>
                                                                <th className="font-medium pb-2 text-right">{t('purForm.unitCost')}</th>
                                                                <th className="font-medium pb-2 text-right">{t('cliHistory.subtotal')}</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                                            {(receipt.items ?? []).map((item) => (
                                                                <tr key={item.id}>
                                                                    <td className="py-2 pl-2 flex items-center gap-2">
                                                                        <div className="w-6 h-6 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                                                            <Package className="w-3 h-3 text-gray-500" />
                                                                        </div>
                                                                        <span className="text-gray-700 dark:text-gray-300 font-medium">{item.product_name}</span>
                                                                    </td>
                                                                    <td className="py-2 text-right text-gray-600 dark:text-gray-400">{item.quantity}</td>
                                                                    <td className="py-2 text-right text-gray-600 dark:text-gray-400">{formatCurrency(item.unit_cost)}</td>
                                                                    <td className="py-2 text-right font-medium text-gray-800 dark:text-gray-200">{formatCurrency(item.subtotal)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                    {receipt.notes && <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 italic">{receipt.notes}</p>}
                                                </div>
                                            </div>
                                        ))
                                    )
                                )}
                            </div>
                        </div>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    )
}
