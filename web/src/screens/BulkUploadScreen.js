import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { AuthContext } from '../context/AuthContext';

export default function BulkUploadScreen({ navigation }) {
  const { userInfo } = useContext(AuthContext);
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [fetchingNovels, setFetchingNovels] = useState(true);
  
  // Selection States
  const [novelsList, setNovelsList] = useState([]);
  const [selectedNovel, setSelectedNovel] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Modal State
  const [showNovelPicker, setShowNovelPicker] = useState(false);

  // Status Log
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchNovels();
  }, []);

  const fetchNovels = async () => {
    try {
        const res = await api.get('/api/novels?limit=100');
        let list = res.data.novels || [];
        
        // Filter if not super admin
        if (userInfo && userInfo.role !== 'admin') {
            list = list.filter(n => 
                (n.authorEmail && n.authorEmail === userInfo.email) ||
                (n.author && n.author.toLowerCase() === userInfo.name.toLowerCase())
            );
        }
        setNovelsList(list);
    } catch(e) { 
        console.log(e);
        showToast("فشل جلب قائمة الروايات", "error");
    } finally {
        setFetchingNovels(false);
    }
  };

  const pickZipFile = async () => {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            type: ['application/zip', 'application/x-zip-compressed'],
            copyToCacheDirectory: true
        });

        if (result.canceled) return;

        const asset = result.assets ? result.assets[0] : result;
        if (asset) {
            setSelectedFile(asset);
        }
    } catch (err) {
        console.error(err);
        showToast("فشل اختيار الملف", "error");
    }
  };

  const handleUpload = async () => {
      if (!selectedNovel) {
          showToast("يرجى اختيار الرواية أولاً", "error");
          return;
      }
      if (!selectedFile) {
          showToast("يرجى اختيار ملف ZIP", "error");
          return;
      }

      setLoading(true);
      setLogs([]); // Clear previous logs

      try {
          const formData = new FormData();
          formData.append('novelId', selectedNovel._id);
          formData.append('zip', {
              uri: selectedFile.uri,
              name: selectedFile.name || 'chapters.zip',
              type: selectedFile.mimeType || 'application/zip'
          });

          const response = await api.post('/api/admin/chapters/bulk-upload', formData, {
              headers: {
                  'Content-Type': 'multipart/form-data',
              },
          });

          const { successCount, errors } = response.data;
          
          if (successCount > 0) {
              showToast(`تم نشر ${successCount} فصل بنجاح!`, "success");
              setLogs([`✅ تم إضافة ${successCount} فصل بنجاح.`, ...errors]);
          } else {
              showToast("لم يتم إضافة أي فصل", "error");
              setLogs(["❌ لم يتم العثور على فصول صالحة.", ...errors]);
          }

      } catch (error) {
          console.error(error);
          const msg = error.response?.data?.message || "حدث خطأ أثناء الرفع";
          showToast(msg, "error");
          setLogs([`❌ خطأ فادح: ${msg}`]);
      } finally {
          setLoading(false);
      }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-forward" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>النشر المتعدد</Text>
        <View style={{width: 40}} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.description}>
            قم برفع ملف ZIP يحتوي على ملفات نصية (.txt). سيتم استخراج رقم الفصل من اسم الملف (مثال: 10.txt) والعنوان من السطر الأول داخل الملف.
        </Text>

        {/* 1. Novel Selector */}
        <View style={styles.section}>
            <Text style={styles.label}>1. اختر الرواية</Text>
            <TouchableOpacity 
                style={styles.selectorBtn} 
                onPress={() => setShowNovelPicker(true)}
                disabled={fetchingNovels}
            >
                {fetchingNovels ? (
                    <ActivityIndicator color="#666" />
                ) : (
                    <>
                        <Ionicons name="chevron-down" size={20} color="#666" />
                        <Text style={[styles.selectorText, selectedNovel && {color: '#4a7cc7', fontWeight: 'bold'}]}>
                            {selectedNovel ? selectedNovel.title : "اضغط للاختيار من القائمة"}
                        </Text>
                    </>
                )}
            </TouchableOpacity>
        </View>

        {/* 2. File Picker */}
        <View style={styles.section}>
            <Text style={styles.label}>2. ملف الفصول (ZIP)</Text>
            <TouchableOpacity style={styles.filePickerBtn} onPress={pickZipFile}>
                {selectedFile ? (
                    <View style={styles.fileInfo}>
                        <Ionicons name="document-text" size={32} color="#4ade80" />
                        <Text style={styles.fileName}>{selectedFile.name}</Text>
                        <Text style={styles.fileSize}>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</Text>
                    </View>
                ) : (
                    <View style={styles.filePlaceholder}>
                        <Ionicons name="cloud-upload-outline" size={40} color="#666" />
                        <Text style={styles.filePlaceholderText}>اضغط لاختيار ملف .zip</Text>
                    </View>
                )}
            </TouchableOpacity>
        </View>

        {/* 3. Action Button */}
        <TouchableOpacity 
            style={[styles.uploadBtn, (!selectedNovel || !selectedFile || loading) && styles.disabledBtn]} 
            onPress={handleUpload}
            disabled={!selectedNovel || !selectedFile || loading}
        >
            {loading ? (
                <ActivityIndicator color="#000" />
            ) : (
                <LinearGradient
                    colors={(!selectedNovel || !selectedFile) ? ['#333', '#333'] : ['#f59e0b', '#d97706']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                />
            )}
            {!loading && <Text style={styles.uploadBtnText}>بدء المعالجة والنشر</Text>}
        </TouchableOpacity>

        {/* Logs Console */}
        {logs.length > 0 && (
            <View style={styles.logsContainer}>
                <Text style={styles.logsTitle}>سجل العملية:</Text>
                {logs.map((log, index) => (
                    <Text key={index} style={[styles.logText, log.includes('❌') && {color: '#ff6b6b'}]}>
                        {log}
                    </Text>
                ))}
            </View>
        )}

      </ScrollView>

      {/* Novel Picker Modal */}
      <Modal visible={showNovelPicker} transparent animationType="slide">
          <View style={styles.modalBg}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>اختر رواية للنشر</Text>
                  {novelsList.length === 0 ? (
                      <Text style={styles.emptyText}>لا توجد روايات متاحة.</Text>
                  ) : (
                      <FlatList
                        data={novelsList}
                        keyExtractor={item => item._id}
                        renderItem={({item}) => (
                            <TouchableOpacity style={styles.modalItem} onPress={() => { setSelectedNovel(item); setShowNovelPicker(false); }}>
                                <Text style={styles.modalItemText}>{item.title}</Text>
                                {selectedNovel?._id === item._id && <Ionicons name="checkmark" size={18} color="#4a7cc7" />}
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
  header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 15,
      borderBottomWidth: 1,
      borderColor: '#222'
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  backButton: { padding: 5, borderRadius: 20, backgroundColor: '#1a1a1a' },
  
  content: { padding: 20 },
  description: { color: '#888', textAlign: 'right', marginBottom: 30, lineHeight: 22 },
  
  section: { marginBottom: 25 },
  label: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 10, textAlign: 'right' },
  
  selectorBtn: {
      flexDirection: 'row',
      justifyContent: 'space-between', // Changed to put text on right (RTL logic via flex)
      alignItems: 'center',
      backgroundColor: '#161616',
      padding: 15,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#333'
  },
  selectorText: { color: '#ccc', fontSize: 14 },

  filePickerBtn: {
      height: 150,
      backgroundColor: '#161616',
      borderRadius: 12,
      borderWidth: 2,
      borderColor: '#333',
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center'
  },
  filePlaceholder: { alignItems: 'center', gap: 10 },
  filePlaceholderText: { color: '#666' },
  
  fileInfo: { alignItems: 'center', gap: 5 },
  fileName: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  fileSize: { color: '#888', fontSize: 12 },

  uploadBtn: {
      height: 55,
      borderRadius: 12,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 20,
      position: 'relative' // needed for absolute fill gradient
  },
  disabledBtn: { opacity: 0.5 },
  uploadBtnText: { color: '#000', fontSize: 16, fontWeight: 'bold', zIndex: 1 },

  logsContainer: {
      marginTop: 30,
      backgroundColor: '#111',
      padding: 15,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#333'
  },
  logsTitle: { color: '#fff', fontWeight: 'bold', marginBottom: 10, textAlign: 'right' },
  logText: { color: '#4ade80', fontSize: 12, marginBottom: 4, textAlign: 'right' },

  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#161616', borderRadius: 16, padding: 20, maxHeight: '70%' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  emptyText: { color: '#666', textAlign: 'center', padding: 20 },
  modalItem: { flexDirection: 'row-reverse', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderColor: '#222' },
  modalItemText: { color: '#ccc', fontSize: 16 },
  closeBtn: { marginTop: 20, alignItems: 'center', padding: 15, backgroundColor: '#333', borderRadius: 8 },
});