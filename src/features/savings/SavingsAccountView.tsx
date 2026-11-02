import { useCallback, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { parseISO } from 'date-fns'
import { PiggyBank, Info, ArrowDownCircle, ArrowUpCircle, CalendarDays, ArrowLeftRight, Edit2, Trash2, Shapes } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation, paymentMethodLabel } from '@/i18n'
import { cn, formatCurrency } from '@/lib/utils'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { savingsAccountService, savingsTransactionService } from '@/services/savingsService'
import type { SavingsAccount, SavingsTransaction, SavingsTransactionType } from '@/types/database'
import {
    ViewHeader, ViewAvatar, ViewSection, ViewFields, ViewField, ViewAudit, ViewStat,
    ViewTable, ViewLoading, ViewNotFound, viewCellClass
} from '@/components/view/ViewPage'
import { useRecord, parseId } from '@/components/view/useRecord'
import { SavingsAccountForm } from './SavingsAccountForm'
import { SavingsTransactionForm } from './SavingsTransactionForm'
import { savingsErrorMessage } from './savingsErrors'
import { CATEGORY_STYLES, categoryLabel, typeLabel, signedAmount } from './savingsUi'

interface SavingsRecord {
    account: SavingsAccount
    accounts: SavingsAccount[]
    // Newest first
    transactions: SavingsTransaction[]
}

