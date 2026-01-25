import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  ActivityIndicator,
  Modal,
  ScrollView,
  useWindowDimensions,
  TextInput
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { useFocusEffect } from '@react-navigation/native';

const CATEGORIES = [
    { id: 'all', name: 'الكل' },
    { id: 'action', name: 'أكشن' },
    { id: 'romance', name: 'رومانسي' },
    { id: 'fantasy', name: 'فانتازيا' },
    { id: 'xianxia', name: 'شيانشيا' },
    { id: 'xuanhuan', name: 'شوانهوان' },
    { id: 'wuxia', name: 'وشيا' },
    { id: 'adventure', name: 'مغامرات' },
    { id: 'system', name: 'نظام' },
    { id: 'harem', name: 'حريم' },
    { id: 'horror', name: 'رعب' },
    { id: 'scifi', name: 'خيال علمي' }
];

const STATUS_OPTIONS = [
    { id: 'all', name: 'جميع الحالات' },
    { id: 'ongoing', name: 'مستمرة' },
    { id: 'completed', name: 'مكتملة' },
    { id: 'stopped', name: 'متوقفة' }
];

const SORT_OPTIONS = [
    { id: 'chapters_desc', name: 'عدد الفصول - من أعلى لأقل' },
    { id: 'chapters_asc', name: 'عدد الفصول - من أقل لأعلى' },
    { id: 'title_asc', name: 'الاسم - أ إلى ي' },
    { id: 'title_desc', name: 'الاسم - ي إلى أ' },
];

