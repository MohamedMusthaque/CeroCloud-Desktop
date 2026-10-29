/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo, useRef } from 'react'
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    Package,
    Upload,
    LayoutGrid,
    List,
    ArrowUpDown,
    AlertTriangle,
    CheckCircle2,
    Tags
} from 'lucide-react'
import { productService } from '@/services/productService'
import { companyService } from '@/services/companyService'
import { Product } from '@/types/database'
import { ProductForm } from './ProductForm'
import { Categories } from './Categories'
import { ImportWizard } from '@/components/inventory/ImportWizard'
import { useUIStore } from '@/stores/uiStore'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, getImageSrc } from '@/lib/utils'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ProductCardSkeleton, TableRowSkeleton } from '@/components/ui/Skeleton'
import { useVirtualizer } from '@tanstack/react-virtual'
import { LazyImage } from '@/components/ui/LazyImage'
import { useTranslation, unitLabel, t as translateNow } from '@/i18n'
// If button component doesn't exist, I'll use standard buttons with Tailwind

type SortField = 'name' | 'price' | 'stock'
type SortOrder = 'asc' | 'desc'

export function Inventory() {
    // Global UI State
    const { inventoryViewMode, setInventoryViewMode } = useUIStore()
    const [settings] = useState(companyService.getSettings())
    const { t } = useTranslation()

    // Local State
    const [products, setProducts] = useState<Product[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [sortField, setSortField] = useState<SortField>('name')
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

    // Confirm Dialog State
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [productToDelete, setProductToDelete] = useState<number | null>(null)

    // Modals & Loading
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [isImportOpen, setIsImportOpen] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [loading, setLoading] = useState(true)
    const [section, setSection] = useState<'products' | 'categories'>('products')

    // Load Data
    useEffect(() => {
        loadProducts()
    }, [])

    const loadProducts = async () => {
        try {
            setLoading(true)
            const data = await productService.getAll()
            setProducts(data)
        } catch (error) {
            console.error('Error loading products:', error)
            // Non-reactive translate keeps the load function free of hook dependencies
            toast.error(translateNow('inv.loadError'))
        } finally {
            setLoading(false)
        }
    }

    // Actions
    const handleDeleteClick = (id: number) => {
        setProductToDelete(id)
        setConfirmOpen(true)
    }

    const confirmDelete = async () => {
        if (productToDelete) {
            try {
                await productService.delete(productToDelete)
                setProducts(prev => prev.filter(p => p.id !== productToDelete))
                toast.success(t('inv.deleted'))
            } catch (error) {
                console.error('Error deleting product:', error)
                toast.error(t('inv.deleteError'))
            } finally {
                setConfirmOpen(false)
                setProductToDelete(null)
            }
        }
    }

    const handleEdit = (product: Product) => {
        setEditingProduct(product)
        setIsFormOpen(true)
    }

    // filtering & Sorting
    const categories = useMemo(() => {
        const cats = new Set(products.map(p => p.category || t('inv.noCategory')))
        return ['all', ...Array.from(cats)]
    }, [products, t])

    const filteredAndSortedProducts = useMemo(() => {
        let result = [...products]

        // 1. Search
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase()
            result = result.filter(p =>
                p.name.toLowerCase().includes(lowerTerm) ||
                p.code.toLowerCase().includes(lowerTerm) ||
                p.category?.toLowerCase().includes(lowerTerm)
            )
        }

        // 2. Category Filter
        if (selectedCategory !== 'all') {
            result = result.filter(p => (p.category || t('inv.noCategory')) === selectedCategory)
        }

        // 3. Sorting
        result.sort((a, b) => {
            let valA: any = a[sortField]
            let valB: any = b[sortField]

            if (typeof valA === 'string') valA = valA.toLowerCase()
            if (typeof valB === 'string') valB = valB.toLowerCase()

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1
            return 0
        })

        return result
    }, [products, searchTerm, selectedCategory, sortField, sortOrder, t])

    // Render Helpers
    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortOrder('asc')
        }
    }

    // Virtualization for table mode
    const tableContainerRef = useRef<HTMLDivElement>(null)

    const rowVirtualizer = useVirtualizer({
        count: filteredAndSortedProducts.length,
        getScrollElement: () => tableContainerRef.current,
        estimateSize: () => 73, // Estimated row height in pixels
        overscan: 5, // Number of items to render outside visible area
    })

    return (
        <div className="space-y-6 pb-20">
            {/* HEADER & ACTIONS */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                        {t('inv.title')}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {t('inv.subtitle', { count: products.length })}
                    </p>
                </div>
                {section === 'products' && (
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsImportOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 border border-indigo-200 dark:border-gray-700 bg-indigo-50 dark:bg-gray-800 text-indigo-700 dark:text-gray-300 rounded-xl hover:bg-indigo-100 dark:hover:bg-gray-700 hover:border-indigo-300 hover:scale-105 active:scale-95 transition-all duration-200 font-medium"
                    >
                        <Upload className="w-4 h-4" />
                        {t('inv.import')}
                    </button>
                    <button
                        onClick={() => setIsFormOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all duration-200 font-medium shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
                    >
                        <Plus className="w-5 h-5" />
                        {t('inv.newProduct')}
                    </button>
                </div>
                )}
            </div>

            {/* SECTION TABS */}
            <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
                {([
                    { id: 'products', label: t('inv.section.products'), icon: Package },
                    { id: 'categories', label: t('inv.section.categories'), icon: Tags }
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

            {section === 'categories' ? (
                <Categories onProductsChanged={loadProducts} />
            ) : (
            <>
            {/* TOOLBAR (Search, Filters, View Toggle) */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md border border-gray-300 dark:border-gray-700 flex flex-col lg:flex-row gap-4 justify-between items-center sticky top-0 z-10 backdrop-blur-xl bg-opacity-90 dark:bg-opacity-90">
                {/* Search */}
                <div className="relative w-full lg:max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('inv.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200"
                    />
                </div>

                {/* Filters & Toggles */}
                <div className="flex items-center gap-4 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0">
                    {/* Category Selector - Adaptive */}
                    <div className="flex items-center gap-2 flex-1 lg:flex-none">
                        {categories.length <= 5 ? (
                            <div className="flex items-center gap-2 overflow-x-auto max-w-[200px] sm:max-w-none scrollbar-hide">
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap shrink-0 hover:scale-105 active:scale-95",
                                            selectedCategory === cat
                                                ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
                                                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                                        )}
                                    >
                                        {cat === 'all' ? t('inv.all') : cat}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="relative w-full lg:w-48">
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="w-full appearance-none bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 py-2 pl-4 pr-10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow cursor-pointer"
                                >
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>
                                            {cat === 'all' ? t('inv.allCategories') : cat}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                                    <ArrowUpDown className="w-4 h-4" />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-2 hidden lg:block" />

                    {/* View Toggle */}
                    <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                        <button
                            onClick={() => setInventoryViewMode('list')}
                            className={cn(
                                "p-2 rounded-md transition-all",
                                inventoryViewMode === 'list'
                                    ? "bg-white dark:bg-gray-800 text-primary shadow-sm"
                                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            )}
                            title={t('inv.listView')}
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setInventoryViewMode('grid')}
                            className={cn(
                                "p-2 rounded-md transition-all",
                                inventoryViewMode === 'grid'
                                    ? "bg-white dark:bg-gray-800 text-primary shadow-sm"
                                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            )}
                            title={t('inv.gridView')}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* CONTENT AREA */}
            <AnimatePresence mode="wait">
                {loading ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-6"
                    >
                        {inventoryViewMode === 'grid' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                                {Array.from({ length: 8 }).map((_, i) => (
                                    <ProductCardSkeleton key={i} />
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('inv.col.product')}</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">{t('inv.col.category')}</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('inv.col.price')}</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('inv.col.stock')}</th>
                                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('inv.col.actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {Array.from({ length: 6 }).map((_, i) => (
                                                <TableRowSkeleton key={i} columns={5} />
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </motion.div>
                ) : filteredAndSortedProducts.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-20"
                    >
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Package className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            {t('inv.empty')}
                        </h3>
                        <p className="text-gray-500 mt-2">
                            {t('inv.emptyDesc')}
                        </p>
                    </motion.div>
                ) : (
                    <>
                        {inventoryViewMode === 'grid' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                                {filteredAndSortedProducts.map((product) => (
                                    <ProductCard
                                        key={product.id}
                                        product={product}
                                        settings={settings}
                                        onEdit={() => handleEdit(product)}
                                        onDelete={() => handleDeleteClick(product.id!)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                                {/* Fixed Header - Outside scroll container */}
                                <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                                    <div className="grid grid-cols-[80px_1fr_150px_120px_120px_120px] gap-4 px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        <div className="flex items-center justify-center">{t('inv.col.image')}</div>
                                        <div
                                            className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors"
                                            onClick={() => toggleSort('name')}
                                        >
                                            {t('inv.col.product')}
                                            <ArrowUpDown className="w-3 h-3" />
                                        </div>
                                        <div className="hidden md:flex items-center">{t('inv.col.category')}</div>
                                        <div
                                            className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors"
                                            onClick={() => toggleSort('price')}
                                        >
                                            {t('inv.col.price')}
                                            <ArrowUpDown className="w-3 h-3" />
                                        </div>
                                        <div
                                            className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors"
                                            onClick={() => toggleSort('stock')}
                                        >
                                            {t('inv.col.stock')}
                                            <ArrowUpDown className="w-3 h-3" />
                                        </div>
                                        <div className="flex items-center justify-end">{t('inv.col.actions')}</div>
                                    </div>
                                </div>

                                {/* Scrollable Content - Fixed height */}
                                <div
                                    ref={tableContainerRef}
                                    className="overflow-auto"
                                    style={{ height: '550px' }}
                                >
                                    <div
                                        className="relative"
                                        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
                                    >
                                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                            const product = filteredAndSortedProducts[virtualRow.index]
                                            return (
                                                <ProductRow
                                                    key={product.id}
                                                    product={product}
                                                    settings={settings}
                                                    onEdit={() => handleEdit(product)}
                                                    onDelete={() => handleDeleteClick(product.id!)}
                                                    virtualStyle={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        width: '100%',
                                                        transform: `translateY(${virtualRow.start}px)`,
                                                    }}
                                                />
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </AnimatePresence>
            </>
            )}

            {/* MODALS */}
            {isFormOpen && (
                <ProductForm
                    product={editingProduct}
                    onClose={() => {
                        setIsFormOpen(false)
                        setEditingProduct(null)
                        loadProducts()
                    }}
                />
            )}

            {isImportOpen && (
                <ImportWizard
                    onClose={() => setIsImportOpen(false)}
                    onSuccess={() => {
                        loadProducts()
                        setIsImportOpen(false)
                    }}
                />
            )}

            <ConfirmDialog
                isOpen={confirmOpen}
                title={t('inv.deleteTitle')}
                description={t('inv.deleteDesc')}
                confirmText={t('inv.deleteConfirm')}
                variant="danger"
                onConfirm={confirmDelete}
                onCancel={() => setConfirmOpen(false)}
            />
        </div>
    )
}

// --- Subcomponents ---

function ProductCard({ product, settings, onEdit, onDelete }: { product: Product; settings?: any; onEdit: () => void; onDelete: () => void }) {
    const { t } = useTranslation()
    const isLowStock = product.stock <= (settings?.inventory?.lowStockThreshold ?? product.min_stock)

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-700 shadow-md hover:shadow-2xl hover:-translate-y-1 hover:border-gray-400 dark:hover:border-gray-600 transition-all duration-300 overflow-hidden"
        >
            {/* Image / Thumbnail */}
            <div className="relative w-full overflow-hidden">
                {product.image ? (
                    <LazyImage
                        src={getImageSrc(product.image)}
                        alt={product.name}
                        aspectRatio="aspect-video"
                        className="group-hover:scale-110 transition-transform duration-700"
                        fallback={
                            <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                            </div>
                        }
                    />
                ) : (
                    <div className="aspect-video w-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-300 dark:text-gray-600">
                        <Package className="w-12 h-12" />
                    </div>
                )}

                {/* Overlay actions on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3 backdrop-blur-[2px]">
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onEdit}
                        className="p-2.5 bg-white rounded-full text-gray-900 hover:bg-primary hover:text-white transition-colors shadow-lg"
                        title={t('common.edit')}
                    >
                        <Edit2 className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onDelete}
                        className="p-2.5 bg-white rounded-full text-red-600 hover:bg-red-500 hover:text-white transition-colors shadow-lg"
                        title={t('common.delete')}
                    >
                        <Trash2 className="w-4 h-4" />
                    </motion.button>
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {product.category || 'General'}
                        </span>
                        <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1" title={product.name}>
                            {product.name}
                        </h3>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-primary">
                            {settings?.currencySymbol || '$'}{product.price.toFixed(2)}
                        </span>
                    </div>

                    <div className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1",
                        isLowStock
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    )}>
                        {isLowStock ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                        {t('inv.unitsShort', { count: product.stock })}
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

function ProductRow({ product, settings, onEdit, onDelete, virtualStyle }: { product: Product; settings?: any; onEdit: () => void; onDelete: () => void; virtualStyle?: React.CSSProperties }) {
    const { t } = useTranslation()
    const isLowStock = product.stock <= (settings?.inventory?.lowStockThreshold ?? product.min_stock)

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-[80px_1fr_150px_120px_120px_120px] gap-4 px-6 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group items-center"
            style={virtualStyle}
        >
            {/* Image */}
            <div className="flex items-center justify-center">
                {product.image ? (
                    <div className="w-12 h-12 rounded-lg shrink-0 overflow-hidden border border-gray-200 dark:border-gray-600">
                        <LazyImage
                            src={getImageSrc(product.image)}
                            alt={product.name}
                            aspectRatio="aspect-square"
                            placeholderClassName="rounded-lg"
                            fallback={<Package className="w-5 h-5 text-gray-400" />}
                        />
                    </div>
                ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 border border-gray-200 dark:border-gray-600">
                        <Package className="w-5 h-5 text-gray-400" />
                    </div>
                )}
            </div>

            {/* Product Info */}
            <div className="min-w-0">
                <p className="font-medium text-gray-900 dark:text-white line-clamp-1">{product.name}</p>
                <p className="text-xs text-gray-500 font-mono">{product.code}</p>
            </div>

            {/* Category */}
            <div className="hidden md:block">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                    {product.category || t('inv.noCategory')}
                </span>
            </div>

            {/* Price */}
            <div>
                <p className="font-bold text-gray-900 dark:text-white">
                    {settings?.currencySymbol || '$'}{product.price.toFixed(2)}
                </p>
                {product.cost && (
                    <p className="text-xs text-gray-500">{t('inv.cost', { amount: `${settings?.currencySymbol || '$'}${product.cost.toFixed(2)}` })}</p>
                )}
            </div>

            {/* Stock */}
            <div>
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "w-2 h-2 rounded-full",
                        isLowStock ? "bg-red-500 animate-pulse" : "bg-green-500"
                    )} />
                    <span className={cn(
                        "text-sm font-medium",
                        isLowStock ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                    )}>
                        {product.stock} {unitLabel(product.unit)}
                    </span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={onEdit}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title={t('common.edit')}
                >
                    <Edit2 className="w-4 h-4" />
                </button>
                <button
                    onClick={onDelete}
                    className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title={t('common.delete')}
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    )
}
