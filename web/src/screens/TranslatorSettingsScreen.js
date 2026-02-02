
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  StatusBar,
  ImageBackground
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

const GlassContainer = ({ children, style }) => (
    <View style={[styles.glassContainer, style]}>
        {children}
    </View>
);

export default function TranslatorSettingsScreen({ navigation }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  
  const [transPrompt, setTransPrompt] = useState('');
  const [extractPrompt, setExtractPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  
  const [apiKeysText, setApiKeysText] = useState('');
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
              setExtractPrompt(res.data.translatorExtractPrompt || '');
              setSelectedModel(res.data.translatorModel || 'gemini-2.5-flash');
              
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
          const processedKeys = apiKeysText
              .split('\n')
              .map(k => k.trim())
              .filter(k => k.length > 5);

          await api.post('/api/translator/settings', {
              customPrompt: transPrompt,
              translatorExtractPrompt: extractPrompt,
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
              <ActivityIndicator color="#fff" size="large" />
          </View>
      );
  }

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
            <Text style={styles.headerTitle}>إعدادات المترجم</Text>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
            
            <GlassContainer>
                <Text style={styles.sectionLabel}>مفاتيح API (Bulk Input)</Text>
                <Text style={styles.hint}>ضع كل مفتاح في سطر منفصل. النظام سيقوم بتنظيفها وحفظها.</Text>
                <Text style={[styles.hint, {color: '#fff', fontWeight: 'bold'}]}>الحالة الحالية: {savedKeysCount} مفتاح محفوظ.</Text>
                
                <TextInput 
                    style={styles.keysInput}
                    multiline
                    placeholder="AIzaSy...&#10;AIzaSy..."
                    placeholderTextColor="#666"
                    value={apiKeysText}
                    onChangeText={setApiKeysText}
                    textAlignVertical="top"
                    autoCapitalize="none"
                    autoCorrect={false}
                />
            </GlassContainer>

            <Text style={styles.sectionTitle}>النموذج</Text>
            <View style={styles.modelsContainer}>
                {models.map((model) => (
                    <TouchableOpacity 
                        key={model.id}
                        activeOpacity={0.8}
                        onPress={() => setSelectedModel(model.id)}
                    >
                        <GlassContainer style={[styles.modelOption, selectedModel === model.id && styles.modelOptionActive]}>
                            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15}}>
                                <View>
                                    <Text style={[styles.modelName, selectedModel === model.id && {color: '#fff'}]}>{model.name}</Text>
                                    <Text style={styles.modelDesc}>{model.desc}</Text>
                                </View>
                                {selectedModel === model.id && <Ionicons name="checkmark-circle" size={24} color="#fff" />}
                            </View>
                        </GlassContainer>
                    </TouchableOpacity>
                ))}
            </View>

            <GlassContainer>
                <Text style={styles.sectionLabel}>تعليمات الترجمة</Text>
                <Text style={styles.hint}>النبرة، الأسلوب، الضمائر...</Text>
                <TextInput 
                    style={styles.input}
                    multiline
                    value={transPrompt}
                    onChangeText={setTransPrompt}
                    textAlignVertical="top"
                    placeholder="You are a professional translator..."
                    placeholderTextColor="#666"
                />
            </GlassContainer>

            <GlassContainer style={{marginTop: 20, borderColor: 'rgba(255,255,255,0.2)'}}>
                <Text style={[styles.sectionLabel, {color: '#fff'}]}>استخراج المصطلحات</Text>
                <Text style={styles.hint}>كيفية استخراج المصطلحات الجديدة للمسرد.</Text>
                <TextInput 
                    style={styles.input}
                    multiline
                    value={extractPrompt}
                    onChangeText={setExtractPrompt}
                    textAlignVertical="top"
                    placeholder="Extract proper nouns..."
                    placeholderTextColor="#666"
                />
            </GlassContainer>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveText}>حفظ الإعدادات</Text>
            </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  bgImage: { ...StyleSheet.absoluteFillObject },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', padding: 20, alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  iconBtn: { padding: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 },
  
  content: { padding: 20 },
  
  // Glass Container
  glassContainer: { 
      backgroundColor: 'rgba(20, 20, 20, 0.75)',
      borderRadius: 16, 
      overflow: 'hidden', 
      padding: 15, 
      borderWidth: 1, 
      borderColor: 'rgba(255,255,255,0.1)' 
  },
  
  sectionLabel: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 5, textAlign: 'right' },
  hint: { color: '#888', fontSize: 12, textAlign: 'right', marginBottom: 15 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 15, marginTop: 25, textAlign: 'right' },

  keysInput: { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, padding: 12, color: '#fff', borderWidth: 1, borderColor: '#333', height: 150, fontFamily: 'monospace', fontSize: 12 },
  input: { backgroundColor: 'rgba(0,0,0,0.5)', color: '#ccc', borderRadius: 10, padding: 15, minHeight: 120, borderWidth: 1, borderColor: '#333', textAlign: 'left' },

  modelsContainer: { gap: 10 },
  modelOption: { borderRadius: 16, overflow: 'hidden' },
  modelOptionActive: { borderColor: '#fff', borderWidth: 1 },
  modelName: { color: '#ccc', fontSize: 16, fontWeight: 'bold', textAlign: 'left' },
  modelDesc: { color: '#666', fontSize: 12, marginTop: 4, textAlign: 'left' },

  // Glassy Button
  saveBtn: { 
      marginTop: 40, marginBottom: 50, borderRadius: 16, overflow: 'hidden', 
      backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
      padding: 18, alignItems: 'center'
  },
  saveText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
