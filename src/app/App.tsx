import { HashRouter as Router } from 'react-router-dom'
import { AppRoutes } from './routes'
import { Toaster, toast } from 'sonner'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CommandPalette } from '@/components/command/CommandPalette'

const queryClient = new QueryClient()

import { useEffect } from 'react'
import { companyService } from '@/services/companyService'
import { backupService } from '@/services/backupService'
import { t, useLanguageStore } from '@/i18n'
import { sampleDataService } from '@/services/sampleDataService'

export function App() {
    const language = useLanguageStore((state) => state.language)

    // Keep the demo products' texts in the selected language
    useEffect(() => {
        sampleDataService.localizeSampleProducts(language).catch(console.error)
    }, [language])

    useEffect(() => {
        companyService.initTheme()

        // Check for Auto Backup
        const checkBackup = async () => {
            if (backupService.shouldAutoBackup()) {
                toast.info(t('app.autoBackupStarting'))
                const result = await backupService.performAutoBackup()
                if (result.success) {
                    toast.success(t('app.autoBackupSuccess'))
                } else {
                    toast.error(t('app.autoBackupError'))
                }
            }
        }

        checkBackup()
    }, [])

    return (
        <Router>
            <QueryClientProvider client={queryClient}>
                <AppRoutes />
                <CommandPalette />
                <Toaster position="top-right" richColors closeButton />
            </QueryClientProvider>
        </Router>
    )
}

export default App
