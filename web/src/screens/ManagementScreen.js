import React, { useState, useCallback, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const { width } = Dimensions.get('window');

export default function ManagementScreen({ navigation }) {
  const { userInfo } = useContext(AuthContext);
  const { showToast } = useToast();
  const [novels, setNovels] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchMyNovels();
    }, [])
  );

  const fetchMyNovels = async () => {
    setLoading(true);
    try {
      // Fetch user stats which includes myWorks
      const res = await api.get('/api/user/stats');
      setNovels(res.data.myWorks || []);
    } catch (e) {
      console.error(e);
      showToast("فشل جلب الأعمال", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (novelId) => {
    Alert.alert(
      "حذف الرواية",
      "هل أنت متأكد؟ سيتم حذف الرواية وجميع الفصول نهائياً.",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/api/admin/novels/${novelId}`);
              showToast("تم الحذف بنجاح", "success");
              fetchMyNovels(); // Refresh list
            } catch (e) {
              showToast("فشل الحذف", "error");
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Image 
        source={item.cover} 
        style={styles.cover} 
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <View style={styles.statsRow}>
            <Text style={styles.statText}>{item.chaptersCount || (item.chapters?.length || 0)} فصل</Text>
            <Text style={styles.statText}>•</Text>
            <Text style={styles.statText}>{item.views || 0} مشاهدة</Text>
        </View>
        <View style={styles.actions}>
            <TouchableOpacity 
                style={[styles.actionBtn, styles.editBtn]} 
                onPress={() => navigation.navigate('AdminDashboard', { editNovel: item })}
            >
                <Ionicons name="create-outline" size={16} color="#fff" />
                <Text style={styles.btnText}>تعديل</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.actionBtn, styles.addBtn]}
                onPress={() => navigation.navigate('AdminDashboard', { 
                    addChapterMode: { 
                        novelId: item._id, 
                        nextNumber: (item.chapters ? item.chapters.length + 1 : 1).toString(),
                        novelTitle: item.title
                    } 
                })}
            >
                <Ionicons name="add-circle-outline" size={16} color="#fff" />
                <Text style={styles.btnText}>فصل</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.actionBtn, styles.deleteBtn]}
                onPress={() => handleDelete(item._id)}
            >
                <Ionicons name="trash-outline" size={16} color="#fff" />
            </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-forward" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>أعمالي</Text>
        <TouchableOpacity 
            style={styles.addNovelBtn}
            onPress={() => navigation.navigate('AdminDashboard')}
        >
            <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4a7cc7" />
        </View>
      ) : (
        <FlatList
          data={novels}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.centered}>
                <Text style={styles.emptyText}>لم تقم بنشر أي أعمال بعد.</Text>
                <TouchableOpacity 
                    style={styles.ctaButton}
                    onPress={() => navigation.navigate('AdminDashboard')}
                >
                    <Text style={styles.ctaText}>نشر عمل جديد</Text>
                </TouchableOpacity>
            </View>
          }
        />
      )}
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
    borderBottomColor: '#222'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff'
  },
  backBtn: { padding: 5 },
  addNovelBtn: { 
      backgroundColor: '#4a7cc7', 
      borderRadius: 20, 
      width: 40, 
      height: 40, 
      justifyContent: 'center', 
      alignItems: 'center' 
  },
  listContent: { padding: 15 },
  card: {
    flexDirection: 'row-reverse',
    backgroundColor: '#161616',
    borderRadius: 12,
    marginBottom: 15,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a'
  },
  cover: {
    width: 70,
    height: 100,
    borderRadius: 8,
    marginLeft: 15,
    backgroundColor: '#333'
  },
  info: {
    flex: 1,
    alignItems: 'flex-end'
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'right'
  },
  statsRow: {
      flexDirection: 'row-reverse',
      gap: 5,
      marginBottom: 10
  },
  statText: {
      color: '#888',
      fontSize: 12
  },
  actions: {
      flexDirection: 'row-reverse',
      gap: 10,
      width: '100%'
  },
  actionBtn: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
      gap: 5
  },
  editBtn: { backgroundColor: '#333' },
  addBtn: { backgroundColor: '#4a7cc7' },
  deleteBtn: { backgroundColor: '#ff4444', paddingHorizontal: 8 },
  btnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#666', fontSize: 16, marginBottom: 20 },
  ctaButton: { backgroundColor: '#4a7cc7', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  ctaText: { color: '#fff', fontWeight: 'bold' }
});