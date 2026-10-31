import { useRef, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { UpdateNotifier } from '@/components/update/UpdateNotifier'

export function MainLayout() {
    const mainRef = useRef<HTMLDivElement>(null)
    const navigate = useNavigate()

    // Global Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if user is typing in an input
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return

            // System Actions (Ctrl/Cmd + key)
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'n':
                        e.preventDefault() // Prevent new window
                        navigate('/inventory') // Or open create product modal if exists
                        break

                    // If user is NOT in input, Ctrl+V usually does nothing or Paste.
                    // Let's stick to Ctrl+V for Sales as requested, but handle carefully.
                    case 'v':
                        // If we are NOT in an input, we can hijack Ctrl+V safely?
                        // Browsers might try to paste. preventDefault stops it.
                        e.preventDefault()
                        navigate('/sales')
                        break
                    case 'r':
                        // Ctrl+R is Refresh. We MUST preventDefault if we want to hijack it.
                        e.preventDefault()
                        navigate('/reports')
                        break
                }
                return
            }

            // Navigation (Single keys)
            if (e.altKey) return // Ignore Alt combos

            switch (e.key.toLowerCase()) {
                case 'd': navigate('/'); break;
                case 'i': navigate('/inventory'); break;
                case 'v': navigate('/sales'); break;
                case 'r': navigate('/reports'); break;
                case 's': navigate('/settings'); break;
                case 'u': navigate('/users'); break;
                case 'a': navigate('/about'); break;
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [navigate])

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-gray-900 overflow-hidden">
            {/* Sidebar with Auto Width */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-gray-900 transition-all duration-300">
                <Header />

                <main
                    ref={mainRef}
                    className="flex-1 overflow-y-auto overflow-x-hidden p-6 relative scroll-smooth"
                >
                    <div className="h-full container mx-auto max-w-7xl">
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* Update Notifier - Global */}
            <UpdateNotifier />
        </div>
    )
}
