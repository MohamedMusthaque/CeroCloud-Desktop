/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    TrendingUp,
    DollarSign,
    Package,
    ShoppingCart,
    ArrowUpRight,
    ArrowDownRight,
    Activity,
    Calendar
} from 'lucide-react'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts'
import { productService } from '@/services/productService'
import { saleService } from '@/services/saleService'
import { companyService } from '@/services/companyService'
import { Product, Sale } from '@/types/database'
import { format, subDays, startOfDay } from 'date-fns'
import { useTranslation } from '@/i18n'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function Dashboard() {
    const [products, setProducts] = useState<Product[]>([])
    const [sales, setSales] = useState<Sale[]>([])
    const [loading, setLoading] = useState(true)
    const [settings] = useState(companyService.getSettings())
    const { t, dateLocale } = useTranslation()

    const [currentTime, setCurrentTime] = useState(new Date())

    useEffect(() => {
        loadData()
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    const loadData = async () => {
        try {
            setLoading(true)
            const [productsData, salesData] = await Promise.all([
                productService.getAll(),
                saleService.getAll()
            ])
            setProducts(productsData)
            setSales(salesData)
        } catch (error) {
            console.error('Error loading dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    // Stats
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0)
    const totalProducts = products.length
    const totalSales = sales.length
    const lowStockCount = products.filter(p => p.stock <= p.min_stock).length

    // Today's metrics
    const today = startOfDay(new Date())
    const salesToday = sales.filter(sale => {
        const saleDate = startOfDay(new Date(sale.created_at!))
        return saleDate.getTime() === today.getTime()
    })
    const revenueToday = salesToday.reduce((sum, sale) => sum + sale.total, 0)

    // Chart Data
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i)
        const dayStart = startOfDay(date)
        const daySales = sales.filter(sale => {
            const saleDate = startOfDay(new Date(sale.created_at!))
            return saleDate.getTime() === dayStart.getTime()
        })
        return {
            date: format(date, 'EEE', { locale: dateLocale }), // Mon, Tue...
            fullDate: format(date, 'dd MMM', { locale: dateLocale }),
            ventas: daySales.reduce((sum, sale) => sum + sale.total, 0),
        }
    })

    // Top Products
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

    const topProducts = Array.from(productRevenue.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)
        .map(item => ({
            name: item.product.name.substring(0, 15),
            ventas: item.revenue,
            quantity: item.quantity
        }))

    const navigate = useNavigate()

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8 pb-8">
            {/* HERO SECTION - Redesigned Premium Dark Theme */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl shadow-2xl border border-slate-800/50 group transition-shadow duration-500 hover:shadow-indigo-500/10">
                {/* Background Effects */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[120px] mix-blend-screen opacity-50 pointer-events-none transform translate-x-1/2 -translate-y-1/2 group-hover:opacity-60 transition-opacity duration-700" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] mix-blend-screen opacity-30 pointer-events-none transform -translate-x-1/2 translate-y-1/2 group-hover:opacity-40 transition-opacity duration-700" />

                <div className="relative z-10 p-6 md:p-8 flex justify-between items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, ease: "circOut" }}
                        className="max-w-2xl"
                    >
                        {/* Time & Date Pills */}
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-sm ring-1 ring-white/5">
                                <Calendar className="w-3.5 h-3.5 text-indigo-300" />
                                <span className="text-sm font-medium text-slate-200 capitalize tracking-wide">
                                    {format(currentTime, t('dash.heroDateFormat'), { locale: dateLocale })}
                                </span>
                            </div>
                            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-sm ring-1 ring-white/5">
                                <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                                <span className="text-sm font-medium text-slate-200 tabular-nums tracking-wide">
                                    {format(currentTime, 'hh:mm:ss a')}
                                </span>
                            </div>
                        </div>

                        {/* Welcome Text */}
                        <div className="space-y-1.5">
                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-lg">
                                {t('dash.hello')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-white">{settings.name || t('dash.admin')}</span>
                            </h1>
                            <p className="text-slate-400 text-base md:text-lg font-light max-w-lg leading-relaxed">
                                {t('dash.summary')}
                                <span className="block mt-2 text-base">
                                    {t('dash.salesTodayPrefix')} <span className="font-bold text-white bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">{salesToday.length}</span> {t('dash.salesTodaySuffix')}
                                </span>
                            </p>
                        </div>
                    </motion.div>

                    {/* Logo Section */}
                    <div className="hidden lg:block relative group-hover:scale-105 transition-transform duration-700 ease-in-out">
                        <div className="relative w-32 h-32">
                            {/* Glow behind logo */}
                            <div className="absolute inset-0 bg-indigo-500/30 blur-2xl rounded-full" />
                            <div className="relative w-full h-full rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl flex items-center justify-center p-3">
                                <img
                                    src={settings.logo || 'icon.png'}
                                    alt="Company Icon"
                                    className="w-full h-full object-contain filter drop-shadow-md"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI CARDS - Clean & Neutral */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <KPICard
                    title={t('dash.totalRevenue')}
                    value={`${settings.currencySymbol}${totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
                    icon={DollarSign}
                    trend={revenueToday > 0 ? "+Hoy" : "Neutral"}
                    trendValue={revenueToday > 0 ? `${settings.currencySymbol}${revenueToday.toFixed(2)}` : "-"}
                    color="blue"
                />

                <KPICard
                    title={t('dash.totalSales')}
                    value={totalSales.toString()}
                    icon={ShoppingCart}
                    trend={salesToday.length > 0 ? "+Hoy" : "Neutral"}
                    trendValue={salesToday.length > 0 ? `+${salesToday.length}` : "-"}
                    color="teal"
                />

                <KPICard
                    title={t('dash.inventory')}
                    value={totalProducts.toString()}
                    icon={Package}
                    trend={lowStockCount > 0 ? "Alerta" : "OK"}
                    trendValue={lowStockCount > 0 ? t('dash.lowCount', { count: lowStockCount }) : t('dash.healthyStock')}
                    color={lowStockCount > 0 ? "amber" : "indigo"}
                />

                <KPICard
                    title={t('dash.avgTicket')}
                    value={`${settings.currencySymbol}${totalSales > 0 ? (totalRevenue / totalSales).toFixed(2) : "0.00"}`}
                    icon={TrendingUp}
                    trend="Estable"
                    trendValue={t('dash.general')}
                    color="purple"
                />
            </div >

            {/* CHARTS GRID - Clean & Professional */}
            < div className="grid grid-cols-1 lg:grid-cols-2 gap-6" >
                {/* Sales Trend */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-300 dark:border-gray-700 shadow-md">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('dash.revenue7d')}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('dash.dailyTrend')}</p>
                        </div>
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
                            <Activity className="w-5 h-5" />
                        </div>
                    </div>
                    {totalSales > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={last7Days}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6B7280', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6B7280', fontSize: 12 }}
                                    tickFormatter={(value) => `${settings.currencySymbol}${value}`}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--tooltip-bg, #fff)' }}
                                    itemStyle={{ color: 'var(--tooltip-text, #1f2937)' }}
                                    cursor={{ stroke: '#3b82f6', strokeWidth: 1 }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="ventas"
                                    name={t('dash.revenue')}
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorSales)"
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[300px] flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 dark:border-gray-700/50 rounded-xl">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.5 }}
                                className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800 rounded-full mb-4 shadow-inner"
                            >
                                <Activity className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                            </motion.div>
                            <h4 className="font-semibold text-gray-900 dark:text-gray-200 mb-2 text-center px-4">{t('dash.noActivity')}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-[280px] leading-relaxed px-4">
                                {t('dash.noActivityDesc')}
                            </p>
                        </div>
                    )}
                </div >

                {/* Top Products & Payment Methods Grid */}
                <div className="space-y-6">
                    {/* Top Products */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-700 shadow-md h-[420px] flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700/50 shrink-0">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('dash.topProducts')}</h3>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 relative">
                            {topProducts.length > 0 ? (
                                <div className="space-y-7">
                                    {topProducts.map((product, index) => (
                                        <div key={index} className="relative group">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-bold text-gray-500">
                                                        {index + 1}
                                                    </span>
                                                    <span className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate max-w-[140px] group-hover:text-primary transition-colors">
                                                        {product.name}
                                                    </span>
                                                </div>
                                                <div className="text-right flex flex-col items-end">
                                                    <span className="text-sm font-black text-gray-900 dark:text-white">
                                                        {settings.currencySymbol}{product.ventas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                    </span>
                                                    <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 mt-0.5">
                                                        {t('dash.unitsSold', { count: product.quantity })}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500 ease-out bg-teal-500 group-hover:bg-teal-400"
                                                    style={{
                                                        width: `${(product.ventas / (topProducts[0]?.ventas || 1)) * 100}%`
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ duration: 0.5 }}
                                        className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800 rounded-full mb-4 shadow-inner"
                                    >
                                        <Package className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                                    </motion.div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('dash.noSales')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div >

            {/* Quick Actions / Micro UX */}
            < div className="grid grid-cols-1 md:grid-cols-3 gap-6" >
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 text-white flex items-center justify-between cursor-pointer hover:shadow-lg transition-all"
                    onClick={() => navigate('/sales')}
                >
                    <div>
                        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">{t('dash.quickPos')}</p>
                        <h3 className="text-xl font-bold">{t('dash.newSale')}</h3>
                    </div>
                    <div className="p-3 bg-white/10 rounded-full">
                        <ShoppingCart className="w-6 h-6" />
                    </div>
                </motion.div>

                <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl p-6 flex items-center justify-between cursor-pointer shadow-md hover:border-primary/50 transition-all"
                    onClick={() => navigate('/inventory')}
                >
                    <div>
                        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">{t('dash.catalog')}</p>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('dash.addProduct')}</h3>
                    </div>
                    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
                        <Package className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                    </div>
                </motion.div>

                <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl p-6 flex items-center justify-between cursor-pointer shadow-md hover:border-primary/50 transition-all"
                    onClick={() => navigate('/reports')}
                >
                    <div>
                        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">{t('dash.analysis')}</p>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('dash.viewReports')}</h3>
                    </div>
                    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
                        <Activity className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                    </div>
                </motion.div>
            </div >
        </div >
    )
}

function KPICard({ title, value, icon: Icon, trend, trendValue, color }: any) {
    const colorStyles = {
        blue: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
        teal: "text-teal-600 bg-teal-50 dark:bg-teal-900/20",
        amber: "text-amber-600 bg-amber-50 dark:bg-amber-900/20",
        indigo: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20",
        purple: "text-purple-600 bg-purple-50 dark:bg-purple-900/20",
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-300 dark:border-gray-700 shadow-md hover:shadow-xl hover:border-gray-400 dark:hover:border-gray-600 transition-all duration-300 hover:-translate-y-0.5 group">
            <div className="flex items-start justify-between mb-4">
                <div className={cn("p-3 rounded-lg transition-transform duration-300 group-hover:scale-110", colorStyles[color as keyof typeof colorStyles] || colorStyles.blue)}>
                    <Icon className="w-6 h-6" />
                </div>
                {trend !== "Neutral" && (
                    <div className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium",
                        trend === "Alerta" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                    )}>
                        {trend === "Alerta" ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                        {trendValue}
                    </div>
                )}
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</h3>
            </div>
        </div>
    )
}
