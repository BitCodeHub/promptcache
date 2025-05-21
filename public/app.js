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
  const [searchTool, setSearchTool] = useState(''); // State for the new tool filter
  const [text, setText] = useState('');
  const [tool, setTool] = useState('');
  const [tags, setTags] = useState('');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [sortCriteria, setSortCriteria] = useState('dateAdded'); // New state for sorting
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [currentPromptHistory, setCurrentPromptHistory] = useState([]);
  const [selectedPromptForHistory, setSelectedPromptForHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  // State for Import/Export
  const [selectedFile, setSelectedFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');


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
      let queryParams = [`q=${encodeURIComponent(search)}`];
      if (searchTags.trim() !== '') {
        queryParams.push(`tag=${encodeURIComponent(searchTags)}`);
      }
      if (searchTool.trim() !== '') { // Add tool to query if it's not empty
        queryParams.push(`tool=${encodeURIComponent(searchTool)}`);
      }
      const queryString = queryParams.join('&');
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

  // --- History Functions ---
  const fetchHistory = async (promptId) => {
    if (!promptId) return;
    setHistoryLoading(true);
    setHistoryError(null);
    setSelectedPromptForHistory(prompts.find(p => p.id === promptId));
    try {
      const res = await fetch(`/api/prompts/${promptId}/history`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: `API error: ${res.status}` }));
        throw new Error(errorData.message || 'Failed to fetch history');
      }
      const historyData = await res.json();
      setCurrentPromptHistory(historyData);
      setHistoryModalOpen(true);
    } catch (error) {
      console.error("Error fetching history:", error);
      setHistoryError(error.message);
      // Potentially show an alert or keep the modal closed
      setHistoryModalOpen(false); 
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleRevert = async (promptId, versionId) => {
    if (!window.confirm('Are you sure you want to revert to this version? The current version will be saved to history.')) {
      return;
    }
    try {
      const res = await fetch(`/api/prompts/${promptId}/revert/${versionId}`, { method: 'POST' });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to revert prompt.' }));
        throw new Error(errorData.message);
      }
      const revertedPrompt = await res.json();
      // Update the main prompts list
      setPrompts(prevPrompts =>
        prevPrompts.map(p => (p.id === revertedPrompt.id ? { ...p, ...revertedPrompt } : p))
      );
      // If the reverted prompt was being edited, update the edit form
      if (editingPrompt && editingPrompt.id === revertedPrompt.id) {
        setText(revertedPrompt.text);
        setTool(revertedPrompt.tool);
        setTags(revertedPrompt.tags.join(', '));
      }
      alert('Prompt reverted successfully!');
      setHistoryModalOpen(false);
      // Optionally, refresh history for the current prompt if the modal were to stay open
      // fetchHistory(promptId); 
    } catch (error) {
      console.error('Error reverting prompt:', error);
      alert(`Error reverting prompt: ${error.message}`);
    }
  };


  // --- Export/Import Functions ---
  const handleExportPrompts = async () => {
    try {
      const response = await fetch('/api/prompts/export');
      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }
      // The browser should handle the download automatically due to Content-Disposition
      // Forcing download via JavaScript:
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'prompts_export.json'; // Filename suggestion
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      alert('Prompts exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      alert(`Export failed: ${error.message}`);
    }
  };

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setImportMessage(''); // Clear previous messages
  };

  const handleImportPrompts = async () => {
    if (!selectedFile) {
      setImportMessage('Please select a JSON file to import.');
      return;
    }
    if (selectedFile.type !== "application/json") {
        setImportMessage('Invalid file type. Please select a JSON file.');
        return;
    }

    setIsImporting(true);
    setImportMessage('Importing prompts...');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const fileContent = event.target.result;
        // Validate if content is JSON before sending (optional, backend also validates)
        JSON.parse(fileContent); 

        const response = await fetch('/api/prompts/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: fileContent,
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || `Import failed with status: ${response.status}`);
        }
        
        setImportMessage(`Import successful! ${result.importedCount} prompts imported.`);
        loadPrompts(); // Refresh the list
        setSelectedFile(null); // Clear the selected file
        // Clear the file input visually
        const fileInput = document.getElementById('importFile');
        if (fileInput) {
            fileInput.value = '';
        }
      } catch (error) {
        console.error('Import error:', error);
        setImportMessage(`Import failed: ${error.message}`);
      } finally {
        setIsImporting(false);
      }
    };
    reader.onerror = (error) => {
        console.error('File reading error:', error);
        setImportMessage('Error reading file.');
        setIsImporting(false);
    };
    reader.readAsText(selectedFile);
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
          <div className="search-tool"> {/* New input field for tool filter */}
            <input value={searchTool} onChange={e => setSearchTool(e.target.value)} placeholder="Filter by tool (e.g., GPT-4)" />
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
        
        <section className="data-management">
          <h2>Data Management</h2>
          <div className="export-controls">
            <button onClick={handleExportPrompts}>Export All Prompts</button>
          </div>
          <div className="import-controls">
            <h3>Import Prompts</h3>
            <input type="file" id="importFile" accept=".json" onChange={handleFileChange} />
            <button onClick={handleImportPrompts} disabled={!selectedFile || isImporting}>
              {isImporting ? 'Importing...' : 'Import Selected JSON'}
            </button>
            {importMessage && <p className={`import-message ${importMessage.startsWith('Import failed') || importMessage.startsWith('Error') || importMessage.startsWith('Please') ? 'error' : 'success'}`}>{importMessage}</p>}
          </div>
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
                  <button onClick={() => fetchHistory(p.id)} className="history-btn" title="View History" style={{ marginLeft: '5px' }} disabled={historyLoading && selectedPromptForHistory?.id === p.id}>📜 History</button>
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

  return (
    <div className="app">
      {/* Header and Add/Edit Form remain the same */}
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
          <form onSubmit={handleSubmitPrompt} id="newPrompt">
            <label>Prompt Text <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Prompt text" required /></label>
            <label>Tool <input value={tool} onChange={e => setTool(e.target.value)} placeholder="e.g. GPT-4, Midjourney" /></label>
            <label>Tags <input value={tags} onChange={e => setTags(e.value)} placeholder="e.g. copywriting, design (comma-separated)" /></label>
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
                  <button onClick={() => fetchHistory(p.id)} className="history-btn" title="View History" style={{ marginLeft: '5px' }} disabled={historyLoading && selectedPromptForHistory?.id === p.id}>📜 History</button>
                  <button onClick={() => handleDeletePrompt(p.id)} className="delete-btn" title="Delete Prompt" style={{ marginLeft: '5px', color: 'red' }}>🗑️ Delete</button>
                </div>
                <div className="text" style={{ whiteSpace: 'pre-wrap' }}>{p.text}</div>
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
      {historyModalOpen && selectedPromptForHistory && (
        <PromptHistoryModal
          isOpen={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          promptTitle={selectedPromptForHistory.text.substring(0, 50) + "..."} // Pass a title or identifier
          historyData={currentPromptHistory}
          onRevert={(versionId) => handleRevert(selectedPromptForHistory.id, versionId)}
          isLoading={historyLoading}
          error={historyError}
        />
      )}
      <style jsx global>{`
        .data-management {
          background-color: #f9f9f9;
          padding: 15px;
          margin-bottom: 20px;
          border-radius: 8px;
          border: 1px solid #eee;
        }
        .data-management h2 {
          margin-top: 0;
          margin-bottom: 15px;
          font-size: 1.2em;
        }
        .export-controls, .import-controls {
          margin-bottom: 15px;
        }
        .import-controls h3 {
          margin-top: 0;
          margin-bottom: 10px;
          font-size: 1.1em;
        }
        .import-controls input[type="file"] {
          margin-right: 10px;
          margin-bottom: 10px; /* Stack on smaller screens */
        }
        .import-message {
          margin-top: 10px;
          padding: 8px;
          border-radius: 4px;
        }
        .import-message.success {
          background-color: #e6ffed;
          border: 1px solid #b7ebc9;
          color: #2f6f4f;
        }
        .import-message.error {
          background-color: #ffe6e6;
          border: 1px solid #ffb3b3;
          color: #990000;
        }
      `}</style>
    </div>
  );
}

