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
    const toolQuery = (parsed.query.tool || '').toLowerCase(); // New tool query parameter

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
        // Ensure p.tags exists and is an array before calling .some()
        tagMatch = Array.isArray(p.tags) && p.tags.some(promptTag => queryTags.includes(promptTag.toLowerCase()));
      }

      // Tool filter (toolQuery parameter)
      // Ensure p.tool exists before calling toLowerCase()
      const toolMatch = (toolQuery === '') || (p.tool && p.tool.toLowerCase() === toolQuery);
      
      return textMatch && tagMatch && toolMatch;
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
          favorite: data.favorite || false, // Ensure favorite status can be set on creation
          history: [], // Assuming history is not set on creation
          usageCount: 0,    // New field for usage tracking
          lastUsed: null    // New field for last used timestamp
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
      try {
        const data = JSON.parse(body);
        const idx = prompts.findIndex(p => p.id === id);
        if (idx === -1) return send(res, 404, { error: 'Not found' });

        // Ensure history array exists and is initialized
        if (!prompts[idx].history) {
          prompts[idx].history = [];
        }

        // Save current state to history
        const currentVersion = { ...prompts[idx] };
        // Remove history from the version being saved to avoid nested histories
        delete currentVersion.history; 
        
        prompts[idx].history.unshift({ // Add to the beginning of the array
          versionId: new Date().toISOString(),
          promptData: currentVersion
        });

        // Limit history to 10 versions
        if (prompts[idx].history.length > 10) {
          prompts[idx].history.pop(); // Remove the oldest version
        }

        // Update prompt with new data
        prompts[idx] = { ...prompts[idx], ...data, history: prompts[idx].history }; // Persist history

        save();
        send(res, 200, prompts[idx]);
      } catch (err) {
        send(res, 400, { error: 'Invalid JSON or error during history update' });
      }
    });
    return;
  }
oix40c-codex/review-repo-and-suggest-features
=======
6dgucv-codex/review-repo-and-suggest-features
=======

  // --- GET /api/prompts/:id/history ---
  if (parsed.pathname.match(/^\/api\/prompts\/(\d+)\/history$/) && req.method === 'GET') {
    const idStr = parsed.pathname.split('/')[3];
    const id = parseInt(idStr);

    if (isNaN(id)) {
      return send(res, 400, { error: 'Invalid Prompt ID format' });
    }

    const prompt = prompts.find(p => p.id === id);
    if (!prompt) {
      return send(res, 404, { error: 'Prompt not found' });
    }

    return send(res, 200, prompt.history || []);
  }
  
  // --- POST /api/prompts/:id/revert/:versionId ---
  if (parsed.pathname.match(/^\/api\/prompts\/(\d+)\/revert\/([^/]+)$/) && req.method === 'POST') {
    const idStr = parsed.pathname.split('/')[3];
    const versionId = parsed.pathname.split('/')[5];
    const id = parseInt(idStr);

    if (isNaN(id)) {
      return send(res, 400, { error: 'Invalid Prompt ID format' });
    }

    const promptIndex = prompts.findIndex(p => p.id === id);
    if (promptIndex === -1) {
      return send(res, 404, { error: 'Prompt not found' });
    }

    const prompt = prompts[promptIndex];
    if (!prompt.history) {
      return send(res, 404, { error: 'No history found for this prompt' });
    }

    const historyEntry = prompt.history.find(h => h.versionId === versionId);
    if (!historyEntry) {
      return send(res, 404, { error: 'Version not found in history' });
    }

    // Save current state (before reverting) to history
    const currentVersionData = { 
        text: prompt.text, 
        tool: prompt.tool, 
        tags: prompt.tags,
        favorite: prompt.favorite,
        // Potentially other fields like usageCount, lastUsed should be preserved from the current state,
        // or explicitly decide if reverting should reset them too.
        // For now, let's assume we only revert text, tool, tags.
    };

    prompt.history.unshift({
      versionId: new Date().toISOString(),
      promptData: currentVersionData
    });

    // Limit history
    if (prompt.history.length > 10) {
      prompt.history.pop();
    }
    
    // Revert prompt to historical version's data
    prompt.text = historyEntry.promptData.text;
    prompt.tool = historyEntry.promptData.tool;
    prompt.tags = historyEntry.promptData.tags;
    // Note: We are not reverting 'favorite', 'usageCount', 'lastUsed' status by default.
    // This can be a design choice. If they need to be reverted, copy them from historyEntry.promptData as well.

    prompts[promptIndex] = prompt; // Update the prompt in the main array
    save();
    return send(res, 200, prompt);
  }

  // --- DELETE /api/prompts/:id ---
  if (parsed.pathname.startsWith('/api/prompts/') && req.method === 'DELETE') {
feature-recommendations-implemented
=======
    const id = parseInt(parsed.pathname.split('/')[3]);
    const idx = prompts.findIndex(p => p.id === id);
    if (idx === -1) return send(res, 404, { error: 'Not found' });
    prompts.splice(idx, 1);
    save();
    return send(res, 204, '');
  }
