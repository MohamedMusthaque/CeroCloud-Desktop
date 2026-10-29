import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { canAccessPage, PAGE_IDS, PAGE_PATHS, type PageId } from '@/lib/permissions'

// Renders the page only if the signed-in user may open it; otherwise sends them to the first page they can open
export function RequirePage({ page, children }: { page: PageId; children: React.ReactNode }) {
    const user = useAuthStore((state) => state.user)

    if (canAccessPage(user, page)) return <>{children}</>

    const fallback = PAGE_IDS.find(id => canAccessPage(user, id))
    return <Navigate to={fallback ? PAGE_PATHS[fallback] : '/about'} replace />
}