function PromptHistoryModal({ isOpen, onClose, promptTitle, historyData, onRevert, isLoading, error }) {
  if (!isOpen) return null;

  const formatVersionId = (isoString) => {
    const date = new Date(isoString);
    return `Saved on ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h3>History for: "{promptTitle}"</h3>
          <button onClick={onClose} className="modal-close-btn">&times;</button>
        </div>
        <div className="modal-body">
          {isLoading && <p>Loading history...</p>}
          {error && <p className="error-message">Error loading history: {error}</p>}
          {!isLoading && !error && historyData.length === 0 && <p>No history available for this prompt.</p>}
          {!isLoading && !error && historyData.length > 0 && (
            <ul>
              {historyData.map(entry => (
                <li key={entry.versionId} className="history-entry">
                  <div className="history-version-id">{formatVersionId(entry.versionId)}</div>
                  <div className="history-details">
                    <p><strong>Text:</strong> <span style={{ whiteSpace: 'pre-wrap', display: 'block', maxHeight: '100px', overflowY: 'auto', border: '1px solid #eee', padding: '5px' }}>{entry.promptData.text}</span></p>
                    <p><strong>Tool:</strong> {entry.promptData.tool || 'N/A'}</p>
                    <p><strong>Tags:</strong> {(entry.promptData.tags || []).join(', ') || 'N/A'}</p>
                  </div>
                  <button onClick={() => onRevert(entry.versionId)} className="revert-btn">
                    Revert to this version
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose}>Close</button>
        </div>
      </div>
      {/* Basic styling for modal - should be in CSS file */}
      <style jsx global>{`
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .modal {
          background-color: white;
          padding: 20px;
          border-radius: 8px;
          min-width: 500px;
          max-width: 80%;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #eee;
          padding-bottom: 10px;
          margin-bottom: 10px;
        }
        .modal-header h3 {
          margin: 0;
        }
        .modal-close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
        }
        .modal-body {
          overflow-y: auto;
          flex-grow: 1;
        }
        .modal-footer {
          border-top: 1px solid #eee;
          padding-top: 10px;
          margin-top: 10px;
          text-align: right;
        }
        .history-entry {
          border-bottom: 1px solid #f0f0f0;
          padding: 10px 0;
          margin-bottom: 10px;
        }
        .history-entry:last-child {
          border-bottom: none;
        }
        .history-version-id {
          font-weight: bold;
          margin-bottom: 5px;
          color: #333;
        }
        .history-details p {
          margin: 3px 0;
          font-size: 0.9em;
        }
        .history-details strong {
          color: #555;
        }
        .revert-btn {
          margin-top: 10px;
          padding: 5px 10px;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .revert-btn:hover {
          background-color: #0056b3;
        }
        .error-message {
          color: red;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}


ReactDOM.render(<App />, document.getElementById('root'));
