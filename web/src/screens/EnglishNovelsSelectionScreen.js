
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import CustomAlert from '../components/CustomAlert';

export default function EnglishNovelsSelectionScreen({ navigation }) {
  const { showToast } = useToast();
  const [novels, setNovels] = useState([]);
  const [filteredNovels, setFilteredNovels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedNovel, setSelectedNovel] = useState(null);
  
  // Chapter Selection
  const [chapters, setChapters] = useState([]);
  const [selectionMode, setSelectionMode] = useState('all'); // 'all' | 'manual'
  const [selectedChapters, setSelectedChapters] = useState([]);
  
  // Range Input State
  const [rangeInput, setRangeInput] = useState('');
  
  // Alert State
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});

  useEffect(() => {
      fetchNovels();
  }, []);

  useEffect(() => {
      if (search.trim()) {
          const lower = search.toLowerCase();
          setFilteredNovels(novels.filter(n => n.title.toLowerCase().includes(lower)));
      } else {
          setFilteredNovels(novels);
      }
  }, [search, novels]);

  const fetchNovels = async () => {
      try {
          const res = await api.get('/api/translator/novels'); 
          setNovels(res.data);
          setFilteredNovels(res.data);
      } catch(e) { console.log(e); } 
      finally { setLoading(false); }
  };

  const fetchChapters = async (novelId) => {
      try {
          const res = await api.get(`/api/novels/${novelId}`);
          setChapters(res.data.chapters || []);
      } catch(e) { console.log(e); }
  };

  const handleSelectNovel = (novel) => {
      setSelectedNovel(novel);
      fetchChapters(novel._id);
      setSelectedChapters([]);
      setRangeInput('');
      setSelectionMode('all');
  };

  const toggleChapter = (num) => {
      if (selectedChapters.includes(num)) {
          setSelectedChapters(prev => prev.filter(c => c !== num));
      } else {
          setSelectedChapters(prev => [...prev, num]);
      }
  };

  // --- Logic for Range Selection ---
  const handleApplyRange = () => {
      if (!rangeInput.trim()) {
          showToast("يرجى إدخال نطاق", "error");
          return;
      }

      const input = rangeInput.trim();
      let newSelection = [];
      const availableNumbers = chapters.map(c => c.number);
      const maxChap = availableNumbers.length > 0 ? Math.max(...availableNumbers) : 0;

      // Case 1: Start to End (e.g., "25-!")
      if (input.includes('-!')) {
          const [startStr] = input.split('-!');
          const start = parseInt(startStr);

          if (isNaN(start)) {
              showToast("صيغة غير صحيحة", "error");
              return;
          }

          // Loop from start to maxChap
          for (let i = start; i <= maxChap; i++) {
              if (availableNumbers.includes(i)) {
                  newSelection.push(i);
              }
          }
      } 
      // Case 2: Specific Range (e.g., "25-100")
      else if (input.includes('-')) {
          const parts = input.split('-');
          const start = parseInt(parts[0]);
          const end = parseInt(parts[1]);

          if (isNaN(start) || isNaN(end)) {
              showToast("صيغة الأرقام غير صحيحة", "error");
              return;
          }

          if (start > end) {
              showToast("البداية يجب أن تكون أصغر من النهاية", "error");
              return;
          }

          for (let i = start; i <= end; i++) {
              if (availableNumbers.includes(i)) {
                  newSelection.push(i);
              }
          }
      } 
      // Case 3: Single Chapter (e.g., "50")
      else {
          const num = parseInt(input);
          if (!isNaN(num) && availableNumbers.includes(num)) {
              newSelection.push(num);
          }
      }

      if (newSelection.length === 0) {
          showToast("لم يتم العثور على فصول مطابقة في هذا النطاق", "warning");
      } else {
          setSelectedChapters(newSelection);
          showToast(`تم تحديد ${newSelection.length} فصل`, "success");
          Keyboard.dismiss();
      }
  };

  const confirmTranslation = () => {
      if (!selectedNovel) return;
      
      const count = selectionMode === 'manual' ? selectedChapters.length : (chapters.length || 'الكل');
      if (selectionMode === 'manual' && selectedChapters.length === 0) {
          showToast("الرجاء تحديد فصل واحد على الأقل", "error");
          return;
      }

      setAlertConfig({
          title: "تأكيد الترجمة",
          message: `هل أنت متأكد من بدء ترجمة "${selectedNovel.title}"؟\nعدد الفصول: ${count}\nسيتم استخدام مفاتيح API المخزنة في الإعدادات.`,
          type: 'info',
          confirmText: 'ابدأ الآن',
          onConfirm: startTranslation
      });
      setAlertVisible(true);
  };

  const startTranslation = async () => {
      setAlertVisible(false);
      
      const payload = {
          novelId: selectedNovel._id,
          chapters: selectionMode === 'manual' ? selectedChapters : 'all',
      };

      try {
          await api.post('/api/translator/start', payload);
          showToast("تم بدء المهمة في الخلفية", "success");
          navigation.navigate('TranslatorHub');
      } catch (e) {
          showToast("فشل بدء المهمة", "error");
      }
  };

  const renderNovelItem = ({ item }) => (
      <TouchableOpacity 
        style={[styles.novelItem, selectedNovel?._id === item._id && styles.novelItemSelected]}
        onPress={() => handleSelectNovel(item)}
      >
          <Image source={{uri: item.cover}} style={styles.novelCover} />
          <View style={{flex:1}}>
              <Text style={styles.novelTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.novelMeta}>أضيف: {new Date(item.createdAt).toLocaleDateString()}</Text>
              <Text style={styles.novelMeta}>{item.chaptersCount || item.chapters?.length || 0} فصل</Text>
          </View>
          {selectedNovel?._id === item._id && <Ionicons name="checkmark-circle" size={24} color="#06b6d4" />}
      </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomAlert 
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        confirmText={alertConfig.confirmText}
        onCancel={() => setAlertVisible(false)}
        onConfirm={alertConfig.onConfirm}
      />

      <View style={styles.header}>
          <Text style={styles.headerTitle}>اختيار الرواية (أحدث 15 مضافة)</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
      </View>

      <View style={{flex:1, flexDirection:'row-reverse'}}>
          {/* Right Side: Novel List */}
          <View style={styles.novelListContainer}>
              <View style={styles.searchBox}>
                  <Ionicons name="search" size={16} color="#666" />
                  <TextInput 
                      style={styles.searchInput} 
                      placeholder="بحث..." 
                      placeholderTextColor="#666"
                      value={search}
                      onChangeText={setSearch}
                  />
              </View>
              {loading ? <ActivityIndicator color="#06b6d4" /> : 
                  <FlatList 
                      data={filteredNovels}
                      keyExtractor={item => item._id}
                      renderItem={renderNovelItem}
                      contentContainerStyle={{paddingBottom: 20}}
                  />
              }
          </View>

          {/* Left Side: Chapter Selection & Config */}
          <View style={styles.selectionContainer}>
              {selectedNovel ? (
                  <>
                      <View style={styles.selectedHeader}>
                          <Image source={{uri: selectedNovel.cover}} style={styles.selectedCover} />
                          <View style={{flex:1}}>
                              <Text style={styles.selectedTitle}>{selectedNovel.title}</Text>
                              <Text style={styles.selectedSub}>تحديد نطاق الترجمة</Text>
                          </View>
                      </View>

                      <View style={styles.modeSwitch}>
                          <TouchableOpacity 
                            style={[styles.modeBtn, selectionMode === 'all' && styles.modeBtnActive]}
                            onPress={() => setSelectionMode('all')}
                          >
                              <Text style={[styles.modeText, selectionMode === 'all' && {color:'#fff'}]}>الكل</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[styles.modeBtn, selectionMode === 'manual' && styles.modeBtnActive]}
                            onPress={() => setSelectionMode('manual')}
                          >
                              <Text style={[styles.modeText, selectionMode === 'manual' && {color:'#fff'}]}>تحديد يدوي</Text>
                          </TouchableOpacity>
                      </View>

                      {selectionMode === 'manual' && (
                          <View style={{flex: 1}}>
                              {/* Range Input Section */}
                              <View style={styles.rangeContainer}>
                                  <Text style={styles.rangeLabel}>اكتب النطاق:</Text>
                                  <View style={styles.rangeInputRow}>
                                      <TextInput 
                                          style={styles.rangeInput}
                                          placeholder="مثال: 25-100 أو 25-!"
                                          placeholderTextColor="#666"
                                          value={rangeInput}
                                          onChangeText={setRangeInput}
                                          textAlign="center"
                                          keyboardType="default" // Allow '!' and '-'
                                      />
                                      <TouchableOpacity style={styles.rangeApplyBtn} onPress={handleApplyRange}>
                                          <Text style={styles.rangeApplyText}>تطبيق</Text>
                                      </TouchableOpacity>
                                  </View>
                                  <Text style={styles.rangeHint}>
                                      استخدم "25-100" للنطاق، أو "25-!" من فصل محدد للنهاية.
                                  </Text>
                              </View>

                              {/* Chapters List */}
                              <FlatList 
                                  data={chapters}
                                  keyExtractor={item => item.number.toString()}
                                  style={{flex:1, marginTop: 10}}
                                  contentContainerStyle={{paddingBottom: 10}}
                                  renderItem={({item}) => (
                                      <TouchableOpacity 
                                        style={[styles.chapItem, selectedChapters.includes(item.number) && styles.chapItemActive]}
                                        onPress={() => toggleChapter(item.number)}
                                      >
                                          <Text style={[styles.chapText, selectedChapters.includes(item.number) && {color:'#06b6d4'}]}>
                                              فصل {item.number}
                                          </Text>
                                          {selectedChapters.includes(item.number) && <Ionicons name="checkmark" size={16} color="#06b6d4" />}
                                      </TouchableOpacity>
                                  )}
                              />
                          </View>
                      )}

                      {selectionMode === 'all' && (
                          <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', opacity: 0.5}}>
                              <Ionicons name="documents-outline" size={60} color="#444" />
                              <Text style={{color: '#666', marginTop: 10}}>سيتم ترجمة جميع الفصول المتاحة</Text>
                          </View>
                      )}

                      <View style={styles.infoBox}>
                          <Ionicons name="information-circle" size={20} color="#888" />
                          <Text style={styles.infoText}>سيتم استخدام المفاتيح المحفوظة. تأكد من إعدادها مسبقاً.</Text>
                      </View>

                      <TouchableOpacity style={styles.startBtn} onPress={confirmTranslation}>
                          <Text style={styles.startBtnText}>بدء الترجمة</Text>
                          <Ionicons name="play" size={20} color="#fff" />
                      </TouchableOpacity>
                  </>
              ) : (
                  <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
                      <Ionicons name="library-outline" size={50} color="#333" />
                      <Text style={{color:'#666', marginTop:10}}>اختر رواية من القائمة لبدء الإعداد</Text>
                  </View>
              )}
          </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderColor: '#222' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  
  novelListContainer: { width: '40%', borderLeftWidth: 1, borderColor: '#222', padding: 10 },
  selectionContainer: { width: '60%', padding: 15 },
  
  searchBox: { flexDirection: 'row', backgroundColor: '#161616', padding: 8, borderRadius: 8, marginBottom: 10, alignItems: 'center' },
  searchInput: { flex: 1, color: '#fff', marginLeft: 5 },

  novelItem: { flexDirection: 'row-reverse', padding: 10, marginBottom: 8, borderRadius: 8, alignItems: 'center', gap: 10 },
  novelItemSelected: { backgroundColor: '#161616', borderColor: '#06b6d4', borderWidth: 1 },
  novelCover: { width: 40, height: 60, borderRadius: 4, backgroundColor: '#333' },
  novelTitle: { color: '#fff', fontSize: 12, textAlign: 'right' },
  novelMeta: { color: '#666', fontSize: 10, textAlign: 'right' },

  selectedHeader: { flexDirection: 'row-reverse', gap: 15, marginBottom: 15 },
  selectedCover: { width: 60, height: 90, borderRadius: 6 },
  selectedTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'right' },
  selectedSub: { color: '#06b6d4', fontSize: 12, textAlign: 'right' },

  modeSwitch: { flexDirection: 'row-reverse', backgroundColor: '#111', padding: 4, borderRadius: 8, marginBottom: 10 },
  modeBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  modeBtnActive: { backgroundColor: '#06b6d4' },
  modeText: { color: '#666', fontSize: 12, fontWeight: 'bold' },

  // Range Input Styles
  rangeContainer: { marginBottom: 10, backgroundColor: '#161616', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#333' },
  rangeLabel: { color: '#ccc', fontSize: 12, marginBottom: 5, textAlign: 'right' },
  rangeInputRow: { flexDirection: 'row-reverse', gap: 10 },
  rangeInput: { flex: 1, backgroundColor: '#222', color: '#fff', borderRadius: 6, padding: 8, textAlign: 'center', borderWidth: 1, borderColor: '#444' },
  rangeApplyBtn: { backgroundColor: '#06b6d4', borderRadius: 6, paddingHorizontal: 15, justifyContent: 'center', alignItems: 'center' },
  rangeApplyText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  rangeHint: { color: '#666', fontSize: 10, marginTop: 5, textAlign: 'right' },

  chapItem: { flexDirection: 'row-reverse', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderColor: '#222' },
  chapItemActive: { backgroundColor: 'rgba(6, 182, 212, 0.1)' },
  chapText: { color: '#ccc', fontSize: 14 },

  infoBox: { flexDirection: 'row-reverse', backgroundColor: '#161616', padding: 10, borderRadius: 8, marginTop: 'auto', marginBottom: 10, gap: 10 },
  infoText: { color: '#888', fontSize: 11, flex: 1, textAlign: 'right' },

  startBtn: { backgroundColor: '#06b6d4', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 12, gap: 10 },
  startBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
