import { forwardRef } from 'react'
import { Sale, CompanySettings, Client } from '@/types/database'
import { format } from 'date-fns'
import { useTranslation, paymentMethodLabel } from '@/i18n'

interface InvoiceTemplateProps {
    sale: Sale
    settings: CompanySettings
    client?: Client
}

export const InvoiceTemplate = forwardRef<HTMLDivElement, InvoiceTemplateProps>(({ sale, settings, client }, ref) => {
    const { t, dateLocale } = useTranslation()
    const isTicket = settings.invoice?.paperSize === 'ticket80mm'

    // --- TICKET 80MM LAYOUT ---
    if (isTicket) {
        return (
            <div ref={ref} className="w-[280px] bg-white p-2 text-gray-900 font-mono text-[11px] leading-tight mx-auto" id="invoice-template">
                {/* Top banner */}
                {settings.invoice?.headerImage && (
                    <img src={settings.invoice.headerImage} alt="Header" className="block max-w-full max-h-16 mx-auto mb-2 object-contain" />
                )}

                <div className="text-center mb-3 break-words">
                    {settings.logo && !settings.invoice?.headerImage && (
                        <img src={settings.logo} alt="Logo" className="w-12 h-12 mx-auto mb-1 object-contain" />
                    )}
                    <h1 className="font-bold text-sm uppercase mb-1">{settings.name}</h1>
                    <p>{settings.address}</p>
                    <p>{[settings.phone, settings.email].filter(Boolean).join(' - ')}</p>
                    {settings.taxId && <p className="font-bold mt-1">{t('print.nit', { id: settings.taxId })}</p>}
                </div>

                <div className="border-b border-black border-dashed my-2" />

                <div className="mb-2">
                    <p className="font-bold text-sm">{t('print.ticketNumber', { id: sale.id ?? '' })}</p>
                    <p>{format(new Date(sale.created_at!), "dd/MM/yyyy HH:mm", { locale: dateLocale })}</p>
                </div>

                <div className="mb-2 break-words">
                    <p className="font-bold uppercase">{t('print.client')}</p>
                    <p className="text-sm font-bold">{sale.customer_name || t('print.counter')}</p>
                    {client?.tax_id && <p>{t('print.nit', { id: client.tax_id })}</p>}
                    {client?.address && <p>{client.address}</p>}
                </div>

                <div className="border-b border-black border-dashed my-2" />

                <table className="w-full mb-2 table-fixed">
                    <thead>
                        <tr className="text-left border-b border-black border-dashed">
                            <th className="w-[55%] pb-1">{t('print.desc')}</th>
                            <th className="w-[15%] pb-1 text-center">{t('print.qty')}</th>
                            <th className="w-[30%] pb-1 text-right">{t('print.total')}</th>
                        </tr>
                    </thead>
                    <tbody className="align-top">
                        {sale.items.map((item, i) => (
                            <tr key={i}>
                                <td className="py-1 pr-1">
                                    <div className="font-bold break-words">{item.product_name}</div>
                                </td>
                                <td className="py-1 text-center">{item.quantity}</td>
                                <td className="py-1 text-right whitespace-nowrap">
                                    {settings.currencySymbol}{item.subtotal.toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="border-t border-black border-dashed my-2 pt-2">
                    <div className="flex justify-between font-bold text-sm">
                        <span>{t('print.totalUpper')}</span>
                        <span>{settings.currencySymbol}{sale.total.toFixed(2)}</span>
                    </div>
                    {sale.discount > 0 && (
                        <div className="flex justify-between">
                            <span>{t('print.savings')}</span>
                            <span>{settings.currencySymbol}{sale.discount.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between mt-1">
                        <span>{t('print.paymentMethod')}</span>
                        <span className="font-bold">{paymentMethodLabel(sale.payment_method)}</span>
                    </div>
                    {sale.payment_method === 'cheque' && sale.cheque_number && (
                        <p className="text-right break-words">
                            {t('print.chequeNumber', { number: sale.cheque_number })}{sale.cheque_bank ? ` · ${sale.cheque_bank}` : ''}
                        </p>
                    )}
                </div>

                <div className="text-center mt-4 mb-2 break-words px-2">
                    <p className="italic">{settings.invoice?.disclaimer || t('print.thanks')}</p>
                    <p className="mt-2 text-[9px] opacity-60">-- NexoraCloud --</p>
                </div>

                {/* Bottom banner */}
                {settings.invoice?.footerImage && (
                    <img src={settings.invoice.footerImage} alt="Footer" className="w-full mt-2 object-contain" />
                )}
            </div>
        )
    }

    // --- A4 / CARTA LAYOUT (PROFESIONAL) ---
    return (
        <div ref={ref} className="w-[800px] min-h-[1100px] bg-white p-0 text-gray-900 relative" id="invoice-template">
            {/* Custom Header Banner */}
            {settings.invoice?.headerImage && (
                <div className="w-full h-24 overflow-hidden mb-8 px-12 pt-6">
                    <img src={settings.invoice.headerImage} alt="Header" className="w-full h-full object-contain" />
                </div>
            )}

            <div className={`px-12 ${!settings.invoice?.headerImage ? 'pt-12' : ''}`}>
                {/* Standard Header if no banner or combined */}
                <div className="flex justify-between items-start mb-12">
                    <div className="flex gap-4 items-center">
                        {/* Show Logo only if no header image is present to avoid redundancy, or if user wants both? Let's show it but standard */}
                        {!settings.invoice?.headerImage && settings.logo && (
                            <img
                                src={settings.logo}
                                alt="Logo"
                                className="w-24 h-24 object-contain"
                            />
                        )}
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 tracking-tight">{settings.name || t('print.company')}</h1>
                            <div className="text-gray-500 text-sm mt-2 space-y-0.5">
                                {settings.address && <p>{settings.address}</p>}
                                {(settings.phone || settings.email) && <p>{[settings.phone, settings.email].filter(Boolean).join(' · ')}</p>}
                                {settings.taxId && <p className="font-medium text-primary">{t('print.rfc', { id: settings.taxId })}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="text-right">
                        <h2 className="text-xl font-bold text-gray-400 uppercase tracking-widest mb-1">{t('print.invoice')}</h2>
                        <p className="text-4xl font-mono font-bold text-gray-900">#{sale.id?.toString().padStart(6, '0')}</p>
                        <p className="text-gray-500 mt-2 font-medium">
                            {t('print.date', { date: format(new Date(sale.created_at!), t('print.longDateFormat'), { locale: dateLocale }) })}
                        </p>
                        <div className="mt-4 bg-gray-50 px-4 py-2 rounded-lg inline-block">
                            <span className={`text-xs font-bold uppercase tracking-wider ${sale.status === 'completed' ? 'text-green-600' : 'text-red-600'}`}>
                                {sale.status === 'completed' ? t('print.paid') : sale.status}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Client Info - Enhanced with Real Data */}
                <div className="bg-gray-50 rounded-xl p-6 mb-12 flex justify-between">
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{t('print.billTo')}</h3>
                        <p className="text-lg font-bold text-gray-900">{client?.name || sale.customer_name || t('print.generalClient')}</p>

                        {client ? (
                            <div className="text-sm text-gray-600 mt-1 space-y-0.5">
                                {client.tax_id && <p>{t('print.nitRfc', { id: client.tax_id })}</p>}
                                {client.address && <p>{client.address}</p>}
                                {client.phone && <p>{t('print.phone', { phone: client.phone })}</p>}
                                {client.email && <p>{client.email}</p>}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm">{t('print.counterClient')}</p>
                        )}
                    </div>
                    <div className="text-right">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{t('print.paymentMethod')}</h3>
                        <p className="text-lg font-bold text-gray-900 capitalize">{paymentMethodLabel(sale.payment_method)}</p>
                        {sale.payment_method === 'cheque' && sale.cheque_number && (
                            <p className="text-sm text-gray-600">
                                {t('print.chequeNumber', { number: sale.cheque_number })}{sale.cheque_bank ? ` · ${sale.cheque_bank}` : ''}
                            </p>
                        )}
                    </div>
                </div>

                {/* Items Table - Same as before */}
                <div className="mb-12">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b-2 border-gray-100">
                                <th className="py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-400 w-[50%]">{t('print.description')}</th>
                                <th className="py-4 text-center text-xs font-bold uppercase tracking-wider text-gray-400">{t('print.qtyShort')}</th>
                                <th className="py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-400">{t('print.price')}</th>
                                <th className="py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-400">{t('print.total')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {sale.items.map((item, index) => (
                                <tr key={index}>
                                    <td className="py-4">
                                        <p className="font-bold text-gray-900">{item.product_name}</p>
                                        <p className="text-xs text-gray-400">{t('print.code', { code: item.product_id })}</p>
                                    </td>
                                    <td className="py-4 text-center font-medium text-gray-600">{item.quantity}</td>
                                    <td className="py-4 text-right font-medium text-gray-600">
                                        {settings.currencySymbol}{item.unit_price.toFixed(2)}
                                    </td>
                                    <td className="py-4 text-right font-bold text-gray-900">
                                        {settings.currencySymbol}{item.subtotal.toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals - Same as before */}
                <div className="flex justify-end mb-20">
                    <div className="w-1/3">
                        <div className="flex justify-between py-2 text-gray-500">
                            <span>{t('print.subtotal')}</span>
                            <span>{settings.currencySymbol}{sale.subtotal.toFixed(2)}</span>
                        </div>
                        {sale.discount > 0 && (
                            <div className="flex justify-between py-2 text-green-600">
                                <span>{t('print.discount')}</span>
                                <span>-{settings.currencySymbol}{sale.discount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between py-2 text-gray-500 border-b border-gray-100 pb-4">
                            <span>{t('print.taxes', { rate: settings.taxRate })}</span>
                            <span>{settings.currencySymbol}{sale.tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between py-4 text-2xl font-black text-gray-900">
                            <span>{t('print.total')}</span>
                            <span>{settings.currencySymbol}{sale.total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center text-gray-400 text-sm border-t border-gray-100 pt-8 pb-12">
                    <p className="mb-2">{settings.invoice?.disclaimer || t('print.thanks')}</p>
                    <p className="text-xs">{t('print.generatedBy')}</p>
                </div>
            </div>

            {/* Custom Footer Banner */}
            {settings.invoice?.footerImage && (
                <div className="w-full absolute bottom-0 left-0">
                    <img src={settings.invoice.footerImage} alt="Footer" className="w-full object-contain" />
                </div>
            )}
        </div>
    )
})

InvoiceTemplate.displayName = 'InvoiceTemplate'
