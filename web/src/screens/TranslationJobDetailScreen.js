
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import CustomAlert from '../components/CustomAlert';

const { width } = Dimensions.get('window');

export default function TranslationJobDetailScreen({ navigation, route }) {
  const { job: initialJob } = route.params;
  const { showToast } = useToast();
  const [job, setJob] = useState(initialJob);
  const [logs, setLogs] = useState([]);
  const [novelMaxChapter, setNovelMaxChapter] = useState(0);
  
  // Custom Alert State
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});
  
  // Polling for live updates
  useEffect(() => {
      const fetchDetails = async () => {
          try {
              const res = await api.get(`/api/translator/jobs/${initialJob.id}`);
              setJob(res.data);
              setLogs(res.data.logs.reverse() || []); 
              if (res.data.novelMaxChapter) setNovelMaxChapter(res.data.novelMaxChapter);
          } catch(e) { console.log(e); }
      };

      fetchDetails();
      const interval = setInterval(fetchDetails, 3000); 
      return () => clearInterval(interval);
  }, []);

  const requestResume = () => {
      setAlertConfig({
          title: "استئناف الترجمة",
          message: `هل تريد استئناف الترجمة من الفصل ${job.currentChapter + 1}؟`,
          type: 'info',
          confirmText: "نعم، ابدأ",
          onConfirm: performResume
      });
      setAlertVisible(true);
  };

  const performResume = async () => {
      setAlertVisible(false);
      try {
          await api.post('/api/translator/start', {
              novelId: job.novelId,
              resumeFrom: job.currentChapter + 1
              // Keys are fetched from settings on backend
          });
          showToast("تم استئناف المهمة", "success");
      } catch (e) { showToast("فشل الاستئناف", "error"); }
  };

  const openGlossary = () => {
      navigation.navigate('GlossaryManager', { novelId: job.novelId });
  };

  const renderLog = ({ item }) => {
      let color = '#ccc';
      if (item.type === 'error') color = '#ff4444';
      if (item.type === 'success') color = '#4ade80';
      if (item.type === 'warning') color = '#f59e0b';

      const time = new Date(item.timestamp).toLocaleTimeString();

      return (
          <View style={styles.logItem}>
              <Text style={styles.logTime}>{time}</Text>
              <Text style={[styles.logText, {color}]}>{item.message}</Text>
          </View>
      );
  };

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
          <Text style={styles.headerTitle}>تحليلات الترجمة</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
          
          {/* Header Card */}
          <View style={styles.statusCard}>
              <View style={{flexDirection:'row-reverse', justifyContent:'space-between', alignItems:'center'}}>
                  <Text style={styles.novelTitle}>{job.novelTitle}</Text>
                  <View style={[styles.statusBadge, {backgroundColor: job.status === 'active' ? '#4ade80' : '#333'}]}>
                      {job.status === 'active' && <ActivityIndicator size="small" color="#000" style={{marginRight:5}} />}
                      <Text style={{color: job.status === 'active' ? '#000' : '#fff', fontSize:12, fontWeight:'bold'}}>{job.status}</Text>
                  </View>
              </View>
              
              <View style={styles.progressContainer}>
                  <View style={[styles.progressBar, {width: `${Math.min(100, (job.currentChapter / (novelMaxChapter || 1)) * 100)}%`}]} />
              </View>
              <Text style={styles.progressText}>
                  تم الوصول للفصل {job.currentChapter} من أصل {novelMaxChapter} فصل موجود
              </Text>
          </View>

          {/* Analytics Grid */}
          <View style={styles.analyticsGrid}>
              <View style={styles.analyticBox}>
                  <Text style={styles.analyticVal}>{job.translatedCount}</Text>
                  <Text style={styles.analyticLabel}>تمت ترجمته</Text>
              </View>
              <View style={[styles.analyticBox, {backgroundColor: '#2a1a1a', borderColor:'#ff4444'}]}>
                  <Text style={[styles.analyticVal, {color:'#ff4444'}]}>
                      {Math.max(0, novelMaxChapter - job.currentChapter)}
                  </Text>
                  <Text style={styles.analyticLabel}>متبقي</Text>
              </View>
          </View>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>إجراءات سريعة</Text>
          <View style={styles.actionsRow}>
              <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#06b6d4'}]} onPress={requestResume}>
                  <Ionicons name="play" size={24} color="#fff" />
                  <Text style={styles.actionBtnText}>استئناف الترجمة</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#f59e0b'}]} onPress={openGlossary}>
                  <Ionicons name="book" size={24} color="#fff" />
                  <Text style={styles.actionBtnText}>إدارة المسرد</Text>
              </TouchableOpacity>
          </View>

          {/* Live Console */}
          <View style={styles.consoleContainer}>
              <Text style={styles.consoleTitle}>سجل العمليات الحية (Live Terminal)</Text>
              <View style={styles.console}>
                  <FlatList 
                      data={logs}
                      keyExtractor={item => item._id || Math.random().toString()}
                      renderItem={renderLog}
                      scrollEnabled={false}
                  />
              </View>
          </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderColor: '#222' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  content: { padding: 20 },
  
  statusCard: { backgroundColor: '#161616', padding: 20, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#333' },
  novelTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', maxWidth: '70%', textAlign:'right' },
  statusBadge: { flexDirection:'row', alignItems:'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  
  progressContainer: { width: '100%', height: 6, backgroundColor: '#333', borderRadius: 3, marginTop: 15, marginBottom: 5 },
  progressBar: { height: '100%', backgroundColor: '#4ade80', borderRadius: 3 },
  progressText: { color: '#888', fontSize: 12, textAlign: 'right' },

  analyticsGrid: { flexDirection: 'row', gap: 15, marginBottom: 25 },
  analyticBox: { flex: 1, backgroundColor: '#111', borderRadius: 12, padding: 15, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  analyticVal: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  analyticLabel: { color: '#666', fontSize: 12, marginTop: 5 },

  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 15, textAlign: 'right' },
  actionsRow: { flexDirection: 'row-reverse', gap: 10, marginBottom: 30 },
  actionBtn: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  consoleContainer: { flex: 1 },
  consoleTitle: { color: '#888', fontSize: 12, marginBottom: 10, textAlign: 'right' },
  console: { backgroundColor: '#0f0f0f', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#333', minHeight: 300 },
  logItem: { flexDirection: 'row-reverse', marginBottom: 8 },
  logTime: { color: '#555', fontSize: 10, width: 50, textAlign: 'left', marginRight: 10 },
  logText: { flex: 1, fontSize: 12, fontFamily: 'monospace', textAlign: 'right' },
});
