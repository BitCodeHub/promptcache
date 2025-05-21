const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const DATA_FILE = path.join(__dirname, 'prompts.json');
let prompts = [];
try {
  prompts = JSON.parse(fs.readFileSync(DATA_FILE));
} catch {
  prompts = [];
}
let nextId = prompts.reduce((max, p) => Math.max(max, p.id), 0) + 1;

function save() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(prompts, null, 2));
}

function send(res, status, data, type = 'application/json') {
  res.writeHead(status, { 'Content-Type': type });
  res.end(type === 'application/json' ? JSON.stringify(data) : data);
}

function serveStatic(req, res) {
  const filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, 'Not found', 'text/plain');
    const ext = path.extname(filePath);
    const type = ext === '.js' ? 'application/javascript'
      : ext === '.css' ? 'text/css'
      : 'text/html';
    send(res, 200, data, type);
  });
}

function handleAPI(req, res) {
  const parsed = url.parse(req.url, true);
  if (parsed.pathname === '/api/prompts' && req.method === 'GET') {
    return send(res, 200, prompts);
  }
  if (parsed.pathname === '/api/prompts/search' && req.method === 'GET') {
    const q = (parsed.query.q || '').toLowerCase();
    const tagQuery = parsed.query.tag; // e.g., "tag1,tag2, tag3 "
    
    let queryTags = [];
    if (tagQuery && typeof tagQuery === 'string' && tagQuery.trim() !== '') {
      queryTags = tagQuery.split(',')
                          .map(tag => tag.trim())
                          .filter(tag => tag !== '');
    }

    const filtered = prompts.filter(p => {
      // Keyword search (q parameter)
      const textMatch = (q === '') || // if q is empty, it's a match for text
                        p.text.toLowerCase().includes(q) ||
                        p.tool.toLowerCase().includes(q) || // Also search in tool
                        p.tags.some(pt => pt.toLowerCase().includes(q)); // And in individual tags

      // Tag search (tag parameter)
      let tagMatch = true; // Default to true if no tags are specified in the query
      if (queryTags.length > 0) {
        // If there are queryTags, prompt must have at least one of them
        tagMatch = p.tags.some(promptTag => queryTags.includes(promptTag));
      }
      
      return textMatch && tagMatch;
    });
    return send(res, 200, filtered);
  }
  if (parsed.pathname === '/api/prompts' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const prompt = {
          id: nextId++,
          text: data.text || '',
          tool: data.tool || '',
          tags: data.tags || [],
          favorite: false,
          history: []
        };
        prompts.push(prompt);
        save();
        send(res, 201, prompt);
      } catch (err) {
        send(res, 400, { error: 'Invalid JSON' });
      }
    });
    return;
  }
  if (parsed.pathname.startsWith('/api/prompts/') && req.method === 'PUT') {
    const id = parseInt(parsed.pathname.split('/')[3]);
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const data = JSON.parse(body);
      const idx = prompts.findIndex(p => p.id === id);
      if (idx === -1) return send(res, 404, { error: 'Not found' });
      prompts[idx] = { ...prompts[idx], ...data };
      save();
      send(res, 200, prompts[idx]);
    });
    return;
  }
  // --- DELETE /api/prompts/:id ---
  if (parsed.pathname.startsWith('/api/prompts/') && req.method === 'DELETE') {
    const idStr = parsed.pathname.split('/')[3];
    if (!idStr) {
      return send(res, 400, { error: 'Prompt ID is required' });
    }
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return send(res, 400, { error: 'Invalid Prompt ID format' });
    }

    const index = prompts.findIndex(p => p.id === id);

    if (index === -1) {
      return send(res, 404, { error: 'Prompt not found' });
    }

    prompts.splice(index, 1); // Remove the prompt from the array
    save(); // Persist changes to prompts.json

    return send(res, 200, { message: 'Prompt deleted successfully' });
  }
  send(res, 404, { error: 'Not found' });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    return handleAPI(req, res);
  }
  serveStatic(req, res);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
