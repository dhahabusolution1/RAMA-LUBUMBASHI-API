import { authResolvers } from "./auth.resolver.js";
import { userResolvers } from "./user.resolver.js";
import { contenuResolvers } from "./contenu.resolver.js";
import { egliseResolvers } from "./eglise.resolver.js";
import { requeteResolvers } from "./requete.resolver.js";
import { rendezvousResolvers } from "./rendezvous.resolver.js";
import { messagerieResolvers } from "./messagerie.resolver.js";
import { notificationResolvers } from "./notification.resolver.js";
import { bookshopResolvers } from "./bookshop.resolver.js";
import { accueilResolvers } from "./accueil.resolver.js";
import { sessionsResolvers } from "./sessions.resolver.js";
import { donResolvers } from "./don.resolver.js";
import { configResolvers } from "./config.resolver.js";
import { DateTimeResolver, DateResolver, JSONResolver } from "graphql-scalars";
import { GraphQLScalarType, Kind } from 'graphql';

// Serialise les valeurs Prisma.Decimal (objet) vers un nombre JSON exploitable
const DecimalScalar = new GraphQLScalarType({
  name: 'Decimal',
  description: 'Decimal custom scalar — nombre à virgule (prix, etc.)',
  serialize(value: unknown) {
    // Prisma renvoie un objet Decimal avec une méthode .toNumber()
    if (value !== null && typeof value === 'object' && typeof (value as any).toNumber === 'function') {
      return (value as any).toNumber();
    }
    return Number(value);
  },
  parseValue(value: unknown) {
    return Number(value);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.FLOAT || ast.kind === Kind.INT) return parseFloat(ast.value);
    if (ast.kind === Kind.STRING) return parseFloat(ast.value);
    return null;
  },
});

export const resolvers = [
  {
    DateTime: DateTimeResolver,
    Date: DateResolver,
    JSON: JSONResolver,
    Decimal: DecimalScalar,
  },
  authResolvers,
  userResolvers,
  contenuResolvers,
  egliseResolvers,
  requeteResolvers,
  rendezvousResolvers,
  messagerieResolvers,
  notificationResolvers,
  bookshopResolvers,
  accueilResolvers,
  sessionsResolvers,
  donResolvers,
  configResolvers,
];
