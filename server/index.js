const http = require('http');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'scores.json');

function readScores() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

function writeScores(scores) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(scores));
}

function handlePostScores(req, res) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      const { playerId, score } = JSON.parse(body);
      if (typeof playerId !== 'string' || typeof score !== 'number') throw new Error();
      const scores = readScores();
      const existing = scores.find(s => s.playerId === playerId);
      if (!existing) {
        scores.push({ playerId, score });
      } else if (score > existing.score) {
        existing.score = score;
      }
      scores.sort((a, b) => b.score - a.score);
      writeScores(scores);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid data' }));
    }
  });
}

function handleGetRanking(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const playerId = url.searchParams.get('playerId');
  const scores = readScores().sort((a,b) => b.score - a.score);
  const top = scores.slice(0,10);
  let rank = null;
  if (playerId) {
    const idx = scores.findIndex(s => s.playerId === playerId);
    if (idx !== -1) rank = idx + 1;
  }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ top, rank }));
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/scores') {
    handlePostScores(req, res);
  } else if (req.method === 'GET' && req.url.startsWith('/ranking')) {
    handleGetRanking(req, res);
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});