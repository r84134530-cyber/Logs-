const http = require('http');
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Botul ruleaza cu succes!\n');
});
server.listen(process.env.PORT || 3000);

