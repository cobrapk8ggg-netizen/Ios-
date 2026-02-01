
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export default function TranslatorSettingsScreen({ navigation }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  
  // Prompts
  const [transPrompt, setTransPrompt] = useState('');
  const [extractPrompt, setExtractPrompt] = useState(''); // 🔥 Restored
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  
  // API Keys Management
  const [apiKeysText, setApiKeysText] = useState(''); // Text representation for bulk edit
  const [savedKeysCount, setSavedKeysCount] = useState(0);

  const models = [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', desc: 'سريع، اقتصادي، مثالي للترجمة السريعة' },
      { id: 'pro', name: 'Gemini Pro', desc: 'دقيق، ذكي، أفضل للنصوص المعقدة' },
  ];

  useEffect(() => {
      fetchSettings();
  }, []);

  const fetchSettings = async () => {
      try {
          const res = await api.get('/api/translator/settings');
          if (res.data) {
              setTransPrompt(res.data.customPrompt || '');
              setExtractPrompt(res.data.translatorExtractPrompt || ''); // 🔥 Load Extraction Prompt
              setSelectedModel(res.data.translatorModel || 'gemini-2.5-flash');
              
              // Convert array to multiline string for easy editing
              const keys = res.data.translatorApiKeys || [];
              setApiKeysText(keys.join('\n'));
              setSavedKeysCount(keys.length);
          }
      } catch (e) {
          showToast("فشل جلب الإعدادات", "error");
      } finally {
          setLoading(false);
      }
  };

  const handleSave = async () => {
      try {
          // Process Keys: Split by newline, trim, remove empty
          const processedKeys = apiKeysText
              .split('\n')
              .map(k => k.trim())
              .filter(k => k.length > 5); // Basic validation

          await api.post('/api/translator/settings', {
              customPrompt: transPrompt,
              translatorExtractPrompt: extractPrompt, // 🔥 Save Extraction Prompt
              translatorModel: selectedModel,
              translatorApiKeys: processedKeys
          });
          
          setSavedKeysCount(processedKeys.length);
          showToast(`تم الحفظ بنجاح (${processedKeys.length} مفتاح)`, "success");
          navigation.goBack();
      } catch (e) {
          showToast("فشل الحفظ", "error");
      }
  };

  if (loading) {
      return (
          <View style={[styles.container, {justifyContent:'center', alignItems:'center'}]}>
              <ActivityIndicator color="#06b6d4" size="large" />
          </View>
      );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
          <Text style={styles.headerTitle}>إعدادات المترجم</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
          
          {/* API Keys Section */}
          <Text style={styles.sectionLabel}>مفاتيح API (Bulk Input)</Text>
          <Text style={styles.hint}>ضع كل مفتاح في سطر منفصل. النظام سيقوم بتنظيفها وحفظها.</Text>
          <Text style={[styles.hint, {color: '#4ade80'}]}>الحالة الحالية: {savedKeysCount} مفتاح محفوظ.</Text>
          
          <TextInput 
              style={styles.keysInput}
              multiline
              placeholder="AIzaSy...&#10;AIzaSy...&#10;AIzaSy..."
              placeholderTextColor="#666"
              value={apiKeysText}
              onChangeText={setApiKeysText}
              textAlignVertical="top"
              autoCapitalize="none"
              autoCorrect={false}
          />

          {/* Model Section */}
          <Text style={styles.sectionLabel}>نموذج الذكاء الاصطناعي</Text>
          <View style={styles.modelsContainer}>
              {models.map((model) => (
                  <TouchableOpacity 
                    key={model.id}
                    style={[styles.modelOption, selectedModel === model.id && styles.modelOptionActive]}
                    onPress={() => setSelectedModel(model.id)}
                  >
                      <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                          <View>
                              <Text style={[styles.modelName, selectedModel === model.id && {color: '#fff'}]}>{model.name}</Text>
                              <Text style={styles.modelDesc}>{model.desc}</Text>
                          </View>
                          {selectedModel === model.id && <Ionicons name="checkmark-circle" size={24} color="#06b6d4" />}
                      </View>
                  </TouchableOpacity>
              ))}
          </View>

          {/* Translation Prompt */}
          <Text style={styles.label}>تعليمات الترجمة (Translation Prompt)</Text>
          <Text style={styles.hint}>التعليمات الأساسية للترجمة (النبرة، الأسلوب، الضمائر).</Text>
          <TextInput 
              style={styles.input}
              multiline
              value={transPrompt}
              onChangeText={setTransPrompt}
              textAlignVertical="top"
              placeholder="You are a professional translator..."
              placeholderTextColor="#666"
          />

          {/* 🔥 Extraction Prompt Restored */}
          <Text style={styles.label}>تعليمات استخراج المصطلحات (Extraction Prompt)</Text>
          <Text style={styles.hint}>تعليمات خاصة بكيفية استخراج المصطلحات الجديدة وإضافتها للمسرد.</Text>
          <TextInput 
              style={[styles.input, { borderColor: '#f59e0b' }]} // Distinct color
              multiline
              value={extractPrompt}
              onChangeText={setExtractPrompt}
              textAlignVertical="top"
              placeholder="Extract proper nouns, skills, and cultivation ranks..."
              placeholderTextColor="#666"
          />

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveText}>حفظ الإعدادات</Text>
          </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderColor: '#222' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  content: { padding: 20 },
  
  sectionLabel: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 5, textAlign: 'right', marginTop: 10 },
  hint: { color: '#888', fontSize: 12, textAlign: 'right', marginBottom: 10 },

  keysInput: { backgroundColor: '#111', borderRadius: 8, padding: 12, color: '#4ade80', borderWidth: 1, borderColor: '#333', height: 150, fontFamily: 'monospace', fontSize: 12 },
  
  modelsContainer: { gap: 10, marginBottom: 25 },
  modelOption: { backgroundColor: '#161616', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  modelOptionActive: { borderColor: '#06b6d4', backgroundColor: 'rgba(6, 182, 212, 0.1)' },
  modelName: { color: '#ccc', fontSize: 16, fontWeight: 'bold', textAlign: 'left' },
  modelDesc: { color: '#666', fontSize: 12, marginTop: 4, textAlign: 'left' },

  label: { color: '#06b6d4', marginBottom: 5, marginTop: 20, textAlign: 'right', fontWeight: 'bold' },
  input: { backgroundColor: '#161616', color: '#ccc', borderRadius: 10, padding: 15, minHeight: 120, borderWidth: 1, borderColor: '#333', textAlign: 'left' },
  
  saveBtn: { backgroundColor: '#06b6d4', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 40, marginBottom: 50 },
  saveText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
