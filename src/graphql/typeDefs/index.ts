import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mergeTypeDefs } from '@graphql-tools/merge';
import { DocumentNode } from 'graphql';
import { gql } from 'graphql-tag';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadGraphQL(filename: string): DocumentNode {
  const content = readFileSync(join(__dirname, filename), 'utf-8');
  return gql(content);
}

// Base types necessaires pour les extensions
const baseTypeDefs = gql`
  type Query
  type Mutation
  type Subscription
`;

export const typeDefs = mergeTypeDefs([
  baseTypeDefs,
  loadGraphQL('scalars.graphql'),
  loadGraphQL('auth.graphql'),
  loadGraphQL('user.graphql'),
  loadGraphQL('contenu.graphql'),
  loadGraphQL('eglise.graphql'),
  loadGraphQL('requete.graphql'),
  loadGraphQL('rendezvous.graphql'),
  loadGraphQL('messagerie.graphql'),
  loadGraphQL('bookshop.graphql'),
  loadGraphQL('accueil.graphql'),
  loadGraphQL('notification.graphql'),
  loadGraphQL('sessions.graphql'),
  loadGraphQL('don.graphql'),
  loadGraphQL('config.graphql'),
]);
