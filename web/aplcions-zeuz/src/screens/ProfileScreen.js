
import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Animated,
  Dimensions,
  Modal,
  TextInput,
  ActivityIndicator,
  FlatList,
  Alert
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

const { width } = Dimensions.get('window');
const HEADER_HEIGHT = 280;

// Config for Responsive Layout
const isMobile = width < 600;

// Improved date formatter
const formatDate = (dateString) => {
    if (!dateString) return 'غير معروف';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'غير معروف'; // Invalid date check
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

export default function ProfileScreen({ navigation, route }) {
  const { userInfo, logout, login } = useContext(AuthContext); 
  const { showToast } = useToast();
  
  // Public Profile Logic
  const targetUserId = route.params?.userId;
  const targetUserEmail = route.params?.email;
  const isSelf = !targetUserId && !targetUserEmail;
  
  // State
  const [activeTab, setActiveTab] = useState('data'); 
  const [loading, setLoading] = useState(true);
  
  // User Data State
  const [profileUser, setProfileUser] = useState(null); // The user being displayed
  const [stats, setStats] = useState({
      readChapters: 0,
      addedChapters: 0,
      totalViews: 0,
      joinDate: ''
  });
  const [favorites, setFavorites] = useState([]);
  const [history, setHistory] = useState([]);
  const [myWorks, setMyWorks] = useState([]);
  
  // Settings Modal State
  const [showSettings, setShowSettings] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [isHistoryPublic, setIsHistoryPublic] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Animations
  const scrollY = useRef(new Animated.Value(0)).current;

  // Role Logic (for the profile being viewed)
  const isProfileAdmin = profileUser?.role === 'admin';
  const isProfileContributor = profileUser?.role === 'contributor' || isProfileAdmin; 
  const isViewerAdmin = userInfo?.role === 'admin';

  // Initial Load & Refetch
  useFocusEffect(
      useCallback(() => {
          fetchProfileData(false); // False means silent refresh if data exists
      }, [userInfo, targetUserId, targetUserEmail])
  );

  const fetchProfileData = async (forceLoading = false) => {
      // Only show full spinner if it's the first load or explicit refresh
      if (forceLoading || (!profileUser && loading)) {
          setLoading(true);
      }

      try {
          // Construct Query Params
          let queryParams = '';
          if (targetUserId) queryParams = `?userId=${targetUserId}`;
          else if (targetUserEmail) queryParams = `?email=${targetUserEmail}`;

          // Fetch Stats & Public Profile Data
          const statsRes = await api.get(`/api/user/stats${queryParams}`);
          
          const userData = statsRes.data.user || userInfo; // Fallback to userInfo if self
          setProfileUser(userData);

          setMyWorks(statsRes.data.myWorks || []);
          setStats({
              readChapters: statsRes.data.readChapters || 0,
              addedChapters: statsRes.data.addedChapters || 0,
              totalViews: statsRes.data.totalViews || 0,
              joinDate: formatDate(userData?.createdAt)
          });

          // Fetch Private Data (Library/Favorites)
          // Condition: It is Self OR the user has Public History enabled
          const shouldFetchLibrary = isSelf || userData.isHistoryPublic;
          
          if (shouldFetchLibrary) {
             // Pass userId to API if viewing someone else
             const libQuery = targetUserId ? `&userId=${targetUserId}` : '';

             const historyRes = await api.get(`/api/novel/library?type=history${libQuery}`);
             const favRes = await api.get(`/api/novel/library?type=favorites${libQuery}`);
             setHistory(historyRes.data || []);
             setFavorites(favRes.data || []);
          } else {
             setHistory([]); 
             setFavorites([]);
          }

      } catch (e) {
          console.error("Profile Fetch Error", e);
      } finally {
          setLoading(false);
      }
  };

  const uploadImage = async (uri, type) => {
      setUploading(true);
      try {
          let formData = new FormData();
          formData.append('image', {
              uri: uri,
              name: 'upload.jpg',
              type: 'image/jpeg'
          });

          const res = await api.post('/api/upload', formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          const imageUrl = res.data.url;
          
          await api.put('/api/user/profile', {
              [type]: imageUrl
          });

          showToast("تم تحديث الصورة بنجاح", "success");
          fetchProfileData(true);
          login(await AsyncStorage.getItem('userToken')); 
          
      } catch (e) {
          showToast("فشل رفع الصورة", "error");
      } finally {
          setUploading(false);
      }
  };

  const pickImage = async (type) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
        showToast('نحتاج إذن الوصول للصور', 'error');
        return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'banner' ? [16, 9] : [1, 1],
        quality: 0.7,
    });

    if (!result.canceled) {
        uploadImage(result.assets[0].uri, type);
    }
  };

  const handleSaveSettings = async () => {
      setUploading(true);
      try {
          await api.put('/api/user/profile', {
              name: editName,
              bio: editBio,
              isHistoryPublic
          });
          showToast("تم حفظ التغييرات", "success");
          setShowSettings(false);
          login(await AsyncStorage.getItem('userToken')); 
      } catch (e) {
          showToast("فشل حفظ التغييرات", "error");
      } finally {
          setUploading(false);
      }
  };

  const openSettings = () => {
      setEditName(profileUser?.name || '');
      setEditBio(profileUser?.bio || '');
      setIsHistoryPublic(profileUser?.isHistoryPublic !== undefined ? profileUser.isHistoryPublic : true);
      setShowSettings(true);
  };

  // --- Helpers ---
  const getStatusColor = (status) => {
    switch (status) {
      case 'مكتملة': return '#4ade80';
      case 'متوقفة': return '#ff4444';
      default: return '#4a7cc7';
    }
  };

  // --- Render Components ---

  const renderTabButton = (id, label) => (
      <TouchableOpacity 
        style={styles.tabButton}
        onPress={() => setActiveTab(id)}
      >
          <Text style={[styles.tabText, activeTab === id && styles.activeTabText]}>{label}</Text>
          {activeTab === id && <View style={styles.activeIndicator} />}
      </TouchableOpacity>
  );

  const renderDataRow = (icon, label, value, color = "#4a7cc7") => (
      <View style={styles.dataRow}>
          <View style={styles.dataValueContainer}>
              <Text style={styles.dataLabel}>{label}</Text>
              <Text style={styles.dataValue}>{value}</Text>
          </View>
          <View style={[styles.iconBox, { backgroundColor: `${color}20` }]}>
              <Ionicons name={icon} size={20} color={color} />
          </View>
      </View>
  );

  // Responsive Grid/List Renderer
  const renderLibraryStyleGrid = (data, emptyMsg) => {
      if (!data || data.length === 0) {
          return (
              <View style={styles.emptyContainer}>
                  <Ionicons name="book-outline" size={40} color="#333" />
                  <Text style={styles.emptyText}>{emptyMsg}</Text>
              </View>
          );
      }

      return (
          <View style={styles.gridContainer}>
              {data.map((item, index) => {
                  const ContainerStyle = isMobile ? styles.mobileCard : styles.tabletCard;
                  const ImageStyle = isMobile ? styles.mobileImage : styles.tabletImage;
                  
                  return (
                    <TouchableOpacity
                        key={index}
                        style={ContainerStyle}
                        onPress={() => navigation.push('NovelDetail', { 
                            novel: { ...item, _id: item.novelId || item._id } 
                        })}
                        activeOpacity={0.8}
                    >
                        {isMobile ? (
                            // --- MOBILE VIEW ---
                            <>
                                <View>
                                    <Image 
                                        source={item.cover} 
                                        style={ImageStyle}
                                        contentFit="cover" 
                                        transition={300}
                                        cachePolicy="memory-disk"
                                    />
                                    {/* تصحيح مكان الحالة للشاشات الصغيرة لتكون فوق الصورة */}
                                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status), position: 'absolute', top: 5, right: 5 }]}>
                                        <Text style={styles.statusText}>{item.status || 'مستمرة'}</Text>
                                    </View>
                                </View>
                                
                                <View style={styles.mobileInfo}>
                                    <Text style={styles.novelTitle} numberOfLines={2}>{item.title}</Text>
                                    
                                    <View style={styles.novelStats}>
                                        <View style={styles.statBadge}>
                                            <Text style={styles.statText}>{item.chaptersCount || (item.chapters ? item.chapters.length : 0)} فصل</Text>
                                            <Ionicons name="book-outline" size={12} color="#888" style={{marginLeft: 4}} />
                                        </View>
                                    </View>
                                </View>
                            </>
                        ) : (
                            // --- TABLET/LARGE VIEW ---
                            <>
                                <Image 
                                    source={item.cover} 
                                    style={ImageStyle}
                                    contentFit="cover" 
                                    transition={300}
                                    cachePolicy="memory-disk"
                                />
                                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status), position: 'absolute', top: 5, right: 5 }]}>
                                    <Text style={styles.statusText}>{item.status || 'مستمرة'}</Text>
                                </View>
                                <View style={styles.cardInfo}>
                                    {/* تعديل الخط للشاشات الكبيرة: سطرين وخط أصغر */}
                                    <Text style={[styles.novelTitle, { fontSize: 11, height: 'auto' }]} numberOfLines={2}>{item.title}</Text>
                                    <View style={styles.novelStats}>
                                        <View style={styles.statBadge}>
                                            <Ionicons name="book-outline" size={12} color="#888" />
                                            <Text style={styles.statText}>{item.chaptersCount || (item.chapters ? item.chapters.length : 0)} فصل</Text>
                                        </View>
                                    </View>
                                </View>
                            </>
                        )}
                    </TouchableOpacity>
                  );
              })}
          </View>
      );
  };

  const renderHistoryList = (data, emptyMsg) => {
    if (!data || data.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="time-outline" size={40} color="#333" />
                <Text style={styles.emptyText}>{emptyMsg}</Text>
            </View>
        );
    }
    return (
        <View style={{ gap: 15 }}>
            {data.map((item, index) => (
                <TouchableOpacity 
                    key={index}
                    style={styles.historyCard}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('Reader', { 
                        novel: { ...item, _id: item.novelId }, 
                        chapterId: item.lastChapterId 
                    })}
                >
                    <Image 
                        source={item.cover} 
                        style={styles.historyImage} 
                        contentFit="cover"
                        transition={200}
                        cachePolicy="memory-disk"
                    />
                    <View style={styles.historyContent}>
                        <Text style={styles.historyTitle} numberOfLines={1}>{item.title}</Text>
                        
                        <View style={styles.historyChapterRow}>
                            <Text style={styles.historyChapterText} numberOfLines={1}>
                                {item.lastChapterTitle ? `فصل ${item.lastChapterId}: ${item.lastChapterTitle}` : `الفصل ${item.lastChapterId}`}
                            </Text>
                        </View>

                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${item.progress || 0}%` }]} />
                        </View>
                        <Text style={styles.progressText}>{item.progress || 0}% مكتمل</Text>
                    </View>
                </TouchableOpacity>
            ))}
        </View>
    );
  };

  const renderContent = () => {
      // Logic for showing library tabs: Self OR Public
      const showLibrary = isSelf || (profileUser && profileUser.isHistoryPublic);

      switch (activeTab) {
          case 'data':
              return (
                  <View style={styles.tabContent}>
                      <View style={styles.bioContainer}>
                          <Text style={styles.sectionTitle}>النبذة التعريفية</Text>
                          <Text style={styles.bioText}>
                              {profileUser?.bio || "لا توجد نبذة تعريفية."}
                          </Text>
                      </View>

                      <View style={styles.dataSection}>
                          {renderDataRow("person", "نوع العضوية", isProfileAdmin ? "مشرف (Admin)" : isProfileContributor ? "مساهم" : "قارئ", isProfileAdmin ? "#ff4444" : "#4a7cc7")}
                          <View style={styles.separator} />
                          {renderDataRow("book", "الفصول المقروءة", stats.readChapters, "#4ade80")}
                          <View style={styles.separator} />
                          {isProfileContributor && (
                              <>
                                  {renderDataRow("cloud-upload", "الفصول المضافة", stats.addedChapters, "#ffa500")}
                                  <View style={styles.separator} />
                                  {renderDataRow("eye", "المشاهدات", stats.totalViews, "#d44aff")}
                                  <View style={styles.separator} />
                              </>
                          )}
                          {renderDataRow("calendar", "تاريخ الانضمام", stats.joinDate, "#888")}
                      </View>
                  </View>
              );
          case 'works':
              return renderLibraryStyleGrid(myWorks, "لا توجد أعمال منشورة.");
          case 'favorites':
              return showLibrary ? renderLibraryStyleGrid(favorites, "قائمة المفضلة فارغة.") : null;
          case 'history':
              return showLibrary ? renderHistoryList(history, "سجل القراءة فارغ.") : null;
          default:
              return null;
      }
  };

  const AsyncStorage = require('@react-native-async-storage/async-storage').default;

  // Determine Dashboard Button
  const renderDashboardButton = () => {
      if (!isSelf || !isProfileContributor) return null;

      if (userInfo?.role === 'admin') {
          return (
            <TouchableOpacity style={styles.dashboardButton} onPress={() => navigation.navigate('AdminMain')}>
                <Ionicons name="grid" size={20} color="#fff" />
                <Text style={styles.dashboardButtonText}>لوحة التحكم</Text>
            </TouchableOpacity>
          );
      } else {
          // Contributor
          return (
            <TouchableOpacity style={styles.dashboardButton} onPress={() => navigation.navigate('Management')}>
                <Ionicons name="book" size={20} color="#fff" />
                <Text style={styles.dashboardButtonText}>أعمالي</Text>
            </TouchableOpacity>
          );
      }
  };

  // Logic to show/hide tabs
  const showLibraryTabs = isSelf || (profileUser && profileUser.isHistoryPublic);

  return (
    <View style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        {/* Hero Section */}
        <View style={styles.heroContainer}>
            <Image 
                source={profileUser?.banner ? { uri: profileUser.banner } : null} 
                style={styles.bannerImage}
                contentFit="cover"
            />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)', '#000000']} style={styles.heroGradient} />
            
            <View style={styles.profileInfo}>
                <View style={styles.avatarContainer}>
                    <Image 
                        source={profileUser?.picture ? { uri: profileUser.picture } : null} 
                        style={styles.avatarImage} 
                        contentFit="cover" 
                    />
                </View>
                <Text style={styles.userName}>{profileUser?.name || 'مستخدم'}</Text>
                <Text style={styles.userRole}>{isProfileAdmin ? 'مشرف عام' : isProfileContributor ? 'مترجم / مؤلف' : 'قارئ مميز'}</Text>
                
                {renderDashboardButton()}
            </View>

            {/* Settings button only for Self */}
            {isSelf && (
                <TouchableOpacity style={styles.settingsButton} onPress={openSettings}>
                    <Ionicons name="settings-outline" size={22} color="#fff" />
                </TouchableOpacity>
            )}
            
            {/* Back Button if viewing another profile */}
            {!isSelf && (
                <TouchableOpacity style={[styles.settingsButton, {right: undefined, left: 20}]} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
            )}
        </View>

        {/* Tabs - Reordered & Conditional */}
        <View style={styles.tabsContainer}>
            {renderTabButton('data', 'البيانات')}
            {isProfileContributor && renderTabButton('works', 'الأعمال')}
            {showLibraryTabs && renderTabButton('favorites', 'المفضلة')}
            {showLibraryTabs && renderTabButton('history', 'السجل')}
        </View>

        {/* Content Area */}
        <View style={styles.contentContainer}>
            {loading && !profileUser ? (
                <ActivityIndicator color="#4a7cc7" style={{marginTop: 50}} />
            ) : renderContent()}
        </View>

        <View style={{height: 100}} />
      </ScrollView>

      {/* Settings Modal (Only for Self) */}
      {isSelf && (
      <Modal visible={showSettings} animationType="slide" presentationStyle="pageSheet">
          <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>تعديل الملف الشخصي</Text>
                  <TouchableOpacity onPress={() => setShowSettings(false)}>
                      <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalContent}>
                  {/* Banner Edit */}
                  <TouchableOpacity style={styles.editBanner} onPress={() => pickImage('banner')}>
                      <Image source={profileUser?.banner ? {uri: profileUser.banner} : null} style={StyleSheet.absoluteFill} contentFit="cover" />
                      <View style={styles.editOverlay}>
                          <Ionicons name="camera" size={24} color="#fff" />
                          <Text style={{color:'#fff', marginTop: 5}}>تغيير الغلاف</Text>
                      </View>
                  </TouchableOpacity>
                  
                  {/* Avatar Edit */}
                    <View style={{alignItems: 'center', marginBottom: 20}}>
                      <TouchableOpacity style={styles.editAvatar} onPress={() => pickImage('picture')}>
                          <Image source={profileUser?.picture ? {uri: profileUser.picture} : null} style={styles.avatarImage} contentFit="cover" />
                          <View style={[styles.editOverlay, {borderRadius: 40}]}>
                              <Ionicons name="camera" size={20} color="#fff" />
                          </View>
                      </TouchableOpacity>
                      <Text style={{color: '#666', marginTop: 5}}>تغيير الصورة الشخصية</Text>
                    </View>

                  {/* Input Fields */}
                  <View style={styles.inputGroup}>
                      <Text style={styles.label}>الاسم</Text>
                      <TextInput 
                          style={styles.input} 
                          value={editName} 
                          onChangeText={setEditName}
                          placeholder="اسم المستخدم"
                          placeholderTextColor="#666" 
                      />
                  </View>

                  <View style={styles.inputGroup}>
                      <Text style={styles.label}>النبذة التعريفية</Text>
                      <TextInput 
                          style={[styles.input, {height: 100}]} 
                          value={editBio} 
                          onChangeText={setEditBio}
                          placeholder="اكتب شيئاً عن نفسك..."
                          placeholderTextColor="#666"
                          multiline
                          textAlignVertical="top"
                      />
                  </View>

                  <View style={styles.switchRow}>
                      <Text style={styles.switchLabel}>جعل سجل القراءة عام</Text>
                      <Switch 
                          value={isHistoryPublic} 
                          onValueChange={setIsHistoryPublic}
                          trackColor={{ false: "#333", true: "#4a7cc7" }}
                      />
                  </View>

                  {/* Privacy Policy Link */}
                  <TouchableOpacity 
                      style={styles.privacyLink}
                      onPress={() => {
                          setShowSettings(false);
                          navigation.navigate('PrivacyPolicy');
                      }}
                  >
                      <View style={{flexDirection:'row', alignItems:'center'}}>
                          <Text style={styles.privacyText}>سياسة الخصوصية</Text>
                          <Ionicons name="shield-checkmark-outline" size={18} color="#aaa" style={{marginLeft: 8}} />
                      </View>
                      <Ionicons name="chevron-back" size={18} color="#666" />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.saveButton} onPress={handleSaveSettings} disabled={uploading}>
                      {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>حفظ التغييرات</Text>}
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.logoutButton} onPress={() => { setShowSettings(false); logout(); }}>
                      <Text style={styles.logoutButtonText}>تسجيل الخروج</Text>
                  </TouchableOpacity>

              </ScrollView>
          </View>
      </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  
  // Hero Section
  heroContainer: {
      height: HEADER_HEIGHT,
      width: '100%',
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingBottom: 20,
      position: 'relative'
  },
  bannerImage: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      opacity: 0.6
  },
  heroGradient: {
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0
  },
  profileInfo: {
      alignItems: 'center',
      zIndex: 2
  },
  avatarContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      borderWidth: 3,
      borderColor: '#fff',
      overflow: 'hidden',
      marginBottom: 10,
      backgroundColor: '#333'
  },
  avatarImage: { width: '100%', height: '100%' },
  userName: {
      color: '#fff',
      fontSize: 22,
      fontWeight: 'bold',
      textShadowColor: 'rgba(0, 0, 0, 0.75)',
      textShadowOffset: {width: -1, height: 1},
      textShadowRadius: 10
  },
  userRole: {
      color: '#ccc',
      fontSize: 14,
      marginTop: 4,
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingHorizontal: 10,
      paddingVertical: 2,
      borderRadius: 10
  },
  dashboardButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#4a7cc7',
      paddingHorizontal: 15,
      paddingVertical: 8,
      borderRadius: 20,
      marginTop: 15,
      gap: 8
  },
  dashboardButtonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 14
  },
  settingsButton: {
      position: 'absolute',
      top: 50,
      right: 20,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10
  },

  // Tabs
  tabsContainer: {
      flexDirection: 'row-reverse',
      backgroundColor: '#000',
      borderBottomWidth: 1,
      borderBottomColor: '#222',
  },
  tabButton: {
      flex: 1,
      paddingVertical: 15,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative'
  },
  tabText: {
      color: '#666',
      fontSize: 14,
      fontWeight: '500'
  },
  activeTabText: {
      color: '#fff',
      fontWeight: 'bold'
  },
  activeIndicator: {
      position: 'absolute',
      bottom: 0,
      width: '60%',
      height: 3,
      backgroundColor: '#fff',
      borderRadius: 2
  },

  // Content
  contentContainer: {
      padding: 20,
      minHeight: 300
  },
  bioContainer: {
      marginBottom: 25,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: '#222'
  },
  sectionTitle: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 10,
      textAlign: 'right'
  },
  bioText: {
      color: '#ccc',
      fontSize: 14,
      lineHeight: 22,
      textAlign: 'right'
  },
  
  // Data Rows (RTL Fix)
  dataSection: {
      gap: 0
  },
  dataRow: {
      flexDirection: 'row', 
      justifyContent: 'flex-end', 
      alignItems: 'center',
      paddingVertical: 12
  },
  dataValueContainer: {
      alignItems: 'flex-end', 
      marginRight: 15 
  },
  dataLabel: {
      color: '#fff',
      fontSize: 14,
      marginBottom: 2,
      fontWeight: 'bold',
      textAlign: 'right'
  },
  dataValue: {
      color: '#888',
      fontSize: 12,
      textAlign: 'right'
  },
  iconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center'
  },
  separator: {
      height: 1,
      backgroundColor: '#1a1a1a',
      width: '100%'
  },

  // Grid Style (Exact copy of LibraryScreen)
  gridContainer: {
      flexDirection: 'row-reverse',
      flexWrap: 'wrap',
      gap: 15, // زيادة المسافة قليلاً
      justifyContent: 'flex-start'
  },
  mobileCard: {
      width: '100%',
      height: 120, // Horizontal card height
      backgroundColor: '#161616',
      borderRadius: 12,
      marginBottom: 10,
      flexDirection: 'row-reverse', // Image Right, Info Left
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: '#222',
  },
  mobileImage: {
      width: 80,
      height: '100%',
  },
  mobileInfo: {
      flex: 1,
      padding: 10,
      justifyContent: 'space-between',
      alignItems: 'flex-end'
  },
  tabletCard: {
      width: 160, // تصغير عرض البطاقة لتناسب الصورة
      backgroundColor: '#161616',
      borderRadius: 12,
      marginBottom: 15,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: '#222',
  },
  tabletImage: {
      width: '100%',
      height: 220, // ارتفاع متناسب مع العرض 160
      backgroundColor: '#000',
  },
  statusBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      zIndex: 1,
  },
  statusText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: 'bold',
  },
  cardInfo: {
      padding: 10,
  },
  novelTitle: {
      color: '#fff',
      fontSize: 13,
      fontWeight: 'bold',
      textAlign: 'right',
      marginBottom: 8,
      // Removed fixed height to allow flexible 2 lines if needed
  },
  novelStats: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  statBadge: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 4,
  },
  statText: {
      color: '#888',
      fontSize: 11,
  },

  // History Style (Horizontal Card)
  historyCard: { 
      flexDirection: 'row-reverse', 
      backgroundColor: '#161616', 
      borderRadius: 12, 
      padding: 10, 
      height: 110, 
      alignItems: 'center', 
      borderWidth: 1, 
      borderColor: '#333',
  },
  historyImage: { 
      width: 70, 
      height: '100%', 
      borderRadius: 8, 
      marginLeft: 15 
  },
  historyContent: { 
      flex: 1, 
      alignItems: 'flex-end', 
      justifyContent: 'center',
      height: '100%',
      paddingVertical: 5
  },
  historyTitle: { 
      color: '#fff', 
      fontSize: 15, 
      fontWeight: 'bold', 
      textAlign: 'right', 
      marginBottom: 8 
  },
  historyChapterRow: { 
      flexDirection: 'row-reverse', 
      alignItems: 'center', 
      marginBottom: 8
  },
  historyChapterText: { 
      color: '#4a7cc7', 
      fontSize: 13, 
      fontWeight: '600',
      textAlign: 'right' 
  },
  progressBarBg: {
      width: '100%',
      height: 4,
      backgroundColor: '#333',
      borderRadius: 2,
      marginBottom: 4
  },
  progressBarFill: {
      height: '100%',
      backgroundColor: '#4ade80',
      borderRadius: 2
  },
  progressText: {
      color: '#666',
      fontSize: 10,
      textAlign: 'right'
  },
  emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 50
  },
  emptyText: {
      color: '#444',
      marginTop: 10,
      fontSize: 14
  },

  // Modal
  modalContainer: {
      flex: 1,
      backgroundColor: '#111'
  },
  modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: '#222'
  },
  modalTitle: {
      color: '#fff',
      fontSize: 18,
      fontWeight: 'bold'
  },
  modalContent: {
      padding: 20
  },
  editBanner: {
      height: 150,
      backgroundColor: '#222',
      borderRadius: 12,
      marginBottom: 10,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#333'
  },
  editAvatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      overflow: 'hidden',
      backgroundColor: '#222',
      borderWidth: 1,
      borderColor: '#333',
      justifyContent: 'center',
      alignItems: 'center'
  },
  editOverlay: {
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.4)',
  },
  inputGroup: {
      marginBottom: 20
  },
  label: {
      color: '#ccc',
      marginBottom: 8,
      textAlign: 'right',
      fontSize: 14
  },
  input: {
      backgroundColor: '#222',
      color: '#fff',
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      borderWidth: 1,
      borderColor: '#333',
      textAlign: 'right'
  },
  switchRow: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 30,
      backgroundColor: '#222',
      padding: 15,
      borderRadius: 8
  },
  switchLabel: {
      color: '#fff',
      fontSize: 16
  },
  privacyLink: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#222',
      padding: 15,
      borderRadius: 8,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: '#333'
  },
  privacyText: {
      color: '#ccc',
      fontSize: 16,
      fontWeight: '500'
  },
  saveButton: {
      backgroundColor: '#4a7cc7',
      padding: 15,
      borderRadius: 8,
      alignItems: 'center',
      marginBottom: 15
  },
  saveButtonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 16
  },
  logoutButton: {
      backgroundColor: '#ff4444',
      padding: 15,
      borderRadius: 8,
      alignItems: 'center'
  },
  logoutButtonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 16
  }
});
