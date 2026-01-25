import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Modal,
  Image,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from '../context/ToastContext';
import { AuthContext } from '../context/AuthContext';

export default function AdminDashboardScreen({ route, navigation }) {
  const { showToast } = useToast();
  const { userInfo } = useContext(AuthContext);
  
  // Params
  const editNovelData = route.params?.editNovel;
  const editChapterData = route.params?.editChapter; 
  const addChapterMode = route.params?.addChapterMode;
  
  // Tabs: 'novel' (Details) | 'chapters_list' (List of chapters) | 'chapter_form' (Add/Edit single chapter)
  // FIX: Default to 'novel' if it's a new novel OR editing a novel. Only 'chapter_form' if adding/editing specific chapter.
  const [activeTab, setActiveTab] = useState((editChapterData || addChapterMode) ? 'chapter_form' : 'novel'); 
  
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // --- Novel State ---
  const [title, setTitle] = useState(editNovelData?.title || '');
  const [cover, setCover] = useState(editNovelData?.cover || '');
  const [description, setDescription] = useState(editNovelData?.description || '');
  const initialTags = editNovelData?.tags || [];
  const [selectedTags, setSelectedTags] = useState(initialTags);
  const [customTag, setCustomTag] = useState('');
  const [status, setStatus] = useState(editNovelData?.status || 'مستمرة');

  // Novel Chapters List
  const [novelChapters, setNovelChapters] = useState([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);

  // --- Chapter Form State ---
  const [selectedNovelId, setSelectedNovelId] = useState(editChapterData?.novelId || addChapterMode?.novelId || editNovelData?._id || '');
  const [chapterNumber, setChapterNumber] = useState(editChapterData?.number?.toString() || addChapterMode?.nextNumber?.toString() || '');
  const [chapterTitle, setChapterTitle] = useState(editChapterData?.title || '');
  const [chapterContent, setChapterContent] = useState('');
  const [isEditingChapter, setIsEditingChapter] = useState(!!editChapterData);

  const [novelsList, setNovelsList] = useState([]);
  const [showNovelPicker, setShowNovelPicker] = useState(false);

  useEffect(() => {
    // Initial Data Fetch if we are not editing a specific novel
    if (!editNovelData) {
        fetchNovels();
    }
    
    // If editing a novel, fetch its chapters immediately
    if (editNovelData) {
        fetchNovelChapters(editNovelData._id);
        setSelectedNovelId(editNovelData._id);
    }

    // Direct Chapter Edit Mode (from external screen)
    if (editChapterData) {
        fetchChapterContent();
    }
  }, []);

  const fetchNovelChapters = async (id) => {
      setChaptersLoading(true);
      try {
          const res = await api.get(`/api/novels/${id}`);
          if (res.data && res.data.chapters) {
              const sorted = res.data.chapters.sort((a, b) => b.number - a.number);
              setNovelChapters(sorted);
          }
      } catch (e) {
          console.log("Failed to fetch novel chapters", e);
      } finally {
          setChaptersLoading(false);
      }
  };

  const fetchChapterContent = async () => {
      try {
          setLoading(true);
          const res = await api.get(`/api/novels/${selectedNovelId}/chapters/${chapterNumber}`);
          setChapterContent(res.data.content);
      } catch (e) {
          showToast('فشل جلب محتوى الفصل', 'error');
      } finally {
          setLoading(false);
      }
  };

  const fetchNovels = async () => {
    try {
        const res = await api.get('/api/novels?limit=100');
        let list = res.data.novels || [];
        if (userInfo && userInfo.role !== 'admin') {
            list = list.filter(n => 
                (n.authorEmail && n.authorEmail === userInfo.email) ||
                (n.author && n.author.toLowerCase() === userInfo.name.toLowerCase())
            );
        }
        setNovelsList(list);
    } catch(e) { console.log(e); }
  };

  // --- Image Handling ---
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
        showToast('نحتاج إذن الوصول للصور', 'error');
        return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, 
        quality: 0.8,
    });
    if (!result.canceled) {
        uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri) => {
      setUploadingImage(true);
      try {
          let formData = new FormData();
          formData.append('image', { uri: uri, name: 'upload.jpg', type: 'image/jpeg' });
          const res = await api.post('/api/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
          setCover(res.data.url);
          showToast('تم رفع الصورة بنجاح', 'success');
      } catch (e) {
          showToast('فشل رفع الصورة', 'error');
      } finally {
          setUploadingImage(false);
      }
  };

  // --- Novel Logic ---
  const toggleTag = (tag) => {
      if (selectedTags.includes(tag)) setSelectedTags(selectedTags.filter(t => t !== tag));
      else setSelectedTags([...selectedTags, tag]);
  };

  const addCustomTag = () => {
      if (customTag.trim() && !selectedTags.includes(customTag.trim())) {
          setSelectedTags([...selectedTags, customTag.trim()]);
          setCustomTag('');
      }
  };

  const handleSaveNovel = async () => {
      if (!title || !cover) { showToast("املأ الحقول الأساسية", 'error'); return; }
      setLoading(true);
      try {
          const payload = { title, cover, description, category: selectedTags[0] || 'أخرى', tags: selectedTags, status };
          if (editNovelData) {
              await api.put(`/api/admin/novels/${editNovelData._id}`, payload);
              showToast("تم تحديث الرواية بنجاح", 'success');
          } else {
              await api.post('/api/admin/novels', payload);
              showToast("تم إنشاء الرواية بنجاح", 'success');
              if (!editNovelData) navigation.goBack();
          }
      } catch (e) { showToast("فشلت العملية", 'error'); } 
      finally { setLoading(false); }
  };

  // --- Chapter Logic ---
  const prepareEditChapter = async (chapter) => {
      setIsEditingChapter(true);
      setChapterNumber(chapter.number.toString());
      setChapterTitle(chapter.title);
      setChapterContent(''); // Clear first
      setActiveTab('chapter_form'); // Switch to form
      
      // Fetch content
      try {
          setLoading(true);
          const res = await api.get(`/api/novels/${editNovelData._id}/chapters/${chapter.number}`);
          setChapterContent(res.data.content);
      } catch (e) {
          showToast("فشل تحميل محتوى الفصل", "error");
      } finally {
          setLoading(false);
      }
  };

  const prepareAddChapter = () => {
      setIsEditingChapter(false);
      // Auto increment based on last chapter
      const nextNum = novelChapters.length > 0 ? (Math.max(...novelChapters.map(c => c.number)) + 1) : 1;
      setChapterNumber(nextNum.toString());
      setChapterTitle('');
      setChapterContent('');
      setActiveTab('chapter_form');
  };

  const handleSaveChapter = async () => {
      if (!selectedNovelId || !chapterNumber || !chapterTitle || !chapterContent) {
          showToast("جميع الحقول مطلوبة", 'error');
          return;
      }
      setLoading(true);
      try {
          if (isEditingChapter) {
              await api.put(`/api/admin/chapters/${selectedNovelId}/${chapterNumber}`, {
                  title: chapterTitle,
                  content: chapterContent
              });
              showToast("تم تعديل الفصل بنجاح", 'success');
          } else {
              await api.post('/api/admin/chapters', {
                  novelId: selectedNovelId,
                  number: chapterNumber,
                  title: chapterTitle,
                  content: chapterContent
              });
              showToast("تم إضافة الفصل بنجاح", 'success');
          }

          // Return to list if we are in Novel Edit Mode
          if (editNovelData) {
              await fetchNovelChapters(editNovelData._id);
              setActiveTab('chapters_list');
          } else {
              navigation.goBack();
          }
      } catch (e) {
          showToast(e.message || "فشل الرفع", 'error');
      } finally {
          setLoading(false);
      }
  };

  const handleDeleteChapter = (chapNum) => {
      Alert.alert(
          "حذف الفصل",
          `هل أنت متأكد من حذف الفصل رقم ${chapNum}؟`,
          [
              { text: "إلغاء", style: "cancel" },
              { 
                  text: "حذف", 
                  style: "destructive", 
                  onPress: async () => {
                      try {
                          await api.delete(`/api/admin/chapters/${editNovelData._id}/${chapNum}`);
                          showToast("تم حذف الفصل", "success");
                          fetchNovelChapters(editNovelData._id);
                      } catch (e) {
                          showToast("فشل الحذف", "error");
                      }
                  } 
              }
          ]
      );
  };

  const commonCategories = ['شيانشيا', 'شوانهوان', 'وشيا', 'أكشن', 'رومانسي', 'نظام', 'حريم', 'مغامرات', 'خيال', 'دراما'];
  const statusOptions = ['مستمرة', 'مكتملة', 'متوقفة'];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>
            {editNovelData ? `تعديل: ${editNovelData.title}` : (editChapterData || addChapterMode ? 'إدارة الفصل' : 'إنشاء رواية جديدة')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* TABS - Only show if editing a novel */}
      {editNovelData && (
          <View style={styles.tabs}>
            <TouchableOpacity 
                style={[styles.tab, activeTab === 'novel' && styles.activeTab]} 
                onPress={() => setActiveTab('novel')}
            >
                <Text style={[styles.tabText, activeTab === 'novel' && styles.activeTabText]}>بيانات الرواية</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
                style={[styles.tab, (activeTab === 'chapters_list' || activeTab === 'chapter_form') && styles.activeTab]} 
                onPress={() => setActiveTab('chapters_list')}
            >
                <Text style={[styles.tabText, (activeTab === 'chapters_list' || activeTab === 'chapter_form') && styles.activeTabText]}>
                    فصول الرواية
                </Text>
            </TouchableOpacity>
          </View>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* === TAB 1: NOVEL DETAILS === */}
        {activeTab === 'novel' && (
            <View style={styles.form}>
                <Text style={styles.label}>صورة الغلاف</Text>
                <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                    {uploadingImage ? (
                        <ActivityIndicator color="#4a7cc7" />
                    ) : cover ? (
                        <Image source={{ uri: cover }} style={styles.previewImage} />
                    ) : (
                        <View style={{alignItems: 'center'}}>
                            <Ionicons name="image-outline" size={30} color="#666" />
                            <Text style={{color: '#666', marginTop: 5}}>اضغط لرفع صورة</Text>
                        </View>
                    )}
                </TouchableOpacity>
                <TextInput style={[styles.input, {fontSize: 10}]} value={cover} onChangeText={setCover} placeholder="أو رابط مباشر..." placeholderTextColor="#444" />
                
                <Text style={styles.label}>اسم الرواية</Text>
                <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="اسم الرواية" placeholderTextColor="#444" />

                <Text style={styles.label}>حالة الرواية</Text>
                <View style={styles.statusRow}>
                    {statusOptions.map(opt => (
                        <TouchableOpacity 
                            key={opt} 
                            style={[
                                styles.statusBtn, 
                                status === opt && { borderColor: opt === 'مكتملة' ? '#4ade80' : opt === 'متوقفة' ? '#ff4444' : '#9b4ac7', backgroundColor: 'rgba(255,255,255,0.05)' }
                            ]}
                            onPress={() => setStatus(opt)}
                        >
                            <View style={[styles.radio, status === opt && { backgroundColor: opt === 'مكتملة' ? '#4ade80' : opt === 'متوقفة' ? '#ff4444' : '#9b4ac7' }]} />
                            <Text style={{color: '#fff'}}>{opt}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>التصنيفات</Text>
                <View style={styles.tagsContainer}>
                    {commonCategories.map(cat => (
                        <TouchableOpacity 
                            key={cat} 
                            style={[styles.tagChip, selectedTags.includes(cat) && styles.activeTagChip]} 
                            onPress={() => toggleTag(cat)}
                        >
                            <Text style={{color: selectedTags.includes(cat) ? '#fff' : '#888'}}>{cat}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                
                <View style={styles.addTagRow}>
                    <TouchableOpacity style={styles.addTagBtn} onPress={addCustomTag}>
                        <Ionicons name="add" size={24} color="#fff" />
                    </TouchableOpacity>
                    <TextInput 
                        style={[styles.input, {flex: 1, marginBottom: 0}]} 
                        value={customTag} 
                        onChangeText={setCustomTag} 
                        placeholder="إضافة تصنيف خاص..." 
                        placeholderTextColor="#444" 
                    />
                </View>
                
                {selectedTags.length > 0 && (
                    <View style={styles.selectedTagsRow}>
                        {selectedTags.map(tag => (
                             <View key={tag} style={styles.selectedTag}>
                                 <Text style={styles.selectedTagText}>{tag}</Text>
                                 <TouchableOpacity onPress={() => toggleTag(tag)}>
                                    <Ionicons name="close" size={14} color="#fff" />
                                 </TouchableOpacity>
                             </View>
                        ))}
                    </View>
                )}

                <Text style={styles.label}>الوصف</Text>
                <TextInput style={[styles.input, {height: 100}]} value={description} onChangeText={setDescription} multiline placeholder="وصف الرواية..." placeholderTextColor="#444" textAlignVertical="top" />

                <TouchableOpacity style={styles.submitBtn} onPress={handleSaveNovel} disabled={loading}>
                    {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.submitText}>{editNovelData ? 'حفظ التعديلات' : 'إنشاء الرواية'}</Text>}
                </TouchableOpacity>
            </View>
        )}

        {/* === TAB 2: CHAPTER LIST === */}
        {activeTab === 'chapters_list' && (
             <View style={styles.chapterListSection}>
                 <TouchableOpacity style={styles.addChapterCta} onPress={prepareAddChapter}>
                     <Ionicons name="add-circle" size={20} color="#fff" />
                     <Text style={{color: '#fff', fontWeight: 'bold'}}>إضافة فصل جديد</Text>
                 </TouchableOpacity>

                 {chaptersLoading ? (
                     <ActivityIndicator size="large" color="#4a7cc7" style={{marginTop: 50}} />
                 ) : (
                     <View style={styles.chapterListContainer}>
                         {novelChapters.length === 0 ? (
                             <Text style={{color: '#666', textAlign: 'center', padding: 20}}>لا توجد فصول لهذه الرواية.</Text>
                         ) : (
                             novelChapters.map((chap) => (
                                 <View key={chap.number} style={styles.chapterListItem}>
                                     <View style={styles.chapterActions}>
                                         <TouchableOpacity 
                                             style={[styles.actionIcon, {backgroundColor: 'rgba(255, 68, 68, 0.1)'}]} 
                                             onPress={() => handleDeleteChapter(chap.number)}
                                         >
                                             <Ionicons name="trash-outline" size={18} color="#ff4444" />
                                         </TouchableOpacity>
                                         <TouchableOpacity 
                                             style={[styles.actionIcon, {backgroundColor: 'rgba(74, 124, 199, 0.1)'}]} 
                                             onPress={() => prepareEditChapter(chap)}
                                         >
                                             <Ionicons name="create-outline" size={18} color="#4a7cc7" />
                                         </TouchableOpacity>
                                     </View>
                                     <View style={{flex: 1}}>
                                         <Text style={styles.chapterListTitle}>فصل {chap.number}</Text>
                                         <Text style={styles.chapterListSubtitle}>{chap.title}</Text>
                                     </View>
                                 </View>
                             ))
                         )}
                     </View>
                 )}
             </View>
        )}

        {/* === TAB 3: CHAPTER FORM (Sub-view) === */}
        {activeTab === 'chapter_form' && (
            <View style={styles.form}>
                {editNovelData && (
                    <TouchableOpacity style={styles.backToListBtn} onPress={() => setActiveTab('chapters_list')}>
                        <Ionicons name="arrow-forward" size={16} color="#4a7cc7" />
                        <Text style={{color: '#4a7cc7'}}>العودة للقائمة</Text>
                    </TouchableOpacity>
                )}

                {!editNovelData && !selectedNovelId && (
                    <>
                    <Text style={styles.label}>اختر الرواية</Text>
                    <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowNovelPicker(true)}>
                        <Text style={{color: '#fff'}}>
                            {Array.isArray(novelsList) && novelsList.find(n => n._id === selectedNovelId)?.title || "اضغط للاختيار"}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color="#666" />
                    </TouchableOpacity>
                    </>
                )}

                <View style={{flexDirection: 'row', gap: 10, marginTop: 10}}>
                    <View style={{flex: 1}}>
                        <Text style={styles.label}>رقم الفصل</Text>
                        <TextInput 
                            style={styles.input} 
                            value={chapterNumber} 
                            onChangeText={setChapterNumber} 
                            keyboardType="numeric" 
                            placeholder="1" 
                            placeholderTextColor="#444" 
                            editable={true} 
                        />
                    </View>
                    <View style={{flex: 2}}>
                        <Text style={styles.label}>عنوان الفصل</Text>
                        <TextInput style={styles.input} value={chapterTitle} onChangeText={setChapterTitle} placeholder="مثال: البداية" placeholderTextColor="#444" />
                    </View>
                </View>

                <Text style={styles.label}>محتوى الفصل</Text>
                {loading && !chapterContent ? (
                    <ActivityIndicator color="#4a7cc7" style={{marginVertical: 20}} />
                ) : (
                    <TextInput 
                        style={[styles.input, {height: 350, textAlign: 'right', lineHeight: 22}]} 
                        value={chapterContent} 
                        onChangeText={setChapterContent} 
                        multiline 
                        placeholder="الصق نص الفصل هنا..." 
                        placeholderTextColor="#444" 
                        textAlignVertical="top" 
                    />
                )}

                <TouchableOpacity style={styles.submitBtn} onPress={handleSaveChapter} disabled={loading}>
                    {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.submitText}>
                        {isEditingChapter ? 'حفظ تعديلات الفصل' : 'نشر الفصل'}
                    </Text>}
                </TouchableOpacity>
            </View>
        )}

      </ScrollView>

      {/* Novel Picker Modal */}
      <Modal visible={showNovelPicker} transparent animationType="slide">
          <View style={styles.modalBg}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>اختر رواية</Text>
                  {novelsList.length === 0 ? (
                      <Text style={{color: '#666', textAlign: 'center', padding: 20}}>لا توجد روايات.</Text>
                  ) : (
                      <FlatList
                        data={novelsList}
                        keyExtractor={item => item._id}
                        renderItem={({item}) => (
                            <TouchableOpacity style={styles.modalItem} onPress={() => { setSelectedNovelId(item._id); setShowNovelPicker(false); }}>
                                <Text style={styles.modalItemText}>{item.title}</Text>
                            </TouchableOpacity>
                        )}
                      />
                  )}
                  <TouchableOpacity style={styles.closeBtn} onPress={() => setShowNovelPicker(false)}>
                      <Text style={{color: '#fff'}}>إغلاق</Text>
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderColor: '#222', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  
  tabs: { flexDirection: 'row', padding: 10, gap: 10 },
  tab: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#111', borderRadius: 8 },
  activeTab: { backgroundColor: '#4a7cc7' },
  tabText: { color: '#888' },
  activeTabText: { color: '#fff', fontWeight: 'bold' },
  
  content: { padding: 20 },
  form: { gap: 15 },
  label: { color: '#ccc', fontSize: 14, textAlign: 'right', marginBottom: 5 },
  input: { backgroundColor: '#111', borderRadius: 8, padding: 12, color: '#fff', textAlign: 'right', borderWidth: 1, borderColor: '#333' },
  pickerBtn: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#111', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#333' },
  
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: { paddingHorizontal: 15, paddingVertical: 8, backgroundColor: '#111', borderRadius: 20, borderWidth: 1, borderColor: '#333' },
  activeTagChip: { backgroundColor: '#4a7cc7', borderColor: '#4a7cc7' },
  
  addTagRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  addTagBtn: { width: 50, height: 50, backgroundColor: '#4a7cc7', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  
  selectedTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  selectedTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#222', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, gap: 5, borderWidth: 1, borderColor: '#444' },
  selectedTagText: { color: '#fff', fontSize: 12 },

  statusRow: { flexDirection: 'row', gap: 10 },
  statusBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#333', backgroundColor: '#111' },
  radio: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#333' },

  submitBtn: { backgroundColor: '#fff', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  submitText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  
  imagePicker: { height: 150, backgroundColor: '#111', borderRadius: 8, borderWidth: 1, borderColor: '#333', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  previewImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  
  // Chapter List Styles
  chapterListSection: { marginTop: 0 },
  addChapterCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4a7cc7', padding: 15, borderRadius: 8, marginBottom: 15, gap: 8 },
  chapterListContainer: { backgroundColor: '#161616', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#333' },
  chapterListItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderColor: '#222' },
  chapterListTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold', textAlign: 'right' },
  chapterListSubtitle: { color: '#888', fontSize: 12, textAlign: 'right', marginTop: 2 },
  chapterActions: { flexDirection: 'row', gap: 10 },
  actionIcon: { padding: 8, borderRadius: 6 },
  
  backToListBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5, marginBottom: 10 },
  
  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#111', borderRadius: 12, padding: 20, maxHeight: '80%' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  modalItem: { padding: 15, borderBottomWidth: 1, borderColor: '#222' },
  modalItemText: { color: '#fff', textAlign: 'right' },
  closeBtn: { marginTop: 20, alignItems: 'center', padding: 15, backgroundColor: '#333', borderRadius: 8 },
});
