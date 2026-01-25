import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';

const { width } = Dimensions.get('window');

export default function CategoryScreen({ route, navigation }) {
  // Now supports 'category' (string) passed for fetching
  const { title, novels, category } = route.params;
  
  const [data, setData] = useState(novels || []);
  const [loading, setLoading] = useState(!novels);
  const displayTitle = title || category;

  useEffect(() => {
    if (!novels && category) {
        fetchCategoryNovels();
    }
  }, [category]);

  const fetchCategoryNovels = async () => {
      try {
          const res = await api.get(`/api/novels?category=${encodeURIComponent(category)}`);
          // Fix: Access .novels array from response
          setData(res.data.novels || res.data || []);
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  const renderNovelItem = ({ item }) => (
    <TouchableOpacity
      style={styles.novelItem}
      onPress={() => navigation.navigate('NovelDetail', { novel: item })}
    >
      <Image source={{ uri: item.cover }} style={styles.novelImage} />
      
      <View style={styles.novelDetails}>
        <Text style={styles.novelTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.novelAuthor} numberOfLines={1}>
          {item.author}
        </Text>
        
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="star" size={14} color="#ffa500" />
            <Text style={styles.metaText}>{item.rating}</Text>
          </View>
          
          <View style={styles.metaItem}>
            <Ionicons name="book-outline" size={14} color="#666" />
            <Text style={styles.metaText}>{item.chaptersCount || item.chapters} فصل</Text>
          </View>
          
          <View style={styles.metaItem}>
            <Ionicons name="eye-outline" size={14} color="#666" />
            <Text style={styles.metaText}>{item.views}</Text>
          </View>
        </View>

        <View style={styles.tags}>
          <View style={styles.categoryTag}>
            <Text style={styles.categoryTagText}>{item.category || category}</Text>
          </View>
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-forward" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{displayTitle}</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
          <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
              <ActivityIndicator size="large" color="#4a7cc7" />
          </View>
      ) : (
        <FlatList
            data={data}
            renderItem={renderNovelItem}
            keyExtractor={item => item._id || item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={() => (
                <View style={{alignItems: 'center', marginTop: 50}}>
                    <Text style={{color: '#666'}}>لا توجد روايات في هذا التصنيف</Text>
                </View>
            )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  listContent: {
    padding: 20,
  },
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
});