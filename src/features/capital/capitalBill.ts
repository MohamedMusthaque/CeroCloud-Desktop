import { toast } from 'sonner'
import { t } from '@/i18n'
import { pdfGenerator } from '@/services/pdfGenerator'
import { companyService } from '@/services/companyService'
import type { CapitalEntry } from '@/types/database'

// Downloads the entry's bill as a PDF, with progress in a toast
export function printCapitalBill(entry: CapitalEntry) {
    toast.promise(pdfGenerator.generateCapitalBill(entry, companyService.getSettings()), {
        loading: t('rep.export.generating'), success: t('rep.export.success'), error: t('rep.export.error')
    })
}
