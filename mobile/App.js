import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TextInput, ScrollView, Button, TouchableOpacity, Platform } from 'react-native';

const API_BASE = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

export default function App() {
  const [prompts, setPrompts] = useState([]);
  const [search, setSearch] = useState('');
  const [text, setText] = useState('');
  const [tool, setTool] = useState('');
  const [tags, setTags] = useState('');

  async function load() {
    const res = await fetch(`${API_BASE}/api/prompts/search?q=${encodeURIComponent(search)}`);
    const data = await res.json();
    setPrompts(data);
  }

  async function addPrompt() {
    await fetch(`${API_BASE}/api/prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        tool,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean)
      })
    });
    setText('');
    setTool('');
    setTags('');
    load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PromptCache</Text>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Search prompts"
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
        />
        <Button title="Search" onPress={load} />
      </View>
      <ScrollView style={styles.list}>
        {prompts.map(p => (
          <View key={p.id} style={styles.prompt}>
            <View style={styles.promptHeader}>
              <Text style={styles.tool}>{p.tool}</Text>
              <Text style={styles.tags}>{p.tags.join(', ')}</Text>
            </View>
            <Text style={styles.text}>{p.text}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.addSection}>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          placeholder="Prompt text"
          placeholderTextColor="#888"
          value={text}
          onChangeText={setText}
        />
        <TextInput
          style={styles.input}
          placeholder="Tool"
          placeholderTextColor="#888"
          value={tool}
          onChangeText={setTool}
        />
        <TextInput
          style={styles.input}
          placeholder="Tags"
          placeholderTextColor="#888"
          value={tags}
          onChangeText={setTags}
        />
        <TouchableOpacity style={styles.button} onPress={addPrompt}>
          <Text style={styles.buttonText}>Add Prompt</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 16,
    paddingTop: 48
  },
  title: {
    color: '#fff',
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 16
  },
  searchRow: {
    flexDirection: 'row',
    marginBottom: 16
  },
  input: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    marginBottom: 8
  },
  textArea: {
    height: 80
  },
  list: {
    flex: 1,
    marginBottom: 16
  },
  prompt: {
    backgroundColor: '#1e1e1e',
    borderRadius: 4,
    padding: 12,
    marginBottom: 12
  },
  promptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  tool: {
    color: '#fff',
    fontWeight: 'bold'
  },
  tags: {
    color: '#aaa'
  },
  text: {
    color: '#fff'
  },
  addSection: {
    marginTop: 8
  },
  button: {
    backgroundColor: '#4a90e2',
    paddingVertical: 10,
    borderRadius: 4,
    marginTop: 8
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold'
  }
});

