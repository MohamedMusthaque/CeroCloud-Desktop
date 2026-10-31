import { useState, useEffect, useMemo } from 'react'
import {
    Plus, Search, Edit2, Trash2, Users, Mail, Phone,
    MapPin, LayoutGrid, List as ListIcon, History,
    CreditCard, FileText
} from 'lucide-react'
import { clientService, type Client } from '@/services/clientService'
import { motion, AnimatePresence } from 'framer-motion'
import { ClientForm } from './ClientForm'
import { ClientHistoryModal } from './ClientHistoryModal'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ClearFiltersButton } from '@/components/ui/ClearFiltersButton'
import { useTranslation, t as translateNow } from '@/i18n'
import { companyService } from '@/services/companyService'

export function Clients() {
    const { t } = useTranslation()
    const [clients, setClients] = useState<Client[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(true)
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

    // Modals state
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [selectedClient, setSelectedClient] = useState<Client | null>(null)
    const [isHistoryOpen, setIsHistoryOpen] = useState(false)
    const [clientForHistory, setClientForHistory] = useState<Client | null>(null)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [clientToDelete, setClientToDelete] = useState<number | null>(null)

    const loadData = async () => {
        try {
            setLoading(true)
            const data = await clientService.getAll()
            setClients(data)
        } catch (error) {
            console.error('Error fetching clients:', error)
            // Non-reactive translate keeps the load function free of hook dependencies
            toast.error(translateNow('cli.loadError'))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const filteredClients = useMemo(() => {
        return clients.filter(c =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.tax_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.phone?.includes(searchTerm)
        )
    }, [clients, searchTerm])

    const handleDeleteClick = (id: number) => {
        setClientToDelete(id)
        setConfirmOpen(true)
    }

    const confirmDelete = async () => {
        if (clientToDelete) {
            try {
                await clientService.delete(clientToDelete)
                setClients(prev => prev.filter(c => c.id !== clientToDelete))
                toast.success(t('cli.deleted'))
            } catch (error) {
                console.error(error)
                toast.error(t('cli.deleteError'))
            } finally {
                setConfirmOpen(false)
                setClientToDelete(null)
            }
        }
    }

    // Stats
    const totalClients = clients.length
    const withTaxId = clients.filter(c => c.tax_id).length
    const withEmail = clients.filter(c => c.email).length
    const withCredit = clients.filter(c => (c.credit_limit ?? 0) > 0).length

    return (
        <div className="space-y-6 pb-20 p-2">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                        {t('cli.title')}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {t('cli.subtitle')}
                    </p>
                </div>
                <button
                    onClick={() => { setSelectedClient(null); setIsFormOpen(true) }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl transition-all font-semibold shadow-lg shadow-cyan-500/25 active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    {t('cli.new')}
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    label={t('cli.statTotal')}
                    value={totalClients}
                    icon={Users}
                    color="bg-cyan-500"
                />
                <StatCard
                    label={t('cli.statBillable')}
                    value={withTaxId}
                    icon={FileText}
                    color="bg-blue-500"
                />
                <StatCard
                    label={t('cli.statContact')}
                    value={withEmail}
                    icon={Mail}
                    color="bg-indigo-500"
                />
                <StatCard
                    label={t('cli.statCredit')}
                    value={withCredit}
                    icon={CreditCard}
                    color="bg-emerald-500"
                />
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-gray-800 p-2 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('cli.searchPlaceholder')}
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
                                ? "bg-gray-100 dark:bg-gray-700 text-cyan-600"
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
                                ? "bg-gray-100 dark:bg-gray-700 text-cyan-600"
                                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        )}
                    >
                        <ListIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Content Content */}
            <AnimatePresence mode="wait">
                {loading ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center h-64 gap-4"
                    >
                        <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                        <p className="text-gray-500">{t('cli.loading')}</p>
                    </motion.div>
                ) : filteredClients.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('cli.noResults')}</h3>
                        <p className="text-gray-500 mt-2">{t('cli.noResultsDesc')}</p>
                    </div>
                ) : (
                    <div className={cn(
                        "grid gap-4",
                        viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
                    )}>
                        {filteredClients.map((client) => (
                            <ClientCard
                                key={client.id}
                                client={client}
                                viewMode={viewMode}
                                onEdit={() => { setSelectedClient(client); setIsFormOpen(true) }}
                                onDelete={() => handleDeleteClick(client.id!)}
                                onHistory={() => { setClientForHistory(client); setIsHistoryOpen(true) }}
                            />
                        ))}
                    </div>
                )}
            </AnimatePresence>

            {/* Modals */}
            <ClientForm
                isOpen={isFormOpen}
                onClose={() => { setIsFormOpen(false); setSelectedClient(null) }}
                onSuccess={loadData}
                clientToEdit={selectedClient}
            />

            <ClientHistoryModal
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                client={clientForHistory}
            />

            <ConfirmDialog
                isOpen={confirmOpen}
                title={t('cli.deleteTitle')}
                description={t('cli.deleteDesc')}
                confirmText={t('cli.deleteConfirm')}
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

