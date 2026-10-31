import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
    Search,
    Plus,
    Minus,
    Trash2,
    ShoppingCart,
    CreditCard,
    Banknote,
    QrCode,
    Package,
    X,
    Check,
    User,
    Percent,
    Ticket as TicketIcon,
    ArrowUpDown,
    Camera,
    HandCoins,
    Landmark
} from 'lucide-react'
import { productService } from '@/services/productService'
import { saleService } from '@/services/saleService'
import { companyService } from '@/services/companyService'
import { pdfGenerator } from '@/services/pdfGenerator'
import { Product, CartItem, Sale, SaleItem } from '@/types/database'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { cn, getImageSrc } from '@/lib/utils'
import { useCartStore, type PaymentMethod } from '@/stores/cartStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { clientService, type Client } from '@/services/clientService'
import { LazyImage } from '@/components/ui/LazyImage'
import { useTranslation } from '@/i18n'

// Chip order in the bill section; each one shows only when enabled in Settings > Payment Methods
const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'card', 'transfer', 'other', 'cheque', 'credit']

export function Sales() {
    // Data State
    const { t } = useTranslation()
    const [settings] = useState(companyService.getSettings())
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('all')

    // Store Connection
    const {
        tabs,
        activeTabId,
        addTab,
        removeTab,
        setActiveTab,
        addItem,
        updateQuantity: updateStoreQuantity,
        removeItem,
        clearCart,
        setCustomerName,
        setCustomer,
        setDiscount,
        setPaymentMethod,
        updateTabName
    } = useCartStore()

    const { addNotification } = useNotificationStore()

    // Derived State from Store
    const activeTab = useMemo(() => tabs.find(tab => tab.id === activeTabId) || tabs[0], [tabs, activeTabId])
    const cart = activeTab.items

    // A ticket kept on a method that was switched off in Settings moves to the first enabled one
    const enabledMethods = useMemo(() => PAYMENT_METHODS.filter(method => settings.paymentMethods?.[method]), [settings.paymentMethods])
    useEffect(() => {
        if (enabledMethods.length > 0 && !enabledMethods.includes(activeTab.paymentMethod)) setPaymentMethod(enabledMethods[0])
    }, [enabledMethods, activeTab.paymentMethod, setPaymentMethod])

    // Auto-generated tab names ("Ticket 2", stored by the cart store) follow the UI language; custom names show as typed
    const tabLabel = (name: string) => {
        const match = /^(?:Ticket|Bill) (\d+)$/.exec(name)
        return match ? t('pos.tabName', { number: match[1] }) : name
    }

    // Checkout State
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
    const [receivedAmount, setReceivedAmount] = useState('')
    // Cheque details for the bill being checked out
    const [chequeNumber, setChequeNumber] = useState('')
    const [chequeBank, setChequeBank] = useState('')

    // Refs
    const searchInputRef = useRef<HTMLInputElement>(null)
    const receivedAmountInputRef = useRef<HTMLInputElement>(null)
    const processSaleRef = useRef<() => void>(() => { })

    // Client Autocomplete State
    const [clientSearchResults, setClientSearchResults] = useState<Client[]>([])
    const [showClientResults, setShowClientResults] = useState(false)
    const clientSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const clientContainerRef = useRef<HTMLDivElement>(null)

    // Credit info of the selected registered client
    const [clientCredit, setClientCredit] = useState<{ limit: number; balance: number } | null>(null)
    useEffect(() => {
        const clientId = activeTab.clientId
        setClientCredit(null)
        if (!clientId) return
        let stale = false
        Promise.all([clientService.getById(clientId), clientService.getCreditBalance(clientId)])
            .then(([client, balance]) => {
                if (!stale) setClientCredit({ limit: client?.credit_limit || 0, balance })
            })
            .catch(console.error)
        return () => { stale = true }
    }, [activeTab.clientId])

    // Handle click outside client results
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (clientContainerRef.current && !clientContainerRef.current.contains(event.target as Node)) {
                setShowClientResults(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleClientSearch = (term: string) => {
        setCustomerName(term)

        if (clientSearchTimeoutRef.current) clearTimeout(clientSearchTimeoutRef.current)

        if (term.length < 2) {
            setClientSearchResults([])
            setShowClientResults(false)
            return
        }

        clientSearchTimeoutRef.current = setTimeout(async () => {
            try {
                const results = await clientService.search(term)
                setClientSearchResults(results)
                setShowClientResults(true)
            } catch (err) {
                console.error(err)
            }
        }, 300) // Debounce 300ms
    }

    const selectClient = (client: Client) => {
        setCustomer(client.name, client.id ?? null)
        setShowClientResults(false)
        setClientSearchResults([])
    }



    // Ensure active tab on mount
    useEffect(() => {
        if (!activeTabId && tabs.length > 0) {
            setActiveTab(tabs[0].id)
        }
    }, [activeTabId, tabs, setActiveTab])

    // Focus checkout input when modal opens
    useEffect(() => {
        if (isCheckoutOpen) {
            setTimeout(() => receivedAmountInputRef.current?.focus(), 100)
        }
    }, [isCheckoutOpen])

    const handleCheckoutInitiate = useCallback(() => {
        if (cart.length === 0) return toast.warning(t('pos.emptyCart'))

        if (settings.requireCustomerName && !activeTab.customerName.trim()) {
            toast.error(t('pos.customerRequired'))
            return
        }

        if (!receivedAmount && activeTab.paymentMethod === 'cash') {
            setReceivedAmount('')
        }

        setIsCheckoutOpen(true)
    }, [cart, settings.requireCustomerName, activeTab.customerName, activeTab.paymentMethod, receivedAmount, t])

    const loadProducts = useCallback(async (): Promise<Product[]> => {
        try {
            const data = await productService.getAll()
            setProducts(data.filter(p => p.stock > 0 || settings.pos?.allowNegativeStock))
            return data
        } catch (error) {
            console.error('Error loading products:', error)
            toast.error(t('pos.loadError'))
            return []
        }
    }, [settings.pos?.allowNegativeStock, t])

    // Load Data
    useEffect(() => {
        loadProducts()
        setTimeout(() => searchInputRef.current?.focus(), 100)
    }, [loadProducts])

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F2') {
                e.preventDefault()
                searchInputRef.current?.focus()
            }
            if (e.key === 'Enter' && e.ctrlKey && !isCheckoutOpen) {
                e.preventDefault()
                handleCheckoutInitiate()
            }
            if (e.key === 'Enter' && isCheckoutOpen) {
                if (document.activeElement?.tagName !== 'BUTTON') {
                    e.preventDefault()
                    processSaleRef.current()
                }
            }
            if (e.key === 'Escape') {
                if (isCheckoutOpen) {
                    setIsCheckoutOpen(false)
                } else {
                    setSearchTerm('')
                    searchInputRef.current?.focus()
                }
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isCheckoutOpen, cart, activeTab, handleCheckoutInitiate])

    // Filter Logic
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const term = searchTerm.toLowerCase()
            const matchesSearch = p.name.toLowerCase().includes(term) ||
                p.code.toString().toLowerCase().includes(term) ||
                (p.category && p.category.toLowerCase().includes(term))
            const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory
            return matchesSearch && matchesCategory
        })
    }, [products, searchTerm, selectedCategory])

    const categories = useMemo(() => {
        const cats = new Set(products.map(p => p.category || t('pos.others')))
        return ['all', ...Array.from(cats)]
    }, [products, t])

    // Cart Actions (Wrapped)
    const handleAddToCart = (product: Product) => {
        const currentItem = cart.find(i => i.product.id === product.id)
        if (currentItem) {
            if (!settings.pos?.allowNegativeStock && currentItem.quantity >= product.stock) {
                toast.error(t('pos.insufficientStock', { count: product.stock }))
                return
            }
        } else {
            if (!settings.pos?.allowNegativeStock && product.stock <= 0) {
                toast.error(t('pos.insufficientStock', { count: product.stock }))
                return
            }
        }

        addItem(product, settings.pos?.allowNegativeStock)
        toast.success(t('pos.added', { name: product.name }), { position: 'bottom-center', duration: 1000 })

        if (searchTerm.length > 0) {
            setSearchTerm('')
            searchInputRef.current?.focus()
        }
    }

    const handleUpdateQuantity = (productId: number, delta: number) => {
        const item = cart.find(i => i.product.id === productId)
        if (!item) return

        const newQuantity = item.quantity + delta
        if (!settings.pos?.allowNegativeStock && newQuantity > item.product.stock) {
            toast.error(t('pos.maxStock'))
            return
        }

        updateStoreQuantity(productId, delta, settings.pos?.allowNegativeStock)
    }

    // Typed quantity: 0 removes the item; above available stock is capped unless negative stock is allowed
    const handleSetQuantity = (productId: number, quantity: number) => {
        const item = cart.find(i => i.product.id === productId)
        if (!item) return

        let target = Math.max(0, Math.floor(quantity))
        if (!settings.pos?.allowNegativeStock && target > item.product.stock) {
            toast.error(t('pos.insufficientStock', { count: item.product.stock }))
            target = item.product.stock
        }

        if (target !== item.quantity) {
            updateStoreQuantity(productId, target - item.quantity, settings.pos?.allowNegativeStock)
        }
    }

    // Totals Calculation
    const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
    const discountAmount = subtotal * (activeTab.discount / 100)
    const taxRate = settings.enableTax ? (settings.taxRate / 100) : 0
    const tax = (subtotal - discountAmount) * taxRate
    const total = subtotal - discountAmount + tax

    const amountReceivedNum = parseFloat(receivedAmount) || 0
    const change = Math.max(0, amountReceivedNum - total)
    const isPaymentSufficient = activeTab.paymentMethod !== 'cash' || amountReceivedNum >= total

    // Credit: only for a registered client, capped by credit limit minus outstanding balance
    const isCredit = activeTab.paymentMethod === 'credit'
    const isCheque = activeTab.paymentMethod === 'cheque'
    const chequeError = isCheque && !chequeNumber.trim() ? t('pos.chequeNumberRequired') : null
    const availableCredit = clientCredit ? Math.max(0, clientCredit.limit - clientCredit.balance) : 0
    const creditError = !isCredit ? null
        : !activeTab.clientId ? t('pos.creditNeedsClient')
            : !clientCredit ? null // still loading
                : clientCredit.limit <= 0 ? t('pos.creditNoLimit')
                    : total > availableCredit ? t('pos.creditExceeded', { amount: `${settings.currencySymbol}${availableCredit.toFixed(2)}` })
                        : null
    const canConfirmCredit = !isCredit || (!!clientCredit && !creditError)

    const processSale = useCallback(async () => {
        if (!isPaymentSufficient && activeTab.paymentMethod === 'cash') {
            toast.error(t('pos.insufficientAmount'))
            receivedAmountInputRef.current?.focus()
            return
        }
        if (isCredit && !canConfirmCredit) {
            if (creditError) toast.error(creditError)
            return
        }
        if (chequeError) {
            toast.error(chequeError)
            return
        }

        setLoading(true)
        try {
            const saleItems: SaleItem[] = cart.map(item => ({
                product_id: item.product.id!,
                product_code: item.product.code,
                product_name: item.product.name,
                quantity: item.quantity,
                unit_price: item.product.price,
                subtotal: item.product.price * item.quantity,
            }))

            const sale: Omit<Sale, 'id'> = {
                items: saleItems,
                subtotal,
                tax,
                discount: discountAmount,
                total,
                payment_method: activeTab.paymentMethod,
                cheque_number: isCheque ? chequeNumber.trim() : null,
                cheque_bank: isCheque ? chequeBank.trim() || null : null,
                customer_name: activeTab.customerName || undefined,
                client_id: activeTab.clientId ?? undefined,
                status: 'completed',
            }

            const newSale = await saleService.create(sale)

            toast.success(t('pos.saleCompleted'), {
                icon: <Check className="w-5 h-5 text-green-500" />,
                description: activeTab.paymentMethod === 'cash'
                    ? t('pos.changeDue', { amount: `${settings.currencySymbol}${change.toFixed(2)}` })
                    : t('pos.totalAmount', { amount: `${settings.currencySymbol}${total.toFixed(2)}` }),
                action: {
                    label: t('pos.printTicket'),
                    onClick: () => pdfGenerator.generateInvoice(newSale, settings)
                },
                duration: 8000
            })

            // Reset current tab but keep it open (or clear it)
            // Strategy: Clear cart of active tab
            // Capture items before clearing for notification check
            const soldItems = [...cart]
            clearCart()

            // Also reset UI local state
            setReceivedAmount('')
            setChequeNumber('')
            setChequeBank('')
            setIsCheckoutOpen(false)

            // Reload products and check for low stock on affected items
            const freshProducts = await loadProducts()

            // Check for low stock alerts
            soldItems.forEach(item => {
                const freshProduct = freshProducts.find(p => p.id === item.product.id)
                if (freshProduct && freshProduct.stock <= freshProduct.min_stock) {
                    addNotification({
                        title: t('pos.lowStockTitle'),
                        message: t('pos.lowStockMessage', { name: freshProduct.name, stock: freshProduct.stock }),
                        type: freshProduct.stock <= 0 ? 'error' : 'warning'
                    })
                }
            })

        } catch (error) {
            console.error(error)
            toast.error(t('pos.saleError'))
        } finally {
            setLoading(false)
        }
    }, [isPaymentSufficient, isCredit, canConfirmCredit, creditError, isCheque, chequeError, chequeNumber, chequeBank, activeTab.paymentMethod, activeTab.customerName, activeTab.clientId, cart, subtotal, tax, discountAmount, total, settings, change, clearCart, loadProducts, addNotification, t])

    // Update ref on render
    useEffect(() => {
        processSaleRef.current = processSale
    }, [activeTab, receivedAmount, processSaleRef, processSale]) // Update when tab state changes

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-6rem)] gap-4 pb-2">
            {/* LEFT: Catalog */}
            <div className="flex-1 flex flex-col gap-4 min-w-0">
                {/* Search & Categories */}
                <div className="flex flex-col gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md border border-gray-300 dark:border-gray-700">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder={t('pos.searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 text-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border-none rounded-xl focus:ring-2 focus:ring-primary shadow-inner placeholder:text-gray-400"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => { setSearchTerm(''); searchInputRef.current?.focus() }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
                            >
                                <X className="w-4 h-4 text-gray-500" />
                            </button>
                        )}
                    </div>

                    <div className="flex gap-2 w-full">
                        {categories.length <= 5 ? (
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide w-full">
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all shrink-0",
                                            selectedCategory === cat
                                                ? "bg-primary text-white shadow-md shadow-primary/25"
                                                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                                        )}
                                    >
                                        {cat === 'all' ? t('pos.all') : cat}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="relative w-full">
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="w-full appearance-none bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 py-3 pl-4 pr-10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow cursor-pointer"
                                    style={{ backgroundImage: 'none' }}
                                >
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>
                                            {cat === 'all' ? t('pos.allCategories') : cat}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                                    <ArrowUpDown className="w-4 h-4" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto pr-2">
                    {filteredProducts.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <Package className="w-16 h-16 mb-4 opacity-50" />
                            <p>{t('pos.noProducts')}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                            {filteredProducts.map(product => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    settings={settings}
                                    onClick={() => handleAddToCart(product)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT: Cart with Multi-Ticket */}
            <div className="w-full lg:w-[400px] flex flex-col bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-300 dark:border-gray-700 overflow-hidden flex-shrink-0 transition-all h-full">

                {/* Tickets Tabs Header */}
                <div className="flex bg-gray-900 items-end px-2 pt-2 gap-1 shrink-0 overflow-hidden">
                    {tabs.map(tab => (
                        <div
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex-1 flex items-center gap-2 px-2 py-2 rounded-t-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition-all min-w-0 max-w-[150px] select-none group relative",
                                activeTabId === tab.id
                                    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-t border-x border-gray-300 dark:border-gray-700 relative top-[1px] z-10"
                                    : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200 border border-transparent opacity-80"
                            )}
                            title={tabLabel(tab.name)}
                        >
                            <TicketIcon className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate flex-1 text-[10px] sm:text-xs">{tabLabel(tab.name)}</span>
                            {/* Close button: visible in active or group hover */}
                            {tabs.length > 1 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); removeTab(tab.id) }}
                                    className={cn(
                                        "p-0.5 rounded-full hover:bg-red-500/20 hover:text-red-500 transition-opacity shrink-0",
                                        activeTabId === tab.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                    )}
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    ))}

                    {/* New Tab Button */}
                    <button
                        onClick={() => {
                            if (tabs.length >= 5) {
                                toast.warning(t('pos.maxTickets'))
                                return
                            }
                            addTab()
                        }}
                        disabled={tabs.length >= 5}
                        className={cn(
                            "p-2 mb-1 ml-1 rounded-lg transition-colors shrink-0",
                            tabs.length >= 5
                                ? "text-gray-600 cursor-not-allowed"
                                : "text-gray-400 hover:text-white hover:bg-gray-700"
                        )}
                        title={tabs.length >= 5 ? t('pos.limitReached') : t('pos.newTicket')}
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>

                {/* Cart Active Tab Content */}
                <div className="flex flex-col flex-1 bg-white dark:bg-gray-800 relative z-0 overflow-hidden">
                    {/* Cart Header Info */}
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                        <div>
                            <input
                                type="text"
                                value={tabLabel(activeTab.name)}
                                onChange={(e) => updateTabName(activeTab.id, e.target.value)}
                                className="font-bold text-gray-900 dark:text-white bg-transparent border-none p-0 focus:ring-0 w-full truncate text-sm"
                            />
                            <p className="text-xs text-gray-500">{t('pos.productCount', { count: cart.length })}</p>
                        </div>
                        <button
                            onClick={clearCart}
                            className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        >
                            {t('pos.clear')}
                        </button>
                    </div>

                    {/* Cart Items Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50 dark:bg-gray-900/20 relative min-h-0 scrollbar-thin">
                        <AnimatePresence initial={false}>
                            {cart.map(item => (
                                <CartItemRow
                                    key={item.product.id}
                                    item={item}
                                    onUpdate={handleUpdateQuantity}
                                    onSetQuantity={handleSetQuantity}
                                    onRemove={removeItem}
                                    currencySymbol={settings.currencySymbol}
                                />
                            ))}
                        </AnimatePresence>

                        {cart.length === 0 && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 space-y-4 opacity-40 select-none pointer-events-none">
                                <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-2">
                                    <ShoppingCart className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                                </div>
                                <p className="font-medium text-sm">{t('pos.emptyCart')}</p>
                            </div>
                        )}
                    </div>

                    {/* Checkout Section */}
                    <div className="bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] z-20 shrink-0">
                        {/* Customer & Inputs Row */}
                        <div className="p-4 space-y-3">
                            <div className="flex gap-3">
                                <div className="relative flex-1 group" ref={clientContainerRef}>
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User className="w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        value={activeTab.customerName}
                                        onChange={(e) => handleClientSearch(e.target.value)}
                                        onFocus={() => activeTab.customerName.length >= 2 && setShowClientResults(true)}
                                        placeholder={t('pos.customerPlaceholder')}
                                        className={cn(
                                            "w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-400",
                                            settings.requireCustomerName && !activeTab.customerName && "border-red-300 ring-2 ring-red-50"
                                        )}
                                        autoComplete="off"
                                    />
                                    {/* Autocomplete results */}
                                    <AnimatePresence>
                                        {showClientResults && clientSearchResults.length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 5 }}
                                                className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 max-h-60 overflow-y-auto z-50 py-1"
                                            >
                                                {clientSearchResults.map((client) => (
                                                    <button
                                                        key={client.id}
                                                        onClick={() => selectClient(client)}
                                                        className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex flex-col border-b border-gray-50 dark:border-gray-700 last:border-0"
                                                    >
                                                        <span className="font-bold text-sm text-gray-800 dark:text-gray-200">{client.name}</span>
                                                        <div className="flex gap-2 text-xs text-gray-500">
                                                            {client.tax_id && <span>{t('pos.nit', { id: client.tax_id })}</span>}
                                                            {client.phone && <span>• {client.phone}</span>}
                                                        </div>
                                                    </button>
                                                ))}
                                                <div className="bg-gray-50 dark:bg-gray-900/50 p-2 text-center text-xs text-gray-400">
                                                    {t('pos.matches', { count: clientSearchResults.length })}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {settings.enableDiscounts && (
                                    <div className="relative w-24 group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Percent className="w-3.5 h-3.5 text-gray-400 group-focus-within:text-red-500 transition-colors" />
                                        </div>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={activeTab.discount > 0 ? activeTab.discount : ''}
                                            onChange={(e) => setDiscount(Math.max(0, Math.min(100, Number(e.target.value))))}
                                            placeholder="0%"
                                            className="w-full pl-8 pr-2 py-2.5 text-sm font-semibold text-center rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all placeholder:text-gray-400"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Method Selection */}
                            <div className="flex gap-2 justify-between bg-gray-50 dark:bg-gray-900/30 p-1.5 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                {settings.paymentMethods?.cash && (
                                    <PaymentChip active={activeTab.paymentMethod === 'cash'} onClick={() => setPaymentMethod('cash')} icon={Banknote} label={t('payment.cash')} />
                                )}
                                {settings.paymentMethods?.card && (
                                    <PaymentChip active={activeTab.paymentMethod === 'card'} onClick={() => setPaymentMethod('card')} icon={CreditCard} label={t('payment.card')} />
                                )}
                                {settings.paymentMethods?.transfer && (
                                    <PaymentChip active={activeTab.paymentMethod === 'transfer'} onClick={() => setPaymentMethod('transfer')} icon={QrCode} label={t('pos.transferShort')} />
                                )}
                                {settings.paymentMethods?.other && (
                                    <PaymentChip active={activeTab.paymentMethod === 'other'} onClick={() => setPaymentMethod('other')} icon={Package} label={t('payment.other')} />
                                )}
                                {settings.paymentMethods?.cheque && (
                                    <PaymentChip active={isCheque} onClick={() => setPaymentMethod('cheque')} icon={Landmark} label={t('payment.cheque')} />
                                )}
                                {settings.paymentMethods?.credit && (
                                    <PaymentChip
                                        active={isCredit}
                                        onClick={() => setPaymentMethod('credit')}
                                        icon={HandCoins}
                                        label={t('payment.credit')}
                                        disabled={!activeTab.clientId}
                                        title={!activeTab.clientId ? t('pos.creditNeedsClient') : undefined}
                                    />
                                )}
                            </div>
                            {isCredit && clientCredit && (
                                <p className={cn("text-xs font-medium px-1", creditError ? "text-red-500" : "text-gray-500 dark:text-gray-400")}>
                                    {creditError ?? t('pos.creditAvailable', { amount: `${settings.currencySymbol}${availableCredit.toFixed(2)}` })}
                                </p>
                            )}
                        </div>

                        {/* Totals & Action */}
                        <div className="p-5 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 space-y-4">
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">{t('pos.subtotal')}</span>
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{settings.currencySymbol}{subtotal.toFixed(2)}</span>
                                </div>
                                {activeTab.discount > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-red-500 flex items-center gap-1"><Percent className="w-3 h-3" /> {t('pos.discount')}</span>
                                        <span className="font-medium text-red-500">-{settings.currencySymbol}{discountAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                {settings.enableTax && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">{t('pos.tax', { rate: settings.taxRate })}</span>
                                        <span className="font-medium text-gray-700 dark:text-gray-300">{settings.currencySymbol}{tax.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-end pt-2 mt-1 border-t border-gray-200 dark:border-gray-700/50">
                                    <span className="text-base font-bold text-gray-900 dark:text-white">{t('pos.totalDue')}</span>
                                    <span className="text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-none">
                                        <span className="text-lg text-gray-400 font-normal mr-1">{settings.currencySymbol}</span>
                                        {total.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={handleCheckoutInitiate}
                                disabled={loading || cart.length === 0}
                                className="w-full relative overflow-hidden py-4 bg-gradient-to-br from-indigo-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:shadow-none transition-all active:scale-[0.98] group"
                            >
                                <div className="relative z-10 flex items-center justify-center gap-2">
                                    {loading ? (
                                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <span>{t('pos.charge')}</span>
                                            <span className="hidden sm:inline-block px-2 py-0.5 bg-white/20 rounded-md text-xs font-medium tracking-wide opacity-80 group-hover:opacity-100 transition-opacity">
                                                Ctrl + Enter
                                            </span>
                                        </>
                                    )}
                                </div>
                                <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent z-0" style={{ transform: 'skewX(-20deg)' }} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* CHECKOUT MODAL - Updated to use store values implicitly via closure, but safe since modal is conditional */}
            <AnimatePresence>
                {isCheckoutOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-6 bg-gray-900 text-white flex justify-between items-center shrink-0">
                                <div>
                                    <h2 className="text-xl font-bold">{t('pos.confirmSale')}</h2>
                                    <p className="text-sm text-gray-400">{t('pos.finalSummary')}</p>
                                </div>
                                <button onClick={() => setIsCheckoutOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-8 space-y-8 flex-1 overflow-y-auto">
                                <div className="text-center">
                                    <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">{t('pos.totalDue')}</p>
                                    <div className="text-5xl font-black text-gray-900 dark:text-white tracking-tight">
                                        {settings.currencySymbol}{total.toFixed(2)}
                                    </div>
                                </div>

                                {activeTab.paymentMethod === 'cash' ? (
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-600 dark:text-gray-300 ml-1">{t('pos.cashReceived')}</label>
                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xl group-focus-within:text-primary transition-colors">
                                                    {settings.currencySymbol}
                                                </div>
                                                <input
                                                    ref={receivedAmountInputRef}
                                                    type="number"
                                                    value={receivedAmount}
                                                    onChange={(e) => setReceivedAmount(e.target.value)}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') processSale() }}
                                                    className="w-full pl-10 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-2xl text-2xl font-bold text-gray-900 dark:text-white focus:border-primary focus:ring-0 transition-all shadow-sm"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div className="flex gap-2 flex-wrap justify-center">
                                                {[total, Math.ceil(total / 10) * 10, Math.ceil(total / 50) * 50, Math.ceil(total / 100) * 100].filter((v, i, a) => a.indexOf(v) === i && v >= total).map((amt) => (
                                                    <button
                                                        key={amt}
                                                        onClick={() => setReceivedAmount(amt.toString())}
                                                        className="px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full text-xs font-bold text-gray-600 dark:text-gray-300 transition-colors"
                                                    >
                                                        {settings.currencySymbol}{amt}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className={cn(
                                            "p-4 rounded-xl border flex justify-between items-center transition-all",
                                            isPaymentSufficient
                                                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
                                                : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
                                        )}>
                                            <span className="font-bold">{t('pos.yourChange')}</span>
                                            <span className="text-2xl font-black">{settings.currencySymbol}{change.toFixed(2)}</span>
                                        </div>
                                    </div>
                                ) : isCredit ? (
                                    <div className="space-y-3">
                                        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">{t('pos.creditLimit')}</span>
                                                <span className="font-bold text-gray-900 dark:text-white">{settings.currencySymbol}{(clientCredit?.limit ?? 0).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">{t('pos.creditBalance')}</span>
                                                <span className="font-bold text-gray-900 dark:text-white">{settings.currencySymbol}{(clientCredit?.balance ?? 0).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                                                <span className="text-gray-500">{t('pos.creditAfterSale')}</span>
                                                <span className={cn("font-black", creditError ? "text-red-600" : "text-green-600")}>
                                                    {settings.currencySymbol}{(availableCredit - total).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                        <p className={cn("text-xs text-center font-medium", creditError ? "text-red-500" : "text-gray-500")}>
                                            {creditError ?? t('pos.creditOnAccount', { name: activeTab.customerName })}
                                        </p>
                                    </div>
                                ) : isCheque ? (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label htmlFor="cheque-number" className="text-sm font-bold text-gray-600 dark:text-gray-300 ml-1">{t('pos.chequeNumber')}</label>
                                            <input
                                                id="cheque-number"
                                                type="text"
                                                autoFocus
                                                value={chequeNumber}
                                                onChange={(e) => setChequeNumber(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') processSale() }}
                                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-white focus:border-primary focus:ring-0 transition-all shadow-sm text-lg font-bold"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label htmlFor="cheque-bank" className="text-sm font-bold text-gray-600 dark:text-gray-300 ml-1">{t('pos.chequeBank')}</label>
                                            <input
                                                id="cheque-bank"
                                                type="text"
                                                value={chequeBank}
                                                onChange={(e) => setChequeBank(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') processSale() }}
                                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-white focus:border-primary focus:ring-0 transition-all shadow-sm text-base font-medium"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-gray-500 font-medium bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                                        <p>{t('pos.payWith', { method: activeTab.paymentMethod === 'card' ? t('payment.card') : activeTab.paymentMethod === 'transfer' ? t('payment.transfer') : t('pos.otherMethod') })}</p>
                                        <p className="text-xs mt-1">{t('pos.confirmTransaction')}</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 flex gap-4 shrink-0">
                                <button onClick={() => setIsCheckoutOpen(false)} className="flex-1 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                    {t('common.cancel')}
                                </button>
                                <button
                                    onClick={processSale}
                                    disabled={loading || (activeTab.paymentMethod === 'cash' && !isPaymentSufficient) || !canConfirmCredit || !!chequeError}
                                    className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                                >
                                    {loading ? t('pos.processing') : t('pos.confirmAndFinish')}
                                    {!loading && <Check className="w-5 h-5" />}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}

// --- Subcomponents ---

function ProductCard({ product, settings, onClick }: { product: Product; settings?: { currencySymbol: string }; onClick: () => void }) {
    return (
        <motion.div
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className="group bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-300 dark:border-gray-700 shadow-md hover:shadow-lg hover:border-primary/50 cursor-pointer transition-all flex flex-col h-full"
        >
            <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg mb-3 overflow-hidden relative">
                {product.image ? (
                    <LazyImage
                        src={getImageSrc(product.image) || ""}
                        alt={product.name}
                        aspectRatio="aspect-square"
                        className="w-full h-full object-cover"
                        fallback={<NoImagePlaceholder iconClassName="w-10 h-10" />}
                    />
                ) : (
                    <NoImagePlaceholder iconClassName="w-10 h-10" />
                )}
                <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-md z-20">
                    {product.stock}
                </div>
            </div>
            <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2 leading-tight mb-1">
                    {product.name}
                </h3>
                <p className="text-xs text-gray-500 line-clamp-1">{product.code}</p>
            </div>
            <div className="mt-2 text-primary font-bold">
                {settings?.currencySymbol || '$'}{product.price.toFixed(2)}
            </div>
        </motion.div>
    )
}

function CartItemRow({ item, onUpdate, onSetQuantity, onRemove, currencySymbol }: { item: CartItem; onUpdate: (id: number, delta: number) => void; onSetQuantity: (id: number, quantity: number) => void; onRemove: (id: number) => void; currencySymbol: string }) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex gap-3 items-center bg-gray-50 dark:bg-gray-700/30 p-2 rounded-xl group"
        >
            <div className="w-12 h-12 bg-white dark:bg-gray-700 rounded-lg shrink-0 overflow-hidden border border-gray-100 dark:border-gray-600">
                {item.product.image ? (
                    <LazyImage
                        src={getImageSrc(item.product.image) || ""}
                        alt={item.product.name}
                        aspectRatio="aspect-square"
                        className="w-full h-full object-cover"
                        fallback={<NoImagePlaceholder iconClassName="w-5 h-5" />}
                    />
                ) : (
                    <NoImagePlaceholder iconClassName="w-5 h-5" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">{item.product.name}</h4>
                <div className="text-xs text-gray-500">{currencySymbol}{item.product.price.toFixed(2)} x {item.quantity}</div>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={() => onUpdate(item.product.id!, -1)} className="w-7 h-7 flex items-center justify-center bg-white dark:bg-gray-700 rounded-full shadow-sm hover:bg-gray-100 border border-gray-200 dark:border-gray-600">
                    <Minus className="w-3 h-3" />
                </button>
                <QuantityInput value={item.quantity} onCommit={(quantity) => onSetQuantity(item.product.id!, quantity)} />
                <button onClick={() => onUpdate(item.product.id!, 1)} className="w-7 h-7 flex items-center justify-center bg-white dark:bg-gray-700 rounded-full shadow-sm hover:bg-gray-100 border border-gray-200 dark:border-gray-600">
                    <Plus className="w-3 h-3" />
                </button>
            </div>
            <div className="text-right min-w-[60px]">
                <div className="font-bold text-sm text-gray-900 dark:text-white">
                    {currencySymbol}{(item.product.price * item.quantity).toFixed(2)}
                </div>
                <button onClick={() => onRemove(item.product.id!)} className="p-1 text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                    <Trash2 className="w-3 h-3" />
                </button>
            </div>
        </motion.div>
    )
}

// Editable cart quantity: applied on Enter or blur, Escape restores the current value
function QuantityInput({ value, onCommit }: { value: number; onCommit: (quantity: number) => void }) {
    const [draft, setDraft] = useState(String(value))
    const cancelRef = useRef(false)

    useEffect(() => {
        setDraft(String(value))
    }, [value])

    const commit = () => {
        if (cancelRef.current) {
            cancelRef.current = false
            setDraft(String(value))
            return
        }
        const quantity = parseInt(draft, 10)
        if (!Number.isNaN(quantity) && quantity !== value) onCommit(quantity)
        // Show the stored value again; if it changed, the effect above updates it
        setDraft(String(value))
    }

    return (
        <input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={(e) => e.target.select()}
            onBlur={commit}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.preventDefault()
                    e.currentTarget.blur()
                }
                if (e.key === 'Escape') {
                    cancelRef.current = true
                    e.currentTarget.blur()
                }
            }}
            className="w-10 h-7 font-semibold text-sm text-center rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
    )
}

// Default product image: shown when a product has no image or it fails to load
function NoImagePlaceholder({ iconClassName }: { iconClassName?: string }) {
    return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-300 dark:text-gray-500">
            <Camera className={iconClassName} strokeWidth={1.5} />
        </div>
    )
}

interface PaymentChipProps {
    active: boolean
    onClick: () => void
    icon: React.ElementType
    label: string
    disabled?: boolean
    title?: string
}

function PaymentChip({ active, onClick, icon: Icon, label, disabled, title }: PaymentChipProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={cn(
                "flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all duration-200 border-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent",
                active
                    ? "bg-white dark:bg-gray-800 border-indigo-500 shadow-sm transform scale-105 z-10"
                    : "border-transparent hover:bg-white/50 dark:hover:bg-gray-800/50 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            )}
        >
            <Icon className={cn("w-5 h-5 mb-1 transition-colors", active ? "text-indigo-500" : "text-current")} />
            <span className={cn("text-[10px] font-bold uppercase tracking-wide", active ? "text-indigo-600 dark:text-indigo-400" : "text-current")}>{label}</span>
        </button>
    )
}
