
import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking'; 
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

const { width } = Dimensions.get('window');
const BACKEND_URL = 'https://c-production-3db6.up.railway.app'; 

export default function LoginScreen() {
  const { login } = useContext(AuthContext);
  const { showToast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTestLogin = async () => {
      if (!email || !password) {
          showToast("الرجاء إدخال البريد وكلمة المرور", "error");
          return;
      }
      
      setLoading(true);
      try {
          // استدعاء نقطة النهاية الجديدة للاختبار
          const res = await api.post('/auth/login', { email, password });
          if (res.data.token) {
             login(res.data.token);
             showToast("تم تسجيل الدخول بنجاح", "success");
          }
      } catch (error) {
          console.error(error);
          showToast("فشل تسجيل الدخول", "error");
      } finally {
          setLoading(false);
      }
  };

  const handleGoogleLogin = async () => {
    try {
      const redirectUri = Linking.createURL('auth');
      const authUrl = `${BACKEND_URL}/auth/google?redirect_uri=${encodeURIComponent(redirectUri)}`;
      await WebBrowser.openBrowserAsync(authUrl);
    } catch (error) {
      console.error(error);
      Alert.alert('خطأ', 'حدث خطأ أثناء فتح المتصفح');
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={styles.container}
    >
      <StatusBar style="light" />
      <LinearGradient
        colors={['#000000', '#111']}
        style={styles.background}
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Zeuz</Text>
            <Text style={styles.subtitle}>بوابتك لعالم الروايات</Text>
          </View>

          <View style={styles.illustration}>
             <Ionicons name="library" size={100} color="#4a7cc7" />
          </View>

          {/* نموذج تسجيل الدخول السريع (للاختبار) */}
          <View style={styles.formContainer}>
             <View style={styles.inputWrapper}>
                 <Ionicons name="mail" size={20} color="#666" style={styles.inputIcon} />
                 <TextInput 
                    style={styles.input}
                    placeholder="البريد الإلكتروني"
                    placeholderTextColor="#666"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                 />
             </View>
             
             <View style={styles.inputWrapper}>
                 <Ionicons name="lock-closed" size={20} color="#666" style={styles.inputIcon} />
                 <TextInput 
                    style={styles.input}
                    placeholder="كلمة المرور (للاختبار أي شيء مقبول)"
                    placeholderTextColor="#666"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                 />
             </View>

             <TouchableOpacity 
                style={styles.loginBtn} 
                onPress={handleTestLogin}
                disabled={loading}
             >
                 {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>دخول سريع</Text>}
             </TouchableOpacity>
          </View>

          <View style={styles.divider}>
             <View style={styles.line} />
             <Text style={styles.orText}>أو</Text>
             <View style={styles.line} />
          </View>

          <View style={styles.bottomSection}>
            <TouchableOpacity 
              style={styles.googleButton}
              onPress={handleGoogleLogin}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-google" size={24} color="#000" />
              <Text style={styles.googleButtonText}>تسجيل الدخول بواسطة Google</Text>
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              نسخة تجريبية للاختبار والتطوير
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
      flexGrow: 1,
      justifyContent: 'center'
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  content: {
    padding: 30,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%'
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30
  },
  title: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#4a7cc7',
    marginBottom: 10,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 18,
    color: '#aaa',
  },
  illustration: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40
  },
  
  // Form Styles
  formContainer: {
      width: '100%',
      gap: 15,
      marginBottom: 20
  },
  inputWrapper: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      backgroundColor: '#161616',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#333',
      height: 50,
      paddingHorizontal: 15
  },
  inputIcon: { marginLeft: 10 },
  input: {
      flex: 1,
      color: '#fff',
      textAlign: 'right',
      height: '100%'
  },
  loginBtn: {
      backgroundColor: '#4a7cc7',
      height: 50,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 5
  },
  loginBtnText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 16
  },

  divider: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      marginBottom: 20
  },
  line: { flex: 1, height: 1, backgroundColor: '#333' },
  orText: { color: '#666', marginHorizontal: 10 },

  bottomSection: {
    width: '100%',
    alignItems: 'center',
  },
  googleButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    width: '100%',
    gap: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  googleButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disclaimer: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
  },
});
