const fs = require('fs');
const { buildSchema, parse, validate } = require('graphql');
const { mergeTypeDefs } = require('@graphql-tools/merge');
const { print } = require('graphql');

const typeDefsFiles = fs.readdirSync('src/graphql/typeDefs')
    .filter(f => f.endsWith('.graphql'))
    .map(f => fs.readFileSync('src/graphql/typeDefs/' + f, 'utf8'));

// Inject Subscription type if it's missing to avoid 'Cannot extend type "Subscription"'
typeDefsFiles.push('type Subscription { _empty: String }');

try {
  const merged = mergeTypeDefs(typeDefsFiles);
  const typeDefs = print(merged);
  const schema = buildSchema(typeDefs);
  const httpFile = fs.readFileSync('nouveaux_schemas.http', 'utf8');
  const queries = [...httpFile.matchAll(/"query": "(.*?)"/g)].map(m => m[1].replace(/\\"/g, '"'));
  
  let hasErrors = false;
  queries.forEach(q => {
    try {
      const ast = parse(q);
      const errors = validate(schema, ast);
      if (errors.length > 0) {
        console.log('\n--- Errors in query ---\n' + q);
        errors.forEach(e => console.log('  ' + e.message));
        hasErrors = true;
      }
    } catch(e) {
      console.log('\n--- Parse error ---\n' + q);
      console.log('  ' + e.message);
      hasErrors = true;
    }
  });

  if (!hasErrors) {
    console.log('All queries in nouveaux_schemas.http match the schema perfectly!');
  }
} catch(e) {
  console.error('Schema error:', e);
}
