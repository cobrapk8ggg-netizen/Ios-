import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Keyboard,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Image } from 'expo-image'; 
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export default function SearchScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  
  let searchTimeout = null;

  useEffect(() => {
    loadSearchHistory();
  }, []);

  const loadSearchHistory = async () => {
    try {
      const history = await AsyncStorage.getItem('searchHistory');
      if (history) {
        setSearchHistory(JSON.parse(history));
      }
    } catch (e) {
      console.log('Error loading history');
    }
  };

  const saveSearchHistory = async (query) => {
    if (!query.trim()) return;
    try {
      let newHistory = [query, ...searchHistory.filter(h => h !== query)];
      newHistory = newHistory.slice(0, 10); // Limit to 10 items
      setSearchHistory(newHistory);
      await AsyncStorage.setItem('searchHistory', JSON.stringify(newHistory));
    } catch (e) {
      console.log('Error saving history');
    }
  };

  const clearHistory = async () => {
    try {
      await AsyncStorage.removeItem('searchHistory');
      setSearchHistory([]);
    } catch (e) {
      console.log('Error clearing history');
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    
    if (searchTimeout) clearTimeout(searchTimeout);

    if (query.trim()) {
      setLoading(true);
      // Reduced debounce time for snappier feeling (300ms)
      searchTimeout = setTimeout(async () => {
        try {
            const response = await api.get(`/api/novels?search=${encodeURIComponent(query)}`);
            // Fix: Access .novels array from response
            setSearchResults(response.data.novels || response.data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
      }, 300); 
    } else {
      setSearchResults([]);
      setLoading(false);
    }
  };

  const handleResultPress = (item) => {
    saveSearchHistory(searchQuery);
    Keyboard.dismiss();
    navigation.navigate('NovelDetail', { novel: item });
  };

  const renderSearchResult = ({ item }) => (
    <TouchableOpacity
      style={styles.novelItem}
      onPress={() => handleResultPress(item)}
    >
      <Image 
        source={item.cover} 
        style={styles.novelImage} 
        contentFit="cover"
        transition={300}
        cachePolicy="memory-disk"
      />
      
      <View style={styles.novelDetails}>
        <Text style={styles.novelTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.novelAuthor} numberOfLines={1}>{item.author}</Text>
        
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="star" size={14} color="#ffa500" />
            <Text style={styles.metaText}>{item.rating || 0}</Text>
          </View>
          
          <View style={styles.metaItem}>
            <Ionicons name="book-outline" size={14} color="#666" />
            <Text style={styles.metaText}>{item.chaptersCount || item.chapters?.length || 0} فصل</Text>
          </View>
          
          <View style={styles.metaItem}>
            <Ionicons name="eye-outline" size={14} color="#666" />
            <Text style={styles.metaText}>{item.views || 0}</Text>
          </View>
        </View>

        <View style={styles.tags}>
          {item.category && (
             <View style={styles.categoryTag}>
               <Text style={styles.categoryTagText}>{item.category}</Text>
             </View>
          )}
          {item.status && (
            <View style={[styles.statusTag, item.status === 'متوقفة' ? {borderColor: '#ff4444', backgroundColor: 'rgba(255,68,68,0.2)'} : {}]}>
              <Ionicons name={item.status === 'مكتملة' ? "checkmark-circle" : "ellipse"} size={12} color={item.status === 'متوقفة' ? '#ff4444' : '#4ade80'} />
              <Text style={[styles.statusTagText, item.status === 'متوقفة' ? {color: '#ff4444'} : {}]}>{item.status}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="ابحث عن رواية..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={handleSearch}
            autoFocus
            onSubmitEditing={() => saveSearchHistory(searchQuery)}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
          <ActivityIndicator style={{marginTop: 50}} color="#4a7cc7" />
      ) : searchResults.length > 0 ? (
        <FlatList
          data={searchResults}
          renderItem={renderSearchResult}
          keyExtractor={item => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.resultsList}
        />
      ) : searchQuery !== '' ? (
        <View style={styles.noResultsContainer}>
          <Text style={styles.noResultsText}>لا توجد نتائج</Text>
        </View>
      ) : (
          <View style={styles.historyContainer}>
            <View style={styles.historyHeader}>
              <TouchableOpacity onPress={clearHistory} disabled={searchHistory.length === 0}>
                <Text style={[styles.clearText, searchHistory.length === 0 && {color: '#333'}]}>مسح الكل</Text>
              </TouchableOpacity>
              <Text style={styles.sectionTitle}>🕒 آخر عمليات البحث</Text>
            </View>
            
            <View style={styles.historyList}>
              {searchHistory.length > 0 ? (
                  searchHistory.map((item, index) => (
                    <TouchableOpacity key={index} style={styles.historyChip} onPress={() => handleSearch(item)}>
                      <Ionicons name="time-outline" size={14} color="#666" style={{marginRight: 6}} />
                      <Text style={styles.historyText}>{item}</Text>
                    </TouchableOpacity>
                  ))
              ) : (
                  <Text style={{color: '#444', textAlign: 'center', width: '100%', marginTop: 20}}>سجل البحث فارغ</Text>
              )}
            </View>
          </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, gap: 12, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  searchInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', borderRadius: 15, paddingHorizontal: 15, height: 48, gap: 10, borderWidth: 1, borderColor: '#2a2a2a' },
  searchInput: { flex: 1, color: '#fff', fontSize: 16, textAlign: 'right' },
  
  resultsList: { padding: 20 },
  
  // Card Styles (Matched with CategoryScreen)
  novelItem: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 18,
    marginBottom: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  novelImage: {
    width: 120,
    height: 160,
    backgroundColor: '#2a2a2a',
  },
  novelDetails: {
    flex: 1,
    padding: 15,
  },
  novelTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
    textAlign: 'right',
  },
  novelAuthor: {
    fontSize: 14,
    color: '#888',
    marginBottom: 12,
    textAlign: 'right',
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 15,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#666',
  },
  tags: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap'
  },
  categoryTag: {
    backgroundColor: 'rgba(74, 124, 199, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4a7cc7',
  },
  categoryTagText: {
    fontSize: 12,
    color: '#4a7cc7',
    fontWeight: '600',
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: '#4ade80',
  },
  statusTagText: {
    fontSize: 11,
    color: '#4ade80',
    fontWeight: '600',
  },

  noResultsContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noResultsText: { fontSize: 18, color: '#666' },
  
  historyContainer: { padding: 20 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  clearText: { color: '#ff4444', fontSize: 14 },
  
  historyList: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end' },
  historyChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#333' },
  historyText: { color: '#ccc', fontSize: 14 },
});