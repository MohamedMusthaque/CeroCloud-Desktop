import { useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Info, ShoppingBag, DollarSign, CalendarDays, CreditCard, FileText, Phone, Mail, MapPin, Contact, Receipt, StickyNote } from 'lucide-react'
import { useTranslation, paymentMethodLabel } from '@/i18n'
import { cn, formatCurrency } from '@/lib/utils'
import { clientService, type Client } from '@/services/clientService'
import { saleService } from '@/services/saleService'
import type { Sale } from '@/types/database'
import {
    ViewHeader, ViewAvatar, ViewBadge, ViewSection, ViewFields, ViewField, ViewAudit, ViewStat,
    ViewTable, ViewSaleStatus, ViewNic, ViewLoading, ViewNotFound, viewCellClass, viewLinkClass
} from '@/components/view/ViewPage'
import { useRecord, parseId } from '@/components/view/useRecord'
import { ClientForm } from './ClientForm'

// Most recent purchases listed on the page; the stats still cover every purchase
const SALES_SHOWN = 50

interface ClientRecord {
    client: Client
    sales: Sale[]
    creditUsed: number
}

export function ClientView() {
    const { t, locale } = useTranslation()
    const clientId = parseId(useParams().id)
    const [editing, setEditing] = useState(false)

    const load = useCallback(async (): Promise<ClientRecord | null> => {
        if (!clientId) return null
        const client = await clientService.getById(clientId)
        if (!client) return null
        // Same source as the purchase history on the clients list (sales under the client's name)
        const [sales, creditUsed] = await Promise.all([
            saleService.getByCustomerName(client.name),
            clientService.getCreditBalance(clientId)
        ])
        return { client, sales, creditUsed }
    }, [clientId])
    const { data, loading, reload } = useRecord(load)

    const backLabel = t('view.backTo', { page: t('nav.clients') })
    if (loading) return <ViewLoading />
    if (!data) return <ViewNotFound backTo="/clients" backLabel={backLabel} />

    const { client, sales, creditUsed } = data
    const completed = sales.filter(s => s.status === 'completed')
    const totalSpent = completed.reduce((sum, s) => sum + s.total, 0)
    const lastPurchase = completed[0]?.created_at
    const creditLimit = client.credit_limit ?? 0
    const hasCredit = creditLimit > 0

    return (
        <div className="space-y-6 pb-20 p-2">
            <ViewHeader
                backTo="/clients"
                backLabel={backLabel}
                avatar={<ViewAvatar gradient="from-cyan-400 to-blue-600">{client.name.charAt(0).toUpperCase()}</ViewAvatar>}
                title={client.name}
                subtitle={client.tax_id ? <span className="inline-flex items-center gap-1.5"><FileText className="w-4 h-4" />{client.tax_id}</span> : undefined}
                badges={<>
                    {hasCredit && <ViewBadge tone="green" icon={CreditCard}>{t('cli.creditLimit', { amount: formatCurrency(creditLimit) })}</ViewBadge>}
                    {client.nic_attachment && <ViewBadge tone="green" icon={Contact}>{t('nic.attached')}</ViewBadge>}
                </>}
                onEdit={() => setEditing(true)}
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ViewStat label={t('cliHistory.totalSpent')} value={formatCurrency(totalSpent)} icon={DollarSign} color="bg-green-500" />
                <ViewStat label={t('cliHistory.totalPurchases')} value={completed.length} icon={ShoppingBag} color="bg-blue-500" />
                <ViewStat label={t('cliHistory.lastPurchase')} value={lastPurchase ? new Date(lastPurchase).toLocaleDateString(locale) : '-'} icon={CalendarDays} color="bg-purple-500" />
                <ViewStat
                    label={t('view.client.creditUsed')}
                    value={formatCurrency(creditUsed)}
                    hint={hasCredit ? t('view.client.creditAvailable', { amount: formatCurrency(Math.max(creditLimit - creditUsed, 0)) }) : t('view.client.noCredit')}
                    icon={CreditCard}
                    color={hasCredit && creditUsed >= creditLimit ? 'bg-red-500' : 'bg-orange-500'}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ViewSection title={t('view.contactDetails')} icon={Info} className="lg:col-span-2">
                    <ViewFields>
                        <ViewField label={t('view.name')} value={client.name} />
                        <ViewField label={t('cliForm.taxId')} value={client.tax_id} icon={FileText} />
                        <ViewField label={t('view.phone')} value={client.phone && <a href={`tel:${client.phone}`} className={viewLinkClass}>{client.phone}</a>} icon={Phone} />
                        <ViewField label={t('view.email')} value={client.email && <a href={`mailto:${client.email}`} className={viewLinkClass}>{client.email}</a>} icon={Mail} />
                        <ViewField label={t('view.address')} value={client.address} icon={MapPin} wide />
                        <ViewField label={t('cliForm.creditLimit')} value={hasCredit ? formatCurrency(creditLimit) : t('view.client.noCredit')} icon={CreditCard} />
                        <ViewField label={t('nic.label')} value={<ViewNic filename={client.nic_attachment} />} icon={Contact} />
                        <ViewField label={t('view.notes')} value={client.notes} icon={StickyNote} wide />
                    </ViewFields>
                </ViewSection>
                <ViewAudit record={client} />
            </div>

            <ViewSection
                title={t('cliHistory.title')}
                icon={Receipt}
                actions={sales.length > SALES_SHOWN && <span className="text-xs text-gray-500">{t('view.showingLatest', { shown: SALES_SHOWN, total: sales.length })}</span>}
            >
                <ViewTable
                    columns={[
                        { label: t('view.sale.number') }, { label: t('view.sale.date') }, { label: t('view.sale.items') },
                        { label: t('view.sale.payment') }, { label: t('view.sale.total'), align: 'right' }, { label: t('view.sale.status') }
                    ]}
                    empty={sales.length === 0 ? t('cliHistory.empty') : undefined}
                >
                    {sales.slice(0, SALES_SHOWN).map(sale => (
                        <tr key={sale.id} className={cn(sale.status === 'cancelled' && "opacity-60")}>
                            <td className={cn(viewCellClass, "font-mono")}>#{sale.id}</td>
                            <td className={cn(viewCellClass, "whitespace-nowrap")}>{new Date(sale.created_at!).toLocaleString(locale)}</td>
                            <td className={cn(viewCellClass, "max-w-xs truncate")} title={sale.items.map(i => `${i.quantity} × ${i.product_name}`).join(', ')}>
                                {sale.items.map(i => `${i.quantity} × ${i.product_name}`).join(', ')}
                            </td>
                            <td className={cn(viewCellClass, "whitespace-nowrap")}>{paymentMethodLabel(sale.payment_method)}</td>
                            <td className={cn(viewCellClass, "text-right font-bold text-gray-900 dark:text-white")}>{formatCurrency(sale.total)}</td>
                            <td className={viewCellClass}><ViewSaleStatus status={sale.status} /></td>
                        </tr>
                    ))}
                </ViewTable>
            </ViewSection>

            <ClientForm
                isOpen={editing}
                onClose={() => setEditing(false)}
                onSuccess={reload}
                clientToEdit={client}
            />
        </div>
    )
}
