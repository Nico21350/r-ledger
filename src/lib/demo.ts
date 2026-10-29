// Mode démo : un compte en lecture seule, ouvert par le bouton « Voir la démo » de l'écran de connexion.
// Ses identifiants viennent des réglages (VITE_DEMO_EMAIL, VITE_DEMO_PASSWORD), jamais du code.
// Ce compte ne peut rien modifier (règles RLS de la base) ni synchroniser (refusé par la fonction sync-notion) :
// les boutons masqués ici sont un confort d'affichage, pas la protection.
export const DEMO_EMAIL: string | undefined = import.meta.env.VITE_DEMO_EMAIL || undefined
export const DEMO_PASSWORD: string | undefined = import.meta.env.VITE_DEMO_PASSWORD || undefined

export const demoAvailable = Boolean(DEMO_EMAIL && DEMO_PASSWORD)

export function isDemoEmail(email: string | undefined): boolean {
  return Boolean(DEMO_EMAIL && email && email.toLowerCase() === DEMO_EMAIL.toLowerCase())
}
