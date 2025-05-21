7ubkob-codex/improve-ui-design-of-promptcache
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
=======
const { useState, useEffect } = React;

function App() {
  const [prompts, setPrompts] = useState([]);
  const [search, setSearch] = useState('');
  const [searchTags, setSearchTags] = useState('');
  const [text, setText] = useState('');
  const [tool, setTool] = useState('');
  const [tags, setTags] = useState('');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [sortCriteria, setSortCriteria] = useState('dateAdded'); // New state for sorting

  const formatLastUsed = (dateString) => {
    if (!dateString) return "Not used yet";
    try {
      return new Date(dateString).toLocaleDateString('en-CA'); // YYYY-MM-DD format
    } catch (e) {
      return "Invalid date";
    }
  };

  const loadPrompts = async () => {
    try {
      let queryString = `q=${encodeURIComponent(search)}`;
      if (searchTags.trim() !== '') {
        queryString += `&tag=${encodeURIComponent(searchTags)}`;
      }
      const res = await fetch(`/api/prompts/search?${queryString}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: `API error: ${res.status}` }));
        throw new Error(errorData.message);
      }
      const data = await res.json();
      // Initialize usageCount/lastUsed if missing from older data
      const processedData = data.map(p => ({
        ...p,
        usageCount: p.usageCount || 0,
        lastUsed: p.lastUsed || null
      }));
      setPrompts(processedData);
    } catch (error) {
      console.error("Failed to load prompts:", error);
      alert(`Error loading prompts: ${error.message}`);
    }
  };

  useEffect(() => {
    loadPrompts();
  }, []);

  const handleSubmitPrompt = async (e) => {
    e.preventDefault();
    const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
    const url = editingPrompt ? `/api/prompts/${editingPrompt.id}` : '/api/prompts';
    const method = editingPrompt ? 'PUT' : 'POST';
    const body = {
      text,
      tool,
      tags: tagArray,
      favorite: editingPrompt ? editingPrompt.favorite : false,
      // usageCount and lastUsed are handled by backend on creation/logusage
    };

    try {
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Unknown error occurred' }));
        throw new Error(errorData.message || `Failed to ${editingPrompt ? 'update' : 'add'} prompt`);
      }
      const updatedOrNewPrompt = await res.json();
      if (editingPrompt) {
        setPrompts(prevPrompts =>
          prevPrompts.map(p => (p.id === editingPrompt.id ? { ...p, ...updatedOrNewPrompt } : p))
        );
      } else {
        loadPrompts(); // Reload all to get the new prompt with correct defaults
      }
      setEditingPrompt(null);
      setText('');
      setTool('');
      setTags('');
    } catch (error) {
      console.error(`Error ${editingPrompt ? 'updating' : 'adding'} prompt:`, error);
      alert(`Error ${editingPrompt ? 'updating' : 'adding'} prompt: ${error.message}`);
    }
  };

  const handleExecuteSearch = () => {
    loadPrompts();
  };

  const toggleFavorite = async (id, currentFavoriteStatus) => {
    try {
      const res = await fetch(`/api/prompts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorite: !currentFavoriteStatus })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to update favorite status' }));
        throw new Error(errorData.message);
      }
      const updatedPrompt = await res.json();
      setPrompts(prevPrompts =>
        prevPrompts.map(p => (p.id === id ? { ...p, ...updatedPrompt } : p))
      );
    } catch (error) {
      console.error('Error toggling favorite:', error);
      alert(`Error toggling favorite: ${error.message}`);
    }
  };

  const handleEdit = (prompt) => {
    setEditingPrompt(prompt);
    setText(prompt.text);
    setTool(prompt.tool);
    setTags(prompt.tags.join(', '));
  };

  const handleCancelEdit = () => {
    setEditingPrompt(null);
    setText('');
    setTool('');
    setTags('');
  };

  const handleDeletePrompt = async (promptId) => {
    if (window.confirm('Are you sure you want to delete this prompt?')) {
      try {
        const res = await fetch(`/api/prompts/${promptId}`, { method: 'DELETE' });
        if (res.ok) {
          setPrompts(prevPrompts => prevPrompts.filter(p => p.id !== promptId));
        } else {
          const errorData = await res.json().catch(() => ({ message: 'Failed to delete prompt.' }));
          alert(`Error: ${errorData.message}`);
        }
      } catch (error) {
        alert(`Error deleting prompt: ${error.message}`);
      }
    }
  };

  // --- Log Usage Function ---
  const handleLogUsage = async (promptToLog) => {
    try {
      await navigator.clipboard.writeText(promptToLog.text);
      alert('Prompt text copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy text: ', err);
      alert('Failed to copy text to clipboard. See console for details.');
    }

    try {
      const res = await fetch(`/api/prompts/${promptToLog.id}/logusage`, { method: 'POST' });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to log usage.' }));
        throw new Error(errorData.message);
      }
      const updatedPrompt = await res.json();
      setPrompts(prevPrompts =>
        prevPrompts.map(p => (p.id === updatedPrompt.id ? { ...p, ...updatedPrompt } : p))
      );
    } catch (error) {
      console.error('Error logging usage:', error);
      alert(`Error logging usage: ${error.message}`);
    }
  };

  // --- Sorting and Filtering Logic ---
  let processedPrompts = [...prompts];

  // 1. Filter by favorites (client-side)
  if (showOnlyFavorites) {
    processedPrompts = processedPrompts.filter(p => p.favorite);
  }

  // 2. Sort (client-side)
  if (sortCriteria === 'usageCountDesc') {
    processedPrompts.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
  } else if (sortCriteria === 'usageCountAsc') {
    processedPrompts.sort((a, b) => (a.usageCount || 0) - (b.usageCount || 0));
  } else if (sortCriteria === 'lastUsedDesc') {
    processedPrompts.sort((a, b) => {
      const dateA = a.lastUsed ? new Date(a.lastUsed) : new Date(0); // Treat null as very old
      const dateB = b.lastUsed ? new Date(b.lastUsed) : new Date(0);
      return dateB - dateA;
    });
  } else if (sortCriteria === 'lastUsedAsc') {
    processedPrompts.sort((a, b) => {
      const dateA = a.lastUsed ? new Date(a.lastUsed) : new Date(0);
      const dateB = b.lastUsed ? new Date(b.lastUsed) : new Date(0);
      return dateA - dateB;
    });
  } else if (sortCriteria === 'dateAdded') {
    // Assuming prompts are fetched in order of addition or have an ID that reflects this
    // If IDs are sequential and increasing, sorting by ID ascending would be "dateAdded"
    processedPrompts.sort((a, b) => a.id - b.id); 
  }


  return (
    <div className="app">
      <header className="header">
        <h1>PromptCache</h1>
        <div className="search-controls">
          <div className="search-keywords">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by keyword..." />
          </div>
          <div className="search-tags">
            <input value={searchTags} onChange={e => setSearchTags(e.target.value)} placeholder="Filter by tags (e.g., js, python)" />
          </div>
          <button onClick={handleExecuteSearch}>Search</button>
        </div>
      </header>
      <main>
        <section className="add">
          <h2>{editingPrompt ? 'Edit Prompt' : 'Add Prompt'}</h2>
          {/* Form for adding/editing prompts remains the same */}
          <form onSubmit={handleSubmitPrompt} id="newPrompt">
            <label>Prompt Text <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Prompt text" required /></label>
            <label>Tool <input value={tool} onChange={e => setTool(e.target.value)} placeholder="e.g. GPT-4, Midjourney" /></label>
            <label>Tags <input value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. copywriting, design (comma-separated)" /></label>
            <button type="submit">{editingPrompt ? 'Update Prompt' : 'Add Prompt'}</button>
            {editingPrompt && (<button type="button" onClick={handleCancelEdit} style={{ marginLeft: '10px' }}>Cancel Edit</button>)}
          </form>
        </section>

        <section className="list-controls">
          <label>
            <input type="checkbox" checked={showOnlyFavorites} onChange={e => setShowOnlyFavorites(e.target.checked)} />
            Show Favorites Only
          </label>
          <div className="sort-controls" style={{ marginLeft: '20px', display: 'inline-block' }}>
            <label htmlFor="sortCriteria">Sort by: </label>
            <select id="sortCriteria" value={sortCriteria} onChange={e => setSortCriteria(e.target.value)}>
              <option value="dateAdded">Date Added</option>
              <option value="usageCountDesc">Usage Count (Most First)</option>
              <option value="usageCountAsc">Usage Count (Least First)</option>
              <option value="lastUsedDesc">Last Used (Newest First)</option>
              <option value="lastUsedAsc">Last Used (Oldest First)</option>
            </select>
          </div>
        </section>

        <section className="list">
          <ul id="list">
            {processedPrompts.map(p => (
              <li key={p.id}>
                <div className="prompt-header">
                  <span className="tool">{p.tool}</span>
                  <span className="tags">{p.tags.join(', ')}</span>
                  <button onClick={() => toggleFavorite(p.id, p.favorite)} className={`favorite-btn ${p.favorite ? 'favorited' : ''}`} title={p.favorite ? 'Unfavorite' : 'Favorite'}>{p.favorite ? '★' : '☆'}</button>
                  <button onClick={() => handleEdit(p)} className="edit-btn" title="Edit Prompt" style={{ marginLeft: '5px' }}>✏️ Edit</button>
                  <button onClick={() => handleDeletePrompt(p.id)} className="delete-btn" title="Delete Prompt" style={{ marginLeft: '5px', color: 'red' }}>🗑️ Delete</button>
                </div>
                <div className="text">{p.text}</div>
                <div className="prompt-usage">
                  <span>Usage Count: {p.usageCount || 0}</span>
                  <span style={{ marginLeft: '10px' }}>Last Used: {formatLastUsed(p.lastUsed)}</span>
                </div>
                <button onClick={() => handleLogUsage(p)} className="log-usage-btn" style={{ marginTop: '5px' }}>
                  📋 Copy & Log Use
                </button>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
main