export default function LibraryScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const numColumns = width > 600 ? 4 : 2; // Responsive grid

  const [loading, setLoading] = useState(true);
  const [novels, setNovels] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters State
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedSort, setSelectedSort] = useState('chapters_desc');
  const [searchQuery, setSearchQuery] = useState(''); // New Search State

  // Modal State
  const [activeModal, setActiveModal] = useState(null); // 'category', 'status', 'sort'

  let searchTimeout = null;

  const fetchNovels = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/novels', {
          params: {
              page,
              limit: 20,
              category: selectedCategory,
              status: selectedStatus,
              sort: selectedSort,
              search: searchQuery // Pass search query
          }
      });
      
      if (Array.isArray(response.data)) {
          setNovels(response.data);
          setTotalPages(1);
      } else {
          setNovels(response.data.novels || []);
          setTotalPages(response.data.totalPages || 1);
      }
    } catch (error) {
      console.error("Library Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
      // Debounce logic is handled by the state update triggering this effect
      // But for typing, we rely on the state update. 
      // Ideally, we should debounce the setPage(1) on search change.
      fetchNovels();
  }, [page, selectedCategory, selectedStatus, selectedSort, searchQuery]);

  // Reset page when filters change
  useEffect(() => {
      setPage(1);
  }, [selectedCategory, selectedStatus, selectedSort]);

  const handleSearchChange = (text) => {
      setSearchQuery(text);
      setPage(1); // Reset to page 1 on search
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'مكتملة': return '#4ade80';
      case 'متوقفة': return '#ff4444';
      default: return '#4a7cc7';
    }
  };

  const renderFilterButton = (label, type, value, options) => {
      const selectedLabel = options.find(o => o.id === value)?.name || label;
      return (
        <TouchableOpacity 
            style={styles.filterButton} 
            onPress={() => setActiveModal(type)}
        >
            <Text style={styles.filterButtonText} numberOfLines={1}>{selectedLabel}</Text>
            <Ionicons name="chevron-down" size={14} color="#888" />
        </TouchableOpacity>
      );
  };

  const renderModal = (type, options, currentValue, onSelect) => (
      <Modal
        visible={activeModal === type}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setActiveModal(null)}
          >
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>
                      {type === 'sort' ? 'الترتيب حسب' : type === 'category' ? 'التصنيفات' : 'الحالة'}
                  </Text>
                  <ScrollView style={{maxHeight: 300}}>
                      {options.map(item => (
                          <TouchableOpacity 
                            key={item.id} 
                            style={[
                                styles.modalOption, 
                                currentValue === item.id && styles.modalOptionActive
                            ]}
                            onPress={() => {
                                onSelect(item.id);
                                setActiveModal(null);
                            }}
                          >
                              <Text style={[
                                  styles.modalOptionText,
                                  currentValue === item.id && styles.modalOptionTextActive
                              ]}>{item.name}</Text>
                              {currentValue === item.id && (
                                  <Ionicons name="checkmark" size={18} color="#4a7cc7" />
                              )}
                          </TouchableOpacity>
                      ))}
                  </ScrollView>
              </View>
          </TouchableOpacity>
      </Modal>
  );

  const renderNovelItem = ({ item }) => (
    <TouchableOpacity
      style={styles.novelCard}
      onPress={() => navigation.navigate('NovelDetail', { novel: item })}
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
          <Image 
            source={item.cover} 
            style={styles.novelImage}
            contentFit="cover"
            transition={300}
            cachePolicy="memory-disk"
          />
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{item.status || 'مستمرة'}</Text>
          </View>
      </View>
      
      <View style={styles.cardInfo}>
          <Text style={styles.novelTitle} numberOfLines={2}>{item.title}</Text>
          <View style={styles.novelStats}>
              <View style={styles.statBadge}>
                  <Ionicons name="book-outline" size={12} color="#888" />
                  <Text style={styles.statText}>{item.chaptersCount || 0} فصل</Text>
              </View>
              {item.category && (
                  <View style={styles.statBadge}>
                      <Text style={[styles.statText, {color: '#4a7cc7'}]}>{item.category}</Text>
                  </View>
              )}
          </View>
      </View>
    </TouchableOpacity>
  );

  const renderPagination = () => {
      if (totalPages <= 1) return null;
      
      let pages = [];
      const maxButtons = 5;
      let start = Math.max(1, page - 2);
      let end = Math.min(totalPages, start + maxButtons - 1);
      
      if (end - start < maxButtons - 1) {
          start = Math.max(1, end - maxButtons + 1);
      }

      for (let i = start; i <= end; i++) {
          pages.push(i);
      }

      return (
          <View style={styles.paginationContainer}>
              {page > 1 && (
                  <TouchableOpacity style={styles.pageButton} onPress={() => setPage(p => p - 1)}>
                      <Ionicons name="chevron-back" size={18} color="#fff" />
                  </TouchableOpacity>
              )}
              
              {pages.map(p => (
                  <TouchableOpacity 
                    key={p} 
                    style={[styles.pageButton, page === p && styles.pageButtonActive]} 
                    onPress={() => setPage(p)}
                  >
                      <Text style={[styles.pageText, page === p && styles.pageTextActive]}>{p}</Text>
                  </TouchableOpacity>
              ))}

              {page < totalPages && (
                  <TouchableOpacity style={styles.pageButton} onPress={() => setPage(p => p + 1)}>
                      <Ionicons name="chevron-forward" size={18} color="#fff" />
                  </TouchableOpacity>
              )}
          </View>
      );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>المكتبة</Text>
        <Text style={styles.headerSubtitle}>تصفح جميع الروايات</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <Ionicons name="search" size={20} color="#666" style={{marginLeft: 10}} />
        <TextInput
            style={styles.searchInput}
            placeholder="ابحث داخل المكتبة..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={handleSearchChange}
        />
        {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearchChange('')}>
                <Ionicons name="close-circle" size={18} color="#666" />
            </TouchableOpacity>
        )}
      </View>

      {/* Filter Bar */}
      <View style={styles.filterContainer}>
          {renderFilterButton('الترتيب', 'sort', selectedSort, SORT_OPTIONS)}
          {renderFilterButton('التصنيف', 'category', selectedCategory, CATEGORIES)}
          {renderFilterButton('الحالة', 'status', selectedStatus, STATUS_OPTIONS)}
      </View>

      {/* Content */}
      {loading ? (
          <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4a7cc7" />
          </View>
      ) : (
          <FlatList 
            data={novels}
            keyExtractor={item => item._id}
            renderItem={renderNovelItem}
            numColumns={numColumns}
            key={numColumns} // Force re-render on orientation change
            contentContainerStyle={styles.listContent}
            // IMPORTANT: RTL Support using row-reverse
            columnWrapperStyle={[styles.columnWrapper, { flexDirection: 'row-reverse' }]}
            ListFooterComponent={renderPagination}
            ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                    <Ionicons name="library-outline" size={50} color="#333" />
                    <Text style={styles.emptyText}>لا توجد روايات تطابق بحثك</Text>
                </View>
            )}
          />
      )}

      {/* Modals */}
      {renderModal('sort', SORT_OPTIONS, selectedSort, setSelectedSort)}
      {renderModal('category', CATEGORIES, selectedCategory, setSelectedCategory)}
      {renderModal('status', STATUS_OPTIONS, selectedStatus, setSelectedStatus)}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'right',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
    marginTop: 2,
  },
  
  // Search Bar Styles
  searchBarContainer: {
    flexDirection: 'row-reverse', // RTL for icon and text input alignment
    alignItems: 'center',
    backgroundColor: '#161616',
    marginHorizontal: 15,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 45,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    textAlign: 'right',
    fontSize: 14,
    marginRight: 10,
  },

  filterContainer: {
      flexDirection: 'row',
      padding: 10,
      gap: 10,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: '#1a1a1a',
      justifyContent: 'flex-end',
      marginBottom: 5,
  },
  filterButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#161616',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#2a2a2a',
  },
  filterButtonText: {
      color: '#ccc',
      fontSize: 12,
      fontWeight: '500',
      flex: 1,
      textAlign: 'right',
      marginRight: 5,
  },
  
  // Grid Styles
  listContent: {
      padding: 10,
      paddingBottom: 40,
  },
  columnWrapper: {
      justifyContent: 'flex-start', // Combined with row-reverse, this aligns items to the right
      gap: 10,
  },
  novelCard: {
      flex: 1,
      backgroundColor: '#161616',
      borderRadius: 12,
      marginBottom: 10,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: '#222',
      maxWidth: '48%', // Ensures 2 items per row with gap
  },
  imageContainer: {
      height: 200,
      width: '100%',
      position: 'relative',
  },
  novelImage: {
      width: '100%',
      height: '100%',
  },
  statusBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
  },
  statusText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: 'bold',
  },
  cardInfo: {
      padding: 10,
  },
  novelTitle: {
      color: '#fff',
      fontSize: 14,
      fontWeight: 'bold',
      textAlign: 'right',
      marginBottom: 8,
      height: 40,
  },
  novelStats: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  statBadge: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 4,
  },
  statText: {
      color: '#888',
      fontSize: 11,
  },

  // Pagination
  paginationContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 20,
      marginBottom: 20,
      gap: 8,
  },
  pageButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#161616',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#333',
  },
  pageButtonActive: {
      backgroundColor: '#4a7cc7',
      borderColor: '#4a7cc7',
  },
  pageText: {
      color: '#fff',
      fontSize: 14,
  },
  pageTextActive: {
      fontWeight: 'bold',
  },

  // Loading & Empty
  loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
  },
  emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 50,
  },
  emptyText: {
      color: '#666',
      marginTop: 10,
  },

  // Modal Styles
  modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
  },
  modalContent: {
      width: '85%',
      backgroundColor: '#1a1a1a',
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: '#333',
  },
  modalTitle: {
      color: '#fff',
      fontSize: 18,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 15,
      borderBottomWidth: 1,
      borderBottomColor: '#333',
      paddingBottom: 10,
  },
  modalOption: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#222',
  },
  modalOptionActive: {
      backgroundColor: 'rgba(74, 124, 199, 0.1)',
  },
  modalOptionText: {
      color: '#ccc',
      fontSize: 15,
      textAlign: 'right',
  },
  modalOptionTextActive: {
      color: '#4a7cc7',
      fontWeight: 'bold',
  },
});
