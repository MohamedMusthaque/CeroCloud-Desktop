import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
    Plus, Search, Edit2, Trash2, Package, Mail, Phone,
    User, LayoutGrid, List as ListIcon,
    ShoppingBag, Globe
} from 'lucide-react'
import { supplierService } from '@/services/supplierService'
import { productService } from '@/services/productService'
import { type Supplier, type Product } from '@/types/database'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ClearFiltersButton } from '@/components/ui/ClearFiltersButton'
import { SupplierForm } from './SupplierForm'
import { cn, getImageSrc } from '@/lib/utils'
import { companyService } from '@/services/companyService'
import { useTranslation, unitLabel, t as translateNow } from '@/i18n'

export function Suppliers() {
    const { t } = useTranslation()
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [allProducts, setAllProducts] = useState<Product[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(true)
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [currencySymbol, setCurrencySymbol] = useState('$')

    // Modals & Active State
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [supplierToDelete, setSupplierToDelete] = useState<number | null>(null)
    const [selectedSupplierForProducts, setSelectedSupplierForProducts] = useState<Supplier | null>(null)

    useEffect(() => {
        const settings = companyService.getSettings()
        setCurrencySymbol(settings.currencySymbol)
        loadData()
    }, [])

    const loadData = async () => {
        try {
            setLoading(true)
            const [suppliersData, productsData] = await Promise.all([
                supplierService.getAll(),
                productService.getAll()
            ])
            setSuppliers(suppliersData)
            setAllProducts(productsData)
        } catch (error) {
            console.error('Error loading data:', error)
            // Non-reactive translate keeps the load function free of hook dependencies
            toast.error(translateNow('sup.loadError'))
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteClick = (id: number) => {
        setSupplierToDelete(id)
        setConfirmOpen(true)
    }

    const confirmDelete = async () => {
        if (supplierToDelete) {
            try {
                await supplierService.delete(supplierToDelete)
                setSuppliers(prev => prev.filter(s => s.id !== supplierToDelete))
                toast.success(t('sup.deleted'))
            } catch (error) {
                console.error('Error deleting supplier:', error)
                toast.error(t('sup.deleteError'))
            } finally {
                setConfirmOpen(false)
                setSupplierToDelete(null)
            }
        }
    }

    const filteredSuppliers = useMemo(() => {
        return suppliers.filter(s =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.contact?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.email?.toLowerCase().includes(searchTerm.toLowerCase())
        )
    }, [suppliers, searchTerm])

    // Stats
    const totalSuppliers = suppliers.length
    const totalProductsSourced = filteredSuppliers.reduce((acc, s) => acc + (s.products_count || 0), 0)

    return (
        <div className="space-y-6 pb-20 p-2">
            {/* Header & Title */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                        {t('sup.title')}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {t('sup.subtitle')}
                    </p>
                </div>
                <button
                    onClick={() => { setEditingSupplier(null); setIsFormOpen(true) }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all font-semibold shadow-lg shadow-indigo-500/25 active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    {t('sup.new')}
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    label={t('sup.statTotal')}
                    value={totalSuppliers}
                    icon={User}
                    color="bg-blue-500"
                />
                <StatCard
                    label={t('sup.statLinked')}
                    value={totalProductsSourced}
                    icon={Package}
                    color="bg-purple-500"
                />
                <StatCard
                    label={t('sup.statActive')}
                    value={totalSuppliers} // Placeholder logic
                    icon={Globe}
                    color="bg-green-500"
                />
                <StatCard
                    label={t('sup.statAlerts')}
                    value={0} // Placeholder
                    icon={ShoppingBag}
                    color="bg-orange-500"
                />
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-gray-800 p-2 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('sup.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white placeholder-gray-400"
                    />
                </div>
                <div className="flex items-center">
                    <ClearFiltersButton visible={!!searchTerm} onClick={() => setSearchTerm('')} />
                </div>
                <div className="flex items-center gap-2 border-l border-gray-200 dark:border-gray-700 pl-4">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={cn(
                            "p-2 rounded-lg transition-colors",
                            viewMode === 'grid'
                                ? "bg-gray-100 dark:bg-gray-700 text-indigo-600"
                                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        )}
                    >
                        <LayoutGrid className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={cn(
                            "p-2 rounded-lg transition-colors",
                            viewMode === 'list'
                                ? "bg-gray-100 dark:bg-gray-700 text-indigo-600"
                                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        )}
                    >
                        <ListIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <AnimatePresence mode="wait">
                {loading ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center h-64 gap-4"
                    >
                        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                        <p className="text-gray-500">{t('sup.loading')}</p>
                    </motion.div>
                ) : filteredSuppliers.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700"
                    >
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                            <User className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('sup.noResults')}</h3>
                        <p className="text-gray-500 mt-2">{t('sup.noResultsDesc')}</p>
                    </motion.div>
                ) : (
                    <div className={cn(
                        "grid gap-4",
                        viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
                    )}>
                        {filteredSuppliers.map((supplier) => (
                            <SupplierCard
                                key={supplier.id}
                                supplier={supplier}
                                viewMode={viewMode}
                                onEdit={() => { setEditingSupplier(supplier); setIsFormOpen(true) }}
                                onDelete={() => handleDeleteClick(supplier.id!)}
                                onViewProducts={() => setSelectedSupplierForProducts(supplier)}
                            />
                        ))}
                    </div>
                )}
            </AnimatePresence>

            {/* MODALS */}
            {isFormOpen && (
                <SupplierForm
                    supplier={editingSupplier}
                    onClose={() => {
                        setIsFormOpen(false)
                        setEditingSupplier(null)
                        loadData()
                    }}
                />
            )}

            {selectedSupplierForProducts && (
                <ProductsListModal
                    supplier={selectedSupplierForProducts}
                    products={allProducts.filter(p => p.supplier_id === selectedSupplierForProducts.id)}
                    currencySymbol={currencySymbol}
                    onClose={() => setSelectedSupplierForProducts(null)}
                />
            )}

            <ConfirmDialog
                isOpen={confirmOpen}
                title={t('sup.deleteTitle')}
                description={t('sup.deleteDesc')}
                confirmText={t('sup.deleteConfirm')}
                variant="danger"
                onConfirm={confirmDelete}
                onCancel={() => setConfirmOpen(false)}
            />
        </div>
    )
}

interface StatCardProps {
    label: string
    value: string | number
    icon: React.ElementType
    color: string
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4">
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", color, "bg-opacity-10")}>
                <Icon className={cn("w-6 h-6", color.replace('bg-', 'text-'))} />
            </div>
            <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white">{value}</p>
            </div>
        </div>
    )
}

interface SupplierCardProps {
    supplier: Supplier
    viewMode: 'grid' | 'list'
    onEdit: () => void
    onDelete: () => void
    onViewProducts: () => void
}

function SupplierCard({ supplier, viewMode, onEdit, onDelete, onViewProducts }: SupplierCardProps) {
    const { t } = useTranslation()
    // Modern, compact "business card" layout
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
                "group bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col",
                viewMode === 'list' ? "flex-row items-center p-3 gap-4" : "p-5"
            )}
        >
            <div className="flex items-start gap-4 w-full">
                {/* Colorful avatar */}
                <div className={cn(
                    "shrink-0 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20",
                    "bg-gradient-to-br from-indigo-500 to-purple-600",
                    viewMode === 'list' ? "w-12 h-12 text-lg" : "w-16 h-16 text-3xl"
                )}>
                    {supplier.name ? supplier.name.charAt(0).toUpperCase() : <User className="w-6 h-6" />}
                </div>

                {/* Main information */}
                <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex justify-between items-start">
                        <h3 className="font-bold text-gray-900 dark:text-white text-lg truncate pr-2 leading-tight">
                            {supplier.name}
                        </h3>
                        {/* Quick actions menu (grid only, to avoid clutter) */}
                        {viewMode === 'grid' && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity -mr-2 -mt-1">
                                <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    {supplier.contact && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" />
                            {supplier.contact}
                        </p>
                    )}

                    {/* Compact contact details */}
                    <div className="flex flex-wrap gap-y-1 gap-x-3 text-xs text-gray-500 pt-1">
                        {supplier.phone && (
                            <a href={`tel:${supplier.phone}`} className="flex items-center gap-1 hover:text-indigo-500 transition-colors">
                                <Phone className="w-3 h-3" />
                                {supplier.phone}
                            </a>
                        )}
                        {supplier.email && (
                            <a href={`mailto:${supplier.email}`} className="flex items-center gap-1 hover:text-indigo-500 transition-colors">
                                <Mail className="w-3 h-3" />
                                <span className="truncate max-w-[120px]">{supplier.email}</span>
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom: stats and products button */}
            {viewMode === 'grid' && (
                <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
                    <button
                        onClick={onViewProducts}
                        className="group/btn flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 rounded-lg text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all"
                    >
                        <Package className="w-3.5 h-3.5 transition-transform group-hover/btn:scale-110" />
                        <span>{t('sup.viewProductsCount', { count: supplier.products_count || 0 })}</span>
                    </button>

                    {/* Mobile or extra action buttons if needed, but they are already above */}
                    <div className="text-xs text-gray-400 font-medium">
                        {supplier.address ? t('sup.withAddress') : t('sup.withoutAddress')}
                    </div>
                </div>
            )}

            {/* Actions for list mode */}
            {viewMode === 'list' && (
                <div className="flex items-center gap-2 ml-4 border-l border-gray-100 dark:border-gray-700 pl-4">
                    <button
                        onClick={onViewProducts}
                        className="p-2 text-gray-400 hover:text-indigo-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        title={t('sup.viewProducts')}
                    >
                        <Package className="w-4 h-4" />
                    </button>
                    <button onClick={onEdit} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={onDelete} className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            )}
        </motion.div>
    )
}



