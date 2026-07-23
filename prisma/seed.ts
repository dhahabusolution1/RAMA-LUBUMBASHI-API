import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Supprime les données de démo pour éviter les doublons
 * quand `npm run db:seed` est relancé plusieurs fois.
 * Les comptes / églises sont ensuite recréés via upsert.
 */
async function cleanDemoData() {
  console.log('Nettoyage des donnees de demo (anti-doublons)...');

  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.fcmToken.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.inscriptionDepartement.deleteMany();
  await prisma.inscriptionSession.deleteMany();
  await prisma.sessionFormulaire.deleteMany();
  await prisma.rendezVous.deleteMany();
  await prisma.requete.deleteMany();
  await prisma.donTransaction.deleteMany();
  await prisma.articleBookshop.deleteMany();
  await prisma.citation.deleteMany();
  await prisma.shortVideo.deleteMany();
  await prisma.emission.deleteMany();
  await prisma.culte.deleteMany();
  await prisma.sermon.deleteMany();
  await prisma.playlistSermon.deleteMany();
  await prisma.evenement.deleteMany();
  await prisma.versetJour.deleteMany();
  await prisma.cellule.deleteMany();
  await prisma.departement.deleteMany();
  await prisma.coordonneesDon.deleteMany();
  await prisma.imageAccueil.deleteMany();
  await prisma.eglise.deleteMany();
  await prisma.user.deleteMany();
  await prisma.configurationApp.deleteMany();

  console.log('Nettoyage OK');
}

