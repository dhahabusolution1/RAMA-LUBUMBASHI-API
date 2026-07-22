import { z } from 'zod';

export const RequeteSchema = z.object({
  type: z.enum(['PRIERE', 'PRIERE_SALUT', 'RENOUVELLEMENT', 'INTEGRATION', 'DEMANDE_INFO', 'BAPTEME']),
  egliseId: z.string().uuid('ID eglise invalide').or(z.literal('')).optional().nullable(),
  egliseNom: z.string().max(200).optional().nullable(),
  message: z.string().max(2000).optional(),
  typePriere: z.enum(['MOI', 'AUTRE']).optional(),
  estMembre: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.type === 'PRIERE' && !data.typePriere) {
    ctx.addIssue({
      code: 'custom',
      message: 'Précisez si la prière est pour vous ou pour autrui (typePriere)',
      path: ['typePriere'],
    });
  }

  const typeEgliseRequis = ['RENOUVELLEMENT', 'INTEGRATION', 'PRIERE_SALUT', 'BAPTEME'].includes(data.type);
  
  if (typeEgliseRequis) {
    const aEgliseId = data.egliseId && data.egliseId.trim() !== '';
    const aEgliseNom = data.egliseNom && data.egliseNom.trim() !== '';
    
    if (!aEgliseId && !aEgliseNom) {
      ctx.addIssue({
        code: 'custom',
        message: "Veuillez sélectionner une église préexistante ou saisir le nom de l'église par vous-même (egliseNom/egliseId)",
        path: ['egliseNom'],
      });
    }
  }
});
