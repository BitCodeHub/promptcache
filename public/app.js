async function loadPrompts() {
  const q = document.getElementById('search').value;
  const res = await fetch('/api/prompts/search?q=' + encodeURIComponent(q));
  const data = await res.json();
  const list = document.getElementById('list');
  list.innerHTML = '';
  data.forEach(p => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="prompt-header">
        <span class="tool">${p.tool}</span>
        <span class="tags">${p.tags.join(', ')}</span>
        <button class="delete" data-id="${p.id}" aria-label="Delete">✕</button>
      </div>
      <div class="text">${p.text}</div>
    `;
    list.appendChild(li);
  });
}

document.getElementById('newPrompt').addEventListener('submit', async e => {
  e.preventDefault();
  const text = document.getElementById('text').value;
  const tool = document.getElementById('tool').value;
  const tags = document.getElementById('tags').value.split(',').map(t => t.trim()).filter(Boolean);
  await fetch('/api/prompts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, tool, tags })
  });
  document.getElementById('text').value = '';
  document.getElementById('tool').value = '';
  document.getElementById('tags').value = '';
  loadPrompts();
});

document.getElementById('searchBtn').addEventListener('click', loadPrompts);

document.getElementById('list').addEventListener('click', async e => {
  if (e.target.classList.contains('delete')) {
    const id = e.target.dataset.id;
    await fetch('/api/prompts/' + id, { method: 'DELETE' });
    loadPrompts();
  }
});

loadPrompts();
