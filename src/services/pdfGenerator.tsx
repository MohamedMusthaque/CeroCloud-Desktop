/* eslint-disable @typescript-eslint/no-explicit-any */
import { createRoot } from 'react-dom/client'
import { Sale, CompanySettings } from '@/types/database'
import { InvoiceTemplate } from '@/components/print/InvoiceTemplate'
import { ReportTemplate } from '@/components/print/ReportTemplate'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

import { clientService } from './clientService'
import { t, getLocale } from '@/i18n'

export const pdfGenerator = {
    generateInvoice: async (sale: Sale, settings: CompanySettings) => {
        // Fetch client data if customer name exists
        let client: any
        if (sale.customer_name) {
            try {
                const results = await clientService.search(sale.customer_name)
                client = results.find(c => c.name.toLowerCase() === sale.customer_name?.toLowerCase())
            } catch (error) {
                console.warn('Error fetching client details:', error)
            }
        }

        // Create a temporary container
        const container = document.createElement('div')
        container.style.position = 'absolute'
        container.style.left = '-9999px'
        container.style.top = '0'
        document.body.appendChild(container)

        try {
            // Render the template
            const root = createRoot(container)
            // Wrap within another div to ensure styles are captured correctly
            // Important: We need to wait for the render to complete.
            // Since createRoot is async in practice for effects, we use a promise wrapper or just a timeout.

            await new Promise<void>((resolve) => {
                root.render(
                    <div className="pdf-container">
                        <InvoiceTemplate sale={sale} settings={settings} client={client} />
                    </div>
                )
                // Give it a moment to paint logic and load images
                setTimeout(resolve, 800)
            })

            // Find the element to capture
            const element = container.querySelector('#invoice-template') as HTMLElement
            if (!element) throw new Error('Template element not found')

            // Capture using html2canvas
            const canvas = await html2canvas(element, {
                scale: 2, // Higher scale for better quality
                useCORS: true, // Allow loading cross-origin images if any
                logging: false,
                backgroundColor: '#ffffff'
            })

            // Generate PDF
            const imgData = canvas.toDataURL('image/png')

            // Calculate dimensions based on settings
            const isTicket = settings.invoice?.paperSize === 'ticket80mm'
            const pdfWidth = isTicket ? 80 : 210 // 80mm or A4 width (210mm)
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: isTicket ? [pdfWidth, pdfHeight] : 'a4'
            })

            // If it's standard A4, we usually want to fit within margins, but let's keep it simple: fill width
            if (!isTicket) {
                // For A4, we calculate height relative to A4 width (210)
                // If the content is longer than A4, we might need multiple pages.
                // But InvoiceTemplate A4 is fixed height usually? 
                // Currently logic was: const pdfWidth = pdf.internal.pageSize.getWidth(); ...
                // Let's stick to simple logic for now. 
            }

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
            pdf.save(`${t('export.file.invoice')}_${sale.id}_${new Date().toISOString().split('T')[0]}.pdf`)

            // Cleanup
            root.unmount()
        } catch (error) {
            console.error('Error generating PDF:', error)
            throw error // Re-throw to handle in UI
        } finally {
            if (document.body.contains(container)) {
                document.body.removeChild(container)
            }
        }
    },

    // New General Report Generator
    generateReport: async (
        title: string,
        subtitle: string,
        data: any[],
        type: 'sales' | 'inventory' | 'low-stock' | 'daily-closing',
        settings: CompanySettings,
        range?: string
    ) => {
        // Create invisible temporary container for rendering
        const reportContainer = document.createElement('div')
        reportContainer.id = 'report-render-target'
        reportContainer.style.position = 'fixed'
        reportContainer.style.top = '0'
        reportContainer.style.left = '0'
        reportContainer.style.opacity = '0' // Invisible
        reportContainer.style.pointerEvents = 'none'
        reportContainer.style.zIndex = '-9999'

        // Base styles
        reportContainer.style.backgroundColor = '#ffffff'
        reportContainer.style.width = '1000px'

        document.body.appendChild(reportContainer)

        // Pagination Logic
        const ITEMS_PER_PAGE = 5
        const chunks: any[][] = []
        if (data.length === 0) {
            chunks.push([])
        } else {
            for (let i = 0; i < data.length; i += ITEMS_PER_PAGE) {
                chunks.push(data.slice(i, i + ITEMS_PER_PAGE))
            }
        }

        try {
            const root = createRoot(reportContainer)
            await new Promise<void>((resolve) => {
                root.render(
                    <div style={{ width: '1000px', backgroundColor: '#ffffff' }}>
                        {chunks.map((chunk, index) => (
                            <div key={index} id={`report-page-${index}`} className="mb-8">
                                <ReportTemplate
                                    title={title}
                                    subtitle={subtitle}
                                    data={chunk}
                                    allData={data} // Pass full data for consistent totals
                                    pageInfo={{ current: index + 1, total: chunks.length }}
                                    type={type}
                                    settings={settings}
                                    range={range}
                                />
                            </div>
                        ))}
                    </div>
                )
                // Wait for rendering (images, etc.)
                setTimeout(resolve, 2000)
            })

            const pdf = new jsPDF('p', 'mm', 'a4')
            const imgWidth = 210 // A4 Width mm

            // Process each page individually
            for (let i = 0; i < chunks.length; i++) {
                const element = reportContainer.querySelector(`#report-page-${i}`) as HTMLElement
                if (!element) continue

                const canvas = await html2canvas(element, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff',
                    windowWidth: 1000
                })

                const imgData = canvas.toDataURL('image/png')
                const imgHeight = (canvas.height * imgWidth) / canvas.width

                if (i > 0) pdf.addPage()
                pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
            }

            const filenameMap: Record<string, string> = {
                'sales': t('export.file.reportSales'),
                'inventory': t('export.file.reportInventory'),
                'low-stock': t('export.file.reportLowStock'),
                'daily-closing': t('export.file.report')
            }
            const filenamePrefix = filenameMap[type] || t('export.file.report')
            const dateStr = new Date().toLocaleDateString(getLocale()).replace(/\//g, '-')

            pdf.save(`${filenamePrefix}_${dateStr}.pdf`)

            // Cleanup
            root.unmount()

        } catch (error) {
            console.error('Error generating PDF:', error)
            throw error
        } finally {
            if (document.body.contains(reportContainer)) {
                document.body.removeChild(reportContainer)
            }
        }
    }
}
