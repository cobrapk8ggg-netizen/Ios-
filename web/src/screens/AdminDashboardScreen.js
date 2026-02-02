
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
  ImageBackground,
  Dimensions,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker'; 
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { AuthContext } from '../context/AuthContext';
import CustomAlert from '../components/CustomAlert';

// Glass Container Component
const GlassContainer = ({ children, style }) => (
    <View style={[styles.glassContainer, style]}>
        {children}
    </View>
);

export default function AdminDashboardScreen({ route, navigation }) {
  const { showToast } = useToast();
  const { userInfo } = useContext(AuthContext);
  const isAdmin = userInfo?.role === 'admin';
  
  const editNovelData = route.params?.editNovel;
  const editChapterData = route.params?.editChapter; 
  const addChapterMode = route.params?.addChapterMode;
  
  const [activeTab, setActiveTab] = useState((editChapterData || addChapterMode) ? 'chapter_form' : 'novel'); 
  const [chapterMode, setChapterMode] = useState('single');

  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Novel State
  const [title, setTitle] = useState(editNovelData?.title || '');
  const [cover, setCover] = useState(editNovelData?.cover || '');
  const [description, setDescription] = useState(editNovelData?.description || '');
  const initialTags = editNovelData?.tags || [];
  const [selectedTags, setSelectedTags] = useState(initialTags);
  const [customTag, setCustomTag] = useState('');
  const [status, setStatus] = useState(editNovelData?.status || 'مستمرة');

  // Dynamic Categories
  const [availableCategories, setAvailableCategories] = useState([]);

  const [novelChapters, setNovelChapters] = useState([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);

  // Single Chapter State
  const [selectedNovelId, setSelectedNovelId] = useState(editChapterData?.novelId || addChapterMode?.novelId || editNovelData?._id || '');
  const [chapterNumber, setChapterNumber] = useState(editChapterData?.number?.toString() || addChapterMode?.nextNumber?.toString() || '');
  const [chapterTitle, setChapterTitle] = useState(editChapterData?.title || '');
  const [chapterContent, setChapterContent] = useState('');
  const [isEditingChapter, setIsEditingChapter] = useState(!!editChapterData);

  // Bulk Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [bulkLogs, setBulkLogs] = useState([]);

  const [novelsList, setNovelsList] = useState([]);
  const [showNovelPicker, setShowNovelPicker] = useState(false);

  // Custom Alert
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});

  useEffect(() => {
    fetchCategories();
    if (!editNovelData) fetchNovels();
    if (editNovelData) {
        fetchNovelChapters(editNovelData._id);
        setSelectedNovelId(editNovelData._id);
    }
    if (editChapterData) fetchChapterContent();
  }, []);

  const fetchCategories = async () => {
      try {
          const res = await api.get('/api/categories');
          const cats = res.data.filter(c => c.id !== 'all').map(c => c.name);
          setAvailableCategories(cats);
      } catch (e) {
          setAvailableCategories(['أكشن', 'رومانسي', 'فانتازيا']);
      }
  };

  const fetchNovelChapters = async (id) => {
      setChaptersLoading(true);
      try {
          const res = await api.get(`/api/novels/${id}`);
          if (res.data && res.data.chapters) {
              const sorted = res.data.chapters.sort((a, b) => b.number - a.number);
              setNovelChapters(sorted);
          }
      } catch (e) { console.log("Failed to fetch novel chapters", e); } 
      finally { setChaptersLoading(false); }
  };

  const fetchChapterContent = async () => {
      try {
          setLoading(true);
          const res = await api.get(`/api/novels/${selectedNovelId}/chapters/${chapterNumber}`);
          setChapterContent(res.data.content);
      } catch (e) { showToast('فشل جلب محتوى الفصل', 'error'); } 
      finally { setLoading(false); }
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

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { showToast('نحتاج إذن الوصول للصور', 'error'); return; }
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, quality: 0.8 });
    if (!result.canceled) uploadImage(result.assets[0].uri);
  };

  const uploadImage = async (uri) => {
      setUploadingImage(true);
      try {
          let formData = new FormData();
          formData.append('image', { uri: uri, name: 'upload.jpg', type: 'image/jpeg' });
          const res = await api.post('/api/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
          setCover(res.data.url);
          showToast('تم رفع الصورة بنجاح', 'success');
      } catch (e) { showToast('فشل رفع الصورة', 'error'); } 
      finally { setUploadingImage(false); }
  };

  const pickZipFile = async () => {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            type: ['application/zip', 'application/x-zip-compressed'],
            copyToCacheDirectory: true
        });
        if (result.canceled) return;
        const asset = result.assets ? result.assets[0] : result;
        if (asset) setSelectedFile(asset);
    } catch (err) { showToast("فشل اختيار الملف", "error"); }
  };

  const handleBulkUpload = async () => {
      if (!selectedNovelId) { showToast("يرجى اختيار الرواية أولاً", "error"); return; }
      if (!selectedFile) { showToast("يرجى اختيار ملف ZIP", "error"); return; }

      setLoading(true);
      setBulkLogs([]);

      try {
          const formData = new FormData();
          formData.append('novelId', selectedNovelId);
          formData.append('zip', {
              uri: selectedFile.uri,
              name: selectedFile.name || 'chapters.zip',
              type: selectedFile.mimeType || 'application/zip'
          });

          const response = await api.post('/api/admin/chapters/bulk-upload', formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
          });

          const { successCount, errors } = response.data;
          
          if (successCount > 0) {
              showToast(`تم نشر ${successCount} فصل بنجاح!`, "success");
              setBulkLogs([`✅ تم إضافة ${successCount} فصل بنجاح.`, ...errors]);
              if (editNovelData) fetchNovelChapters(editNovelData._id);
          } else {
              showToast("لم يتم إضافة أي فصل", "error");
              setBulkLogs(["❌ لم يتم العثور على فصول صالحة.", ...errors]);
          }
      } catch (error) {
          const msg = error.response?.data?.message || "حدث خطأ أثناء الرفع";
          showToast(msg, "error");
          setBulkLogs([`❌ خطأ: ${msg}`]);
      } finally { setLoading(false); }
  };

  const toggleTag = (tag) => {
      if (selectedTags.includes(tag)) setSelectedTags(selectedTags.filter(t => t !== tag));
      else setSelectedTags([...selectedTags, tag]);
  };

  const removeTag = (tagToRemove) => {
      setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const addCustomTag = async () => {
      if (!customTag.trim()) return;
      const newTag = customTag.trim();

      if (isAdmin) {
          try {
              await api.post('/api/admin/categories', { category: newTag });
              if (!availableCategories.includes(newTag)) {
                  setAvailableCategories([...availableCategories, newTag]);
              }
              if (!selectedTags.includes(newTag)) setSelectedTags([...selectedTags, newTag]);
              setCustomTag('');
              showToast("تم إضافة التصنيف لقاعدة البيانات", "success");
          } catch(e) {
              showToast("فشل إضافة التصنيف", "error");
          }
      } else {
          showToast("صلاحية المشرف مطلوبة لإضافة تصنيفات جديدة", "warning");
      }
  };

  const handleDeleteCategory = (catName) => {
      setAlertConfig({
          title: "حذف التصنيف نهائياً",
          message: `هل أنت متأكد من حذف تصنيف "${catName}" من قاعدة البيانات وجميع الروايات؟`,
          type: 'danger',
          onConfirm: async () => {
              setAlertVisible(false);
              try {
                  await api.delete(`/api/admin/categories/${encodeURIComponent(catName)}`);
                  setAvailableCategories(prev => prev.filter(c => c !== catName));
                  setSelectedTags(prev => prev.filter(t => t !== catName));
                  showToast("تم حذف التصنيف نهائياً", "success");
              } catch(e) {
                  showToast("فشل الحذف", "error");
              }
          }
      });
      setAlertVisible(true);
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

  const handleSaveChapter = async () => {
      if (!selectedNovelId || !chapterNumber || !chapterTitle || !chapterContent) {
          showToast("جميع الحقول مطلوبة", 'error');
          return;
      }
      setLoading(true);
      try {
          if (isEditingChapter) {
              await api.put(`/api/admin/chapters/${selectedNovelId}/${chapterNumber}`, {
                  title: chapterTitle, content: chapterContent
              });
              showToast("تم تعديل الفصل بنجاح", 'success');
          } else {
              await api.post('/api/admin/chapters', {
                  novelId: selectedNovelId, number: chapterNumber, title: chapterTitle, content: chapterContent
              });
              showToast("تم إضافة الفصل بنجاح", 'success');
          }
          if (editNovelData) {
              await fetchNovelChapters(editNovelData._id);
              setActiveTab('chapters_list');
          } else {
              navigation.goBack();
          }
      } catch (e) { showToast(e.message || "فشل الرفع", 'error'); } 
      finally { setLoading(false); }
  };

  const handleDeleteChapter = (chapNum) => {
      setAlertConfig({
          title: "حذف الفصل",
          message: `هل أنت متأكد من حذف الفصل رقم ${chapNum}؟`,
          type: 'danger',
          onConfirm: async () => {
              setAlertVisible(false);
              try {
                  await api.delete(`/api/admin/chapters/${editNovelData._id}/${chapNum}`);
                  showToast("تم حذف الفصل", "success");
                  fetchNovelChapters(editNovelData._id);
              } catch (e) { showToast("فشل الحذف", "error"); }
          }
      });
      setAlertVisible(true);
  };

  const statusOptions = ['مستمرة', 'مكتملة', 'متوقفة', 'خاصة'];

  const prepareEditChapter = async (chapter) => {
      setIsEditingChapter(true);
      setChapterNumber(chapter.number.toString());
      setChapterTitle(chapter.title);
      setChapterContent('');
      setActiveTab('chapter_form');
      setChapterMode('single'); 
      try {
          setLoading(true);
          const res = await api.get(`/api/novels/${editNovelData._id}/chapters/${chapter.number}`);
          setChapterContent(res.data.content);
      } catch (e) { showToast("فشل تحميل محتوى الفصل", "error"); } 
      finally { setLoading(false); }
  };

  const prepareAddChapter = () => {
      setIsEditingChapter(false);
      const nextNum = novelChapters.length > 0 ? (Math.max(...novelChapters.map(c => c.number)) + 1) : 1;
      setChapterNumber(nextNum.toString());
      setChapterTitle('');
      setChapterContent('');
      setActiveTab('chapter_form');
      setChapterMode('single');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Background Cover - THE GLASSY BASE */}
      <ImageBackground 
        source={cover ? {uri: cover} : require('../../assets/adaptive-icon.png')} 
        style={styles.bgImage}
        blurRadius={20}
      >
          <LinearGradient colors={['rgba(0,0,0,0.6)', '#000000']} style={StyleSheet.absoluteFill} />
      </ImageBackground>

      <CustomAlert 
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onCancel={() => setAlertVisible(false)}
        onConfirm={alertConfig.onConfirm}
      />

      <SafeAreaView style={{flex: 1}} edges={['top']}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
                {editNovelData ? 'تعديل الرواية' : (editChapterData || addChapterMode ? 'إدارة الفصل' : 'مشروع جديد')}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {editNovelData && (
              <View style={styles.tabContainer}>
                <TouchableOpacity style={[styles.tab, activeTab === 'novel' && styles.activeTab]} onPress={() => setActiveTab('novel')}>
                    <Text style={[styles.tabText, activeTab === 'novel' && styles.activeTabText]}>البيانات</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab !== 'novel' && styles.activeTab]} onPress={() => setActiveTab('chapters_list')}>
                    <Text style={[styles.tabText, activeTab !== 'novel' && styles.activeTabText]}>الفصول</Text>
                </TouchableOpacity>
              </View>
          )}

          <ScrollView contentContainerStyle={styles.content}>
            
            {/* NOVEL DETAILS FORM */}
            {activeTab === 'novel' && (
                <View style={{gap: 20}}>
                    {/* Cover Section */}
                    <TouchableOpacity style={styles.coverUpload} onPress={pickImage}>
                        {uploadingImage ? <ActivityIndicator color="#fff" /> : cover ? (
                            <ImageBackground source={{ uri: cover }} style={styles.coverPreview} imageStyle={{borderRadius: 16}}>
                                <View style={styles.editOverlay}><Ionicons name="camera" size={24} color="#fff" /></View>
                            </ImageBackground>
                        ) : (
                            <View style={styles.placeholderCover}>
                                <Ionicons name="image-outline" size={40} color="#666" />
                                <Text style={styles.placeholderText}>رفع الغلاف</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    
                    <GlassContainer>
                        <Text style={styles.label}>عنوان الرواية</Text>
                        <TextInput 
                            style={styles.glassInput} 
                            value={title} 
                            onChangeText={setTitle} 
                            placeholder="اكتب العنوان هنا..." 
                            placeholderTextColor="#666" 
                        />
                        
                        <Text style={styles.label}>رابط الصورة (اختياري)</Text>
                        <TextInput 
                            style={[styles.glassInput, {fontSize: 12}]} 
                            value={cover} 
                            onChangeText={setCover} 
                            placeholder="https://..." 
                            placeholderTextColor="#666" 
                        />
                    </GlassContainer>

                    <GlassContainer>
                        <Text style={styles.label}>الحالة</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusRow}>
                            {statusOptions.map(opt => (
                                <TouchableOpacity 
                                    key={opt} 
                                    style={[styles.statusChip, status === opt && styles.statusChipActive]} 
                                    onPress={() => setStatus(opt)}
                                >
                                    <Text style={[styles.statusText, status === opt && {color: '#fff', fontWeight: 'bold'}]}>{opt}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </GlassContainer>

                    {/* Tags */}
                    <GlassContainer>
                        <Text style={styles.label}>التصنيفات المختارة</Text>
                        <View style={styles.selectedTagsContainer}>
                            {selectedTags.length === 0 ? (
                                <Text style={{color: '#666', fontSize: 12, textAlign: 'center', width: '100%', padding: 10}}>لم يتم اختيار تصنيفات</Text>
                            ) : (
                                selectedTags.map(tag => (
                                     <View key={tag} style={styles.selectedTagChip}>
                                         <Text style={styles.selectedTagText}>{tag}</Text>
                                         <TouchableOpacity style={styles.removeTagBtn} onPress={() => removeTag(tag)}>
                                             <Ionicons name="close" size={14} color="#fff" />
                                         </TouchableOpacity>
                                     </View>
                                ))
                            )}
                        </View>

                        {/* Admin Only: Add New Category */}
                        {isAdmin && (
                            <>
                                <Text style={[styles.label, {marginTop: 15}]}>إضافة تصنيف جديد (مشرف فقط)</Text>
                                <View style={styles.addTagInputRow}>
                                    <TextInput 
                                        style={[styles.glassInput, {flex: 1, marginBottom: 0}]} 
                                        value={customTag} 
                                        onChangeText={setCustomTag} 
                                        placeholder="اكتب تصنيفاً جديداً..." 
                                        placeholderTextColor="#666" 
                                    />
                                    <TouchableOpacity style={styles.addTagBtn} onPress={addCustomTag}>
                                        <Ionicons name="add" size={24} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}

                        <Text style={[styles.label, {marginTop: 15}]}>اختر من القائمة</Text>
                        <View style={styles.tagsCloud}>
                            {availableCategories.filter(c => !selectedTags.includes(c)).map(cat => (
                                <View key={cat} style={styles.suggestionTagWrapper}>
                                    <TouchableOpacity style={styles.suggestionTag} onPress={() => toggleTag(cat)}>
                                        <Text style={{color: '#ccc', fontSize: 12}}>{cat}</Text>
                                        <Ionicons name="add" size={12} color="#ccc" />
                                    </TouchableOpacity>
                                    
                                    {isAdmin && (
                                        <TouchableOpacity style={styles.deleteCategoryBtn} onPress={() => handleDeleteCategory(cat)}>
                                            <Ionicons name="close-circle" size={16} color="#ff4444" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                        </View>
                    </GlassContainer>

                    {/* 🔥 DESCRIPTION BOX: AUTO-GROW & HUGE 🔥 */}
                    <GlassContainer>
                        <Text style={styles.label}>الوصف</Text>
                        <TextInput 
                            style={[styles.glassInput, styles.descriptionInput]} 
                            value={description} 
                            onChangeText={setDescription} 
                            multiline={true} 
                            scrollEnabled={false} // KEY: Allows the box to expand with text
                            placeholder="اكتب وصفاً مشوقاً..." 
                            placeholderTextColor="#666" 
                        />
                    </GlassContainer>

                    <TouchableOpacity style={styles.mainBtn} onPress={handleSaveNovel} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : (
                            <View style={styles.btnContent}>
                                <Text style={styles.btnText}>{editNovelData ? 'حفظ التعديلات' : 'إنشاء الرواية'}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {/* CHAPTERS LIST */}
            {activeTab === 'chapters_list' && (
                 <View style={{flex: 1}}>
                     <TouchableOpacity style={styles.addChapterCard} onPress={prepareAddChapter}>
                         <View style={styles.addChapterContent}>
                             <Ionicons name="add-circle-outline" size={32} color="#fff" />
                             <Text style={{color: '#fff', fontWeight: 'bold', marginTop: 5}}>إضافة فصل جديد</Text>
                         </View>
                     </TouchableOpacity>

                     {chaptersLoading ? <ActivityIndicator size="large" color="#fff" style={{marginTop: 50}} /> : (
                         <View style={{gap: 10}}>
                             {novelChapters.length === 0 ? <Text style={{color: '#666', textAlign: 'center', marginTop: 20}}>لا توجد فصول لهذه الرواية.</Text> : (
                                 novelChapters.map((chap) => (
                                     <View key={chap.number} style={styles.chapterCard}>
                                         <View style={styles.chapInfo}>
                                             <Text style={styles.chapNum}>#{chap.number}</Text>
                                             <Text style={styles.chapTitle}>{chap.title}</Text>
                                         </View>
                                         <View style={styles.chapActions}>
                                             <TouchableOpacity style={styles.iconAction} onPress={() => prepareEditChapter(chap)}>
                                                 <Ionicons name="create-outline" size={20} color="#fff" />
                                             </TouchableOpacity>
                                             <TouchableOpacity style={styles.iconAction} onPress={() => handleDeleteChapter(chap.number)}>
                                                 <Ionicons name="trash-outline" size={20} color="#ff4444" />
                                             </TouchableOpacity>
                                         </View>
                                     </View>
                                 ))
                             )}
                         </View>
                     )}
                 </View>
            )}

            {/* CHAPTER FORM */}
            {activeTab === 'chapter_form' && (
                <View style={{gap: 20}}>
                    {editNovelData && (
                        <TouchableOpacity style={styles.backLink} onPress={() => setActiveTab('chapters_list')}>
                            <Ionicons name="arrow-forward" size={16} color="#fff" />
                            <Text style={{color: '#fff'}}>رجوع للقائمة</Text>
                        </TouchableOpacity>
                    )}

                    {!isEditingChapter && (
                        <View style={styles.modeToggle}>
                            <TouchableOpacity style={[styles.modeBtn, chapterMode === 'single' && styles.modeBtnActive]} onPress={() => setChapterMode('single')}>
                                <Text style={[styles.modeText, chapterMode === 'single' && {color:'#fff'}]}>نشر منفرد</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modeBtn, chapterMode === 'bulk' && styles.modeBtnActive]} onPress={() => setChapterMode('bulk')}>
                                <Text style={[styles.modeText, chapterMode === 'bulk' && {color:'#fff'}]}>نشر ZIP</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {!editNovelData && !selectedNovelId && (
                        <GlassContainer>
                            <Text style={styles.label}>اختر الرواية</Text>
                            <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowNovelPicker(true)}>
                                <Text style={{color: '#fff'}}>{novelsList.find(n => n._id === selectedNovelId)?.title || "اختر من القائمة"}</Text>
                                <Ionicons name="chevron-down" size={20} color="#666" />
                            </TouchableOpacity>
                        </GlassContainer>
                    )}

                    {chapterMode === 'single' ? (
                        <GlassContainer>
                            <View style={{flexDirection: 'row', gap: 15, marginBottom: 15}}>
                                <View style={{flex: 1}}>
                                    <Text style={styles.label}>رقم الفصل</Text>
                                    <TextInput style={styles.glassInput} value={chapterNumber} onChangeText={setChapterNumber} keyboardType="numeric" placeholder="1" placeholderTextColor="#666" />
                                </View>
                                <View style={{flex: 2}}>
                                    <Text style={styles.label}>العنوان</Text>
                                    <TextInput style={styles.glassInput} value={chapterTitle} onChangeText={setChapterTitle} placeholder="مثال: البداية" placeholderTextColor="#666" />
                                </View>
                            </View>
                            <Text style={styles.label}>المحتوى</Text>
                            <TextInput 
                                style={[styles.glassInput, {minHeight: 400, textAlign: 'right', lineHeight: 24}]} 
                                value={chapterContent} 
                                onChangeText={setChapterContent} 
                                multiline 
                                scrollEnabled={false} // Auto Grow
                                placeholder="اكتب أو الصق النص هنا..." 
                                placeholderTextColor="#666" 
                                textAlignVertical="top" 
                            />
                            <TouchableOpacity style={styles.mainBtn} onPress={handleSaveChapter} disabled={loading}>
                                {loading ? <ActivityIndicator color="#fff" /> : (
                                    <View style={styles.btnContent}>
                                        <Text style={styles.btnText}>{isEditingChapter ? 'حفظ التعديل' : 'نشر الفصل'}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </GlassContainer>
                    ) : (
                        <GlassContainer>
                            <Text style={styles.infoText}>ارفع ملف ZIP يحتوي على ملفات نصية (.txt). سيتم استخراج الأرقام من أسماء الملفات.</Text>
                            <TouchableOpacity style={styles.uploadBox} onPress={pickZipFile}>
                                {selectedFile ? (
                                    <View style={{alignItems: 'center'}}>
                                        <Ionicons name="document-text" size={40} color="#fff" />
                                        <Text style={{color: '#fff', marginTop: 10}}>{selectedFile.name}</Text>
                                    </View>
                                ) : (
                                    <View style={{alignItems: 'center'}}>
                                        <Ionicons name="cloud-upload-outline" size={50} color="#666" />
                                        <Text style={{color: '#666', marginTop: 10}}>اضغط لاختيار ملف .zip</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.mainBtn, {marginTop: 20}]} onPress={handleBulkUpload} disabled={loading || !selectedFile}>
                                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>بدء المعالجة</Text>}
                            </TouchableOpacity>
                            {bulkLogs.length > 0 && (
                                <View style={styles.logsBox}>
                                    {bulkLogs.map((log, i) => <Text key={i} style={{color: log.includes('❌') ? '#ff6b6b' : '#4ade80', fontSize: 11}}>{log}</Text>)}
                                </View>
                            )}
                        </GlassContainer>
                    )}
                </View>
            )}
          </ScrollView>

          <Modal visible={showNovelPicker} transparent animationType="slide">
              <View style={styles.modalBg}>
                  <View style={styles.modalContent}>
                      <Text style={styles.modalTitle}>اختر رواية</Text>
                      <FlatList
                        data={novelsList}
                        keyExtractor={item => item._id}
                        renderItem={({item}) => (
                            <TouchableOpacity style={styles.modalItem} onPress={() => { setSelectedNovelId(item._id); setShowNovelPicker(false); }}>
                                <Text style={styles.modalItemText}>{item.title}</Text>
                            </TouchableOpacity>
                        )}
                      />
                      <TouchableOpacity style={styles.closeBtn} onPress={() => setShowNovelPicker(false)}><Text style={{color: '#fff'}}>إغلاق</Text></TouchableOpacity>
                  </View>
              </View>
          </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  bgImage: { ...StyleSheet.absoluteFillObject },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 10 },
  iconBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 },
  
  tabContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20, gap: 15 },
  tab: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: 'rgba(20,20,20,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  activeTab: { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.3)' },
  tabText: { color: '#888', fontWeight: '600' },
  activeTabText: { color: '#fff' },

  content: { padding: 20, paddingBottom: 50 },
  
  // Strict Glass Container
  glassContainer: { backgroundColor: 'rgba(20, 20, 20, 0.75)', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 20 },
  
  label: { color: '#ccc', fontSize: 13, marginBottom: 8, textAlign: 'right', fontWeight: '600' },
  glassInput: { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: 15, color: '#fff', textAlign: 'right', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', fontSize: 16 },
  
  descriptionInput: {
      minHeight: 400, // HUGE BOX
      textAlignVertical: 'top' 
  },

  coverUpload: { height: 200, borderRadius: 16, marginBottom: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(30,30,30,0.6)' },
  coverPreview: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  placeholderCover: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#666', marginTop: 10 },
  editOverlay: { backgroundColor: 'rgba(0,0,0,0.4)', padding: 15, borderRadius: 30 },

  statusRow: { flexDirection: 'row-reverse', gap: 10 },
  statusChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.5)' },
  statusChipActive: { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: '#fff' },
  statusText: { color: '#888', fontSize: 12 },

  selectedTagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end', marginBottom: 10 },
  selectedTagChip: { 
      flexDirection: 'row', alignItems: 'center', 
      backgroundColor: 'rgba(255,255,255,0.1)', 
      borderRadius: 20, 
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
      paddingVertical: 6, paddingHorizontal: 12
  },
  selectedTagText: { color: '#fff', fontWeight: 'bold', fontSize: 12, marginRight: 6 },
  removeTagBtn: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 2 },
  
  addTagInputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  addTagBtn: { width: 50, height: 50, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  
  tagsCloud: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' },
  
  suggestionTagWrapper: { position: 'relative', margin: 2 },
  suggestionTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  deleteCategoryBtn: { position: 'absolute', top: -5, left: -5, zIndex: 10, backgroundColor: '#111', borderRadius: 8 },

  // Telegram Style Action Button
  mainBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 10, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  btnContent: { padding: 18, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  // Chapters Style
  addChapterCard: { marginBottom: 20, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderStyle: 'dashed', backgroundColor: 'rgba(255,255,255,0.05)' },
  addChapterContent: { padding: 30, alignItems: 'center', justifyContent: 'center' },
  
  chapterCard: { flexDirection: 'row-reverse', backgroundColor: 'rgba(30,30,30,0.6)', padding: 15, borderRadius: 12, marginBottom: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  chapInfo: { flex: 1, alignItems: 'flex-end' },
  chapNum: { color: '#ccc', fontSize: 12, fontWeight: 'bold' },
  chapTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  chapActions: { flexDirection: 'row', gap: 10 },
  iconAction: { padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8 },

  // Toggle
  modeToggle: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.5)', padding: 4, borderRadius: 12, marginBottom: 20 },
  modeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  modeBtnActive: { backgroundColor: 'rgba(255,255,255,0.1)' },
  modeText: { color: '#ccc', fontWeight: 'bold' },

  uploadBox: { height: 150, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  infoText: { color: '#888', fontSize: 12, textAlign: 'right', lineHeight: 20 },
  logsBox: { marginTop: 20, padding: 10, backgroundColor: '#000', borderRadius: 8 },

  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#161616', borderRadius: 16, padding: 20, maxHeight: '60%', borderWidth: 1, borderColor: '#333' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  modalItem: { padding: 15, borderBottomWidth: 1, borderColor: '#222' },
  modalItemText: { color: '#fff', textAlign: 'right' },
  closeBtn: { marginTop: 20, alignItems: 'center', padding: 15, backgroundColor: '#333', borderRadius: 12 },
});
