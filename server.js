var http = require('http');
var fs = require('fs');
var path = require('path');

var mime = {
  '.html':'text/html; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.js':'application/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.svg':'image/svg+xml'
};

var server = http.createServer(function(req, res) {
  var url = req.url === '/' ? '/index.html' : req.url;
  var filePath = path.join(__dirname, '.' + url.split('?')[0]);
  fs.readFile(filePath, function(err, data) {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    var ext = path.extname(filePath);
    res.writeHead(200, {'Content-Type': mime[ext] || 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache'});
    res.end(data);
  });
});
server.listen(3001, function() { console.log('Server running at http://localhost:3001'); });
