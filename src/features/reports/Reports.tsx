/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from 'react'
import {
    Download,
    TrendingUp,
    Package,
    DollarSign,
    Calendar,
    AlertCircle,
    Activity,
    X,
    Scale,
    ArrowUpDown,
    Search
} from 'lucide-react'
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts'
import { productService } from '@/services/productService'
import { saleService } from '@/services/saleService'
import { pdfGenerator } from '@/services/pdfGenerator'
import { companyService } from '@/services/companyService'
import { Expense, Product, Sale } from '@/types/database'
import { expenseService } from '@/services/expenseService'
import { ProfitReport } from './ProfitReport'
import { format, subDays, startOfDay } from 'date-fns'
import { ReportPeriodFilter } from './ReportPeriodFilter'
import { filterSalesByPeriod, periodLabel, type ReportPeriod } from '@/lib/reportPeriod'
import { useTranslation, paymentMethodLabel, t as translateNow } from '@/i18n'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, getImageSrc } from '@/lib/utils'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ClearFiltersButton } from '@/components/ui/ClearFiltersButton'
import { PAYMENT_METHODS } from '@/stores/cartStore'

// Client filter value for bills without a customer name
const WALK_IN = '__walk-in__'

export function Reports() {
    const [products, setProducts] = useState<Product[]>([])
    const [sales, setSales] = useState<Sale[]>([])
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'sales' | 'profit' | 'inventory' | 'export' | 'transactions'>('sales')
    const [settings] = useState(companyService.getSettings())
    const { t, dateLocale, locale } = useTranslation()

    // UI States
    const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null)
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [historyPeriod, setHistoryPeriod] = useState<ReportPeriod>({ range: 'all' })
    const [clientFilter, setClientFilter] = useState('')
    const [typeFilter, setTypeFilter] = useState('')

    // Dropdown options come from the bills themselves, so old names and methods stay filterable
    const clientOptions = useMemo(() => {
        const names = new Map<string, string>()
        for (const sale of sales) {
            const name = sale.customer_name?.trim()
            if (name && !names.has(name.toLowerCase())) names.set(name.toLowerCase(), name)
        }
        return [...names.values()].sort((a, b) => a.localeCompare(b))
    }, [sales])
    const hasWalkIns = useMemo(() => sales.some(sale => !sale.customer_name?.trim()), [sales])
    // Methods enabled in Settings (in POS order), plus any other method found on older bills
    const typeOptions = useMemo(() => {
        const enabled: string[] = PAYMENT_METHODS.filter(method => settings.paymentMethods?.[method])
        const fromBills = [...new Set(sales.map(sale => sale.payment_method).filter(Boolean))]
            .filter(method => !enabled.includes(method))
            .sort((a, b) => PAYMENT_METHODS.indexOf(a) - PAYMENT_METHODS.indexOf(b))
        return [...enabled, ...fromBills]
    }, [sales, settings.paymentMethods])

    const sortedSales = useMemo(() => {
        let sortableSales = filterSalesByPeriod(sales, historyPeriod, dateLocale)

        if (clientFilter) {
            sortableSales = sortableSales.filter(s => {
                const name = s.customer_name?.trim().toLowerCase() || ''
                return clientFilter === WALK_IN ? !name : name === clientFilter.toLowerCase()
            })
        }
        if (typeFilter) {
            sortableSales = sortableSales.filter(s => s.payment_method === typeFilter)
        }

        // Filter by Search Term
        if (searchTerm.trim()) {
            const lowerTerm = searchTerm.toLowerCase()
            sortableSales = sortableSales.filter(s =>
                s.id?.toString().includes(lowerTerm) ||
                (s.customer_name || t('rep.walkIn')).toLowerCase().includes(lowerTerm) ||
                s.status?.toLowerCase().includes(lowerTerm)
            )
        }

        if (sortConfig !== null) {
            sortableSales.sort((a: Sale, b: Sale) => {
                let aValue = a[sortConfig.key]
                let bValue = b[sortConfig.key]

                if (sortConfig.key === 'customer_name') {
                    aValue = a.customer_name || t('rep.walkIn')
                    bValue = b.customer_name || t('rep.walkIn')
                }
                if (sortConfig.key === 'created_at') {
                    aValue = new Date(a.created_at || 0).getTime()
                    bValue = new Date(b.created_at || 0).getTime()
                }
                if (sortConfig.key === 'total') {
                    aValue = a.total
                    bValue = b.total
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1
                }
                return 0
            })
        } else {
            // Default sort by date desc
            sortableSales.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        }
        return sortableSales
    }, [sales, historyPeriod, clientFilter, typeFilter, dateLocale, sortConfig, searchTerm, t])

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc'
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        }
        setSortConfig({ key, direction })
    }

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            setLoading(true)
            const [productsData, salesData, expensesData] = await Promise.all([
                productService.getAll(),
                saleService.getAll(),
                expenseService.getAll()
            ])
            setProducts(productsData)
            setSales(salesData)
            setExpenses(expensesData)
        } catch (error) {
            console.error('Error loading data:', error)
            // Non-reactive translate keeps the load function free of hook dependencies
            toast.error(translateNow('rep.loadError'))
        } finally {
            setLoading(false)
        }
    }

    // --- METRICS CALCULATION ---
    const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0)
    const salesToday = sales.filter(sale => {
        const today = new Date().toDateString()
        const saleDate = new Date(sale.created_at!).toDateString()
        return today === saleDate
    })
    const totalSalesToday = salesToday.reduce((sum, sale) => sum + sale.total, 0)

    const lowStockProducts = products.filter(p => p.stock <= Math.max(p.min_stock, settings.inventory?.lowStockThreshold || 0))
    const inventoryValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0)

    // Chart Data
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i)
        const dayStart = startOfDay(date)
        const daySales = sales.filter(sale => {
            const saleDate = startOfDay(new Date(sale.created_at!))
            return saleDate.getTime() === dayStart.getTime()
        })
        return {
            date: format(date, 'dd MMM', { locale: dateLocale }),
            ventas: daySales.reduce((sum, sale) => sum + sale.total, 0),
            cantidad: daySales.length
        }
    })

    const hourlyTraffic = Array.from({ length: 15 }, (_, i) => {
        const hour = i + 8 // Start from 8 AM
        return {
            hour: `${hour}:00`,
            sales: 0,
            count: 0
        }
    })

    sales.forEach(sale => {
        if (sale.created_at) {
            const saleDate = new Date(sale.created_at)
            const hour = saleDate.getHours()
            if (hour >= 8 && hour <= 22) {
                hourlyTraffic[hour - 8].sales += sale.total
                hourlyTraffic[hour - 8].count += 1
            }
        }
    })

    // --- HANDLERS ---

    const handleCancelSale = async () => {
        if (!saleToCancel) return

        try {
            await window.electronAPI.sales.cancel(saleToCancel.id!)
            toast.success(t('rep.saleCancelled'), { description: t('rep.stockRestored') })
            setSaleToCancel(null)
            loadData() // Refresh data
        } catch (error) {
            console.error(error)
            toast.error(t('rep.cancelError'))
        }
    }

    const productRevenue = new Map<number, { product: Product; revenue: number; quantity: number }>()
    sales.forEach(sale => {
        sale.items.forEach(item => {
            const current = productRevenue.get(item.product_id) || {
                product: products.find(p => p.id === item.product_id)!,
                revenue: 0,
                quantity: 0
            }
            if (current.product) {
                productRevenue.set(item.product_id, {
                    product: current.product,
                    revenue: current.revenue + item.subtotal,
                    quantity: current.quantity + item.quantity
                })
            }
        })
    })



    const COLORS = ['#3b82f6', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6']
    const historySelectClass = "px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all max-w-[14rem]"

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-gray-500 font-medium">{t('rep.analyzing')}</p>
                </div>
            </div>
        )
    }

    const tabs = [
        { id: 'sales', label: t('rep.tab.sales'), icon: DollarSign },
        { id: 'profit', label: t('rep.tab.profit'), icon: Scale },
        { id: 'inventory', label: t('rep.tab.inventory'), icon: Package },
        { id: 'transactions', label: t('rep.tab.transactions'), icon: Calendar },
        { id: 'export', label: t('rep.tab.export'), icon: Download },
    ]

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{t('rep.title')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{t('rep.subtitle')}</p>
                </div>

                {/* Modern Tabs */}
                <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-x-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as 'sales' | 'profit' | 'inventory' | 'transactions' | 'export')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                                activeTab === tab.id
                                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            )}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeTab === 'sales' && (
                        <div className="space-y-6">
                            {/* Key Metrics */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <MetricCard
                                    title={t('rep.salesToday')}
                                    value={`${settings.currencySymbol}${totalSalesToday.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
                                    subtitle={t('rep.transactionsCount', { count: salesToday.length })}
                                    icon={DollarSign}
                                    color="green"
                                />
                                <MetricCard
                                    title={t('rep.totalSales')}
                                    value={`${settings.currencySymbol}${totalSales.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
                                    subtitle={t('rep.cumulative')}
                                    icon={TrendingUp}
                                    color="blue"
                                />
                                <MetricCard
                                    title={t('rep.avgTicket')}
                                    value={`${settings.currencySymbol}${sales.length > 0 ? (totalSales / sales.length).toFixed(2) : '0.00'}`}
                                    subtitle={t('rep.perSale')}
                                    icon={Activity}
                                    color="purple"
                                />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-300 dark:border-gray-700">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">{t('rep.trend7d')}</h3>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <AreaChart data={last7Days}>
                                            <defs>
                                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" strokeOpacity={0.2} />
                                            <XAxis
                                                dataKey="date"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                                                dy={10}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                                                tickFormatter={(value) => `${settings.currencySymbol}${value}`}
                                                dx={-10}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'rgba(17, 24, 39, 0.9)',
                                                    backdropFilter: 'blur(8px)',
                                                    border: '1px solid rgba(75, 85, 99, 0.4)',
                                                    borderRadius: '12px',
                                                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                                                    color: '#fff'
                                                }}
                                                itemStyle={{ color: '#e5e7eb' }}
                                                labelStyle={{ color: '#9ca3af', marginBottom: '0.5rem', fontSize: '0.875rem' }}
                                                formatter={(value: number, name: string) => [
                                                    name === 'ventas' ? `${settings.currencySymbol}${Number(value).toLocaleString()}` : value,
                                                    name === 'ventas' ? t('rep.chartSales') : t('rep.chartTransactions')
                                                ]}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="ventas"
                                                stroke="#8b5cf6"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#colorSales)"
                                                activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-300 dark:border-gray-700">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">{t('rep.peakHours')}</h3>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={hourlyTraffic} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" strokeOpacity={0.2} />
                                            <XAxis
                                                dataKey="hour"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#9ca3af', fontSize: 11 }}
                                                dy={10}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#9ca3af', fontSize: 11 }}
                                                tickFormatter={(value) => `${settings.currencySymbol}${value}`}
                                                dx={-10}
                                            />
                                            <Tooltip
                                                cursor={{ fill: 'rgba(139, 92, 246, 0.1)', radius: 4 }}
                                                contentStyle={{
                                                    backgroundColor: 'rgba(17, 24, 39, 0.9)',
                                                    backdropFilter: 'blur(8px)',
                                                    border: '1px solid rgba(75, 85, 99, 0.4)',
                                                    borderRadius: '12px',
                                                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                                                    color: '#fff'
                                                }}
                                                itemStyle={{ color: '#e5e7eb' }}
                                                labelStyle={{ color: '#9ca3af', marginBottom: '0.5rem', fontSize: '0.875rem' }}
                                                formatter={(value: number, name: string) => [
                                                    name === 'sales' ? `${settings.currencySymbol}${Number(value).toLocaleString()}` : value,
                                                    name === 'sales' ? t('rep.chartSales') : t('rep.chartTransactions')
                                                ]}
                                            />
                                            <Bar
                                                dataKey="sales"
                                                fill="#6366f1"
                                                radius={[6, 6, 0, 0]}
                                                barSize={32}
                                                activeBar={{ fill: '#8b5cf6' }}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Top Products Section */}

                        </div>
                    )}

                    {activeTab === 'profit' && (
                        <ProfitReport sales={sales} expenses={expenses} products={products} />
                    )}

                    {activeTab === 'inventory' && (
                        <div className="space-y-6">
                            {/* Key Metrics Row */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <MetricCard
                                    title={t('rep.totalProducts')}
                                    value={products.length.toString()}
                                    subtitle={t('rep.inCatalog')}
                                    icon={Package}
                                    color="blue"
                                />
                                <MetricCard
                                    title={t('rep.inventoryValue')}
                                    value={`${settings.currencySymbol}${inventoryValue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
                                    subtitle={t('rep.estimatedCost')}
                                    icon={DollarSign}
                                    color="green"
                                />
                                <MetricCard
                                    title={t('rep.lowStock')}
                                    value={lowStockProducts.length.toString()}
                                    subtitle={t('rep.needRestock')}
                                    icon={AlertCircle}
                                    color={lowStockProducts.length > 0 ? "red" : "gray"}
                                />
                            </div>

                            {/* Inventory Analysis Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Category Value Chart */}
                                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-300 dark:border-gray-700 flex flex-col">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">{t('rep.valueByCategory')}</h3>
                                    <div className="flex flex-col md:flex-row items-center justify-center gap-8 h-full">
                                        <div className="h-[260px] w-[260px] relative shrink-0">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={Object.entries(products.reduce((acc, p) => {
                                                            const cat = p.category || t('rep.noCategory')
                                                            acc[cat] = (acc[cat] || 0) + (p.price * p.stock)
                                                            return acc
                                                        }, {} as Record<string, number>))
                                                            .map(([name, value]) => ({ name, value }))
                                                            .sort((a, b) => b.value - a.value)}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={80}
                                                        outerRadius={105}
                                                        paddingAngle={4}
                                                        dataKey="value"
                                                        cornerRadius={6}
                                                        stroke="none"
                                                    >
                                                        {products.map((_, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        cursor={{ fill: 'none' }}
                                                        contentStyle={{
                                                            backgroundColor: 'rgba(17, 24, 39, 0.95)',
                                                            backdropFilter: 'blur(8px)',
                                                            border: 'none',
                                                            borderRadius: '12px',
                                                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                                                            color: '#fff',
                                                            padding: '12px'
                                                        }}
                                                        formatter={(value: number) => [`${settings.currencySymbol}${value.toLocaleString()}`, t('rep.totalValue')]}
                                                        itemStyle={{ color: '#fff', fontWeight: 600 }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            {/* Centered Total Label */}
                                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">{t('rep.total')}</span>
                                                <span className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                                                    {settings.currencySymbol}{(inventoryValue / 1000).toFixed(1)}k
                                                </span>
                                            </div>
                                        </div>

                                        {/* Detailed Side Legend */}
                                        <div className="flex flex-col gap-3 w-full md:w-auto overflow-y-auto max-h-[260px] pr-2">
                                            {Object.entries(products.reduce((acc, p) => {
                                                const cat = p.category || t('rep.noCategory')
                                                acc[cat] = (acc[cat] || 0) + (p.price * p.stock)
                                                return acc
                                            }, {} as Record<string, number>))
                                                .sort(([, a], [, b]) => b - a)
                                                .map(([name, value], index) => (
                                                    <div key={name} className="flex items-center justify-between gap-6 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors truncate max-w-[120px]">
                                                                {name}
                                                            </span>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-sm font-bold text-gray-900 dark:text-white">
                                                                {settings.currencySymbol}{value.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                                                            </div>
                                                            <div className="text-[10px] text-gray-400 font-medium">
                                                                {((value / inventoryValue) * 100).toFixed(1)}%
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Top Value Products List */}
                                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-300 dark:border-gray-700 flex flex-col">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('rep.topInvestment')}</h3>
                                    <div className="flex-grow space-y-4 overflow-y-auto">
                                        {products
                                            .map(p => ({ ...p, totalValue: p.price * p.stock }))
                                            .sort((a, b) => b.totalValue - a.totalValue)
                                            .slice(0, 5)
                                            .map((product, i) => (
                                                <div key={product.id} className="flex items-center justify-between group">
                                                    <div className="flex items-center gap-3">
                                                        <span className="flex items-center justify-center w-6 h-6 rounded bg-gray-100 dark:bg-gray-700 text-xs font-bold text-gray-500">
                                                            {i + 1}
                                                        </span>
                                                        <div>
                                                            <p className="font-medium text-sm text-gray-900 dark:text-white truncate max-w-[180px]">{product.name}</p>
                                                            <p className="text-xs text-gray-500">{t('rep.unitsCount', { count: product.stock })}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-sm text-indigo-600 dark:text-indigo-400">
                                                            {settings.currencySymbol}{(product.price * product.stock).toLocaleString()}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400">{t('rep.totalValueLower')}</p>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500">{t('rep.avgValuePerItem')}</span>
                                            <span className="font-mono font-bold text-gray-700 dark:text-gray-300">
                                                {products.length > 0
                                                    ? `${settings.currencySymbol}${(inventoryValue / products.length).toFixed(2)}`
                                                    : `${settings.currencySymbol}0.00`
                                                }
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Stock Alerts (Redesigned) */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-300 dark:border-gray-700 overflow-hidden">
                                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <AlertCircle className={cn("w-5 h-5", lowStockProducts.length > 0 ? "text-red-500" : "text-green-500")} />
                                        {t('rep.stockAlerts')}
                                    </h3>
                                    <span className={cn("px-3 py-1 rounded-full text-xs font-bold", lowStockProducts.length > 0 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600")}>
                                        {t('rep.productsCount', { count: lowStockProducts.length })}
                                    </span>
                                </div>
                                {lowStockProducts.length > 0 ? (
                                    <div>
                                        {/* List Header */}
                                        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-900/50 text-xs font-semibold text-gray-500 uppercase border-b border-gray-100 dark:border-gray-700">
                                            <div className="col-span-1">{t('rep.col.image')}</div>
                                            <div className="col-span-4 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1" onClick={() => {/* Add sort logic later if needed */ }}>
                                                {t('rep.col.product')}
                                            </div>
                                            <div className="col-span-2 text-center">{t('rep.col.category')}</div>
                                            <div className="col-span-2 text-right">{t('rep.col.price')}</div>
                                            <div className="col-span-3 text-right">{t('rep.col.currentStock')}</div>
                                        </div>

                                        {/* List Items */}
                                        <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[500px] overflow-y-auto">
                                            {lowStockProducts.map(p => (
                                                <div key={p.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                                                    {/* Image */}
                                                    <div className="col-span-1">
                                                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden border border-gray-200 dark:border-gray-600">
                                                            {p.image ? (
                                                                <img
                                                                    src={getImageSrc(p.image)}
                                                                    alt=""
                                                                    className="w-full h-full object-cover"
                                                                    onError={(e) => {
                                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                                                    }}
                                                                />
                                                            ) : null}
                                                            <div className={cn("w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500", p.image ? "hidden" : "")}>
                                                                <Package className="w-5 h-5" />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Product Info */}
                                                    <div className="col-span-4">
                                                        <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{p.name}</p>
                                                        <p className="text-xs text-gray-500 font-mono">{p.code}</p>
                                                    </div>

                                                    {/* Category */}
                                                    <div className="col-span-2 flex justify-center">
                                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                                                            {p.category || 'General'}
                                                        </span>
                                                    </div>

                                                    {/* Price */}
                                                    <div className="col-span-2 text-right">
                                                        <p className="font-bold text-gray-900 dark:text-white text-sm">
                                                            {settings.currencySymbol}{p.price.toFixed(2)}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400">
                                                            {t('rep.costLabel', { amount: `${settings.currencySymbol}${p.cost.toFixed(2)}` })}
                                                        </p>
                                                    </div>

                                                    {/* Stock Status */}
                                                    <div className="col-span-3 flex flex-col items-end gap-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full">
                                                                {t(p.stock !== 1 ? 'rep.unitMany' : 'rep.unitOne', { count: p.stock })}
                                                            </span>
                                                        </div>
                                                        <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-red-500 rounded-full"
                                                                style={{ width: `${Math.min(100, (p.stock / (p.min_stock || 1)) * 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[10px] text-gray-400">Min: {Math.max(p.min_stock, settings.inventory?.lowStockThreshold || 0)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-12 text-center">
                                        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Package className="w-8 h-8 text-green-500" />
                                        </div>
                                        <h4 className="text-gray-900 font-bold mb-1">{t('rep.allGood')}</h4>
                                        <p className="text-gray-500 text-sm">{t('rep.noLowStock')}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'export' && (
                        <ExportSection sales={sales} products={products} settings={settings} />
                    )}

                    {activeTab === 'transactions' && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-300 dark:border-gray-700 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                                <h3 className="font-bold text-gray-900 dark:text-white">{t('rep.transactionHistory')}</h3>
                                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                                    <select
                                        value={clientFilter}
                                        onChange={(e) => setClientFilter(e.target.value)}
                                        aria-label={t('rep.filter.client')}
                                        className={historySelectClass}
                                    >
                                        <option value="">{t('rep.filter.allClients')}</option>
                                        {hasWalkIns && <option value={WALK_IN}>{t('rep.walkIn')}</option>}
                                        {clientOptions.map(name => <option key={name} value={name}>{name}</option>)}
                                    </select>
                                    <select
                                        value={typeFilter}
                                        onChange={(e) => setTypeFilter(e.target.value)}
                                        aria-label={t('rep.filter.type')}
                                        className={historySelectClass}
                                    >
                                        <option value="">{t('rep.filter.allTypes')}</option>
                                        {typeOptions.map(method => <option key={method} value={method}>{paymentMethodLabel(method)}</option>)}
                                    </select>
                                    <div className="relative w-full sm:w-64">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder={t('rep.searchPlaceholder')}
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-gray-400"
                                        />
                                    </div>
                                    <ClearFiltersButton
                                        visible={!!searchTerm || !!clientFilter || !!typeFilter || historyPeriod.range !== 'all'}
                                        onClick={() => { setSearchTerm(''); setClientFilter(''); setTypeFilter(''); setHistoryPeriod({ range: 'all' }) }}
                                    />
                                    <span className="text-xs text-gray-500 whitespace-nowrap hidden sm:inline-block">
                                        {t('rep.recordsCount', { count: sortedSales.length })}
                                    </span>
                                </div>
                            </div>

                            {/* Period filter */}
                            <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-700 flex flex-col lg:flex-row justify-between lg:items-center gap-3">
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-indigo-500" />
                                    {t('rep.transactionPeriod')}
                                </span>
                                <ReportPeriodFilter value={historyPeriod} onChange={setHistoryPeriod} />
                            </div>

                            {/* Sortable Header */}
                            <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 dark:bg-gray-900/50 text-xs font-semibold text-gray-500 uppercase border-b border-gray-100 dark:border-gray-700 select-none">
                                <div
                                    className="col-span-3 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1 transition-colors group"
                                    onClick={() => requestSort('created_at')}
                                >
                                    {t('rep.col.dateId')}
                                    <ArrowUpDown className={cn("w-3 h-3 text-gray-300 group-hover:text-gray-500", sortConfig?.key === 'created_at' && "text-cyan-500")} />
                                </div>
                                <div
                                    className="col-span-3 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1 transition-colors group"
                                    onClick={() => requestSort('customer_name')}
                                >
                                    {t('rep.col.client')}
                                    <ArrowUpDown className={cn("w-3 h-3 text-gray-300 group-hover:text-gray-500", sortConfig?.key === 'customer_name' && "text-cyan-500")} />
                                </div>
                                <div className="col-span-2 text-center">{t('rep.col.items')}</div>
                                <div
                                    className="col-span-2 text-right cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 flex items-center justify-end gap-1 transition-colors group"
                                    onClick={() => requestSort('total')}
                                >
                                    {t('rep.col.total')}
                                    <ArrowUpDown className={cn("w-3 h-3 text-gray-300 group-hover:text-gray-500", sortConfig?.key === 'total' && "text-cyan-500")} />
                                </div>
                                <div className="col-span-2 text-right">{t('rep.col.actions')}</div>
                            </div>

                            {/* List Content */}
                            <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[600px] overflow-y-auto bg-white dark:bg-gray-800">
                                {sortedSales.slice(0, 100).map((sale) => (
                                    <div key={sale.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">

                                        {/* Date / ID */}
                                        <div className="col-span-3">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-900 dark:text-white">#{sale.id}</span>
                                                {sale.status === 'cancelled' && (
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                                                        {t('rep.cancelledBadge')}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-0.5">
                                                {sale.created_at ? new Date(sale.created_at).toLocaleString(locale, {
                                                    day: '2-digit', month: '2-digit', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                }) : '-'}
                                            </div>
                                        </div>

                                        {/* Client */}
                                        <div className="col-span-3">
                                            <div className="font-medium text-gray-700 dark:text-gray-200 truncate pr-4">
                                                {sale.customer_name || t('rep.walkIn')}
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className={cn(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    sale.payment_method === 'card' ? "bg-purple-500" :
                                                        sale.payment_method === 'transfer' ? "bg-blue-500" :
                                                            "bg-green-500"
                                                )} />
                                                <span className="text-xs text-gray-400 capitalize">
                                                    {paymentMethodLabel(sale.payment_method)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Items Count badge */}
                                        <div className="col-span-2 flex justify-center">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                                                {t('rep.itemsShort', { count: sale.items.length })}
                                            </span>
                                        </div>

                                        {/* Total */}
                                        <div className="col-span-2 text-right">
                                            <div className={cn(
                                                "font-bold text-base",
                                                sale.status === 'cancelled' ? "text-gray-400 line-through decoration-red-500" : "text-gray-900 dark:text-white"
                                            )}>
                                                {settings.currencySymbol}{sale.total.toFixed(2)}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="col-span-2 text-right flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => pdfGenerator.generateInvoice(sale, settings)}
                                                className="p-1.5 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                                                title={t('rep.reprint')}
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>

                                            {sale.status !== 'cancelled' && (
                                                <button
                                                    onClick={() => setSaleToCancel(sale)}
                                                    className="p-1.5 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                                    title={t('rep.cancelSale')}
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {sortedSales.length === 0 && (
                                    <div className="p-12 text-center text-gray-400">
                                        {t('rep.noTransactions')}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            <ConfirmDialog
                isOpen={!!saleToCancel}
                onCancel={() => setSaleToCancel(null)}
                onConfirm={handleCancelSale}
                title={t('rep.cancelTitle', { id: saleToCancel?.id ?? '' })}
                description={t('rep.cancelDesc')}
                confirmText={t('rep.cancelConfirm')}
                cancelText={t('rep.cancelKeep')}
                variant="danger"
            />
        </div>
    )
}

function MetricCard({ title, value, subtitle, icon: Icon, color }: any) {
    const colors = {
        blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
        green: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
        purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
        red: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
        gray: "bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-300 dark:border-gray-700 flex items-start justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">{value}</h3>
                <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
            </div>
            <div className={cn("p-3 rounded-xl", colors[color as keyof typeof colors])}>
                <Icon className="w-6 h-6" />
            </div>
        </div>
    )
}

function ExportSection({ sales, products, settings }: { sales: Sale[]; products: Product[]; settings: any }) {
    const { t, locale, dateLocale } = useTranslation()
    const [period, setPeriod] = useState<ReportPeriod>({ range: 'today' })
    const timeRange = period.range

    const filteredSales = filterSalesByPeriod(sales, period, dateLocale)
    // Products don't usually filter by date unless it's "created_at", but for inventory snapshots we usually want current state.
    // However, for "Low Stock" we just filter by logic. Used products remains full list usually.

    const lowStock = products.filter(p => p.stock <= Math.max(p.min_stock, settings.inventory?.lowStockThreshold || 0))

    const rangeLabel = periodLabel(period, t, locale)

    const handleExport = (type: 'sales' | 'inventory' | 'low-stock' | 'daily-closing') => {
        const titleMap = {
            'sales': t('rep.export.salesTitle'),
            'inventory': t('rep.export.inventoryTitle'),
            'low-stock': t('rep.export.lowStockTitle'),
            'daily-closing': t('rep.export.closingTitle')
        }
        const subtitleMap = {
            'sales': t('rep.export.salesSubtitle'),
            'inventory': t('rep.export.inventorySubtitle'),
            'low-stock': t('rep.export.lowStockSubtitle'),
            'daily-closing': t('rep.export.closingSubtitle')
        }

        let dataToExport: any[] = []
        const exportTitle = titleMap[type]

        if (type === 'sales') dataToExport = filteredSales
        if (type === 'daily-closing') {
            // Daily closing is specifically Today regardless of filter, or we can respect filter if user selects "Today" specifically? 
            // Usually Daily Closing implies Today. Let's force filter to today for this button or use current filter if it makes sense.
            // To be safe/explicit:
            dataToExport = sales.filter(s => new Date(s.created_at!).toDateString() === new Date().toDateString())
        }
        if (type === 'inventory') dataToExport = products
        if (type === 'low-stock') dataToExport = lowStock

        toast.promise(
            pdfGenerator.generateReport(
                exportTitle,
                subtitleMap[type],
                dataToExport,
                type,
                settings,
                type === 'inventory' || type === 'low-stock' ? undefined : rangeLabel
            ),
            {
                loading: t('rep.export.generating'),
                success: t('rep.export.success'),
                error: t('rep.export.error')
            }
        )
    }

    return (
        <div className="space-y-6">
            {/* Time Filter Controls */}
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-3 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-md border border-gray-300 dark:border-gray-700">
                <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-500" />
                    {t('rep.export.period')}
                </span>
                <ReportPeriodFilter value={period} onChange={setPeriod} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sales Report Card */}
                <NewExportCard
                    title={t('rep.export.salesTitle')}
                    description={t('rep.export.salesDesc', { range: timeRange === 'today' ? t('rep.export.descToday') : timeRange === 'all' ? t('rep.export.descAll') : rangeLabel })}
                    count={filteredSales.length}
                    total={filteredSales.reduce((s, x) => s + x.total, 0)}
                    currencySymbol={settings.currencySymbol}
                    icon={DollarSign}
                    color="green"
                    onClick={() => handleExport('sales')}
                    previewData={filteredSales.slice(0, 3).map(s => (
                        <div key={s.id} className="flex justify-between text-xs py-1 border-b border-dashed border-gray-100 dark:border-gray-700 last:border-0">
                            <span className="text-gray-500">#{s.id}</span>
                            <span className="font-medium text-gray-900 dark:text-white">{settings.currencySymbol}{s.total.toFixed(2)}</span>
                        </div>
                    ))}
                />

                {/* Inventory Card (Static snapshot) */}
                <NewExportCard
                    title={t('rep.export.inventoryTitle')}
                    description={t('rep.export.inventoryDesc')}
                    count={products.length}
                    total={products.reduce((s, p) => s + (p.price * p.stock), 0)}
                    currencySymbol={settings.currencySymbol}
                    icon={Package}
                    color="blue"
                    onClick={() => handleExport('inventory')}
                    previewData={products.slice(0, 3).map(p => (
                        <div key={p.id} className="flex justify-between text-xs py-1 border-b border-dashed border-gray-100 dark:border-gray-700 last:border-0">
                            <span className="truncate max-w-[150px] text-gray-500">{p.name}</span>
                            <span className="font-medium text-gray-900 dark:text-white">{t('rep.unitsShort', { count: p.stock })}</span>
                        </div>
                    ))}
                />

                {/* Low Stock Card */}
                <NewExportCard
                    title={t('rep.export.lowStockCardTitle')}
                    description={t('rep.export.lowStockDesc')}
                    count={lowStock.length}
                    icon={AlertCircle}
                    color="red"
                    onClick={() => handleExport('low-stock')}
                    previewData={lowStock.length === 0 ? [<span key="ok" className="text-xs text-green-500">{t('rep.allGood')}</span>] : lowStock.slice(0, 3).map(p => (
                        <div key={p.id} className="flex justify-between text-xs py-1 border-b border-dashed border-gray-100 dark:border-gray-700 last:border-0">
                            <span className="text-red-500 truncate max-w-[150px]">{p.name}</span>
                            <span className="font-bold text-red-600">{p.stock} / {Math.max(p.min_stock, settings.inventory?.lowStockThreshold || 0)}</span>
                        </div>
                    ))}
                />

                {/* Daily Closing Card (Always today) */}
                <NewExportCard
                    title={t('rep.export.closingCardTitle')}
                    description={t('rep.export.closingDesc')}
                    icon={Calendar}
                    color="purple"
                    onClick={() => handleExport('daily-closing')}
                    customMetric={
                        <div className="text-right">
                            <div className="text-xs text-gray-400 uppercase font-bold">{t('rep.export.salesTodayLabel')}</div>
                            <div className="text-xl font-black text-gray-900 dark:text-white">
                                {settings.currencySymbol}
                                {sales.filter(s => new Date(s.created_at!).toDateString() === new Date().toDateString())
                                    .reduce((acc, s) => acc + s.total, 0).toFixed(2)}
                            </div>
                        </div>
                    }
                />
            </div>


        </div>
    )
}

function NewExportCard({ title, description, count, total, currencySymbol, icon: Icon, color, onClick, previewData, customMetric }: any) {
    const { t } = useTranslation()
    const colors = {
        blue: "text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800",
        green: "text-green-600 bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800",
        purple: "text-purple-600 bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800",
        red: "text-red-600 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800",
    }

    const solidColors = {
        blue: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30",
        green: "bg-green-600 hover:bg-green-700 text-white shadow-green-500/30",
        purple: "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/30",
        red: "bg-red-600 hover:bg-red-700 text-white shadow-red-500/30",
    }

    // Fallback for color indexing
    const themeClass = colors[color as keyof typeof colors] || colors.blue
    const buttonClass = solidColors[color as keyof typeof solidColors] || solidColors.blue

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-300 dark:border-gray-700 flex flex-col h-full hover:shadow-lg transition-all duration-300 group">
            <div className="flex justify-between items-start mb-4">
                <div className={cn("p-3 rounded-xl transition-colors", themeClass)}>
                    <Icon className="w-6 h-6" />
                </div>
                {customMetric ? customMetric : (total !== undefined && (
                    <div className="text-right">
                        <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{t('rep.total')}</div>
                        <div className="text-xl font-black text-gray-900 dark:text-white">{currencySymbol}{total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
                    </div>
                ))}
            </div>

            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">{title}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 leading-relaxed flex-grow">{description}</p>

            {/* Live Preview Area - Refined */}
            {previewData && (
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('rep.export.preview')}</span>
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-[10px] font-bold text-gray-500 dark:text-gray-300">
                            {t('rep.recordsCount', { count })}
                        </span>
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-900/30 rounded-xl p-1 border border-gray-200 dark:border-gray-700">
                        {count === 0 ? (
                            <div className="p-4 text-center text-xs text-gray-400 italic">{t('rep.export.noData')}</div>
                        ) : (
                            <div className="space-y-0.5">
                                {previewData}
                                {(count > 3) && (
                                    <div className="text-[10px] text-center text-gray-400 py-1.5 font-medium border-t border-dashed border-gray-100 dark:border-gray-700">
                                        {t('rep.export.moreRecords', { count: count - 3 })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="mt-auto">
                <button
                    onClick={onClick}
                    className={cn(
                        "w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg",
                        buttonClass
                    )}
                >
                    <Download className="w-4 h-4" />
                    {t('rep.export.generatePdf')}
                </button>
            </div>
        </div>
    )
}
