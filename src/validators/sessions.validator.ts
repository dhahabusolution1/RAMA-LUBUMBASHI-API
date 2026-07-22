import { z } from 'zod';
import { phoneOptionalSchema } from './phone.validator.js';

export const DepartementMembreSchema = z.object({
  departementId: z.string().uuid('ID département invalide').optional().nullable(),
  fonction: z.string().max(200).optional().nullable(),
  depuis: z.coerce.date().optional().nullable(),
});

export const ProfilMembreSchema = z.object({
  telephone2: phoneOptionalSchema,
  email: z.string().email('Email invalide').optional().nullable().or(z.literal('')),
  sexe: z.enum(['MASCULIN', 'FEMININ']),
  dateNaissance: z.coerce.date(),
  lieuNaissance: z.string().min(1, 'Lieu de naissance requis').max(200),
  etatCivil: z.enum(['CELIBATAIRE', 'MARIE', 'DIVORCE', 'VEUF']),
  dateBapteme: z.coerce.date().optional().nullable(),
  lieuBapteme: z.string().max(200).optional().nullable(),
  dateAdhesion: z.coerce.date().optional().nullable(),
  niveauEtudes: z.string().max(200).optional().nullable(),
  profession: z.string().max(200).optional().nullable(),
  adressePhysique: z.string().min(1, 'Adresse physique requise').max(500),
  ville: z.string().max(100).optional().nullable(),
  commune: z.string().max(100).optional().nullable(),
  quartier: z.string().max(100).optional().nullable(),
  egliseId: z.string().uuid('Église invalide').optional().nullable(),
  egliseNom: z.string().min(1, "Le nom de l'église / antenne est requis").max(200),
  formationEglise: z.string().max(2000).optional().nullable(),
  autresSavoirFaire: z.string().max(2000).optional().nullable(),
  nomConjoint: z.string().max(200).optional().nullable(),
  nombreEnfants: z.coerce.number().int().min(0).max(30).optional().nullable(),
  captureFicheUrl: z.string().url('URL de capture invalide').optional().nullable(),
  captureFichePublicId: z.string().max(300).optional().nullable(),
  departements: z.array(DepartementMembreSchema).max(2).optional().default([]),
});

export const InscriptionBaptemeSchema = z.object({
  sessionFormulaireId: z.string().uuid(),
  adresse: z.string().max(500).optional().nullable(),
  egliseId: z.string().uuid().optional().nullable(),
});

export const InscriptionMembreSchema = z.object({
  sessionFormulaireId: z.string().uuid(),
  matriculeSaisi: z.string().min(1, 'Numéro de matricule requis'),
  profilMembre: ProfilMembreSchema,
});

export const ModifierStatutInscriptionSchema = z.object({
  id: z.string().uuid(),
  statut: z.enum(['EN_ATTENTE', 'VALIDE', 'REFUSE']),
  matricule: z.string().max(50).optional().nullable(),
  numeroCarteMembre: z.string().max(50).optional().nullable(),
});
