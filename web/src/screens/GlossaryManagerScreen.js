
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

// Categories Configuration
const CATEGORIES = [
    { id: 'characters', label: 'شخصيات' },
    { id: 'locations', label: 'أماكن' },
    { id: 'items', label: 'عناصر' },
    { id: 'ranks', label: 'رتب' },
    { id: 'other', label: 'أخرى' }
];

export default function GlossaryManagerScreen({ navigation, route }) {
  const initialNovelId = route.params?.novelId;
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [terms, setTerms] = useState([]);
  const [filteredTerms, setFilteredTerms] = useState([]);
  const [search, setSearch] = useState('');
  
  // Tabs State
  const [activeTab, setActiveTab] = useState('characters');

  // Add/Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [inputTerm, setInputTerm] = useState('');
  const [inputTrans, setInputTrans] = useState('');
  const [inputDesc, setInputDesc] = useState('');
  const [inputCat, setInputCat] = useState('characters');

  useEffect(() => {
      fetchTerms();
  }, []);

  useEffect(() => {
      filterData();
  }, [search, terms, activeTab]);

  const filterData = () => {
      let data = terms.filter(t => (t.category || 'other') === activeTab);
      
      if (search.trim()) {
          const lower = search.toLowerCase();
          data = data.filter(t => t.term.toLowerCase().includes(lower) || t.translation.includes(lower));
      }
      setFilteredTerms(data);
  };

  const fetchTerms = async () => {
      setLoading(true);
      try {
          const res = await api.get(`/api/translator/glossary/${initialNovelId}`);
          setTerms(res.data);
      } catch(e) { console.log(e); } 
      finally { setLoading(false); }
  };

  const handleSave = async () => {
      if (!inputTerm || !inputTrans) {
          showToast("الاسم والترجمة مطلوبان", "error");
          return;
      }
      try {
          const res = await api.post('/api/translator/glossary', {
              novelId: initialNovelId,
              term: inputTerm,
              translation: inputTrans,
              category: inputCat,
              description: inputDesc
          });
          
          if (editId) {
              setTerms(prev => prev.map(t => t.term === inputTerm ? res.data : t));
          } else {
              setTerms(prev => [...prev, res.data]);
          }
          
          setShowModal(false);
          resetForm();
          showToast("تم الحفظ", "success");
      } catch(e) {
          showToast("فشل الحفظ", "error");
      }
  };

  const resetForm = () => {
      setInputTerm(''); 
      setInputTrans(''); 
      setInputDesc('');
      setInputCat(activeTab); // Default to current tab
      setEditId(null);
  };

  const openEdit = (item) => {
      setEditId(item._id);
      setInputTerm(item.term);
      setInputTrans(item.translation);
      setInputDesc(item.description || '');
      setInputCat(item.category || 'other');
      setShowModal(true);
  };

  const deleteTerm = (id) => {
      Alert.alert("حذف", "هل أنت متأكد من حذف هذا المصطلح؟", [
          { text: "إلغاء" },
          { 
              text: "حذف", 
              style: 'destructive',
              onPress: async () => {
                  try {
                      await api.delete(`/api/translator/glossary/${id}`);
                      setTerms(prev => prev.filter(t => t._id !== id));
                      showToast("تم الحذف", "success");
                  } catch(e) { showToast("فشل الحذف", "error"); }
              }
          }
      ]);
  };

  const renderItem = ({ item }) => {
      return (
          <TouchableOpacity 
            style={styles.card}
            onPress={() => openEdit(item)}
            activeOpacity={0.7}
          >
              {/* Left: Delete Icon */}
              <TouchableOpacity style={styles.deleteIcon} onPress={() => deleteTerm(item._id)}>
                  <Ionicons name="trash-outline" size={18} color="#666" />
              </TouchableOpacity>

              {/* Right: Content */}
              <View style={styles.cardContent}>
                  <View style={styles.headerRow}>
                      <Text style={styles.enText}>{item.term}</Text>
                      <Ionicons name="arrow-forward" size={12} color="#666" style={{marginHorizontal: 8}} />
                      <Text style={styles.arText}>{item.translation}</Text>
                  </View>
                  
                  <View style={styles.descRow}>
                      {item.description ? <Text style={styles.descText}>{item.description}</Text> : null}
                      <Text style={styles.categoryLabel}>{CATEGORIES.find(c => c.id === (item.category || 'other'))?.label}</Text>
                  </View>
              </View>
          </TouchableOpacity>
      );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
          <Text style={styles.headerTitle}>المسرد</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
              {CATEGORIES.map(cat => (
                  <TouchableOpacity 
                      key={cat.id} 
                      style={[styles.tab, activeTab === cat.id && styles.activeTab]}
                      onPress={() => setActiveTab(cat.id)}
                  >
                      <Text style={[styles.tabText, activeTab === cat.id && styles.activeTabText]}>{cat.label}</Text>
                  </TouchableOpacity>
              ))}
          </ScrollView>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput 
              style={styles.searchInput}
              placeholder="بحث..."
              placeholderTextColor="#666"
              value={search}
              onChangeText={setSearch}
              textAlign="right"
          />
      </View>

      {/* List */}
      {loading ? <ActivityIndicator color="#06b6d4" style={{marginTop:50}} /> : (
          <FlatList 
              data={filteredTerms}
              keyExtractor={item => item._id}
              renderItem={renderItem}
              contentContainerStyle={{padding: 15, paddingBottom: 80}}
              ListEmptyComponent={<Text style={{color: '#666', textAlign: 'center', marginTop: 50}}>لا توجد مصطلحات في هذا القسم</Text>}
          />
      )}

      {/* FAB Add Button */}
      <TouchableOpacity style={styles.fab} onPress={() => { resetForm(); setShowModal(true); }}>
          <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>{editId ? "تعديل مصطلح" : "إضافة مصطلح"}</Text>
                  
                  <ScrollView>
                      <Text style={styles.label}>القسم</Text>
                      <View style={styles.catSelector}>
                          {CATEGORIES.map(cat => (
                              <TouchableOpacity 
                                  key={cat.id}
                                  style={[styles.catOption, inputCat === cat.id && styles.catOptionActive]}
                                  onPress={() => setInputCat(cat.id)}
                              >
                                  <Text style={[styles.catText, inputCat === cat.id && {color: '#fff'}]}>{cat.label}</Text>
                              </TouchableOpacity>
                          ))}
                      </View>

                      <Text style={styles.label}>الكلمة الإنجليزية (الأصل)</Text>
                      <TextInput 
                          style={styles.input} 
                          value={inputTerm} 
                          onChangeText={setInputTerm}
                          placeholder="مثال: Noah Vines"
                          placeholderTextColor="#666"
                      />

                      <Text style={styles.label}>الترجمة العربية</Text>
                      <TextInput 
                          style={[styles.input, {textAlign:'right'}]} 
                          value={inputTrans} 
                          onChangeText={setInputTrans}
                          placeholder="مثال: نوح فاينز"
                          placeholderTextColor="#666"
                      />

                      <Text style={styles.label}>الوصف / الهوية (اختياري)</Text>
                      <TextInput 
                          style={[styles.input, {textAlign:'right'}]} 
                          value={inputDesc} 
                          onChangeText={setInputDesc}
                          placeholder="مثال: الشخصية الرئيسية"
                          placeholderTextColor="#666"
                      />
                  </ScrollView>

                  <View style={styles.modalBtns}>
                      <TouchableOpacity style={[styles.btn, {backgroundColor:'#333'}]} onPress={() => setShowModal(false)}>
                          <Text style={{color:'#fff'}}>إلغاء</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.btn, {backgroundColor:'#06b6d4'}]} onPress={handleSave}>
                          <Text style={{color:'#fff', fontWeight:'bold'}}>حفظ</Text>
                      </TouchableOpacity>
                  </View>
              </View>
          </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderColor: '#222', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  
  // Tabs
  tabsWrapper: { height: 60, borderBottomWidth: 1, borderColor: '#222' },
  tabsContainer: { paddingHorizontal: 10, alignItems: 'center', flexDirection: 'row-reverse' }, // RTL
  tab: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, marginHorizontal: 5, backgroundColor: '#161616', borderWidth: 1, borderColor: '#333' },
  activeTab: { backgroundColor: '#06b6d4', borderColor: '#06b6d4' },
  tabText: { color: '#888', fontWeight: '600' },
  activeTabText: { color: '#fff' },

  searchContainer: { flexDirection: 'row-reverse', backgroundColor: '#161616', margin: 15, padding: 10, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  searchInput: { flex: 1, color: '#fff', marginRight: 10, fontSize: 16 },

  // Card Design
  card: {
      flexDirection: 'row', // Default row (Left to Right)
      backgroundColor: '#111', 
      borderRadius: 10, 
      marginBottom: 10,
      borderWidth: 1,
      borderColor: '#222',
      alignItems: 'center',
      padding: 12
  },
  deleteIcon: { padding: 5, borderRightWidth: 1, borderRightColor: '#333', marginRight: 10 },
  
  cardContent: { flex: 1 },
  headerRow: { 
      flexDirection: 'row-reverse', // Arabic Right, English Left
      alignItems: 'center', 
      justifyContent: 'flex-start',
      marginBottom: 6 
  },
  arText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  enText: { color: '#ccc', fontSize: 14 },
  
  descRow: { 
      flexDirection: 'row-reverse', 
      justifyContent: 'space-between', 
      alignItems: 'center' 
  },
  descText: { color: '#666', fontSize: 11 },
  categoryLabel: { color: '#444', fontSize: 10, backgroundColor: '#1a1a1a', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },

  fab: { position: 'absolute', bottom: 30, left: 30, width: 60, height: 60, borderRadius: 30, backgroundColor: '#06b6d4', justifyContent: 'center', alignItems: 'center', elevation: 5 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#161616', padding: 20, borderRadius: 16, maxHeight: '80%' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  label: { color: '#888', marginBottom: 8, textAlign: 'right', fontSize: 12 },
  input: { backgroundColor: '#222', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#333' },
  
  catSelector: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
  catOption: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#222', borderWidth: 1, borderColor: '#333' },
  catOptionActive: { backgroundColor: '#06b6d4', borderColor: '#06b6d4' },
  catText: { color: '#ccc', fontSize: 12 },

  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 10 },
  btn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' }
});
