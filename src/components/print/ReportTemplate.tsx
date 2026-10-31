/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { forwardRef } from 'react'
import { Sale, CompanySettings, Product, Expense } from '@/types/database'
import { format, parseISO } from 'date-fns'
import { useTranslation, paymentMethodLabel } from '@/i18n'

interface ReportTemplateProps {
    title: string
    subtitle: string
    data: any[]
    allData?: any[] // For calculating totals across pages
    pageInfo?: { current: number, total: number }
    type: 'sales' | 'expenses' | 'inventory' | 'low-stock' | 'daily-closing'
    settings: CompanySettings
    range?: string
}

export const ReportTemplate = forwardRef<HTMLDivElement, ReportTemplateProps>(({ title, subtitle, data, allData, pageInfo, type, settings, range }, ref) => {
    const { t, dateLocale } = useTranslation()

    // --- RENDER HELPERS ---

    const renderSalesTable = () => (
        <table className="w-full text-sm">
            <thead>
                <tr className="bg-gray-100 text-gray-600 uppercase text-xs tracking-wider">
                    <th className="py-3 px-4 text-left">{t('print.col.id')}</th>
                    <th className="py-3 px-4 text-left">{t('print.col.date')}</th>
                    <th className="py-3 px-4 text-left">{t('print.col.client')}</th>
                    {/* <th className="py-3 px-4 text-center">Items</th> */} {/* count replaced by detail row */}
                    <th className="py-3 px-4 text-center">{t('print.col.payment')}</th>
                    <th className="py-3 px-4 text-right">{t('print.total')}</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {data.map((sale: Sale, i) => (
                    <>
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="py-3 px-4 font-mono font-bold text-gray-500 align-top">#{sale.id}</td>
                            <td className="py-3 px-4 align-top">{format(new Date(sale.created_at!), 'dd/MM/yy HH:mm')}</td>
                            <td className="py-3 px-4 truncate max-w-[150px] align-top">{sale.customer_name || t('print.counter')}</td>
                            {/* <td className="py-2 px-4 text-center">{sale.items.length}</td> */}
                            <td className="py-3 px-4 text-center capitalize align-top">{paymentMethodLabel(sale.payment_method)}</td>
                            <td className="py-3 px-4 text-right font-bold align-top">{settings.currencySymbol}{sale.total.toFixed(2)}</td>
                        </tr>
                        {/* Detail Row - Improved readability */}
                        <tr key={`${i}-detail`} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td colSpan={5} className="px-4 pb-4 pt-0">
                                <div className="ml-10 bg-indigo-50/50 rounded-lg p-3 text-sm border border-indigo-100 shadow-sm">
                                    <p className="font-bold text-indigo-400 mb-2 text-[10px] uppercase tracking-wider flex items-center gap-2">
                                        <div className="h-px bg-indigo-200 flex-1"></div>
                                        {t('print.productsSold')}
                                        <div className="h-px bg-indigo-200 flex-1"></div>
                                    </p>
                                    <div className="grid grid-cols-1 gap-2">
                                        {sale.items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-gray-700 hover:bg-white/50 p-1 rounded transition-colors">
                                                <span className="font-medium">{item.product_name}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="bg-white px-2 py-0.5 rounded border border-indigo-100 text-xs font-mono text-indigo-600">x{item.quantity}</span>
                                                    {/* Optional: Show individual price if needed, but space is simpler */}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </>
                ))}
            </tbody>
        </table>
    )

    const renderInventoryTable = () => (
        <table className="w-full text-sm">
            <thead>
                <tr className="bg-gray-100 text-gray-600 uppercase text-xs tracking-wider">
                    <th className="py-3 px-4 text-left">{t('print.col.code')}</th>
                    <th className="py-3 px-4 text-left">{t('print.col.product')}</th>
                    <th className="py-3 px-4 text-left">{t('print.col.category')}</th>
                    <th className="py-3 px-4 text-right">{t('print.col.cost')}</th>
                    <th className="py-3 px-4 text-right">{t('print.price')}</th>
                    <th className="py-3 px-4 text-center">{t('print.col.stock')}</th>
                    <th className="py-3 px-4 text-right">{t('print.col.totalValue')}</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {data.map((product: Product, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="py-2 px-4 font-mono text-xs text-gray-500">{product.code}</td>
                        <td className="py-2 px-4 font-medium truncate max-w-[200px]">{product.name}</td>
                        <td className="py-2 px-4 text-xs text-gray-500">{product.category}</td>
                        <td className="py-2 px-4 text-right text-gray-500">{settings.currencySymbol}{product.cost?.toFixed(2)}</td>
                        <td className="py-2 px-4 text-right font-medium">{settings.currencySymbol}{product.price.toFixed(2)}</td>
                        <td className="py-2 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${product.stock <= (settings.inventory?.lowStockThreshold ?? product.min_stock)
                                ? 'bg-red-100 text-red-600'
                                : 'bg-green-100 text-green-600'
                                }`}>
                                {product.stock}
                            </span>
                        </td>
                        <td className="py-2 px-4 text-right text-gray-700 font-bold">
                            {settings.currencySymbol}{(product.price * product.stock).toFixed(2)}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    )

    const renderExpensesTable = () => (
        <table className="w-full text-sm">
            <thead>
                <tr className="bg-gray-100 text-gray-600 uppercase text-xs tracking-wider">
                    <th className="py-3 px-4 text-left">{t('print.col.date')}</th>
                    <th className="py-3 px-4 text-left">{t('print.col.type')}</th>
                    <th className="py-3 px-4 text-left">{t('print.col.description')}</th>
                    <th className="py-3 px-4 text-center">{t('print.col.payment')}</th>
                    <th className="py-3 px-4 text-left">{t('print.col.recordedBy')}</th>
                    <th className="py-3 px-4 text-right">{t('print.col.amount')}</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {data.map((expense: Expense, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="py-2 px-4 whitespace-nowrap">{format(parseISO(expense.expense_date), 'dd/MM/yy')}</td>
                        <td className="py-2 px-4 font-medium">{expense.expense_type_name}</td>
                        <td className="py-2 px-4 text-gray-600 truncate max-w-[260px]">{expense.description || '-'}</td>
                        <td className="py-2 px-4 text-center">{paymentMethodLabel(expense.payment_method)}</td>
                        <td className="py-2 px-4 text-gray-500">{expense.created_by || '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{settings.currencySymbol}{expense.amount.toFixed(2)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    )

    // --- SUMMARY STATISTICS ---
    // Use allData if available for correct totals across pages
    const sourceData = allData || data

    const calculateTotals = () => {
        if (type === 'sales' || type === 'daily-closing') {
            const total = sourceData.reduce((sum, s) => sum + s.total, 0)
            const count = sourceData.length
            const cash = sourceData.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + s.total, 0)
            return { total, count, cash }
        }
        if (type === 'expenses') {
            const total = sourceData.reduce((sum, e) => sum + e.amount, 0)
            const byType = new Map<string, number>()
            for (const e of sourceData) byType.set(e.expense_type_name ?? '', (byType.get(e.expense_type_name ?? '') ?? 0) + e.amount)
            const topType = [...byType.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
            return { total, count: sourceData.length, topType }
        }
        if (type === 'inventory' || type === 'low-stock') {
            const totalValue = sourceData.reduce((sum, p) => sum + (p.price * p.stock), 0)
            const count = sourceData.length
            return { totalValue, count }
        }
        return {}
    }

    const stats = calculateTotals()

    return (
        <div ref={ref} className="w-[1000px] min-h-[1414px] bg-white p-12 text-gray-900 border-t-8 border-indigo-600 relative overflow-hidden flex flex-col" id="report-template">
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-bl-full -z-0 opacity-50"></div>

            {/* Header */}
            <div className="flex justify-between items-start mb-12 relative z-10">
                <div className="flex gap-5 items-center">
                    <img
                        src={settings.logo || 'logo.png'}
                        className="w-20 h-20 object-contain bg-white rounded-lg shadow-sm border border-gray-100"
                        alt="Logo"
                    />
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none mb-2">{settings.name}</h1>
                        <p className="text-gray-500 font-medium text-sm">{t('print.reportGenerated', { date: format(new Date(), t('print.longDateTimeFormat'), { locale: dateLocale }) })}</p>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-4xl font-black text-indigo-900 mb-1">{title}</h2>
                    <p className="text-indigo-600 font-bold uppercase tracking-widest text-sm">{subtitle}</p>
                    {range && <div className="mt-2 inline-block bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase">{range}</div>}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-6 mb-10">
                {/* Logic to show relevant summary cards based on report type */}
                {(type === 'sales' || type === 'daily-closing') && (
                    <>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <p className="text-xs font-bold text-gray-500 uppercase">{t('print.transactions')}</p>
                            <p className="text-3xl font-black text-gray-900">{stats.count}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <p className="text-xs font-bold text-gray-500 uppercase">{t('print.totalSales')}</p>
                            <p className="text-3xl font-black text-indigo-600">{settings.currencySymbol}{stats.total?.toLocaleString()}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <p className="text-xs font-bold text-gray-500 uppercase">{t('print.cash')}</p>
                            <p className="text-3xl font-black text-green-600">{settings.currencySymbol}{stats.cash?.toLocaleString()}</p>
                        </div>
                    </>
                )}

                {type === 'expenses' && (
                    <>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <p className="text-xs font-bold text-gray-500 uppercase">{t('print.expensesCount')}</p>
                            <p className="text-3xl font-black text-gray-900">{stats.count}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <p className="text-xs font-bold text-gray-500 uppercase">{t('print.totalExpenses')}</p>
                            <p className="text-3xl font-black text-orange-600">{settings.currencySymbol}{stats.total?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <p className="text-xs font-bold text-gray-500 uppercase">{t('print.topType')}</p>
                            <p className="text-2xl font-black text-gray-900 truncate">{stats.topType || '-'}</p>
                        </div>
                    </>
                )}

                {(type === 'inventory' || type === 'low-stock') && (
                    <>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <p className="text-xs font-bold text-gray-500 uppercase">{t('print.totalProducts')}</p>
                            <p className="text-3xl font-black text-gray-900">{stats.count}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <p className="text-xs font-bold text-gray-500 uppercase">{t('print.inventoryValue')}</p>
                            <p className="text-3xl font-black text-indigo-600">{settings.currencySymbol}{stats.totalValue?.toLocaleString()}</p>
                        </div>
                    </>
                )}
            </div>

            {/* Data Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-8 shadow-sm">
                {(type === 'sales' || type === 'daily-closing') ? renderSalesTable() : type === 'expenses' ? renderExpensesTable() : renderInventoryTable()}
            </div>

            {/* Footer */}
            <div className="mt-auto pt-8 text-center border-t border-gray-100">
                <div className="w-16 h-1 bg-gradient-to-r from-indigo-500 to-purple-600 mx-auto mb-4 rounded-full"></div>
                <p className="text-gray-400 text-xs font-medium uppercase tracking-widest">{t('print.confidential')}</p>
                <p className="text-gray-300 text-[10px] mt-1">{t('print.generatedByShort')}</p>
                {pageInfo && (
                    <p className="text-gray-400 text-xs mt-2 font-mono">
                        {t('print.page', { current: pageInfo.current, total: pageInfo.total })}
                    </p>
                )}
            </div>
        </div>
    )
})

ReportTemplate.displayName = 'ReportTemplate'
