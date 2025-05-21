const { useState, useEffect } = React;

function App() {
  const [prompts, setPrompts] = useState([]);
  const [search, setSearch] = useState(''); // For keyword search
  const [searchTags, setSearchTags] = useState(''); // New state for tag search
  const [text, setText] = useState('');
  const [tool, setTool] = useState('');
  const [tags, setTags] = useState(''); // For adding/editing prompt tags
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(null);

  const loadPrompts = async () => {
    try {
      // Construct the query string, conditionally adding tag if searchTags is not empty
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
      setPrompts(data);
    } catch (error) {
      console.error("Failed to load prompts:", error);
      alert(`Error loading prompts: ${error.message}`);
    }
  };

  // useEffect for initial load - should ideally not be triggered by search/searchTags changes here
  // Let the search button explicitly call loadPrompts
  useEffect(() => {
    loadPrompts(); // Initial load with empty search and tags
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
          prevPrompts.map(p => (p.id === editingPrompt.id ? updatedOrNewPrompt : p))
        );
      } else {
        loadPrompts(); // Reload all prompts after adding
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

  // Renamed from handleSearch to reflect it's now a general search trigger
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
        prevPrompts.map(p => (p.id === id ? updatedPrompt : p))
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
        const res = await fetch(`/api/prompts/${promptId}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          setPrompts(prevPrompts => prevPrompts.filter(p => p.id !== promptId));
        } else {
          const errorData = await res.json().catch(() => ({ message: 'Failed to delete prompt.' }));
          console.error('Failed to delete prompt:', errorData.message);
          alert(`Error: ${errorData.message}`);
        }
      } catch (error) {
        console.error('Error deleting prompt:', error);
        alert(`Error deleting prompt: ${error.message}`);
      }
    }
  };

  const filteredPromptsByFavorite = showOnlyFavorites
    ? prompts.filter(p => p.favorite) // This filters results from API
    : prompts;

  return (
    <div className="app">
      <header className="header">
        <h1>PromptCache</h1>
        <div className="search-controls">
          <div className="search-keywords">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by keyword..."
              aria-label="Search by keyword"
            />
          </div>
          <div className="search-tags">
            <input
              value={searchTags}
              onChange={e => setSearchTags(e.target.value)}
              placeholder="Filter by tags (e.g., js, python)"
              aria-label="Filter by tags"
            />
          </div>
          <button onClick={handleExecuteSearch}>Search</button>
        </div>
      </header>
      <main>
        <section className="add">
          <h2>{editingPrompt ? 'Edit Prompt' : 'Add Prompt'}</h2>
          <form onSubmit={handleSubmitPrompt} id="newPrompt">
            <label>Prompt Text
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Prompt text"
                required
              />
            </label>
            <label>Tool
              <input
                value={tool}
                onChange={e => setTool(e.target.value)}
                placeholder="e.g. GPT-4, Midjourney"
              />
            </label>
            <label>Tags
              <input
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="e.g. copywriting, design (comma-separated)"
              />
            </label>
            <button type="submit">{editingPrompt ? 'Update Prompt' : 'Add Prompt'}</button>
            {editingPrompt && (
              <button type="button" onClick={handleCancelEdit} style={{ marginLeft: '10px' }}>
                Cancel Edit
              </button>
            )}
          </form>
        </section>
        <section className="list-controls">
          <label>
            <input
              type="checkbox"
              checked={showOnlyFavorites}
              onChange={e => setShowOnlyFavorites(e.target.checked)}
            />
            Show Favorites Only
          </label>
        </section>
        <section className="list">
          <ul id="list">
            {filteredPromptsByFavorite.map(p => ( // Use the client-side filtered list
              <li key={p.id}>
                <div className="prompt-header">
                  <span className="tool">{p.tool}</span>
                  <span className="tags">{p.tags.join(', ')}</span>
                  <button
                    onClick={() => toggleFavorite(p.id, p.favorite)}
                    className={`favorite-btn ${p.favorite ? 'favorited' : ''}`}
                    title={p.favorite ? 'Unfavorite' : 'Favorite'}
                  >
                    {p.favorite ? '★' : '☆'}
                  </button>
                  <button
                    onClick={() => handleEdit(p)}
                    className="edit-btn"
                    title="Edit Prompt"
                    style={{ marginLeft: '5px' }}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDeletePrompt(p.id)}
                    className="delete-btn"
                    title="Delete Prompt"
                    style={{ marginLeft: '5px', color: 'red' }}
                  >
                    🗑️ Delete
                  </button>
                </div>
                <div className="text">{p.text}</div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
