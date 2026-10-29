import type { categories as es } from '../es/categories'

export const categories: Record<keyof typeof es, string> = {
    // Inventory sections
    'inv.section.products': 'Products',
    'inv.section.categories': 'Categories',

    // Categories section
    'cat.new': 'New Category',
    'cat.searchPlaceholder': 'Search category...',
    'cat.loading': 'Loading categories...',
    'cat.empty': 'No categories yet',
    'cat.emptyDesc': 'Create categories to organize your products.',
    'cat.noResults': 'No categories found',
    'cat.productCount': '{count} products',
    'cat.productCountOne': '1 product',
    'cat.noDescription': 'No description',
    'cat.deleteTitle': 'Delete category?',
    'cat.deleteDesc': 'The category "{name}" will be deleted.',
    'cat.deleteDescProducts': 'The category "{name}" will be deleted and its {count} products will become uncategorized.',
    'cat.deleteConfirm': 'Yes, delete',
    'cat.deleted': 'Category deleted',
    'cat.created': 'Category created',
    'cat.updated': 'Category updated',
    'cat.loadError': 'Error loading categories',

    // Category form
    'catForm.newTitle': 'New Category',
    'catForm.editTitle': 'Edit Category',
    'catForm.name': 'Name',
    'catForm.namePlaceholder': 'e.g. Beverages',
    'catForm.description': 'Description (Optional)',
    'catForm.renameHint': 'Renaming automatically updates the products in this category.',
    'catForm.save': 'Save',

    // Errors (codes from the main process)
    'catError.NAME_REQUIRED': 'Category name is required',
    'catError.NAME_TAKEN': 'A category with that name already exists',
    'catError.NOT_FOUND': 'The category no longer exists',
    'catError.UNKNOWN': 'An unexpected error occurred',

    // Product form
    'productForm.noCategory': 'Uncategorized',
}
