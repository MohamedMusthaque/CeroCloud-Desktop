import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ListOrdered, PackagePlus } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { cn, formatCurrency } from '@/lib/utils'
import type { Client } from '@/types/database'
import type { ViewMode } from '@/components/ui/ViewModeToggle'

// A client seen from the purchasing side: goods bought from them on GRNs, and what they owe from credit sales
export interface ClientAccountRow {
    client: Client
    // Completed GRNs only
    grnCount: number
    bought: number
    lastGrn: string | null
    // Outstanding credit sales
    owes: number
}

interface ClientAccountsListProps {
    rows: ClientAccountRow[]
    viewMode: ViewMode
    formatDay: (day: string) => string
    // The client's ledger on the Accounts page
    canSeeTransactions: boolean
    onNewGrn: (clientId: number) => void
}

const transactionsButton = "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors whitespace-nowrap"
const grnButton = "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-primary hover:bg-primary/10 transition-colors whitespace-nowrap"

// Client Accounts tab on the Purchases page, as a table or as cards
export function ClientAccountsList({ rows, viewMode, formatDay, canSeeTransactions, onNewGrn }: ClientAccountsListProps) {
    const { t } = useTranslation()

    const owesLabel = (owes: number) => owes > 0
        ? <span className="font-bold text-blue-600 dark:text-blue-400">{t('pur.cacc.owesAmount', { amount: formatCurrency(owes) })}</span>
        : <span className="font-bold text-green-600 dark:text-green-400">{t('pur.acc.settled')}</span>

    const name = (client: Client) => (
        <Link to={`/clients/${client.id}`} className="font-bold text-gray-900 dark:text-white hover:text-primary hover:underline truncate" title={client.name}>
            {client.name}
        </Link>
    )

    const actions = (client: Client, card?: boolean) => (
        <>
            {canSeeTransactions && (
                <Link
                    to={`/accounts/client/${client.id}`}
                    className={cn(transactionsButton, card && "py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600")}
                    title={t('stmt.openHint')}
                >
                    <ListOrdered className={card ? "w-4 h-4" : "w-3.5 h-3.5"} />
                    {t('stmt.open')}
                </Link>
            )}
            <button onClick={() => onNewGrn(client.id!)} className={cn(grnButton, card && "py-2 bg-primary/10 hover:bg-primary/20")}>
                <PackagePlus className={card ? "w-4 h-4" : "w-3.5 h-3.5"} />
                {t('pur.newGrn')}
            </button>
        </>
    )

    if (viewMode === 'grid') {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {rows.map(row => (
                    <motion.div
                        key={row.client.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-700 shadow-md hover:shadow-xl transition-all p-5 flex flex-col"
                    >
                        {name(row.client)}
                        {row.client.phone && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{row.client.phone}</p>}

                        <div className="mt-3 flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('pur.cacc.bought')}</p>
                            <p className="text-xl font-black text-gray-900 dark:text-white break-words">{formatCurrency(row.bought)}</p>
                            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 mt-3">
                                <div className="min-w-0">
                                    <dt className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{t('pur.cacc.grns')}</dt>
                                    <dd className="text-sm font-semibold text-gray-900 dark:text-white">{row.grnCount}</dd>
                                </div>
                                <div className="min-w-0">
                                    <dt className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{t('grnView.last')}</dt>
                                    <dd className="text-sm font-semibold text-gray-900 dark:text-white">{row.lastGrn ? formatDay(row.lastGrn) : '-'}</dd>
                                </div>
                                <div className="min-w-0 col-span-2">
                                    <dt className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{t('pur.cacc.owes')}</dt>
                                    <dd className="text-sm break-words">{owesLabel(row.owes)}</dd>
                                </div>
                            </dl>
                        </div>

                        <div className={cn("mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50 grid gap-2", canSeeTransactions ? "grid-cols-2" : "grid-cols-1")}>
                            {actions(row.client, true)}
                        </div>
                    </motion.div>
                ))}
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-300 dark:border-gray-700 overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <tr>
                        <th className="px-4 py-3">{t('pur.cacc.client')}</th>
                        <th className="px-4 py-3 text-right">{t('pur.cacc.grns')}</th>
                        <th className="px-4 py-3">{t('grnView.last')}</th>
                        <th className="px-4 py-3 text-right">{t('pur.cacc.bought')}</th>
                        <th className="px-4 py-3 text-right">{t('pur.cacc.owes')}</th>
                        <th className="px-4 py-3" />
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    {rows.map(row => (
                        <tr key={row.client.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                            <td className="px-4 py-3">
                                <div className="flex flex-col min-w-0">
                                    {name(row.client)}
                                    {row.client.phone && <span className="text-xs text-gray-500 dark:text-gray-400">{row.client.phone}</span>}
                                </div>
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap text-gray-600 dark:text-gray-300">{row.grnCount}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">{row.lastGrn ? formatDay(row.lastGrn) : '-'}</td>
                            <td className="px-4 py-3 text-right whitespace-nowrap font-bold text-gray-900 dark:text-white">{formatCurrency(row.bought)}</td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">{owesLabel(row.owes)}</td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">{actions(row.client)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
