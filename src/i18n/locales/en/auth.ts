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
}