async function main() {
  console.log('Demarrage du seed...');
  await cleanDemoData();

  // ─── CONFIG SINGLETON ─────────────────────────────────────────
  const config = await prisma.configurationApp.upsert({
    where: { id: 'GLOBAL_CONFIG' },
    update: {
      programmeHebdomadaire: 'Dimanche (culte) | Séminaires en semaine | Émissions en ligne',
      programmeDimanche: '08h00 — Accueil\n08h30 — Louange & adoration\n09h15 — Parole\n10h00 — Prière & annonces\n10h30 — Bénédiction',
      numeroWhatsappContact: '+243814993485',
    },
    create: {
      id: 'GLOBAL_CONFIG',
      programmeHebdomadaire: 'Dimanche (culte) | Séminaires en semaine | Émissions en ligne',
      programmeDimanche: '08h00 — Accueil\n08h30 — Louange & adoration\n09h15 — Parole\n10h00 — Prière & annonces\n10h30 — Bénédiction',
      numeroWhatsappContact: '+243814993485',
      coordonneesDons: {
        create: [
          { libelle: 'Mobile Money – Orange', valeur: '+243890123456', detail: 'Au nom de Arche Source de Vie', ordre: 0 },
          { libelle: 'Mobile Money – Airtel', valeur: '+243810123456', detail: 'Au nom de Arche Source de Vie', ordre: 1 },
          { libelle: 'Compte bancaire – Rawbank', valeur: 'RB-0012345678', detail: 'Arche Source de Vie, Lubumbashi', ordre: 2 },
        ],
      },
    },
  });
  console.log('ConfigurationApp OK');

  // ─── HACHAGES MOT DE PASSE ────────────────────────────────────
  const pwdAdmin = await bcrypt.hash('Admin@2026!', 12);
  const pwdUser = await bcrypt.hash('Fidele@2026!', 12);

  // ─── SUPER_ADMIN ──────────────────────────────────────────────
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@archesourcevie.cd' },
    update: {},
    create: {
      nom: 'Monga', postnom: '', prenom: 'Israël',
      email: 'superadmin@archesourcevie.cd',
      motDePasseHash: pwdAdmin, role: 'SUPER_ADMIN',
    },
  });

  // ─── ADMINS ───────────────────────────────────────────────────
  const admin1 = await prisma.user.upsert({
    where: { email: 'secretariat.lubumbashi@archesourcevie.cd' },
    update: {},
    create: {
      nom: 'Secrétariat', postnom: 'Lubumbashi', prenom: 'ASV',
      email: 'secretariat.lubumbashi@archesourcevie.cd',
      motDePasseHash: pwdAdmin, role: 'ADMIN',
    },
  });

  const admin2 = await prisma.user.upsert({
    where: { email: 'secretariat.pointenoire@archesourcevie.cd' },
    update: {},
    create: {
      nom: 'Kangudia', postnom: 'Grâce', prenom: 'Hervé',
      email: 'secretariat.pointenoire@archesourcevie.cd',
      motDePasseHash: pwdAdmin, role: 'ADMIN',
    },
  });

  // ─── FIDELES ──────────────────────────────────────────────────
  const fidele1 = await prisma.user.upsert({
    where: { numeroWhatsapp: '+243991234567' },
    update: {},
    create: {
      nom: 'Mwamba', postnom: 'Tshiela', prenom: 'Sarah',
      numeroWhatsapp: '+243991234567',
      motDePasseHash: pwdUser, role: 'FIDELE',
    },
  });

  const fidele2 = await prisma.user.upsert({
    where: { numeroWhatsapp: '+243991234568' },
    update: {},
    create: {
      nom: 'Kasongo', postnom: 'Kabila', prenom: 'Emmanuel',
      numeroWhatsapp: '+243991234568',
      motDePasseHash: pwdUser, role: 'FIDELE',
    },
  });

  const fidele3 = await prisma.user.upsert({
    where: { numeroWhatsapp: '+243991234569' },
    update: {},
    create: {
      nom: 'Mukadi', postnom: 'Nsenga', prenom: 'Rachel',
      numeroWhatsapp: '+243991234569',
      motDePasseHash: pwdUser, role: 'FIDELE',
    },
  });

  console.log('Utilisateurs OK');

  // ─── EGLISES ─────────────────────────────────────────────────
  const egliseLubs = await prisma.eglise.upsert({
    where: { nom: 'Arche Source de Vie – Lubumbashi' },
    update: { pasteurNom: 'Apôtre Israël Monga', pasteurUserId: superAdmin.id },
    create: {
      nom: 'Arche Source de Vie – Lubumbashi',
      ville: 'Lubumbashi', adresse: 'Avenue Biayi, entre Kilela Balanda et de la Révolution',
      telephone: '+243814993485',
      pasteurNom: 'Apôtre Israël Monga', pasteurUserId: superAdmin.id,
    },
  });

  const egliseKolwezi = await prisma.eglise.upsert({
    where: { nom: 'Arche Source de Vie – Pointe-Noire' },
    update: {},
    create: {
      nom: 'Arche Source de Vie – Pointe-Noire',
      ville: 'Pointe-Noire', adresse: 'Pointe-Noire, République du Congo',
      telephone: '+242055151561',
      pasteurNom: 'Pasteur Hervé Grâce Kangudia', pasteurUserId: admin2.id,
    },
  });

  const egliseKipushi = await prisma.eglise.upsert({
    where: { nom: 'Arche Source de Vie – Bel Air (Siège)' },
    update: {},
    create: {
      nom: 'Arche Source de Vie – Bel Air (Siège)',
      ville: 'Lubumbashi', adresse: 'N°1076 des Plaines, Quartier Bel Air',
    },
  });

  console.log('Eglises OK');

  // ─── CELLULES ─────────────────────────────────────────────────
  await prisma.cellule.createMany({
    data: [
      { nom: 'Cellule Quartier Golf', egliseId: egliseLubs.id, quartiersCouvertes: 'Golf, Plateau', reference: 'Maison de priere Golf', telephone1: '+243970001111' },
      { nom: 'Cellule Commune Kenya', egliseId: egliseLubs.id, quartiersCouvertes: 'Kenya, Ruashi', reference: 'Kenya, Rue Kilimanjaro 12', telephone1: '+243970002222' },
      { nom: 'Cellule Centre-Ville', egliseId: egliseLubs.id, quartiersCouvertes: 'Centre, Kamalondo', reference: 'Kamalondo, Av. Kasai 5', telephone1: '+243970003333' },
      { nom: 'Cellule Pointe-Noire Centre', egliseId: egliseKolwezi.id, quartiersCouvertes: 'Centre-ville', reference: 'Antenne Pointe-Noire', telephone1: '+24206832140' },
    ],
    skipDuplicates: true,
  });
  console.log('Cellules OK');

  // ─── DEPARTEMENTS ────────────────────────────────────────────
  await prisma.departement.createMany({
    data: [
      { nom: 'Département Couples & Familles', responsable: 'Soeur Josiane Tshimanga', mission: 'Restauration des familles et séminaires de couples' },
      { nom: 'Département Enseignement & Combat Spirituel', responsable: 'Frere Christophe Mande', mission: 'Enseignement de la Parole, délivrance et combat spirituel' },
      { nom: 'Département Média & Diffusion', responsable: 'Frere Samuel Kalonji', mission: 'Recevez la Vie TV — diffusion et médias' },
      { nom: 'Departement Femmes en Christ', responsable: 'Soeur Esther Kabila', mission: 'Edification et solidarite entre femmes de la congregation' },
      { nom: 'Departement Intendance', responsable: 'Frere Robert Mutombo', mission: 'Gestion logistique des cultes et evenements' },
    ],
    skipDuplicates: true,
  });
  console.log('Departements OK');

  // ─── VERSETS DU JOUR ─────────────────────────────────────────
  const verset1 = await prisma.versetJour.create({
    data: {
      reference: 'Philippiens 4:13', versionBiblique: 'LSG',
      texte: 'Je puis tout par celui qui me fortifie.',
      meditation: 'Cette promesse s\'applique a toutes les circonstances de la vie. Dieu ne nous appelle pas a reussir par nos propres forces, mais a nous appuyer sur les Siennes.',
      datePublication: new Date('2026-04-30'), estActif: true,
    },
  });

  await prisma.versetJour.createMany({
    data: [
      { reference: 'Jeremie 29:11', versionBiblique: 'LSG', texte: 'Car je connais les projets que j\'ai formes sur vous, dit l\'Eternel, projets de paix et non de malheur, afin de vous donner un avenir et de l\'esperance.', datePublication: new Date('2026-05-01'), estActif: false },
      { reference: 'Romains 8:28', versionBiblique: 'LSG', texte: 'Nous savons, du reste, que toutes choses concourent au bien de ceux qui aiment Dieu, de ceux qui sont appeles selon son dessein.', datePublication: new Date('2026-05-02'), estActif: false },
      { reference: 'Psaumes 23:1', versionBiblique: 'LSG', texte: 'L\'Eternel est mon berger: je ne manquerai de rien.', meditation: 'Une confiance totale en la provision divine. Notre berger connait chacun de ses brebis par son nom.', datePublication: new Date('2026-05-03'), estActif: false },
    ],
  });
  console.log('Versets OK');

  // ─── EVENEMENTS ──────────────────────────────────────────────
  await prisma.evenement.createMany({
    data: [
      { type: 'EVENEMENT', titre: 'Camp de Prieres 2026', description: 'Trois jours de jeune, de priere et de revelation. Intercesseurs, venez en masse !', dateDebut: new Date('2026-06-10T06:00:00'), dateFin: new Date('2026-06-12T18:00:00'), heure: '06h00', lieu: 'Arche Source de Vie Lubumbashi, Salle Principale', statut: 'PUBLIE', organisateur: 'Departement Prieres' },
      { type: 'EVENEMENT', titre: 'Concert de Louange – Ascension 2026', description: 'Une nuit speciale de louange en hommage a Dieu avec des artistes chretiens de toute la region.', dateDebut: new Date('2026-05-21T19:00:00'), dateFin: new Date('2026-05-22T02:00:00'), heure: '19h00', lieu: 'Arche Source de Vie Lubumbashi, Auditorium', statut: 'PUBLIE', organisateur: 'Département Couples & Familles' },
      { type: 'PROGRAMME_CULTE', titre: 'Culte Dominical – 4 mai 2026', description: 'Theme : "Marcher dans la lumiere de Sa Parole"', dateDebut: new Date('2026-05-04T08:30:00'), dateFin: new Date('2026-05-04T12:00:00'), heure: '08h30', lieu: 'Auditorium Principal', statut: 'PUBLIE' },
      { type: 'EVENEMENT', titre: 'Seminaire Leaders 2026', description: 'Formation annuelle des leaders de cellule et responsables de departements.', dateDebut: new Date('2026-07-15T08:00:00'), dateFin: new Date('2026-07-16T17:00:00'), heure: '08h00', lieu: 'Salle de conference ASV', statut: 'BROUILLON', organisateur: 'Direction Pastorale' },
    ],
  });
  console.log('Evenements OK');

  // ─── PLAYLISTS & SERMONS ─────────────────────────────────────
  const playlist1 = await prisma.playlistSermon.create({
    data: {
      titre: 'Serie : Appel a la Consecration', theme: 'Consecration', ordre: 0,
      description: 'Quatre sermons fondamentaux sur l\'abandon total a Dieu.',
      sermons: {
        create: [
          { titre: 'La Consecration Totale – Partie 1', predicateur: 'Apôtre Israël Monga', date: new Date('2026-04-06'), lienYoutube: 'https://youtube.com/watch?v=SERMON001', ordreInPlaylist: 0 },
          { titre: 'La Consecration Totale – Partie 2', predicateur: 'Apôtre Israël Monga', date: new Date('2026-04-13'), lienYoutube: 'https://youtube.com/watch?v=SERMON002', ordreInPlaylist: 1 },
          { titre: 'Mourir a soi-meme', predicateur: 'Pasteur Hervé Grâce Kangudia', date: new Date('2026-04-20'), lienYoutube: 'https://youtube.com/watch?v=SERMON003', ordreInPlaylist: 2 },
          { titre: 'Vivre pour Sa gloire', predicateur: 'Apôtre Israël Monga', date: new Date('2026-04-27'), lienYoutube: 'https://youtube.com/watch?v=SERMON004', ordreInPlaylist: 3 },
        ],
      },
    },
  });

  const playlist2 = await prisma.playlistSermon.create({
    data: {
      titre: 'Serie : Priez Sans Cesse', theme: 'Priere', ordre: 1,
      description: 'Comprendre la priere comme un style de vie et non une simple pratique religieuse.',
      sermons: {
        create: [
          { titre: 'L\'anatomie de la Priere', predicateur: 'Pasteur Grace Kabamba', date: new Date('2026-03-04'), lienYoutube: 'https://youtube.com/watch?v=SERMON005', ordreInPlaylist: 0 },
          { titre: 'La Priere qui deplace les montagnes', predicateur: 'Apôtre Israël Monga', date: new Date('2026-03-11'), lienYoutube: 'https://youtube.com/watch?v=SERMON006', ordreInPlaylist: 1 },
        ],
      },
    },
  });
  console.log('Playlists & Sermons OK');

  // ─── CULTES ───────────────────────────────────────────────────
  const culteEnDirect = await prisma.culte.create({
    data: {
      titre: 'Culte du Mercredi 29 Avril 2026 – EN DIRECT',
      description: 'Culte de la mi-semaine avec le Apôtre Israël Monga. Theme : "L\'esperance qui ne deceoit pas"',
      type: 'MERCREDI', date: new Date('2026-04-29'), statut: 'EN_DIRECT',
      lienYoutube: 'https://youtube.com/live/CULTE_LIVE_001',
    },
  });

  await prisma.culte.createMany({
    data: [
      { titre: 'Culte Dominical – 26 Avril 2026', type: 'DIMANCHE', date: new Date('2026-04-26'), statut: 'PLANIFIE', lienYoutube: 'https://youtube.com/watch?v=CULTE002' },
      { titre: 'Culte du Vendredi 24 Avril 2026', type: 'VENDREDI', date: new Date('2026-04-24'), statut: 'PLANIFIE', lienYoutube: 'https://youtube.com/watch?v=CULTE003' },
      { titre: 'Seminaire : La foi qui agit', type: 'SEMINAIRE', date: new Date('2026-05-10'), statut: 'PLANIFIE' },
    ],
  });
  console.log('Cultes OK');

  // ─── EMISSIONS ───────────────────────────────────────────────
  await prisma.emission.createMany({
    data: [
      { titre: 'Autour de la Parole – Ep. 120', type: 'EMISSION_TV', date: new Date('2026-04-28'), lienYoutube: 'https://youtube.com/watch?v=EMISSION001', description: 'Etude biblique quotidienne sur le livre de Jean' },
      { titre: 'Recevez la Vie Radio – Podcast #45', type: 'EMISSION_RADIO', date: new Date('2026-04-25'), lienYoutube: 'https://youtube.com/watch?v=EMISSION002', description: 'Interview : Temoignages de guerisons miraculeuses' },
      { titre: 'Autour de la Parole – Ep. 119', type: 'EMISSION_TV', date: new Date('2026-04-21'), lienYoutube: 'https://youtube.com/watch?v=EMISSION003' },
    ],
  });
  console.log('Emissions OK');

  // ─── CITATIONS ───────────────────────────────────────────────
  await prisma.citation.createMany({
    data: [
      { imageUrl: 'https://res.cloudinary.com/dglb0uqr8/image/upload/v1/arche-source-de-vie/citations/citation001.jpg', cloudinaryPublicId: 'arche-source-de-vie/citations/citation001', texte: 'La foi, c\'est croire ce qu\'on ne voit pas ; la recompense de la foi, c\'est de voir ce qu\'on croit.', auteur: 'Saint Augustin' },
      { imageUrl: 'https://res.cloudinary.com/dglb0uqr8/image/upload/v1/arche-source-de-vie/citations/citation002.jpg', cloudinaryPublicId: 'arche-source-de-vie/citations/citation002', texte: 'Le chemin le plus court vers Dieu, c\'est la priere.', auteur: 'Charles Spurgeon' },
      { imageUrl: 'https://res.cloudinary.com/dglb0uqr8/image/upload/v1/arche-source-de-vie/citations/citation003.jpg', cloudinaryPublicId: 'arche-source-de-vie/citations/citation003', texte: 'Dieu n\'a jamais promis que le chemin serait facile, mais Il a promis qu\'il ne serait jamais solitaire.', auteur: 'Max Lucado' },
    ],
  });
  console.log('Citations OK');

  // ─── ARTICLES BOOKSHOP ────────────────────────────────────────
  await prisma.articleBookshop.createMany({
    data: [
      { titre: 'La Bible du Semeur', auteur: 'Collectif', prix: 25.00, description: 'La version du Semeur, traduction claire et lisible en francais contemporain. Edition integrale avec notes.', estDisponible: true, numeroWhatsappAchat: '+243814993485', typeArticle: 'LIVRE', stock: 20 },
      { titre: 'Vivre dans la presence de Dieu', auteur: 'Apôtre Israël Monga', prix: 8.50, description: 'Un guide pratique pour developper une vie de priere profonde et une communion intime avec Dieu.', estDisponible: true, typeArticle: 'LIVRE', stock: 15 },
      { titre: 'Prieres et Declarations', auteur: 'John Hagee', prix: 12.00, description: 'Un recueil de prieres scripturaires pour toutes les situations de la vie. Traduit en francais.', estDisponible: true, typeArticle: 'LIVRE', stock: 10 },
      { titre: 'Le Pouvoir de la Parole', auteur: 'Kenneth Hagin', prix: 10.00, description: 'Comment les paroles que nous prononcons facon notre realite selon les principes bibliques.', estDisponible: false, typeArticle: 'LIVRE', stock: 0 },
    ],
  });
  console.log('Bookshop OK');

  // ─── REQUETES (6 types) ──────────────────────────────────────
  await prisma.requete.create({
    data: {
      type: 'PRIERE', userId: fidele1.id,
      message: 'Je demande des prieres pour la guerison de ma mere hospitalisee depuis deux semaines. Les medecins ne savent plus quoi faire, mais je crois en la guerison divine.',
      typePriere: 'AUTRE', estMembre: true, statut: 'EN_PRIERE',
    },
  });

  await prisma.requete.create({
    data: {
      type: 'PRIERE', userId: fidele2.id,
      message: 'Priere pour ma situation professionnelle. J\'ai perdu mon emploi et je cherche la direction de Dieu pour la suite.',
      typePriere: 'MOI', estMembre: true, statut: 'EN_ATTENTE',
    },
  });

  await prisma.requete.create({
    data: {
      type: 'PRIERE_SALUT', egliseId: egliseLubs.id,
      nomVisiteur: 'Mukeba', prenomVisiteur: 'Junior',
      whatsappVisiteur: '+243990001122',
      statut: 'LU',
    },
  });

  await prisma.requete.create({
    data: {
      type: 'INTEGRATION', egliseId: egliseLubs.id,
      nomVisiteur: 'Tshimanga', prenomVisiteur: 'Chloe',
      whatsappVisiteur: '+243990003344', emailVisiteur: 'chloe.tshimanga@email.com',
      statut: 'EN_ATTENTE',
    },
  });

  await prisma.requete.create({
    data: {
      type: 'BAPTEME', userId: fidele3.id, egliseId: egliseLubs.id,
      message: 'Je desire me faire baptiser par immersion. Je suis membre depuis 8 mois.',
      statut: 'CONFIRME',
    },
  });

  await prisma.requete.create({
    data: {
      type: 'DEMANDE_INFO', 
      nomVisiteur: 'Kalombo', prenomVisiteur: 'Pierre',
      whatsappVisiteur: '+243990005566',
      message: 'Je souhaite avoir plus d\'informations sur les cultes du week-end et les activites pour les jeunes.',
      statut: 'REPONDU',
    },
  });

  await prisma.requete.create({
    data: {
      type: 'RENOUVELLEMENT',
      egliseNom: 'Arche Source de Vie – Pointe-Noire',
      nomVisiteur: 'Nsungu', prenomVisiteur: 'Didier',
      whatsappVisiteur: '+243990007788',
      statut: 'EN_ATTENTE',
    },
  });
  console.log('Requetes OK');

  // ─── RENDEZ-VOUS ─────────────────────────────────────────────
  const rdv1 = new Date('2026-05-05');
  const rdv2 = new Date('2026-05-07');
  const rdv3 = new Date('2026-05-05');

  await prisma.rendezVous.createMany({
    data: [
      { userId: fidele1.id, date: rdv1, heure: '09:00', motif: 'Counseling conjugal – accompagnement pre-mariage', statut: 'CONFIRME' },
      { userId: fidele2.id, date: rdv2, heure: '10:00', motif: 'Suivi spirituel apres traversee d\'epreuve', statut: 'EN_ATTENTE' },
      { userId: fidele3.id, date: rdv3, heure: '11:00', motif: 'Preparation au bapteme', statut: 'CONFIRME' },
    ],
  });
  console.log('RendezVous OK');

  // ─── MESSAGERIE ──────────────────────────────────────────────
  const conv1 = await prisma.conversation.create({
    data: {
      fideleId: fidele1.id, adminId: admin1.id, statut: 'OUVERTE',
      messages: {
        create: [
          { expediteurId: fidele1.id, contenu: 'Bonjour Soeur Grace, j\'aimerais avoir des informations sur le camp de prieres de juin.', statut: 'LU' },
          { expediteurId: admin1.id, contenu: 'Bonjour Soeur Sarah ! Le séminaire se tiendra prochainement au campus Arche Source de Vie Lubumbashi. Souhaitez-vous vous inscrire ?', statut: 'LU' },
          { expediteurId: fidele1.id, contenu: 'Oui, je suis tres interessee ! Comment proceder ?', statut: 'ENVOYE' },
        ],
      },
    },
  });

  const conv2 = await prisma.conversation.create({
    data: {
      fideleId: fidele2.id, statut: 'OUVERTE',
      messages: {
        create: [
          { expediteurId: fidele2.id, contenu: 'Bonsoir, j\'ai un sujet urgent a discuter avec un pasteur. Comment puis-je obtenir un rendez-vous rapidement ?', statut: 'ENVOYE' },
        ],
      },
    },
  });
  console.log('Messagerie OK');

  // ─── SESSIONS & INSCRIPTIONS ─────────────────────────────────
  const depLouange = await prisma.departement.findFirst({ where: { nom: { contains: 'Louange' } } });
  const depJeunesse = await prisma.departement.findFirst({ where: { nom: { contains: 'Jeunesse' } } });

  const sessionBapteme = await prisma.sessionFormulaire.create({
    data: {
      titre: 'Campagne Baptême — Juin 2026',
      description: 'Session d\'inscription au baptême pour le mois de juin.',
      type: 'BAPTEME',
      dateDebut: new Date('2026-06-01'),
      dateFin: new Date('2026-06-30'),
      estActif: true,
      inscriptions: {
        create: {
          userId: fidele3.id,
          nom: fidele3.nom,
          postnom: fidele3.postnom,
          prenom: fidele3.prenom ?? '',
          telephone: fidele3.numeroWhatsapp ?? '',
          adresse: 'Av. Tshimakinda, Q. Somika',
          egliseId: egliseLubs.id,
          statut: 'EN_ATTENTE',
        },
      },
    },
  });

  const sessionMembre = await prisma.sessionFormulaire.create({
    data: {
      titre: 'Identification des Membres — 2026',
      description: 'Campagne d\'enregistrement et d\'identification des membres de Arche Source de Vie.',
      type: 'ENREGISTREMENT_MEMBRE',
      dateDebut: new Date('2026-06-01'),
      dateFin: new Date('2026-12-31'),
      estActif: true,
      inscriptions: {
        create: [
          {
            userId: fidele1.id,
            nom: fidele1.nom,
            postnom: fidele1.postnom,
            prenom: fidele1.prenom ?? '',
            telephone: fidele1.numeroWhatsapp ?? '',
            telephone2: '+243970111222',
            email: 'sarah.mukendi@example.cd',
            sexe: 'FEMININ',
            dateNaissance: new Date('1995-03-15'),
            lieuNaissance: 'Lubumbashi',
            etatCivil: 'CELIBATAIRE',
            dateBapteme: new Date('2018-08-12'),
            lieuBapteme: 'Arche Source de Vie Lubumbashi',
            niveauEtudes: 'Licence en Droit',
            profession: 'Juriste',
            adressePhysique: 'Av. Kasai 45, Q. Kenya',
            ville: 'Lubumbashi',
            commune: 'Annexe',
            quartier: 'Kenya',
            egliseNom: 'Arche Source de Vie – Lubumbashi',
            formationEglise: 'École de disciples — Promotion 2019',
            autresSavoirFaire: 'Chant, accueil',
            nombreEnfants: 0,
            statut: 'EN_ATTENTE',
            departements: depLouange ? {
              create: [{ departementId: depLouange.id, fonction: 'Choriste', depuis: new Date('2020-01-01'), ordre: 1 }],
            } : undefined,
          },
          {
            userId: fidele2.id,
            nom: fidele2.nom,
            postnom: fidele2.postnom,
            prenom: fidele2.prenom ?? '',
            telephone: fidele2.numeroWhatsapp ?? '',
            sexe: 'MASCULIN',
            dateNaissance: new Date('1988-11-22'),
            lieuNaissance: 'Kolwezi',
            etatCivil: 'MARIE',
            dateBapteme: new Date('2010-05-20'),
            lieuBapteme: 'Arche Source de Vie Pointe-Noire',
            niveauEtudes: 'Graduat en Gestion',
            profession: 'Comptable',
            adressePhysique: 'Q. Manika, Rue Kando 8',
            ville: 'Kolwezi',
            commune: 'Manika',
            quartier: 'Musonoie',
            egliseNom: 'Arche Source de Vie – Pointe-Noire',
            formationEglise: 'École de disciples — Promotion 2015',
            nomConjoint: 'Grace Ilunga',
            nombreEnfants: 2,
            matricule: 'ASV0000001',
            numeroCarteMembre: 'CARTE-2026-0001',
            dateAdhesion: new Date('2026-06-10'),
            statut: 'VALIDE',
            departements: depJeunesse ? {
              create: [{ departementId: depJeunesse.id, fonction: 'Responsable adjoint', depuis: new Date('2022-03-01'), ordre: 1 }],
            } : undefined,
          },
        ],
      },
    },
  });
  console.log('Sessions OK', { bapteme: sessionBapteme.id, membre: sessionMembre.id });

  // ─── FCM TOKENS (pour tester les notifications) ───────────────
  await prisma.fcmToken.createMany({
    data: [
      { token: 'fcm_test_token_sarah_android_001', plateforme: 'ANDROID', userId: fidele1.id },
      { token: 'fcm_test_token_emmanuel_android_002', plateforme: 'ANDROID', userId: fidele2.id },
      { token: 'fcm_test_token_rachel_ios_003', plateforme: 'IOS', userId: fidele3.id },
      { token: 'fcm_test_token_anonymous_android_004', plateforme: 'ANDROID' },
    ],
    skipDuplicates: true,
  });
  console.log('FCM Tokens OK');

  // ─── AUDIT LOGS (historique des actions admin) ────────────────
  await prisma.auditLog.createMany({
    data: [
      { acteurId: superAdmin.id, action: 'SEED_INIT', entite: 'System', details: { version: '2.0', date: new Date().toISOString() } },
      { acteurId: admin1.id, action: 'UPDATE_STATUT_REQUETE', entite: 'Requete', entiteId: 'seed-requete-priere', details: { from: 'EN_ATTENTE', to: 'EN_PRIERE', motif: 'Prise en charge en seance de priere' } },
    ],
  });
  console.log('AuditLogs OK');

  console.log('\n=== SEED TERMINE AVEC SUCCES ===');
  console.log('Comptes disponibles :');
  console.log('  SUPER_ADMIN : superadmin@archesourcevie.cd / Admin@2026!');
  console.log('  ADMIN       : secretariat.lubumbashi@archesourcevie.cd / Admin@2026!');
  console.log('  ADMIN       : secretariat.pointenoire@archesourcevie.cd / Admin@2026!');
  console.log('  FIDELE      : +243991234567 / Fidele@2026!');
  console.log('  FIDELE      : +243991234568 / Fidele@2026!');
  console.log('  FIDELE      : +243991234569 / Fidele@2026!');
}

main()
  .catch((error) => {
    console.error('Erreur lors du seed :', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
