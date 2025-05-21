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
import { Picker } from '@react-native-picker/picker'; // Standard picker
import * as Clipboard from 'expo-clipboard'; // For clipboard access

const API_BASE = 'http://localhost:3000';

const App = () => {
  const [prompts, setPrompts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTags, setSearchTags] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formVisible, setFormVisible] = useState(false);
  const [newPromptText, setNewPromptText] = useState('');
  const [newPromptTool, setNewPromptTool] = useState('');
  const [newPromptTags, setNewPromptTags] = useState('');

  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(null);
  
  // --- New state for sorting ---
  const [sortCriteria, setSortCriteria] = useState('dateAdded'); // Default sort

  const scrollViewRef = useRef(null);

  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    try {
      const date = new Date(dateString);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    } catch {
      return "Invalid Date";
    }
  };

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
      let data = await response.json();
      // Initialize usageCount/lastUsed if missing (for older data)
      data = data.map(p => ({
        ...p,
        usageCount: p.usageCount || 0,
        lastUsed: p.lastUsed || null,
      }));
      setPrompts(data);
    } catch (e) {
      setError(e.message);
      Alert.alert("Error", "Failed to fetch prompts: " + e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrompts(searchQuery, searchTags);
  }, [fetchPrompts, searchQuery, searchTags]);

  const handleSubmitPrompt = async () => {
    if (!newPromptText.trim()) {
      Alert.alert("Validation", "Prompt text cannot be empty.");
      return;
    }
    setIsLoading(true);
    const tagsArray = newPromptTags.split(',').map(tag => tag.trim()).filter(tag => tag);
    const url = editingPrompt ? `${API_BASE}/api/prompts/${editingPrompt.id}` : `${API_BASE}/api/prompts`;
    const method = editingPrompt ? 'PUT' : 'POST';
    // Backend handles usageCount and lastUsed on creation
    const body = {
      text: newPromptText,
      tool: newPromptTool,
      tags: tagsArray,
      favorite: editingPrompt ? editingPrompt.favorite : false,
    };

    try {
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: 'Unknown API error' }));
        throw new Error(errData.message || `HTTP error! status: ${response.status}`);
      }
      const updatedOrNewPrompt = await response.json();
      if (editingPrompt) {
        setPrompts(prev => prev.map(p => (p.id === editingPrompt.id ? { ...p, ...updatedOrNewPrompt } : p)));
      } else {
        fetchPrompts(searchQuery, searchTags); // Refresh to get new prompt with defaults
      }
      setNewPromptText(''); setNewPromptTool(''); setNewPromptTags('');
      setEditingPrompt(null); setFormVisible(false);
    } catch (e) {
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
      setPrompts(prev => prev.map(p => (p.id === id ? { ...p, ...updatedPrompt } : p)));
    } catch (e) {
      Alert.alert("Error", `Failed to update favorite status: ${e.message}`);
    }
  };
  
  // --- Log Usage Function ---
  const handleLogUsage = async (promptToLog) => {
    try {
      await Clipboard.setStringAsync(promptToLog.text); // Use setStringAsync for expo-clipboard v~12+
      Alert.alert("Copied!", "Prompt text copied to clipboard.");
    } catch (err) {
      console.error('Failed to copy text: ', err);
      Alert.alert("Copy Error", "Failed to copy text. See console.");
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/api/prompts/${promptToLog.id}/logusage`, { method: 'POST' });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: 'Unknown API error' }));
        throw new Error(errData.message || `HTTP error! status: ${response.status}`);
      }
      const updatedPrompt = await response.json();
      setPrompts(prevPrompts =>
        prevPrompts.map(p => (p.id === updatedPrompt.id ? { ...p, ...updatedPrompt } : p))
      );
    } catch (e) {
      Alert.alert("Error", `Failed to log usage: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };


  const handleStartEdit = (prompt) => { /* ... (same as before) ... */ 
    setEditingPrompt(prompt);
    setNewPromptText(prompt.text);
    setNewPromptTool(prompt.tool);
    setNewPromptTags(prompt.tags.join(', '));
    setFormVisible(true);
    setTimeout(() => scrollViewRef.current?.scrollTo({ y: 0, animated: true }), 100);
  };
  const handleCancelForm = () => { /* ... (same as before) ... */ 
    setEditingPrompt(null);
    setNewPromptText('');
    setNewPromptTool('');
    setNewPromptTags('');
    setFormVisible(false);
  };
  const handleDeletePrompt = (promptId) => { /* ... (same as before) ... */ 
    Alert.alert( "Delete Prompt", "Are you sure you want to delete this prompt?",
      [ { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => {
            setIsLoading(true);
            try {
              const response = await fetch(`${API_BASE}/api/prompts/${promptId}`, { method: 'DELETE' });
              if (!response.ok) {
                const errData = await response.json().catch(() => ({ message: 'Unknown API error during delete' }));
                throw new Error(errData.message || `HTTP error! status: ${response.status}`);
              }
              setPrompts(prevPrompts => prevPrompts.filter(p => p.id !== promptId));
            } catch (e) { Alert.alert("Error", `Failed to delete prompt: ${e.message}`); } 
            finally { setIsLoading(false); }
          },
        },
      ]
    );
  };
  
  // --- Sorting and Filtering Logic for Display ---
  let displayedPrompts = [...prompts];

  // 1. Filter by favorites
  if (showOnlyFavorites) {
    displayedPrompts = displayedPrompts.filter(p => p.favorite);
  }

  // 2. Sort
  if (sortCriteria === 'usageCountDesc') {
    displayedPrompts.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
  } else if (sortCriteria === 'usageCountAsc') {
    displayedPrompts.sort((a, b) => (a.usageCount || 0) - (b.usageCount || 0));
  } else if (sortCriteria === 'lastUsedDesc') {
    displayedPrompts.sort((a, b) => {
      const dateA = a.lastUsed ? new Date(a.lastUsed).getTime() : 0; // Treat null as very old
      const dateB = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
      return dateB - dateA;
    });
  } else if (sortCriteria === 'lastUsedAsc') {
    displayedPrompts.sort((a, b) => {
      const dateA = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
      const dateB = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
      return dateA - dateB;
    });
  } else if (sortCriteria === 'dateAdded') {
    displayedPrompts.sort((a, b) => a.id - b.id); // Assuming IDs are sequential
  }


  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView ref={scrollViewRef} style={styles.containerScrollView} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <Text style={styles.header}>PromptCache Mobile</Text>

          <TextInput style={styles.searchInput} placeholder="Search by keyword..." value={searchQuery} onChangeText={setSearchQuery} />
          <TextInput style={styles.searchInput} placeholder="Filter by tags (e.g., js,react)" value={searchTags} onChangeText={setSearchTags} autoCapitalize="none" />
          
          {/* --- Sort Picker --- */}
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Sort by:</Text>
            <Picker
              selectedValue={sortCriteria}
              style={styles.picker}
              onValueChange={(itemValue) => setSortCriteria(itemValue)}
              prompt="Sort Prompts By"
            >
              <Picker.Item label="Date Added" value="dateAdded" />
              <Picker.Item label="Usage Count (Most First)" value="usageCountDesc" />
              <Picker.Item label="Usage Count (Least First)" value="usageCountAsc" />
              <Picker.Item label="Last Used (Newest First)" value="lastUsedDesc" />
              <Picker.Item label="Last Used (Oldest First)" value="lastUsedAsc" />
            </Picker>
          </View>


          <View style={styles.controlsContainer}>
            <Button title={showOnlyFavorites ? "Show All" : "Show Favorites"} onPress={() => setShowOnlyFavorites(!showOnlyFavorites)} color={showOnlyFavorites ? "#ffc107" : Platform.OS === 'ios' ? "#007AFF": "#007bff"} />
            <Button title={formVisible ? (editingPrompt ? "Cancel Edit" : "Cancel Add") : "Add New Prompt"} onPress={() => { if (formVisible) { handleCancelForm(); } else { setEditingPrompt(null); setFormVisible(true); setTimeout(() => scrollViewRef.current?.scrollTo({ y: 0, animated: true }), 100); }}} color={formVisible ? "#dc3545" : (Platform.OS === 'ios' ? "#007AFF": "#28a745")} />
          </View>

          {formVisible && ( /* ... Form remains the same ... */ 
            <View style={styles.addPromptForm}>
              <Text style={styles.formTitle}>{editingPrompt ? 'Edit Prompt' : 'Add New Prompt'}</Text>
              <TextInput placeholder="Prompt Text" value={newPromptText} onChangeText={setNewPromptText} style={styles.input} multiline />
              <TextInput placeholder="Tool (e.g., GPT-4)" value={newPromptTool} onChangeText={setNewPromptTool} style={styles.input} />
              <TextInput placeholder="Tags (comma-separated)" value={newPromptTags} onChangeText={setNewPromptTags} style={styles.input} />
              <Button title={editingPrompt ? "Update Prompt" : "Submit Prompt"} onPress={handleSubmitPrompt} color={Platform.OS === 'ios' ? "#007AFF": "#007bff"} />
            </View>
          )}

          {isLoading && <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />}
          {error && !isLoading && <Text style={styles.errorText}>Error: {error}</Text>}

          {displayedPrompts.length > 0 ? (
            displayedPrompts.map(prompt => (
              <View key={prompt.id} style={styles.promptItem}>
                <View style={styles.promptContent}>
                  <Text style={styles.promptTool}>{prompt.tool}</Text>
                  <Text style={styles.promptText}>{prompt.text}</Text>
                  <Text style={styles.promptTags}>Tags: {prompt.tags.join(', ')}</Text>
                  {/* --- Usage Info --- */}
                  <View style={styles.usageInfoContainer}>
                    <Text style={styles.usageText}>Usage: {prompt.usageCount || 0}</Text>
                    <Text style={styles.usageText}>Last: {formatDate(prompt.lastUsed)}</Text>
                  </View>
                </View>
                <View style={styles.promptActions}>
                  <TouchableOpacity style={[styles.actionButton, styles.favoriteButton]} onPress={() => toggleFavorite(prompt.id, prompt.favorite)}><Text style={[styles.actionButtonText, prompt.favorite && styles.favoritedButtonText]}>{prompt.favorite ? '★' : '☆'}</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={() => handleStartEdit(prompt)}><Text style={styles.actionButtonText}>✏️</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => handleDeletePrompt(prompt.id)}><Text style={[styles.actionButtonText, styles.deleteButtonText]}>🗑️</Text></TouchableOpacity>
                </View>
                {/* --- Copy & Log Use Button --- */}
                <TouchableOpacity style={styles.copyLogButton} onPress={() => handleLogUsage(prompt)}>
                  <Text style={styles.copyLogButtonText}>📋 Copy & Log Use</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : ( !isLoading && <Text style={styles.noPromptsText}>No prompts found for current filters.</Text> )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f0f0f0' },
  containerScrollView: { flex: 1 },
  container: { flex: 1, padding: 16 },
  header: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 10, color: '#333' },
  searchInput: { height: 40, borderColor: 'gray', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, marginBottom: 10, backgroundColor: '#fff' },
  pickerContainer: {
    marginBottom: 12,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#fff',
    height: Platform.OS === 'ios' ? 120 : 50, // iOS Picker is taller by default
    justifyContent: 'center',
  },
  pickerLabel: {
    fontSize: 12,
    color: 'gray',
    paddingHorizontal: 10,
    paddingTop: Platform.OS === 'ios' ? 5 : 0, // Adjust label for iOS
  },
  picker: {
    height: Platform.OS === 'ios' ? 100 : 50, // iOS needs more height for wheel
    width: '100%',
  },
  controlsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  formTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  addPromptForm: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  input: { borderColor: 'lightgray', borderWidth: 1, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10, backgroundColor: '#fff' },
  loader: { marginVertical: 20 },
  errorText: { color: 'red', textAlign: 'center', marginBottom: 10, marginTop: 10 },
  noPromptsText: { textAlign: 'center', marginTop: 20, fontSize: 16, color: '#666' },
  promptItem: { backgroundColor: '#fff', padding: 12, marginBottom: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' }, // Removed flex row for vertical layout of content + actions
  promptContent: { marginBottom: 8 }, // Added margin for spacing before copy button
  promptTool: { fontSize: 16, fontWeight: 'bold', color: Platform.OS === 'ios' ? "#007AFF": '#007bff' },
  promptText: { fontSize: 14, color: '#333', marginTop: 4, marginBottom: 4 },
  promptTags: { fontSize: 12, color: '#666', marginBottom: 6 },
  usageInfoContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  usageText: { fontSize: 12, color: '#444' },
  promptActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 8 }, // Kept actions in a row, at the end
  actionButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 4, alignItems: 'center', justifyContent: 'center', minWidth: 40, marginLeft: 8 }, // Added marginLeft for spacing between action buttons
  favoriteButton: { borderWidth: 1, borderColor: Platform.OS === 'ios' ? "#007AFF": '#007bff' },
  editButton: { borderWidth: 1, borderColor: Platform.OS === 'ios' ? "#5cb85c" : '#5cb85c'},
  deleteButton: { borderWidth: 1, borderColor: Platform.OS === 'ios' ? "#ff3b30" : '#dc3545' },
  actionButtonText: { fontSize: 18 },
  favoritedButtonText: { color: '#ffc107' },
  deleteButtonText: { color: Platform.OS === 'ios' ? "#ff3b30" : '#dc3545' },
  copyLogButton: {
    backgroundColor: Platform.OS === 'ios' ? '#e0e0e0' : '#ddd',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 8,
  },
  copyLogButtonText: { fontSize: 14, color: '#333', fontWeight: '500' },
});

export default App;
