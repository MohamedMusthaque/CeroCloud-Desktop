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
import { useAuthStore } from '@/stores/authStore'
import { Login } from '@/features/auth/Login'
import { AdminSetup } from '@/features/auth/AdminSetup'

export function App() {
    const language = useLanguageStore((state) => state.language)
    const user = useAuthStore((state) => state.user)
    const needsSetup = useAuthStore((state) => state.needsSetup)
    const syncSession = useAuthStore((state) => state.syncSession)

    // Re-validate a stored session against the main process (permissions may have changed)
    // and find out whether this is a fresh install that still needs the Admin Setup
    useEffect(() => {
        syncSession().catch(console.error)
    }, [syncSession])

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
                {needsSetup === null ? (
                    // Waiting for the main process: avoid flashing the login screen on a fresh install
                    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900" />
                ) : needsSetup ? (
                    <AdminSetup />
                ) : user ? (
                    <>
                        <AppRoutes />
                        <CommandPalette />
                    </>
                ) : (
                    <Login />
                )}
                <Toaster position="top-right" richColors closeButton />
            </QueryClientProvider>
        </Router>
    )
}

export default App
