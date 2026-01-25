
import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const { width } = Dimensions.get('window');

// Date Formatter
const formatDate = (dateString) => {
    if (!dateString) return '---';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '---';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

export default function UsersManagementScreen({ navigation }) {
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/users');
      setUsers(res.data);
    } catch (e) {
      showToast("فشل جلب المستخدمين", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = (user) => {
      Alert.alert(
          "تغيير الرتبة",
          `اختر الرتبة الجديدة لـ ${user.name}`,
          [
              { text: "إلغاء", style: "cancel" },
              { text: "مستخدم", onPress: () => updateUserRole(user._id, 'user') },
              { text: "مترجم/مساهم", onPress: () => updateUserRole(user._id, 'contributor') },
              { text: "مشرف (Admin)", onPress: () => updateUserRole(user._id, 'admin'), style: 'destructive' },
          ]
      );
  };

  const updateUserRole = async (userId, newRole) => {
      try {
          await api.put(`/api/admin/users/${userId}/role`, { role: newRole });
          showToast(`تم تغيير الرتبة إلى ${newRole}`, "success");
          fetchUsers();
      } catch (e) {
          showToast("فشل التحديث", "error");
      }
  };

  const handleDelete = (user) => {
      if (Platform.OS === 'web') {
          // Web Fallback (Native alerts don't support 3 options easily on standard web)
          if (confirm(`هل أنت متأكد من حذف المستخدم ${user.name}؟`)) {
              const deleteContent = confirm(`هل تريد حذف الروايات والفصول الخاصة بـ ${user.name} أيضاً؟\n\nاضغط موافق (OK) لحذف المستخدم + أعماله\nاضغط إلغاء (Cancel) لحذف المستخدم فقط`);
              performDelete(user._id, deleteContent);
          }
      } else {
          // Mobile Native Alert with 3 Options
          Alert.alert(
              "خيارات الحذف",
              `ماذا تريد أن تفعل ببيانات المستخدم ${user.name}؟`,
              [
                  { text: "إلغاء", style: "cancel" },
                  { 
                      text: "حذف المستخدم فقط", 
                      onPress: () => performDelete(user._id, false),
                      style: 'default'
                  },
                  { 
                      text: "حذف المستخدم وأعماله", 
                      onPress: () => performDelete(user._id, true),
                      style: 'destructive'
                  }
              ]
          );
      }
  };

  const performDelete = async (userId, deleteContent) => {
      try {
          await api.delete(`/api/admin/users/${userId}?deleteContent=${deleteContent}`);
          showToast(deleteContent ? "تم حذف المستخدم وجميع أعماله" : "تم حذف المستخدم (بقيت الأعمال)", "success");
          fetchUsers();
      } catch (e) {
          showToast(e.response?.data?.message || "فشل الحذف", "error");
      }
  };

  const renderItem = ({ item }) => {
    const isContributor = item.role === 'contributor';
    const isAdmin = item.role === 'admin';

    return (
      <View style={styles.card}>
        
        {/* Actions (Left) */}
        <View style={styles.actionsContainer}>
            <TouchableOpacity onPress={() => handlePromote(item)} style={styles.actionBtn}>
                <Ionicons name="shield-checkmark" size={20} color={isAdmin ? "#ff4444" : isContributor ? "#4a7cc7" : "#666"} />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}>
                <Ionicons name="trash-outline" size={20} color="#ff4444" />
            </TouchableOpacity>
        </View>

        {/* Info (Middle/Right) */}
        <View style={styles.infoContainer}>
            <View style={styles.nameRow}>
                {isAdmin && <View style={styles.roleBadge}><Text style={styles.roleText}>Admin</Text></View>}
                {isContributor && <View style={[styles.roleBadge, {backgroundColor: '#4a7cc7'}]}><Text style={styles.roleText}>مترجم</Text></View>}
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            </View>
            
            <View style={styles.subInfoRow}>
                <Text style={styles.joinDate}>{formatDate(item.createdAt)}</Text>
                <Text style={styles.separator}>|</Text>
                <Text style={styles.email} numberOfLines={1}>{item.email}</Text>
            </View>
        </View>

        {/* Avatar (Right) */}
        <Image 
            source={item.picture ? { uri: item.picture } : require('../../assets/adaptive-icon.png')} 
            style={styles.avatar} 
            contentFit="cover"
        />

      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-forward" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إدارة المستخدمين</Text>
        <View style={{width: 24}} /> 
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4a7cc7" />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 15 },
  
  card: {
      flexDirection: 'row', // Default row, but we organize visually as requested
      backgroundColor: '#161616',
      borderRadius: 12,
      marginBottom: 12,
      padding: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#2a2a2a',
      justifyContent: 'space-between'
  },
  
  // Right Side
  avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      marginLeft: 12,
      backgroundColor: '#333'
  },
  
  // Middle
  infoContainer: {
      flex: 1,
      alignItems: 'flex-end', // Align text to right
      marginRight: 5
  },
  nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4
  },
  name: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
      textAlign: 'right'
  },
  roleBadge: {
      backgroundColor: '#ff4444',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4
  },
  roleText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: 'bold'
  },
  subInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      flexWrap: 'wrap'
  },
  email: {
      color: '#888',
      fontSize: 12,
      maxWidth: 150,
      textAlign: 'right'
  },
  separator: {
      color: '#444',
      marginHorizontal: 6,
      fontSize: 12
  },
  joinDate: {
      color: '#666',
      fontSize: 12
  },

  // Left Side
  actionsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10
  },
  actionBtn: {
      padding: 8,
      backgroundColor: '#222',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#333'
  }
});