interface ClientCardProps {
    client: Client
    viewMode: 'grid' | 'list'
    onEdit: () => void
    onDelete: () => void
    onHistory: () => void
}

function ClientCard({ client, viewMode, onEdit, onDelete, onHistory }: ClientCardProps) {
    const { t } = useTranslation()
    const { currencySymbol } = companyService.getSettings()
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
                    "shrink-0 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg shadow-cyan-500/20",
                    "bg-gradient-to-br from-cyan-400 to-blue-600",
                    viewMode === 'list' ? "w-12 h-12 text-lg" : "w-16 h-16 text-3xl"
                )}>
                    {client.name ? client.name.charAt(0).toUpperCase() : <Users className="w-6 h-6" />}
                </div>

                {/* Main information */}
                <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex justify-between items-start">
                        <h3 className="font-bold text-gray-900 dark:text-white text-lg truncate pr-2 leading-tight">
                            {client.name}
                        </h3>
                        {/* Quick actions menu (grid only) */}
                        {viewMode === 'grid' && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity -mr-2 -mt-1">
                                <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 rounded-lg transition-colors">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                        {client.tax_id && (
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700/50 px-2 py-0.5 rounded-md w-fit">
                                <FileText className="w-3 h-3" />
                                {client.tax_id}
                            </p>
                        )}
                        {(client.credit_limit ?? 0) > 0 && (
                            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-md w-fit">
                                <CreditCard className="w-3 h-3" />
                                {t('cli.creditLimit', { amount: `${currencySymbol}${client.credit_limit!.toFixed(2)}` })}
                            </p>
                        )}
                    </div>

                    {/* Compact contact details */}
                    <div className="flex flex-wrap gap-y-1 gap-x-3 text-xs text-gray-500 pt-1">
                        {client.phone && (
                            <a href={`tel:${client.phone}`} className="flex items-center gap-1 hover:text-cyan-600 transition-colors">
                                <Phone className="w-3 h-3" />
                                {client.phone}
                            </a>
                        )}
                        {client.email && (
                            <a href={`mailto:${client.email}`} className="flex items-center gap-1 hover:text-cyan-600 transition-colors">
                                <Mail className="w-3 h-3" />
                                <span className="truncate max-w-[120px]">{client.email}</span>
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer with the main action */}
            {viewMode === 'grid' && (
                <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
                    <button
                        onClick={onHistory}
                        className="group/btn flex items-center gap-2 px-3 py-1.5 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 rounded-lg text-xs font-bold hover:bg-cyan-100 dark:hover:bg-cyan-500/20 transition-all"
                    >
                        <History className="w-3.5 h-3.5 transition-transform group-hover/btn:-rotate-180 duration-500" />
                        <span>{t('cli.history')}</span>
                    </button>

                    <div className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                        <MapPin className="w-3 h-3" />
                        {client.address ? t('cli.withAddress') : t('cli.withoutAddress')}
                    </div>
                </div>
            )}

            {/* Actions for list mode */}
            {viewMode === 'list' && (
                <div className="flex items-center gap-2 ml-4 border-l border-gray-100 dark:border-gray-700 pl-4">
                    <button
                        onClick={onHistory}
                        className="p-2 text-gray-400 hover:text-cyan-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        title={t('cli.viewHistory')}
                    >
                        <History className="w-4 h-4" />
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
