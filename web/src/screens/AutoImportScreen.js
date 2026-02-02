
import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Platform,
  StatusBar,
  ImageBackground
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import axios from 'axios';
import api from '../services/api'; 

const { height } = Dimensions.get('window');

// ⚠️ استبدل هذا الرابط برابط مشروعك على Railway بعد نشره
const SCRAPER_URL = 'https://test-production-20af.up.railway.app/scrape'; 
const API_SECRET = 'Zeusndndjddnejdjdjdejekk29393838msmskxcm9239484jdndjdnddjj99292938338zeuslojdnejxxmejj82283849'; 

// Glass Container
const GlassContainer = ({ children, style }) => (
    <View style={[styles.glassContainer, style]}>
        {children}
    </View>
);

export default function AutoImportScreen({ navigation }) {
  const { userInfo } = useContext(AuthContext);
  const { showToast } = useToast();

  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
   
  // Real logs from backend
  const [serverLogs, setServerLogs] = useState([]);
  const [polling, setPolling] = useState(false);
  const flatListRef = useRef(null);

  // Clear logs on mount
  useEffect(() => {
      api.delete('/api/scraper/logs').catch(() => {});
  }, []);

  // Polling Effect - More aggressive polling (1s) for better UX
  useEffect(() => {
      let interval;
      if (polling) {
          fetchLogs(); 
          interval = setInterval(fetchLogs, 1000); 
      }
      return () => clearInterval(interval);
  }, [polling]);

  const fetchLogs = async () => {
      try {
          const res = await api.get('/api/scraper/logs');
          if (res.data && Array.isArray(res.data)) {
              setServerLogs(res.data);
               
              // Check completion or error from logs content
              const latest = res.data[0];
              if (latest && loading) {
                  // Success condition
                  if (latest.type === 'success' && (latest.message.includes('حفظ') || latest.message.includes('موجودة') || latest.message.includes('اكتمل'))) {
                      setLoading(false);
                      showToast("اكتملت العملية!", "success");
                  }
                  // Error condition
                  if (latest.type === 'error' && (latest.message.includes('فشل') || latest.message.includes('خطأ'))) {
                      setLoading(false);
                      showToast("حدث خطأ", "error");
                  }
              }
          }
      } catch (e) {
          console.log("Polling error (silent)", e.message);
      }
  };

  const handleImport = async () => {
      // ✅ تم تعديل الشرط هنا ليدعم الموقع الجديد Novel Fire
      const isRewayat = url.includes('rewayat.club');
      const isArNovel = url.includes('ar-no.com');
      const isMarkaz = url.includes('markazriwayat.com');
      const isNovelFire = url.includes('novelfire.net');

      if (!isRewayat && !isArNovel && !isMarkaz && !isNovelFire) {
          showToast("الرابط غير مدعوم! المواقع المدعومة: نادي الروايات، Ar-Novel، مركز الروايات، Novel Fire", "error");
          return;
      }

      setLoading(true);
      setPolling(true); 
      setServerLogs([]);

      try {
          // 1. Tell Backend to Initialize (Logs "Starting...")
          await api.post('/api/scraper/init', { url, userEmail: userInfo.email });
           
          // 2. Call Python Scraper
          const scraperResponse = await axios.post(SCRAPER_URL, {
              url: url,
              adminEmail: userInfo.email,
              authorName: userInfo.name
          }, {
              headers: {
                  'Authorization': API_SECRET,
                  'Content-Type': 'application/json'
              }
          });

          // Check if Scraper returned an error in the body
          if (scraperResponse.data && scraperResponse.data.error) {
              throw new Error(scraperResponse.data.error);
          }

      } catch (error) {
          console.error("Scraper Error:", error);
          setLoading(false);
           
          let errorMsg = error.message;
          if (error.response) {
              errorMsg = error.response.data?.error || `HTTP Error ${error.response.status}`;
          } else if (error.request) {
              errorMsg = "لا يوجد استجابة من الخادم (Timeout)";
          }

          showToast("فشلت عملية السحب", "error");
           
          try {
              await api.post('/api/scraper/log', { 
                  message: `❌ فشل الاتصال بالسكرابر: ${errorMsg}`, 
                  type: 'error' 
              });
              fetchLogs();
          } catch (logErr) {
              console.log("Failed to log error to backend");
          }
      }
  };

  const renderLogItem = ({ item }) => {
      let color = '#ccc';
      let icon = 'information-circle-outline';

      if (item.type === 'success') { color = '#4ade80'; icon = 'checkmark-circle-outline'; }
      if (item.type === 'error') { color = '#ff4444'; icon = 'alert-circle-outline'; }
      if (item.type === 'warning') { color = '#f59e0b'; icon = 'warning-outline'; }

      const time = item.timestamp ? new Date(item.timestamp).toLocaleTimeString('en-US', {hour12: false}) : '';

      return (
          <View style={styles.logItem}>
              <View style={styles.logHeader}>
                  <Ionicons name={icon} size={14} color={color} />
                  <Text style={{color:'#666', fontSize:10}}>{time}</Text>
              </View>
              <Text style={[styles.logText, { color }]}>
                  {item.message}
              </Text>
          </View>
      );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ImageBackground 
        source={require('../../assets/adaptive-icon.png')} 
        style={styles.bgImage}
        blurRadius={20}
      >
          <LinearGradient colors={['rgba(0,0,0,0.6)', '#000000']} style={StyleSheet.absoluteFill} />
      </ImageBackground>

      <SafeAreaView style={{flex: 1}} edges={['top']}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                <Ionicons name="arrow-forward" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>الاستيراد الآلي (Live Console)</Text>
            <View style={{width: 40}} />
        </View>

        <View style={styles.content}>
            
            <GlassContainer style={styles.inputBox}>
                <Text style={styles.label}>روابط المواقع المدعومة</Text>
                <Text style={styles.subLabel}>(نادي الروايات، Ar-Novel، مركز الروايات، Novel Fire)</Text>
                
                <View style={styles.inputRow}>
                    <TextInput 
                        style={styles.input} 
                        placeholder="ضع رابط الرواية هنا..."
                        placeholderTextColor="#666"
                        value={url}
                        onChangeText={setUrl}
                        autoCapitalize="none"
                    />
                    <TouchableOpacity 
                        style={[styles.goBtn, (loading || !url) && styles.disabledBtn]} 
                        onPress={handleImport}
                        disabled={loading || !url}
                    >
                        {loading ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="rocket" size={24} color="#fff" />}
                    </TouchableOpacity>
                </View>
            </GlassContainer>

            <GlassContainer style={styles.consoleContainer}>
                <View style={styles.consoleHeader}>
                    <Text style={styles.consoleTitle}>شاشة النظام (Terminal)</Text>
                    {polling && <ActivityIndicator size="small" color="#4ade80" />}
                </View>
                
                <FlatList
                    ref={flatListRef}
                    data={serverLogs}
                    keyExtractor={item => item._id || Math.random().toString()}
                    renderItem={renderLogItem}
                    contentContainerStyle={styles.logsContent}
                    style={styles.logsList}
                    inverted={false} 
                    ListEmptyComponent={
                        <View style={{alignItems: 'center', marginTop: 50, opacity: 0.5}}>
                            <Ionicons name="terminal-outline" size={40} color="#666" />
                            <Text style={styles.emptyText}>جاهز للاستيراد...</Text>
                            <Text style={[styles.emptyText, {fontSize: 10, marginTop: 5}]}>
                                أدخل الرابط واضغط زر الانطلاق
                            </Text>
                        </View>
                    }
                />
            </GlassContainer>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  bgImage: { ...StyleSheet.absoluteFillObject },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  iconBtn: { padding: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 },
   
  content: { flex: 1, padding: 20 },
  
  // Glass Components
  glassContainer: {
      backgroundColor: 'rgba(20, 20, 20, 0.75)',
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      marginBottom: 20
  },
  
  inputBox: { padding: 20 },
  label: { color: '#fff', textAlign: 'right', fontWeight: 'bold', fontSize: 16, marginBottom: 5 },
  subLabel: { color: '#888', textAlign: 'right', fontSize: 12, marginBottom: 15 },
  
  inputRow: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: 15, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', textAlign: 'left' },
  
  // Glassy Action Button
  goBtn: { width: 60, backgroundColor: 'rgba(139, 92, 246, 0.2)', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#8b5cf6' },
  disabledBtn: { opacity: 0.5, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: '#333' },

  consoleContainer: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.8)', // Darker for terminal look
      marginBottom: 0
  },
  consoleHeader: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  consoleTitle: { color: '#888', fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
   
  logsList: { flex: 1 },
  logsContent: { padding: 15 },
  logItem: { marginBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingBottom: 8 },
  logHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 4 },
  logText: { fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', textAlign: 'right', lineHeight: 20 },
  emptyText: { color: '#444', textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }
});
