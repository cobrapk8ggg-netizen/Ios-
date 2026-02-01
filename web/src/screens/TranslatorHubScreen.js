
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
  RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { useFocusEffect } from '@react-navigation/native';

export default function TranslatorHubScreen({ navigation }) {
  const [jobs, setJobs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchJobs = async () => {
      try {
          const res = await api.get('/api/translator/jobs');
          setJobs(res.data);
      } catch (e) { console.log(e); }
  };

  useFocusEffect(
      useCallback(() => {
          fetchJobs();
          const interval = setInterval(fetchJobs, 5000);
          return () => clearInterval(interval);
      }, [])
  );

  const onRefresh = async () => {
      setRefreshing(true);
      await fetchJobs();
      setRefreshing(false);
  };

  const renderJobItem = (job) => (
      <TouchableOpacity 
        key={job.id} 
        style={styles.jobCard}
        onPress={() => navigation.navigate('TranslationJobDetail', { job })}
      >
          <Image source={{uri: job.cover}} style={styles.jobCover} />
          <View style={styles.jobInfo}>
              <Text style={styles.jobTitle} numberOfLines={1}>{job.novelTitle}</Text>
              <View style={styles.jobStatusRow}>
                  <View style={[styles.statusDot, {backgroundColor: job.status === 'active' ? '#4ade80' : job.status === 'failed' ? '#ff4444' : '#888'}]} />
                  <Text style={styles.statusText}>
                      {job.status === 'active' ? 'جاري الترجمة' : job.status === 'completed' ? 'مكتمل' : 'متوقف/خطأ'}
                  </Text>
              </View>
              <View style={styles.progressContainer}>
                  <View style={[styles.progressBar, {width: `${(job.translated / job.total) * 100}%`}]} />
              </View>
              <Text style={styles.progressText}>{job.translated} / {job.total} فصل</Text>
          </View>
          <Ionicons name="chevron-back" size={20} color="#666" />
      </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0f172a', '#000000']} style={styles.bg} />
      <SafeAreaView style={{flex: 1}}>
        
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.navigate('TranslatorSettings')} style={styles.iconBtn}>
                <Ionicons name="settings-outline" size={24} color="#fff" />
            </TouchableOpacity>
            <View>
                <Text style={styles.headerTitle}>المترجم الذكي</Text>
                <Text style={styles.headerSub}>Zeus AI Engine</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                <Ionicons name="arrow-forward" size={24} color="#fff" />
            </TouchableOpacity>
        </View>

        <ScrollView 
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        >
            
            <TouchableOpacity 
                style={styles.newTranslationBtn}
                onPress={() => navigation.navigate('EnglishNovelsSelection')}
            >
                <LinearGradient 
                    colors={['#06b6d4', '#3b82f6']} 
                    start={{x:0, y:0}} end={{x:1, y:1}} 
                    style={styles.gradientBtn}
                >
                    <Ionicons name="add-circle" size={28} color="#fff" />
                    <Text style={styles.newTranslationText}>بدء ترجمة جديدة</Text>
                </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>المهام الحالية</Text>
            {jobs.length === 0 ? (
                <Text style={{color:'#666', textAlign:'center', marginTop: 20}}>لا توجد مهام نشطة.</Text>
            ) : (
                <View style={styles.jobsList}>
                    {jobs.map(renderJobItem)}
                </View>
            )}

            {/* This is intentionally hidden as Glossary is accessed per Novel now via JobDetail or Selection, 
                OR we can make it open a novel picker specifically for glossary. 
                For now, linking to selection screen but user might want a direct glossary hub later.
                Let's make it open EnglishNovelsSelection but with a params to redirect to Glossary? 
                Actually, simpler: Just show the button, let user pick novel, then go to glossary.
                But based on prompt, let's keep it simple or remove if confusing.
                The prompt asked for glossary interface inside Job Detail. 
            */}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  bg: { ...StyleSheet.absoluteFillObject },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderColor: '#222' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'right' },
  headerSub: { color: '#06b6d4', fontSize: 12, textAlign: 'right' },
  iconBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 },
  
  content: { padding: 20 },
  
  newTranslationBtn: { marginBottom: 30, borderRadius: 16, overflow: 'hidden', shadowColor: '#06b6d4', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  gradientBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, gap: 10 },
  newTranslationText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'right' },
  
  jobsList: { gap: 15, marginBottom: 30 },
  jobCard: { flexDirection: 'row-reverse', backgroundColor: '#161616', borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  jobCover: { width: 60, height: 80, borderRadius: 8, backgroundColor: '#333' },
  jobInfo: { flex: 1, marginRight: 15, alignItems: 'flex-end' },
  jobTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  jobStatusRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, marginBottom: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: '#bbb', fontSize: 12 },
  progressContainer: { width: '100%', height: 4, backgroundColor: '#333', borderRadius: 2, marginBottom: 4 },
  progressBar: { height: '100%', backgroundColor: '#06b6d4', borderRadius: 2 },
  progressText: { color: '#666', fontSize: 10 },
});
