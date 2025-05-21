import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  TextInput,
  Button,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';

const API_BASE = 'http://localhost:3000'; // Ensure this is your actual API base URL

const App = () => {
  const [prompts, setPrompts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTags, setSearchTags] = useState(''); // New state for tag search input
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formVisible, setFormVisible] = useState(false);
  const [newPromptText, setNewPromptText] = useState('');
  const [newPromptTool, setNewPromptTool] = useState('');
  const [newPromptTags, setNewPromptTags] = useState(''); // For adding/editing prompt tags

  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(null);

  const scrollViewRef = useRef(null);

  const fetchPrompts = useCallback(async (keywordQuery = '', tagsQuery = '') => {
    setIsLoading(true);
    setError(null);
    try {
      let queryString = `q=${encodeURIComponent(keywordQuery)}`;
      if (tagsQuery.trim() !== '') {
        queryString += `&tag=${encodeURIComponent(tagsQuery)}`;
      }

      const response = await fetch(`${API_BASE}/api/prompts/search?${queryString}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
        throw new Error(errData.message);
      }
      const data = await response.json();
      setPrompts(data);
    } catch (e) {
      setError(e.message);
      Alert.alert("Error", "Failed to fetch prompts: " + e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // useEffect to fetch prompts when searchQuery or searchTags change
  useEffect(() => {
    // Debounce or delay could be added here if desired, for now, it fetches on each change
    fetchPrompts(searchQuery, searchTags);
  }, [fetchPrompts, searchQuery, searchTags]);

  const handleSubmitPrompt = async () => {
    if (!newPromptText.trim()) {
      Alert.alert("Validation", "Prompt text cannot be empty.");
      return;
    }
    setIsLoading(true);
    const tagsArray = newPromptTags.split(',').map(tag => tag.trim()).filter(tag => tag);
    const url = editingPrompt 
      ? `${API_BASE}/api/prompts/${editingPrompt.id}` 
      : `${API_BASE}/api/prompts`;
    const method = editingPrompt ? 'PUT' : 'POST';
    const body = editingPrompt 
      ? { text: newPromptText, tool: newPromptTool, tags: tagsArray, favorite: editingPrompt.favorite }
      : { text: newPromptText, tool: newPromptTool, tags: tagsArray, favorite: false };

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: 'Unknown API error' }));
        throw new Error(errData.message || `HTTP error! status: ${response.status}`);
      }
      const updatedOrNewPrompt = await response.json();
      if (editingPrompt) {
        setPrompts(prevPrompts =>
          prevPrompts.map(p => (p.id === editingPrompt.id ? updatedOrNewPrompt : p))
        );
      } else {
        // Refresh with current search terms after adding
        fetchPrompts(searchQuery, searchTags); 
      }
      setNewPromptText('');
      setNewPromptTool('');
      setNewPromptTags('');
      setEditingPrompt(null);
      setFormVisible(false);
    } catch (e) {
      setError(e.message);
      Alert.alert("Error", `Failed to ${editingPrompt ? 'update' : 'add'} prompt: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFavorite = async (id, currentFavoriteStatus) => {
    try {
      const response = await fetch(`${API_BASE}/api/prompts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorite: !currentFavoriteStatus }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: 'Unknown API error' }));
        throw new Error(errData.message || `HTTP error! status: ${response.status}`);
      }
      const updatedPrompt = await response.json();
      setPrompts(prevPrompts =>
        prevPrompts.map(p => (p.id === id ? updatedPrompt : p))
      );
    } catch (e) {
      Alert.alert("Error", `Failed to update favorite status: ${e.message}`);
    }
  };

  const handleStartEdit = (prompt) => {
    setEditingPrompt(prompt);
    setNewPromptText(prompt.text);
    setNewPromptTool(prompt.tool);
    setNewPromptTags(prompt.tags.join(', '));
    setFormVisible(true);
    setTimeout(() => scrollViewRef.current?.scrollTo({ y: 0, animated: true }), 100);
  };

  const handleCancelForm = () => {
    setEditingPrompt(null);
    setNewPromptText('');
    setNewPromptTool('');
    setNewPromptTags('');
    setFormVisible(false);
  };

  const handleDeletePrompt = (promptId) => {
    Alert.alert(
      "Delete Prompt",
      "Are you sure you want to delete this prompt?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsLoading(true);
            try {
              const response = await fetch(`${API_BASE}/api/prompts/${promptId}`, {
                method: 'DELETE',
              });
              if (!response.ok) {
                const errData = await response.json().catch(() => ({ message: 'Unknown API error during delete' }));
                throw new Error(errData.message || `HTTP error! status: ${response.status}`);
              }
              setPrompts(prevPrompts => prevPrompts.filter(p => p.id !== promptId));
            } catch (e) {
              Alert.alert("Error", `Failed to delete prompt: ${e.message}`);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };
  
  // Client-side filtering for favorites, applied to the API results
  const displayedPrompts = showOnlyFavorites
    ? prompts.filter(p => p.favorite)
    : prompts;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView ref={scrollViewRef} style={styles.containerScrollView} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <Text style={styles.header}>PromptCache Mobile</Text>

          <TextInput
            style={styles.searchInput}
            placeholder="Search by keyword..."
            value={searchQuery}
            onChangeText={setSearchQuery} // Triggers fetchPrompts via useEffect
          />
          {/* New TextInput for tags */}
          <TextInput
            style={styles.searchInput} // Reusing similar style
            placeholder="Filter by tags (e.g., js,react)"
            value={searchTags}
            onChangeText={setSearchTags} // Triggers fetchPrompts via useEffect
            autoCapitalize="none"
          />

          <View style={styles.controlsContainer}>
            <Button
              title={showOnlyFavorites ? "Show All" : "Show Favorites"}
              onPress={() => setShowOnlyFavorites(!showOnlyFavorites)}
              color={showOnlyFavorites ? "#ffc107" : Platform.OS === 'ios' ? "#007AFF": "#007bff"}
            />
            <Button
              title={formVisible ? (editingPrompt ? "Cancel Edit" : "Cancel Add") : "Add New Prompt"}
              onPress={() => {
                if (formVisible) {
                  handleCancelForm();
                } else {
                  setEditingPrompt(null);
                  setFormVisible(true);
                  setTimeout(() => scrollViewRef.current?.scrollTo({ y: 0, animated: true }), 100);
                }
              }}
              color={formVisible ? "#dc3545" : (Platform.OS === 'ios' ? "#007AFF": "#28a745")}
            />
          </View>

          {formVisible && (
            <View style={styles.addPromptForm}>
              <Text style={styles.formTitle}>{editingPrompt ? 'Edit Prompt' : 'Add New Prompt'}</Text>
              <TextInput placeholder="Prompt Text" value={newPromptText} onChangeText={setNewPromptText} style={styles.input} multiline />
              <TextInput placeholder="Tool (e.g., GPT-4)" value={newPromptTool} onChangeText={setNewPromptTool} style={styles.input} />
              <TextInput placeholder="Tags (comma-separated)" value={newPromptTags} onChangeText={setNewPromptTags} style={styles.input} />
              <Button 
                title={editingPrompt ? "Update Prompt" : "Submit Prompt"} 
                onPress={handleSubmitPrompt} 
                color={Platform.OS === 'ios' ? "#007AFF": "#007bff"}
              />
            </View>
          )}

          {isLoading && <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />}
          {error && !isLoading && <Text style={styles.errorText}>Error: {error}</Text>}

          {displayedPrompts.length > 0 ? (
            displayedPrompts.map(prompt => ( // Use displayedPrompts here
              <View key={prompt.id} style={styles.promptItem}>
                <View style={styles.promptContent}>
                  <Text style={styles.promptTool}>{prompt.tool}</Text>
                  <Text style={styles.promptText}>{prompt.text}</Text>
                  <Text style={styles.promptTags}>Tags: {prompt.tags.join(', ')}</Text>
                </View>
                <View style={styles.promptActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.favoriteButton]}
                    onPress={() => toggleFavorite(prompt.id, prompt.favorite)}
                  >
                    <Text style={[styles.actionButtonText, prompt.favorite && styles.favoritedButtonText]}>
                      {prompt.favorite ? '★' : '☆'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => handleStartEdit(prompt)}
                  >
                    <Text style={styles.actionButtonText}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeletePrompt(prompt.id)}
                  >
                    <Text style={[styles.actionButtonText, styles.deleteButtonText]}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            !isLoading && <Text style={styles.noPromptsText}>No prompts found for current filters.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f0f0f0' },
  containerScrollView: { flex: 1 },
  container: { flex: 1, padding: 16 },
  header: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 16, color: '#333' },
  searchInput: { height: 40, borderColor: 'gray', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, marginBottom: 12, backgroundColor: '#fff' },
  controlsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  formTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  addPromptForm: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  input: { borderColor: 'lightgray', borderWidth: 1, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10, backgroundColor: '#fff' },
  loader: { marginVertical: 20 },
  errorText: { color: 'red', textAlign: 'center', marginBottom: 10, marginTop: 10 },
  noPromptsText: { textAlign: 'center', marginTop: 20, fontSize: 16, color: '#666' },
  promptItem: { backgroundColor: '#fff', padding: 12, marginBottom: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  promptContent: { flex: 1, marginRight: 8 },
  promptTool: { fontSize: 16, fontWeight: 'bold', color: Platform.OS === 'ios' ? "#007AFF": '#007bff' },
  promptText: { fontSize: 14, color: '#333', marginTop: 4, marginBottom: 8 },
  promptTags: { fontSize: 12, color: '#666' },
  promptActions: { flexDirection: 'column', justifyContent: 'space-around', alignItems: 'flex-end' },
  actionButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 4, alignItems: 'center', justifyContent: 'center', minWidth: 40, marginBottom: 5 },
  favoriteButton: { borderWidth: 1, borderColor: Platform.OS === 'ios' ? "#007AFF": '#007bff' },
  editButton: { borderWidth: 1, borderColor: Platform.OS === 'ios' ? "#5cb85c" : '#5cb85c'},
  deleteButton: { borderWidth: 1, borderColor: Platform.OS === 'ios' ? "#ff3b30" : '#dc3545' },
  actionButtonText: { fontSize: 18 },
  favoritedButtonText: { color: '#ffc107' },
  deleteButtonText: { color: Platform.OS === 'ios' ? "#ff3b30" : '#dc3545' },
});

export default App;
