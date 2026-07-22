import { z } from 'zod';

/**
 * Validation des numeros de telephone / WhatsApp (format RDC).
 *
 * Formats acceptes :
 *   - Format international : +243XXXXXXXXX  (13 caracteres, indicatif DRC suivi de 9 chiffres)
 *   - Format local         : 0XXXXXXXXX     (10 chiffres, commence par 0)
 *
 * Exemples valides : +243812345678 | 0812345678
 */
export const PHONE_REGEX = /^(\+243|0)[0-9]{9}$/;

export const PHONE_MESSAGE =
  'Numero invalide. Formats acceptes : +243XXXXXXXXX ou 0XXXXXXXXX (10 chiffres)';

/**
 * Schema Zod reutilisable pour un numero de telephone obligatoire.
 */
export const phoneSchema = z.string().regex(PHONE_REGEX, PHONE_MESSAGE);

/**
 * Schema Zod reutilisable pour un numero de telephone optionnel.
 */
export const phoneOptionalSchema = z
  .string()
  .regex(PHONE_REGEX, PHONE_MESSAGE)
  .or(z.literal(''))
  .optional()
  .nullable();

/**
 * Normalise un numero vers le format international +243XXXXXXXXX.
 * Convertit 0XXXXXXXXX → +243XXXXXXXXX.
 * Laisse inchange un numero deja en +243...
 */
export function normalizePhone(input: string): string {
  if (input.startsWith('0')) {
    return '+243' + input.slice(1);
  }
  return input;
}
