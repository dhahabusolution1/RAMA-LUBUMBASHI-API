import { z } from 'zod';

export const PrendreRendezVousSchema = z.object({
  date: z.union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format date invalide (YYYY-MM-DD)'),
    z.date(),
  ]),
  heure: z.string().regex(/^\d{2}:\d{2}$/, 'Format heure invalide (HH:MM)'),
  motif: z.string().min(1, 'Le motif est requis').max(500),
});
