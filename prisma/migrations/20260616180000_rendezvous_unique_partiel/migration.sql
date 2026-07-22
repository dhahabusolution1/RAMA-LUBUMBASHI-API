-- Un créneau (date + heure) peut être réutilisé si le RDV précédent est ANNULE
DROP INDEX IF EXISTS "RendezVous_unique_slot";
CREATE UNIQUE INDEX "RendezVous_unique_slot" ON "RendezVous"("date", "heure") WHERE "statut" <> 'ANNULE';
