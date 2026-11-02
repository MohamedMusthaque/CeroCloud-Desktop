import type { auth as es } from '../es/auth'

export const auth: Record<keyof typeof es, string> = {
    // Login
    'auth.welcome': 'Welcome',
    'auth.subtitle': 'Sign in to continue',
    'auth.username': 'Username',
    'auth.usernamePlaceholder': 'Enter your username',
    'auth.password': 'Password',
    'auth.passwordPlaceholder': 'Enter your password',
    'auth.showPassword': 'Show password',
    'auth.hidePassword': 'Hide password',
    'auth.signIn': 'Sign In',
    'auth.signingIn': 'Signing in...',
    'auth.required': 'Enter your username and password',
    'auth.invalid': 'Incorrect username or password',
    'auth.error': 'Could not sign in. Please try again.',
    'auth.tagline': '100% local business management',
    'auth.logout': 'Log Out',
    'auth.role.admin': 'Administrator',

    // First-run Admin Setup
    'setup.title': 'Welcome to NexoraCloud',
    'setup.subtitle': "Let's set up your business. It only takes a minute.",
    'setup.step': 'Step {current} of {total}',
    'setup.business.title': 'Your business',
    'setup.business.subtitle': 'Shown on invoices and reports. You can change it later in Settings.',
    'setup.business.nameRequired': 'Enter your business name',
    'setup.admin.title': 'Administrator account',
    'setup.admin.subtitle': 'This account has full access, including managing other users. Keep the password safe.',
    'setup.admin.usernamePlaceholder': 'e.g. owner',
    'setup.admin.required': 'Enter a username and password',
    'setup.next': 'Continue',
    'setup.back': 'Back',
    'setup.finish': 'Create account & start',
    'setup.finishing': 'Setting up...',
}
