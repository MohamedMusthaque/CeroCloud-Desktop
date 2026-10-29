import { useState, useEffect, useRef } from 'react'
import { Search, Package, ShoppingCart, FileText, TrendingUp, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { productService } from '@/services/productService'
import { saleService } from '@/services/saleService'
import { Product, Sale } from '@/types/database'
import { useTranslation } from '@/i18n'

type SearchResult = {
    id: string
    type: 'product' | 'sale' | 'report'
    title: string
    subtitle: string
    icon: React.ElementType
    action: () => void
}

export function GlobalSearch() {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SearchResult[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [products, setProducts] = useState<Product[]>([])
    const [sales, setSales] = useState<Sale[]>([])
    const navigate = useNavigate()
    const { t, locale } = useTranslation()
    const searchRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        loadData()
    }, [])

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const loadData = async () => {
        const [productsData, salesData] = await Promise.all([
            productService.getAll(),
            saleService.getAll()
        ])
        setProducts(productsData)
        setSales(salesData)
    }

    useEffect(() => {
        if (query.trim().length < 2) {
            setResults([])
            return
        }

        const searchResults: SearchResult[] = []
        const lowerQuery = query.toLowerCase()

        // Search products
        products
            .filter(p =>
                p.name.toLowerCase().includes(lowerQuery) ||
                p.code.toLowerCase().includes(lowerQuery) ||
                p.category?.toLowerCase().includes(lowerQuery)
            )
            .slice(0, 5)
            .forEach(product => {
                searchResults.push({
                    id: `product-${product.id}`,
                    type: 'product',
                    title: product.name,
                    subtitle: t('search.productSubtitle', { code: product.code, stock: product.stock, price: `$${product.price}` }),
                    icon: Package,
                    action: () => {
                        navigate('/inventory')
                        setIsOpen(false)
                        setQuery('')
                    }
                })
            })

        // Search sales
        sales
            .filter(s =>
                s.id?.toString().includes(query) ||
                s.customer_name?.toLowerCase().includes(lowerQuery)
            )
            .slice(0, 5)
            .forEach(sale => {
                searchResults.push({
                    id: `sale-${sale.id}`,
                    type: 'sale',
                    title: t('search.saleTitle', { id: sale.id ?? '' }),
                    subtitle: `${sale.customer_name || t('common.walkInCustomer')} · $${sale.total} · ${new Date(sale.created_at!).toLocaleDateString(locale)}`,
                    icon: ShoppingCart,
                    action: () => {
                        navigate('/sales')
                        setIsOpen(false)
                        setQuery('')
                    }
                })
            })

        // Static shortcuts
        if ('reportes'.includes(lowerQuery) || 'reports'.includes(lowerQuery)) {
            searchResults.push({
                id: 'reports',
                type: 'report',
                title: t('search.reportsTitle'),
                subtitle: t('search.reportsSubtitle'),
                icon: FileText,
                action: () => {
                    navigate('/reports')
                    setIsOpen(false)
                    setQuery('')
                }
            })
        }

        if ('inventario'.includes(lowerQuery) || 'inventory'.includes(lowerQuery)) {
            searchResults.push({
                id: 'inventory',
                type: 'product',
                title: t('search.inventoryTitle'),
                subtitle: t('search.inventorySubtitle'),
                icon: Package,
                action: () => {
                    navigate('/inventory')
                    setIsOpen(false)
                    setQuery('')
                }
            })
        }

        if ('ventas'.includes(lowerQuery) || 'sales'.includes(lowerQuery)) {
            searchResults.push({
                id: 'sales',
                type: 'sale',
                title: t('search.salesTitle'),
                subtitle: t('search.salesSubtitle'),
                icon: TrendingUp,
                action: () => {
                    navigate('/sales')
                    setIsOpen(false)
                    setQuery('')
                }
            })
        }

        setResults(searchResults)
    }, [query, products, sales, navigate, t, locale])

    const handleResultClick = (result: SearchResult) => {
        result.action()
    }

    const getIconColor = (type: string) => {
        switch (type) {
            case 'product': return 'text-teal-500 bg-teal-50 dark:bg-teal-900/20'
            case 'sale': return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20'
            case 'report': return 'text-purple-500 bg-purple-50 dark:bg-purple-900/20'
            default: return 'text-gray-500 bg-gray-50 dark:bg-gray-900/20'
        }
    }

    return (
        <div ref={searchRef} className="relative flex-1 max-w-xl">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder={t('search.placeholder')}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value)
                        setIsOpen(true)
                    }}
                    onFocus={() => query.length >= 2 && setIsOpen(true)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
                {query && (
                    <button
                        onClick={() => {
                            setQuery('')
                            setResults([])
                            setIsOpen(false)
                        }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Results Dropdown */}
            {isOpen && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 space-y-1">
                        {results.map((result) => {
                            const Icon = result.icon
                            return (
                                <button
                                    key={result.id}
                                    onClick={() => handleResultClick(result)}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left group"
                                >
                                    <div className={`p-2 rounded-lg ${getIconColor(result.type)} group-hover:scale-110 transition-transform`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 dark:text-white truncate">
                                            {result.title}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                            {result.subtitle}
                                        </p>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}

            {isOpen && query.length >= 2 && results.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-8 text-center z-50">
                    <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                        {t('search.noResultsFor')} "<span className="font-medium">{query}</span>"
                    </p>
                </div>
            )}
        </div>
    )
}
