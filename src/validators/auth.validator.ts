import { z } from 'zod';
import { phoneSchema, phoneOptionalSchema } from './phone.validator.js';

export const RegisterSchema = z.object({
  nom: z.string().min(1, 'Nom requis').max(100),
  postnom: z.string().max(100).optional(),
  prenom: z.string().max(100).optional(),
  numeroWhatsapp: phoneSchema,
  motDePasse: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caracteres'),
});

export const LoginFideleSchema = z.object({
  numeroWhatsapp: phoneSchema,
  motDePasse: z.string().min(1, 'Mot de passe requis'),
});

export const LoginAdminSchema = z.object({
  email: z.email('Format email invalide'),
  motDePasse: z.string().min(1, 'Mot de passe requis'),
});

export const UpdateProfilSchema = z.object({
  nom: z.string().min(1).max(100).optional(),
  postnom: z.string().max(100).optional(),
  prenom: z.string().max(100).optional(),
  photoUrl: z.url().optional(),
  numeroWhatsapp: phoneOptionalSchema,
});