function ProductsListModal({ supplier, products, onClose, currencySymbol }: { supplier: Supplier, products: Product[], onClose: () => void, currencySymbol: string }) {
    const { t } = useTranslation()
    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-white dark:bg-gray-800 rounded-3xl w-full max-w-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col max-h-[85vh] z-10"
            >
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Package className="w-5 h-5 text-indigo-500" />
                            {t('sup.productsOf', { name: supplier.name })}
                        </h2>
                        <p className="text-sm text-gray-500">{t('sup.registeredProducts', { count: products.length })}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <span className="text-2xl leading-none">&times;</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {products.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">
                            {t('sup.noProducts')}
                        </div>
                    ) : (
                        products.map(product => (
                            <div key={product.id} className="flex items-center gap-4 p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                                    {product.image ? (
                                        <img src={getImageSrc(product.image)} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                        <Package className="w-6 h-6 text-gray-400" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-gray-900 dark:text-white truncate">{product.name}</h4>
                                    <p className="text-xs text-gray-500">{product.code} • {product.category || t('sup.noCategory')}</p>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-indigo-600 dark:text-indigo-400">
                                        {currencySymbol}{product.price.toFixed(2)}
                                    </div>
                                    <div className={cn("text-xs font-medium", product.stock > product.min_stock ? "text-green-500" : "text-red-500")}>
                                        {product.stock} {unitLabel(product.unit)}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-center">
                    <button onClick={onClose} className="px-6 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors shadow-sm">
                        {t('common.close')}
                    </button>
                </div>
            </motion.div>
        </div>,
        document.body
    )
}
