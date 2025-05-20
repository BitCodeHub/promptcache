dlvqre-codex/improve-ui-design-of-promptcache
const { useState, useEffect } = React;

function App() {
  const [prompts, setPrompts] = useState([]);
  const [search, setSearch] = useState('');
  const [text, setText] = useState('');
  const [tool, setTool] = useState('');
  const [tags, setTags] = useState('');

  const loadPrompts = async () => {
    const res = await fetch('/api/prompts/search?q=' + encodeURIComponent(search));
    const data = await res.json();
    setPrompts(data);
  };
=======
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
      </div>
      <div class="text">${p.text}</div>
    `;
    list.appendChild(li);
  });
}
main

  useEffect(() => {
    loadPrompts();
  }, []);

dlvqre-codex/improve-ui-design-of-promptcache
  const addPrompt = async (e) => {
    e.preventDefault();
    const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
    await fetch('/api/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, tool, tags: tagArray })
    });
    setText('');
    setTool('');
    setTags('');
    loadPrompts();
  };

  return (
    <div className="app">
      <header className="header">
        <h1>PromptCache</h1>
        <div className="search">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search prompts"
            aria-label="Search prompts"
          />
          <button onClick={loadPrompts}>Search</button>
        </div>
      </header>
      <main>
        <section className="add">
          <h2>Add Prompt</h2>
          <form onSubmit={addPrompt} id="newPrompt">
            <label>Prompt Text
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Prompt text"
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
                placeholder="e.g. copywriting, design"
              />
            </label>
            <button type="submit">Add Prompt</button>
          </form>
        </section>
        <section className="list">
          <ul id="list">
            {prompts.map(p => (
              <li key={p.id}>
                <div className="prompt-header">
                  <span className="tool">{p.tool}</span>
                  <span className="tags">{p.tags.join(', ')}</span>
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
=======
document.getElementById('searchBtn').addEventListener('click', loadPrompts);

loadPrompts();
main
