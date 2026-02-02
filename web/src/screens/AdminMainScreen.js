
import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  ImageBackground
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const { width } = Dimensions.get('window');

// Glass Container for consistency (Same as AdminDashboard)
const GlassCard = ({ children, style, onPress }) => (
    <TouchableOpacity 
        style={[styles.glassCard, style]} 
        onPress={onPress}
        activeOpacity={0.9}
        disabled={!onPress}
    >
        <LinearGradient
            colors={['rgba(20, 20, 20, 0.7)', 'rgba(20, 20, 20, 0.9)']}
            style={StyleSheet.absoluteFill}
        />
        {children}
    </TouchableOpacity>
);

export default function AdminMainScreen({ navigation }) {
  const { userInfo } = useContext(AuthContext);
  const [stats, setStats] = useState({ users: 0, novels: 0, views: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      fetchStats();
  }, []);

  const fetchStats = async () => {
      try {
          const usersRes = await api.get('/api/admin/users');
          const novelsRes = await api.get('/api/novels?limit=1'); 
          
          setStats({
              users: usersRes.data.length,
              novels: novelsRes.data.totalNovels || 0,
              views: '---' 
          });
      } catch (e) {
          console.log(e);
      } finally {
          setLoading(false);
      }
  };

  const DashboardButton = ({ title, icon, color, onPress, subtitle }) => (
      <GlassCard onPress={onPress} style={styles.dashboardBtn}>
          <View style={[styles.iconCircle, { backgroundColor: `${color}20` }]}>
              <Ionicons name={icon} size={28} color={color} />
          </View>
          <View style={styles.btnContent}>
              <Text style={styles.btnTitle}>{title}</Text>
              {subtitle && <Text style={styles.btnSubtitle}>{subtitle}</Text>}
          </View>
          <Ionicons name="chevron-back" size={20} color="#444" />
      </GlassCard>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* BACKGROUND EXACTLY LIKE ADMIN DASHBOARD */}
      <ImageBackground 
        source={require('../../assets/adaptive-icon.png')} 
        style={styles.bgImage}
        blurRadius={20}
      >
          <LinearGradient colors={['rgba(0,0,0,0.6)', '#000000']} style={StyleSheet.absoluteFill} />
      </ImageBackground>

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
            <View>
                <Text style={styles.greeting}>مرحباً، {userInfo?.name}</Text>
                <Text style={styles.roleText}>لوحة تحكم المشرف العام</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
            
            {/* Quick Stats Grid */}
            <View style={styles.statsContainer}>
                <GlassCard style={styles.statCard}>
                    <Text style={styles.statNumber}>{loading ? '...' : stats.users}</Text>
                    <Text style={styles.statLabel}>المستخدمين</Text>
                    <Ionicons name="people" size={20} color="#a855f7" style={styles.statIcon} />
                </GlassCard>
                
                <GlassCard style={styles.statCard}>
                    <Text style={styles.statNumber}>{loading ? '...' : stats.novels}</Text>
                    <Text style={styles.statLabel}>الروايات</Text>
                    <Ionicons name="library" size={20} color="#3b82f6" style={styles.statIcon} />
                </GlassCard>
            </View>

            <Text style={styles.sectionTitle}>الذكاء الاصطناعي</Text>
            <View style={styles.grid}>
                <DashboardButton 
                    title="المترجم الذكي (AI)" 
                    subtitle="إدارة الترجمة الآلية، المفاتيح، المسرد"
                    icon="language" 
                    color="#06b6d4" 
                    onPress={() => navigation.navigate('TranslatorHub')}
                />
                <DashboardButton 
                    title="الاستيراد الآلي (Scraper)" 
                    subtitle="سحب الروايات من المواقع الخارجية"
                    icon="planet" 
                    color="#8b5cf6" 
                    onPress={() => navigation.navigate('AutoImport')}
                />
            </View>

            <Text style={styles.sectionTitle}>الإدارة العامة</Text>
            <View style={styles.grid}>
                <DashboardButton 
                    title="إدارة المستخدمين" 
                    subtitle="الصلاحيات، الحظر، الحذف"
                    icon="people-circle" 
                    color="#f43f5e" 
                    onPress={() => navigation.navigate('UsersManagement')}
                />
                <DashboardButton 
                    title="إدارة الروايات" 
                    subtitle="تعديل، حذف، إضافة فصول"
                    icon="book" 
                    color="#3b82f6" 
                    onPress={() => navigation.navigate('Management')}
                />
            </View>

            <Text style={styles.sectionTitle}>أدوات النشر</Text>
            <View style={styles.grid}>
                <DashboardButton 
                    title="النشر المتعدد (ZIP)" 
                    subtitle="رفع ملف مضغوط للفصول"
                    icon="cloud-upload" 
                    color="#f59e0b" 
                    onPress={() => navigation.navigate('BulkUpload')}
                />
                <DashboardButton 
                    title="إنشاء عمل جديد" 
                    subtitle="إضافة رواية جديدة يدوياً"
                    icon="add-circle" 
                    color="#10b981" 
                    onPress={() => navigation.navigate('AdminDashboard')}
                />
            </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  bgImage: { ...StyleSheet.absoluteFillObject },
  safeArea: { flex: 1 },
  header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 20,
  },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#fff', textAlign: 'right' },
  roleText: { fontSize: 14, color: '#4a7cc7', marginTop: 4, textAlign: 'right', fontWeight: '600' },
  closeBtn: { padding: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 },
  
  content: { padding: 20, paddingBottom: 50 },
  
  // Glass Card Base (Matched AdminDashboard)
  glassCard: {
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      position: 'relative'
  },

  // Stats
  statsContainer: { flexDirection: 'row', gap: 15, marginBottom: 30 },
  statCard: { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center' },
  statNumber: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  statLabel: { color: '#888', fontSize: 12 },
  statIcon: { position: 'absolute', top: 10, left: 10, opacity: 0.8 },

  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 15, marginTop: 10, textAlign: 'right' },
  
  grid: { gap: 12 },
  
  // Dashboard Buttons
  dashboardBtn: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      padding: 15,
  },
  iconCircle: {
      width: 50,
      height: 50,
      borderRadius: 15,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 15
  },
  btnContent: { flex: 1 },
  btnTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'right', marginBottom: 4 },
  btnSubtitle: { color: '#888', fontSize: 12, textAlign: 'right' },
});
