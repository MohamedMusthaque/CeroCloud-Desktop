import type { shell as es } from '../es/shell'

export const shell: Record<keyof typeof es, string> = {
    // Update notifier
    'updater.downloading': '⬇️ Downloading update...',
    'updater.downloadError': 'Download failed: {error}',
    'updater.installing': '🔄 Installing update...',
    'updater.checking': '🔍 Checking for updates...',
    'updater.available': '🎉 New version {version} available!',
    'updater.download': 'Download',
    'updater.downloaded': '✅ Update {version} downloaded',
    'updater.installRestart': 'Install and Restart',
    'updater.unknown': 'Unknown',
    'updater.error': '❌ Update error: {error}',
    'updater.downloadingTitle': 'Downloading update',

    // Command palette
    'cmd.placeholder': 'Search or run a command...',
    'cmd.noResults': 'No results found',
    'cmd.navigation': 'Navigation',
    'cmd.goDashboard': 'Go to Dashboard',
    'cmd.goInventory': 'Go to Inventory',
    'cmd.goSales': 'Go to Sales (POS)',
    'cmd.goReports': 'Go to Reports',
    'cmd.goSettings': 'Go to Settings',
    'cmd.actions': 'Actions',
    'cmd.createProduct': 'Create Product',
    'cmd.newSale': 'New Sale',
    'cmd.viewReports': 'View Reports',
    'cmd.navigate': 'Navigate',
    'cmd.select': 'Select',
    'cmd.close': 'Close',

    // Global search
    'search.productSubtitle': '{code} · {stock} in stock · {price}',
    'search.saleTitle': 'Sale #{id}',
    'search.reportsTitle': 'Reports & Analytics',
    'search.reportsSubtitle': 'View sales and inventory reports',
    'search.inventoryTitle': 'Inventory',
    'search.inventorySubtitle': 'Manage products and stock',
    'search.salesTitle': 'Sales',
    'search.salesSubtitle': 'Point of sale and history',
    'search.placeholder': 'Search products, sales, reports... (Ctrl+K)',
    'search.noResultsFor': 'No results found for',
}
