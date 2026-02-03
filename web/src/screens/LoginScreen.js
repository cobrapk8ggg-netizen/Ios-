
import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ImageBackground
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking'; 
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import CustomAlert from '../components/CustomAlert'; // 🔥 Imported CustomAlert

const { width, height } = Dimensions.get('window');
const BACKEND_URL = 'https://c-production-3db6.up.railway.app'; 

export default function LoginScreen({ navigation }) {
  const { login } = useContext(AuthContext);
  const { showToast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // 🔥 Custom Alert State
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});

  const handleLogin = async () => {
      if (!email || !password) {
          showToast("الرجاء إدخال البريد وكلمة المرور", "error");
          return;
      }

      setLoading(true);
      try {
          const res = await api.post('/auth/login', { email, password });
          if (res.data.token) {
             login(res.data.token);
             showToast("تم تسجيل الدخول بنجاح", "success");
          }
      } catch (error) {
          console.error(error);
          
          if (error.response) {
              const status = error.response.status;
              const msg = error.response.data?.message;

              // 🔥 1. Account Not Found (404) -> Prompt Signup via CustomAlert
              if (status === 404) {
                  setAlertConfig({
                      title: "الحساب غير موجود",
                      message: "هل تريد إنشاء حساب جديد؟",
                      type: 'info',
                      confirmText: "نعم، إنشاء حساب",
                      cancelText: "لا",
                      onConfirm: () => {
                          setAlertVisible(false);
                          navigation.navigate('Signup');
                      }
                  });
                  setAlertVisible(true);
              } 
              // 🔥 2. Wrong Password (401)
              else if (status === 401) {
                  setAlertConfig({
                      title: "خطأ",
                      message: "كلمة المرور غير صحيحة.",
                      type: 'danger',
                      onConfirm: () => setAlertVisible(false),
                      confirmText: "حسناً",
                      cancelText: "" // Hide cancel button
                  });
                  setAlertVisible(true);
              }
              // 🔥 3. Other Errors (e.g. 400 Google User)
              else {
                  showToast(msg || "فشل تسجيل الدخول", "error");
              }
          } else {
              showToast("خطأ في الاتصال بالخادم", "error");
          }
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
      setAlertConfig({
          title: "خطأ",
          message: "حدث خطأ أثناء فتح المتصفح",
          type: 'danger',
          onConfirm: () => setAlertVisible(false)
      });
      setAlertVisible(true);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* 🔥 Custom Alert Component */}
      <CustomAlert 
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        onCancel={() => setAlertVisible(false)}
        onConfirm={alertConfig.onConfirm}
      />

      {/* الخلفية الزجاجية - نفس الصورة المستخدمة */}
      <ImageBackground 
        source={require('../../assets/adaptive-icon.png')} 
        style={styles.bgImage}
        blurRadius={10}
        contentFit="cover"
      >
          <LinearGradient colors={['rgba(0,0,0,0.3)', '#000000']} style={StyleSheet.absoluteFill} />
          
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"} 
            style={{flex: 1}}
          >
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                <View style={styles.logoContainer}>
                    <View style={styles.logoWrapper}>
                        {/* استخدام نفس الصورة كشعار */}
                        <Image 
                            source={require('../../assets/adaptive-icon.png')} 
                            style={styles.logo} 
                            contentFit="contain"
                        />
                    </View>
                    <Text style={styles.appName}>قمر الروايات</Text>
                    <Text style={styles.appSlogan}>بوابتك لعالم الخيال</Text>
                </View>

                {/* Glass Form Container */}
                <View style={styles.glassContainer}>
                    <Text style={styles.formTitle}>تسجيل الدخول</Text>
                    
                    <View style={styles.inputGroup}>
                        <View style={styles.inputWrapper}>
                            <TextInput 
                                style={styles.input}
                                placeholder="البريد الإلكتروني"
                                placeholderTextColor="#ccc"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                            <Ionicons name="mail-outline" size={20} color="#ccc" style={styles.inputIcon} />
                        </View>
                        
                        <View style={styles.inputWrapper}>
                            <TextInput 
                                style={styles.input}
                                placeholder="كلمة المرور"
                                placeholderTextColor="#ccc"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                            <Ionicons name="lock-closed-outline" size={20} color="#ccc" style={styles.inputIcon} />
                        </View>
                    </View>

                    {/* زر الدخول */}
                    <TouchableOpacity 
                        style={styles.loginBtn} 
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>دخول</Text>}
                    </TouchableOpacity>

                    <View style={styles.divider}>
                        <View style={styles.line} />
                        <Text style={styles.orText}>أو</Text>
                        <View style={styles.line} />
                    </View>

                    <TouchableOpacity 
                        style={styles.googleButton}
                        onPress={handleGoogleLogin}
                        activeOpacity={0.8}
                    >
                        <View style={styles.googleIconWrapper}>
                            <Ionicons name="logo-google" size={20} color="#000" />
                        </View>
                        <Text style={styles.googleButtonText}>المتابعة باستخدام Google</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity onPress={() => navigation.navigate('Signup')} activeOpacity={0.7}>
                        <Text style={styles.createAccountText}>ليس لديك حساب؟ <Text style={{color: '#4a7cc7', fontWeight:'bold'}}>إنشاء حساب جديد</Text></Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
          </KeyboardAvoidingView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  bgImage: {
      flex: 1,
      width: '100%',
      height: '100%'
  },
  scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 20,
      paddingTop: 60
  },
  logoContainer: {
      alignItems: 'center',
      marginBottom: 40
  },
  logoWrapper: {
      width: 110,
      height: 110,
      borderRadius: 30,
      backgroundColor: 'rgba(255,255,255,0.1)', // زجاجي خفيف خلف الشعار
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 15,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
      overflow: 'hidden',
      shadowColor: "#fff",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 5
  },
  logo: {
      width: '100%',
      height: '100%',
  },
  appName: {
      fontSize: 32,
      fontWeight: 'bold',
      color: '#fff',
      textShadowColor: 'rgba(0,0,0,0.5)',
      textShadowOffset: {width: 0, height: 2},
      textShadowRadius: 10,
      marginBottom: 5
  },
  appSlogan: {
      fontSize: 16,
      color: '#ccc',
      letterSpacing: 1
  },
  glassContainer: {
      backgroundColor: 'rgba(20, 20, 20, 0.75)',
      borderRadius: 24,
      padding: 25,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      width: '100%',
      maxWidth: 400,
      alignSelf: 'center',
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 10
  },
  formTitle: {
      color: '#fff',
      fontSize: 20,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 25
  },
  inputGroup: {
      gap: 15,
      marginBottom: 25
  },
  inputWrapper: {
      flexDirection: 'row', 
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.4)',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      height: 55,
      paddingHorizontal: 15
  },
  inputIcon: {
      marginLeft: 10
  },
  input: {
      flex: 1,
      color: '#fff',
      fontSize: 16,
      textAlign: 'right', // Arabic Input
      height: '100%'
  },
  loginBtn: {
      backgroundColor: 'rgba(255, 255, 255, 0.15)', 
      height: 55,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.4)', 
      shadowColor: "#fff",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.1,
      shadowRadius: 5,
      elevation: 2
  },
  loginBtnText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 18,
      textShadowColor: 'rgba(0,0,0,0.5)',
      textShadowOffset: {width: 0, height: 1},
      textShadowRadius: 2
  },
  divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20
  },
  line: {
      flex: 1,
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.1)'
  },
  orText: {
      color: '#888',
      paddingHorizontal: 10,
      fontSize: 14
  },
  googleButton: {
      backgroundColor: '#fff',
      flexDirection: 'row-reverse', // Icon Right, Text Left
      alignItems: 'center',
      justifyContent: 'center',
      height: 55,
      borderRadius: 16,
      gap: 10
  },
  googleIconWrapper: {
      marginLeft: 5
  },
  googleButtonText: {
      color: '#000',
      fontSize: 16,
      fontWeight: '600'
  },
  footer: {
      marginTop: 30,
      alignItems: 'center'
  },
  createAccountText: {
      color: '#ccc',
      fontSize: 14
  }
});