=======
main
main
  // --- DELETE /api/prompts/:id ---
  if (parsed.pathname.startsWith('/api/prompts/') && req.method === 'DELETE') {
main
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

  // --- GET /api/prompts/export ---
  if (parsed.pathname === '/api/prompts/export' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="prompts_export.json"'
    });
    // Send a stringified version of prompts, but only specific fields
    // This prevents exporting internal state like history or usageCount if not desired
    const exportablePrompts = prompts.map(p => ({
      text: p.text,
      tool: p.tool,
      tags: p.tags
      // We intentionally do not export id, favorite, history, usageCount, lastUsed
    }));
    return res.end(JSON.stringify(exportablePrompts, null, 2));
  }

  // --- POST /api/prompts/import ---
  if (parsed.pathname === '/api/prompts/import' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const importedData = JSON.parse(body);
        if (!Array.isArray(importedData)) {
          return send(res, 400, { error: 'Invalid import format: Data must be an array of prompts.' });
        }

        let importedCount = 0;
        for (const importedPrompt of importedData) {
          if (typeof importedPrompt.text !== 'string' || importedPrompt.text.trim() === '') {
            // Skip prompts without valid text
            console.warn('Skipping import of prompt due to missing or empty text:', importedPrompt);
            continue; 
          }

          const newPrompt = {
            id: nextId++,
            text: importedPrompt.text,
            tool: typeof importedPrompt.tool === 'string' ? importedPrompt.tool : '',
            tags: Array.isArray(importedPrompt.tags) ? importedPrompt.tags.filter(tag => typeof tag === 'string') : [],
            favorite: false,
            history: [],
            usageCount: 0,
            lastUsed: null
          };
          prompts.push(newPrompt);
          importedCount++;
        }

        if (importedCount > 0) {
          save();
        }
        send(res, 201, { message: `Import successful. ${importedCount} prompts imported.`, importedCount });

      } catch (err) {
        send(res, 400, { error: 'Invalid JSON payload or error during import.' });
      }
    });
    return;
  }

  // --- POST /api/prompts/:id/logusage ---
  if (parsed.pathname.match(/^\/api\/prompts\/(\d+)\/logusage$/) && req.method === 'POST') {
    const idStr = parsed.pathname.split('/')[3];
    if (!idStr) { // Should not happen with regex match but good practice
      return send(res, 400, { error: 'Prompt ID is required in path' });
    }
    const id = parseInt(idStr);
    if (isNaN(id)) { // Should not happen with regex match but good practice
      return send(res, 400, { error: 'Invalid Prompt ID format' });
    }

    const index = prompts.findIndex(p => p.id === id);

    if (index === -1) {
      return send(res, 404, { error: 'Prompt not found' });
    }

    // Update usage count and last used timestamp
    prompts[index].usageCount = (prompts[index].usageCount || 0) + 1;
    prompts[index].lastUsed = new Date().toISOString();

    save(); // Persist changes

    return send(res, 200, prompts[index]); // Send back the updated prompt
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
