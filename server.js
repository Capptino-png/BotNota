const http = require('http');
const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Bot WhatsApp Online');
}).listen(PORT, () => {
  console.log('Servidor HTTP rodando na porta', PORT);
});

// Forçar uso de código com seu número
process.argv = ['node', 'connect.js', 'sim'];
process.env.PHONE_NUMBER = '5511948808735';  // Ex: 5511999999999

require('./connect.js');
