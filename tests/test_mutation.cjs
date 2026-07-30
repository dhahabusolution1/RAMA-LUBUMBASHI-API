const jwt = require('jsonwebtoken'); 
const token = jwt.sign({ id: '123', role: 'SUPER_ADMIN' }, process.env.JWT_SECRET || 'secret_de_developpement_tres_long_et_securise', { expiresIn: '1h' }); 
fetch('http://localhost:4000/graphql', { 
  method: 'POST', 
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, 
  body: JSON.stringify({ 
    query: 'mutation($p: Decimal!) { creerArticle(titre: "Test", prix: $p) { id prix } }', 
    variables: { p: 15.5 } 
  }) 
}).then(r => r.json()).then(console.log);
