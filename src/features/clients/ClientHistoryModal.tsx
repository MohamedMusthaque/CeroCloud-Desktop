
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, DollarSign, ShoppingBag, Loader2, Package, Search } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import type { Client, Sale } from '@/types/database'
import { useTranslation } from '@/i18n'

interface ClientHistoryModalProps {
    isOpen: boolean
    onClose: () => void
    client: Client | null
}

export function ClientHistoryModal({ isOpen, onClose, client }: ClientHistoryModalProps) {
    const { t, locale } = useTranslation()
    const [sales, setSales] = useState<Sale[]>([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        if (isOpen && client) {
            setLoading(true)
            window.electronAPI.sales.getByCustomerName(client.name)
                .then((data: Sale[]) => {
                    setSales(data)
                })
                .catch((err) => {
                    console.error("Error fetching client history:", err)
                    setSales([])
                })
                .finally(() => setLoading(false))
        }
    }, [isOpen, client])

    // Compute statistics
    const totalSpent = sales.reduce((acc, sale) => acc + (sale.status === 'completed' ? sale.total : 0), 0)
    const totalPurchases = sales.filter(s => s.status === 'completed').length
    const lastPurchase = sales.length > 0 ? new Date(sales[0].created_at!).toLocaleDateString(locale) : t('common.na')

    // Filter sales
    const filteredSales = sales.filter(s =>
        s.id?.toString().includes(searchTerm) ||
        s.created_at?.includes(searchTerm) ||
        s.items.some(i => i.product_name.toLowerCase().includes(searchTerm.toLowerCase()))
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
                                    <ShoppingBag className="w-5 h-5 text-indigo-400" />
                                    {t('cliHistory.title')}
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

                        {/* Stats Banner */}
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-indigo-100 dark:border-indigo-900/30 shrink-0">
                            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-indigo-100 dark:border-gray-700 flex items-center gap-3">
                                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                                    <DollarSign className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t('cliHistory.totalSpent')}</p>
                                    <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(totalSpent)}</p>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-indigo-100 dark:border-gray-700 flex items-center gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
                                    <ShoppingBag className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t('cliHistory.totalPurchases')}</p>
                                    <p className="text-lg font-bold text-gray-900 dark:text-white">{totalPurchases}</p>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-indigo-100 dark:border-gray-700 flex items-center gap-3">
                                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t('cliHistory.lastPurchase')}</p>
                                    <p className="text-lg font-bold text-gray-900 dark:text-white">{lastPurchase}</p>
                                </div>
                            </div>
                        </div>

                        {/* Search & List */}
                        <div className="flex-1 overflow-hidden flex flex-col bg-gray-50 dark:bg-gray-900/50">
                            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder={t('cliHistory.searchPlaceholder')}
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
                                ) : filteredSales.length === 0 ? (
                                    <div className="text-center py-10">
                                        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <ShoppingBag className="w-6 h-6 text-gray-400" />
                                        </div>
                                        <h3 className="text-gray-900 dark:text-white font-medium">{t('cliHistory.empty')}</h3>
                                        <p className="text-gray-500 text-sm">{t('cliHistory.emptyDesc')}</p>
                                    </div>
                                ) : (
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