export function SavingsAccountView() {
    const { t, locale } = useTranslation()
    const accountId = parseId(useParams().id)
    const [editing, setEditing] = useState(false)
    const [txFormOpen, setTxFormOpen] = useState(false)
    const [editingTx, setEditingTx] = useState<SavingsTransaction | null>(null)
    const [txPreset, setTxPreset] = useState<{ accountId?: number; type?: SavingsTransactionType }>({})
    const [txToDelete, setTxToDelete] = useState<SavingsTransaction | null>(null)

    const load = useCallback(async (): Promise<SavingsRecord | null> => {
        if (!accountId) return null
        const [accounts, transactions] = await Promise.all([savingsAccountService.getAll(), savingsTransactionService.getAll()])
        const account = accounts.find(a => a.id === accountId)
        if (!account) return null
        return { account, accounts, transactions: transactions.filter(tx => tx.account_id === accountId) }
    }, [accountId])
    const { data, loading, reload } = useRecord(load)

    // Balance after each transaction, oldest to newest
    const runningBalance = useMemo(() => {
        const balances = new Map<number, number>()
        let balance = 0
        for (const tx of [...(data?.transactions ?? [])].reverse()) {
            balance += signedAmount(tx.type, tx.amount)
            if (tx.id) balances.set(tx.id, balance)
        }
        return balances
    }, [data])

    const backLabel = t('view.backTo', { page: t('nav.savings') })
    if (loading) return <ViewLoading />
    if (!data) return <ViewNotFound backTo="/savings" backLabel={backLabel} />

    const { account, accounts, transactions } = data
    const style = CATEGORY_STYLES[account.category] ?? CATEGORY_STYLES.other
    const formatDay = (day: string) => parseISO(day).toLocaleDateString(locale)
    const txCount = transactions.length === 1 ? t('savAcc.txCountOne') : t('savAcc.txCount', { count: transactions.length })

    const openTransaction = (type: SavingsTransactionType) => {
        setEditingTx(null)
        setTxPreset({ accountId: account.id, type })
        setTxFormOpen(true)
    }

    const confirmDeleteTx = async () => {
        if (!txToDelete?.id) return
        try {
            await savingsTransactionService.delete(txToDelete.id)
            toast.success(t('savTx.deleted'))
            reload()
        } catch (error) {
            toast.error(savingsErrorMessage(error, t))
        } finally {
            setTxToDelete(null)
        }
    }

    return (
        <div className="space-y-6 pb-20 p-2">
            <ViewHeader
                backTo="/savings"
                backLabel={backLabel}
                avatar={<ViewAvatar gradient={style.gradient}><style.icon className="w-8 h-8" /></ViewAvatar>}
                title={account.name}
                subtitle={t('savView.subtitle', { category: categoryLabel(account.category, t), count: txCount })}
                badges={
                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold", style.badge)}>
                        <style.icon className="w-3.5 h-3.5" />
                        {categoryLabel(account.category, t)}
                    </span>
                }
                onEdit={() => setEditing(true)}
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ViewStat label={t('savAcc.balance')} value={formatCurrency(account.balance ?? 0)} icon={PiggyBank} color="bg-purple-500" />
                <ViewStat label={t('savView.totalDeposits')} value={formatCurrency(account.total_deposits ?? 0)} icon={ArrowDownCircle} color="bg-green-500" />
                <ViewStat label={t('savView.totalWithdrawals')} value={formatCurrency(account.total_withdrawals ?? 0)} icon={ArrowUpCircle} color="bg-red-500" />
                <ViewStat
                    label={t('savView.lastTransaction')}
                    value={account.last_transaction_date ? formatDay(account.last_transaction_date) : '-'}
                    icon={CalendarDays}
                    color="bg-blue-500"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ViewSection title={t('view.details')} icon={Info} className="lg:col-span-2">
                    <ViewFields>
                        <ViewField label={t('savAccForm.name')} value={account.name} />
                        <ViewField label={t('savAccForm.category')} value={categoryLabel(account.category, t)} icon={Shapes} />
                        <ViewField label={t('savAcc.balance')} value={formatCurrency(account.balance ?? 0)} icon={PiggyBank} />
                        <ViewField label={t('sav.section.transactions')} value={txCount} icon={ArrowLeftRight} />
                        <ViewField label={t('view.description')} value={account.description} wide />
                    </ViewFields>
                </ViewSection>
                <ViewAudit record={account} />
            </div>

            <ViewSection
                title={t('savView.history')}
                icon={ArrowLeftRight}
                actions={
                    <div className="flex gap-2">
                        <button
                            onClick={() => openTransaction('deposit')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                        >
                            <ArrowDownCircle className="w-4 h-4" />
                            {t('sav.deposit')}
                        </button>
                        <button
                            onClick={() => openTransaction('withdrawal')}
                            disabled={(account.balance ?? 0) <= 0}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ArrowUpCircle className="w-4 h-4" />
                            {t('sav.withdraw')}
                        </button>
                    </div>
                }
            >
                <ViewTable
                    columns={[
                        { label: t('savTx.col.date') }, { label: t('savTx.col.type') }, { label: t('savTx.col.description') },
                        { label: t('savTx.col.payment') }, { label: t('savTx.col.amount'), align: 'right' },
                        { label: t('savTx.col.balance'), align: 'right' }, { label: '' }
                    ]}
                    empty={transactions.length === 0 ? t('savView.noTransactions') : undefined}
                >
                    {transactions.map(tx => {
                        const isDeposit = tx.type === 'deposit'
                        return (
                            <tr key={tx.id} className="group">
                                <td className={cn(viewCellClass, "whitespace-nowrap")}>{formatDay(tx.transaction_date)}</td>
                                <td className={cn(viewCellClass, "whitespace-nowrap")}>
                                    <span className={cn("inline-flex items-center gap-1 text-xs font-bold", isDeposit ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                                        {isDeposit ? <ArrowDownCircle className="w-3.5 h-3.5" /> : <ArrowUpCircle className="w-3.5 h-3.5" />}
                                        {typeLabel(tx.type, t)}
                                    </span>
                                </td>
                                <td className={cn(viewCellClass, "max-w-xs truncate")} title={tx.description}>{tx.description || '-'}</td>
                                <td className={cn(viewCellClass, "whitespace-nowrap")}>{paymentMethodLabel(tx.payment_method)}</td>
                                <td className={cn(viewCellClass, "text-right font-bold whitespace-nowrap", isDeposit ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                                    {isDeposit ? '+' : '-'}{formatCurrency(tx.amount)}
                                </td>
                                <td className={cn(viewCellClass, "text-right font-bold text-gray-900 dark:text-white whitespace-nowrap")}>
                                    {formatCurrency(runningBalance.get(tx.id!) ?? 0)}
                                </td>
                                <td className={viewCellClass}>
                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => { setEditingTx(tx); setTxPreset({}); setTxFormOpen(true) }}
                                            className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                            title={t('common.edit')}
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setTxToDelete(tx)}
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                            title={t('common.delete')}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )
                    })}
                </ViewTable>
            </ViewSection>

            <SavingsAccountForm
                isOpen={editing}
                account={account}
                onClose={() => setEditing(false)}
                onSaved={reload}
            />

            <SavingsTransactionForm
                isOpen={txFormOpen}
                transaction={editingTx}
                accounts={accounts}
                preset={txPreset}
                onClose={() => { setTxFormOpen(false); setEditingTx(null) }}
                onSaved={reload}
            />

            <ConfirmDialog
                isOpen={!!txToDelete}
                title={t('savTx.deleteTitle')}
                description={txToDelete ? t('savTx.deleteDesc', {
                    type: typeLabel(txToDelete.type, t).toLowerCase(),
                    amount: formatCurrency(txToDelete.amount),
                    date: formatDay(txToDelete.transaction_date),
                    account: account.name
                }) : ''}
                confirmText={t('savTx.deleteConfirm')}
                variant="danger"
                onConfirm={confirmDeleteTx}
                onCancel={() => setTxToDelete(null)}
            />
        </div>
    )
}
