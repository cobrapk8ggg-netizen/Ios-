
import React, { useState, useRef, useEffect, useContext, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Alert,
  ScrollView,
  FlatList,
  Modal
} from 'react-native';
import { Image } from 'expo-image'; 
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api, { incrementView } from '../services/api'; 
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import CommentsSection from '../components/CommentsSection'; // ✨ Import Comments Component

const { width, height } = Dimensions.get('window');
const CHAPTERS_PER_PAGE = 25; // 25 فصلاً لكل صفحة

// Format views helper
const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
};

const getStatusColor = (status) => {
    switch (status) {
        case 'مكتملة': return '#27ae60';
        case 'متوقفة': return '#c0392b';
        default: return '#8e44ad';
    }
};

export default function NovelDetailScreen({ route, navigation }) {
  const { userInfo } = useContext(AuthContext);
  const { showToast } = useToast();
  
  const initialNovelData = route.params.novel || {};
  
  const [fullNovel, setFullNovel] = useState(initialNovelData);
  const [authorProfile, setAuthorProfile] = useState(null); 
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState('about'); // Default to About
  const [isFavorite, setIsFavorite] = useState(false);
  const [lastReadChapterId, setLastReadChapterId] = useState(0); 
  const [readChapters, setReadChapters] = useState([]); // List of specific read chapters

  // Pagination & Sorting State
  const [currentRangeIndex, setCurrentRangeIndex] = useState(0);
  const [isPagePickerVisible, setPagePickerVisible] = useState(false);
  const [sortDesc, setSortDesc] = useState(false); // Default Ascending (Lowest to Highest)

  // Sort Dropdown Modal
  const [isSortPickerVisible, setSortPickerVisible] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;

  const novelId = fullNovel._id || fullNovel.id || fullNovel.novelId;

  // Check ownership
  const isOwner = userInfo && (
      userInfo.role === 'admin' || 
      (fullNovel.authorEmail && fullNovel.authorEmail === userInfo.email) ||
      (!fullNovel.authorEmail && fullNovel.author && fullNovel.author.toLowerCase() === userInfo.name.toLowerCase())
  );

  const fetchDetails = async () => {
    setLoading(true);
    setError(false);
    try {
      if (!novelId) throw new Error("Novel ID not found");

      const response = await api.get(`/api/novels/${novelId}`);
      const novelData = response.data;
      setFullNovel(prev => ({ ...prev, ...novelData }));
      setChapters(novelData.chapters || []);

      // Fetch Author Profile Data
      let query = '';
      if (novelData.authorEmail) {
          query = `email=${novelData.authorEmail}`;
      } else if (novelData.author) {
          // Legacy support fallback
      }

      if (query) {
          try {
              const authorRes = await api.get(`/api/user/stats?${query}`);
              setAuthorProfile(authorRes.data.user);
          } catch (e) { console.log("Failed to fetch author profile"); }
      }

      try {
        const statusRes = await api.get(`/api/novel/status/${novelId}`);
        if (statusRes.data) {
          setIsFavorite(statusRes.data.isFavorite);
          const lId = statusRes.data.lastChapterId || 0;
          setLastReadChapterId(lId);
          // Store actual read chapters array
          setReadChapters(statusRes.data.readChapters || []);
        }
      } catch (e) {
         console.log("Status check failed, ignoring");
      }
    } catch (e) {
      console.error('Error fetching novel details', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchDetails();
    }, [novelId])
  );

  // --- Sorting & Pagination Logic ---
  const sortedChapters = useMemo(() => {
      if (!chapters) return [];
      return [...chapters].sort((a, b) => sortDesc ? b.number - a.number : a.number - b.number);
  }, [chapters, sortDesc]);

  // Auto-jump to page logic
  useEffect(() => {
      if (lastReadChapterId > 0 && sortedChapters.length > 0) {
          const idx = sortedChapters.findIndex(c => c.number === lastReadChapterId);
          if (idx !== -1) {
              const rangeIndex = Math.floor(idx / CHAPTERS_PER_PAGE);
              // Logic to auto-jump if needed
          }
      }
  }, [sortDesc]); 

  const totalPages = Math.ceil((sortedChapters.length || 0) / CHAPTERS_PER_PAGE);
  const currentPage = currentRangeIndex + 1;

  const displayedChapters = useMemo(() => {
      if (!sortedChapters) return [];
      const start = currentRangeIndex * CHAPTERS_PER_PAGE;
      const end = start + CHAPTERS_PER_PAGE;
      return sortedChapters.slice(start, end);
  }, [sortedChapters, currentRangeIndex]);

  const handleDeleteChapter = (chapNum) => {
    Alert.alert(
        "حذف الفصل",
        "هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء.",
        [
            { text: "إلغاء", style: "cancel" },
            { 
                text: "حذف", 
                style: "destructive", 
                onPress: async () => {
                    try {
                        await api.delete(`/api/admin/chapters/${novelId}/${chapNum}`);
                        showToast("تم حذف الفصل بنجاح", "success");
                        fetchDetails();
                    } catch (e) {
                        showToast("فشل الحذف", "error");
                    }
                }
            }
        ]
    );
  };

  const handleEditChapter = (chapter) => {
      navigation.navigate('AdminDashboard', { 
          editNovel: fullNovel, 
          editChapter: { 
              novelId: novelId,
              number: chapter.number,
              title: chapter.title
          }
      });
  };

  const handleEditNovel = () => {
      navigation.navigate('AdminDashboard', { editNovel: fullNovel });
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const imageScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.2, 1],
    extrapolate: 'clamp',
  });

  const toggleLibrary = async () => {
    try {
      const newStatus = !isFavorite;
      setIsFavorite(newStatus);
      
      setFullNovel(prev => ({
          ...prev,
          favorites: (prev.favorites || 0) + (newStatus ? 1 : -1)
      }));

      await api.post('/api/novel/update', {
        novelId: novelId,
        title: fullNovel.title,
        cover: fullNovel.cover,
        author: fullNovel.author,
        isFavorite: newStatus
      });
      
      if (newStatus) showToast("تمت الإضافة للمفضلة");
      else showToast("تم الحذف من المفضلة", "info");

    } catch (error) {
      setIsFavorite(!isFavorite); 
      showToast("فشلت العملية", "error");
    }
  };

  const renderTabButton = (id, title) => (
    <TouchableOpacity 
      style={[styles.tabButton, activeTab === id && styles.tabButtonActive]}
      onPress={() => setActiveTab(id)}
    >
      <Text style={[styles.tabText, activeTab === id && styles.tabTextActive]}>{title}</Text>
    </TouchableOpacity>
  );

  const renderChapterItem = ({ item }) => {
    // Check if THIS specific chapter number is in the read list
    const isRead = readChapters.includes(item.number);
    const dateStr = item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0].replace(/-/g, '/') : '---';
    
    return (
        <View style={styles.chapterRowContainer}>
            {/* Right Side: Chapter Number Badge (Black) */}
            <TouchableOpacity 
                style={styles.chapterBadge}
                onPress={() => {
                    incrementView(novelId, item.number);
                    navigation.navigate('Reader', { novel: fullNovel, chapterId: item.number });
                }}
            >
                <Text style={styles.chapterBadgeText}>{item.number}</Text>
                {isRead && <View style={styles.readDot} />}
            </TouchableOpacity>

            {/* Left Side: Details (Aligned Right) */}
            <TouchableOpacity 
              style={styles.chapterInfo}
              onPress={() => {
                incrementView(novelId, item.number);
                navigation.navigate('Reader', { novel: fullNovel, chapterId: item.number });
              }}
            >
                <Text style={[styles.chapterTitle, isRead && styles.textRead]} numberOfLines={1}>
                    {item.title || `فصل ${item.number}`}
                </Text>
                <Text style={styles.chapterMeta}>
                    {fullNovel.author || 'Zeus'} • {dateStr}
                </Text>
            </TouchableOpacity>

             {/* Admin Controls (Fixed Layout) */}
             {isOwner && (
                 <View style={styles.adminControls}>
                     <TouchableOpacity style={styles.adminBtn} onPress={() => handleEditChapter(item)}>
                         <Ionicons name="create-outline" size={16} color="#4a7cc7" />
                     </TouchableOpacity>
                     <TouchableOpacity style={styles.adminBtn} onPress={() => handleDeleteChapter(item.number)}>
                         <Ionicons name="trash-outline" size={16} color="#ff4444" />
                     </TouchableOpacity>
                 </View>
             )}
        </View>
    );
  };

  // Author Widget
  const AuthorWidget = () => {
      const displayName = authorProfile?.name || fullNovel.author || 'غير معروف';
      const displayAvatar = authorProfile?.picture;
      const displayBanner = authorProfile?.banner;
      const targetId = authorProfile?._id;

      return (
          <View style={styles.authorSection}>
              <Text style={styles.sectionTitle}>الناشر</Text>
              
              <TouchableOpacity 
                style={styles.authorCardContainer}
                activeOpacity={0.9}
                onPress={() => {
                    if (targetId) {
                        navigation.push('UserProfile', { userId: targetId });
                    } else {
                        showToast("هذا الناشر ليس لديه ملف شخصي عام", "info");
                    }
                }}
              >
                  <View style={styles.authorBannerWrapper}>
                    {displayBanner ? (
                        <Image source={{ uri: displayBanner }} style={styles.authorBannerImage} contentFit="cover" />
                    ) : (
                        <View style={[styles.authorBannerImage, {backgroundColor: '#222'}]} /> 
                    )}
                    <LinearGradient colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFill} />
                    <View style={styles.authorOverlayContent}>
                        <View style={styles.authorAvatarWrapper}>
                            <Image 
                                source={displayAvatar ? { uri: displayAvatar } : require('../../assets/adaptive-icon.png')} 
                                style={styles.authorAvatarImage}
                                contentFit="cover"
                            />
                        </View>
                        <Text style={styles.authorDisplayName} numberOfLines={1}>{displayName}</Text>
                    </View>
                  </View>
              </TouchableOpacity>
          </View>
      );
  };

  // Pagination Component
  const renderPagination = () => {
      if (totalPages <= 1) return null;

      return (
          <View style={styles.paginationContainer}>
               <TouchableOpacity 
                   style={[styles.pageNavBtn, currentPage === 1 && styles.disabledBtn]} 
                   onPress={() => setCurrentRangeIndex(Math.max(0, currentRangeIndex - 1))}
                   disabled={currentPage === 1}
               >
                   <Ionicons name="arrow-back" size={20} color={currentPage === 1 ? "#555" : "#fff"} />
               </TouchableOpacity>

               <TouchableOpacity style={styles.pageSelector} onPress={() => setPagePickerVisible(true)}>
                   <Ionicons name="caret-down-sharp" size={12} color="#fff" style={{marginRight: 'auto'}} />
                   <View style={{alignItems: 'flex-end'}}>
                        <Text style={styles.pageLabel}>الصفحة</Text>
                        <Text style={styles.pageValue}>{currentPage}</Text>
                   </View>
               </TouchableOpacity>

               <TouchableOpacity 
                   style={[styles.pageNavBtn, currentPage === totalPages && styles.disabledBtn]} 
                   onPress={() => setCurrentRangeIndex(Math.min(totalPages - 1, currentRangeIndex + 1))}
                   disabled={currentPage === totalPages}
               >
                   <Ionicons name="arrow-forward" size={20} color={currentPage === totalPages ? "#555" : "#fff"} />
               </TouchableOpacity>
          </View>
      );
  };

  if (!fullNovel || (!fullNovel.title && loading)) {
      return (
          <View style={[styles.container, {justifyContent:'center', alignItems:'center'}]}>
              <ActivityIndicator size="large" color="#4a7cc7" />
          </View>
      )
  }

  const allTags = [
    ...(fullNovel.category ? [fullNovel.category] : []),
    ...(fullNovel.tags || [])
  ];
  const uniqueTags = [...new Set(allTags)];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <Text style={styles.headerTitle} numberOfLines={1}>{fullNovel.title}</Text>
        </SafeAreaView>
      </Animated.View>

      <SafeAreaView edges={['top']} style={styles.floatingControls}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        {isOwner && (
            <TouchableOpacity style={[styles.iconButton, {backgroundColor: '#4a7cc7'}]} onPress={handleEditNovel}>
                <Ionicons name="settings-outline" size={24} color="#fff" />
            </TouchableOpacity>
        )}
      </SafeAreaView>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <Animated.View style={[styles.coverContainer, { transform: [{ scale: imageScale }] }]}>
          <Image 
            source={fullNovel.cover} 
            style={styles.coverImage} 
            contentFit="cover"
            transition={300}
            cachePolicy="memory-disk" 
          />
          <LinearGradient colors={['transparent', '#000000']} style={styles.coverGradient} />
        </Animated.View>

        <View style={styles.contentContainer}>
          <View style={styles.statusBadgeContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(fullNovel.status) }]}>
                <Text style={styles.statusText}>{fullNovel.status || 'مستمرة'}</Text>
            </View>
          </View>

          <Text style={styles.title}>{fullNovel.title}</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{chapters.length || fullNovel.chaptersCount || 0}</Text>
              <Text style={styles.statLabel}>فصل</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatNumber(fullNovel.views)}</Text>
              <Text style={styles.statLabel}>مشاهدة</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, {color: '#ffa500'}]}>{formatNumber(fullNovel.favorites || 0)}</Text>
              <Text style={styles.statLabel}>مفضلة</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.libraryButton, isFavorite && styles.libraryButtonActive]} 
              onPress={toggleLibrary}
            >
              <Ionicons name={isFavorite ? "checkmark" : "add"} size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.readButton}
              onPress={() => {
                if (chapters.length === 0) {
                    showToast("لا توجد فصول متاحة حالياً", "info");
                    return;
                }
                const targetChapterNum = lastReadChapterId > 0 && lastReadChapterId < chapters.length 
                    ? lastReadChapterId + 1 
                    : (lastReadChapterId === chapters.length ? lastReadChapterId : 1);
                incrementView(novelId, targetChapterNum);
                navigation.navigate('Reader', { novel: fullNovel, chapterId: targetChapterNum })
              }}
            >
              <Text style={styles.readButtonText}>
                 {lastReadChapterId > 0 ? 'استئناف القراءة' : 'ابدأ القراءة'}
              </Text>
              <Ionicons name="book-outline" size={20} color="#000" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>

          <View style={styles.tabsContainer}>
            {renderTabButton('comments', 'التعليقات')} {/* Last */}
            {renderTabButton('chapters', 'الفصول')}
            {renderTabButton('about', 'نظرة عامة')} {/* First */}
          </View>

          {error && (
            <View style={{backgroundColor: 'rgba(255, 68, 68, 0.1)', padding: 10, borderRadius: 8, marginBottom: 10, flexDirection: 'row-reverse', alignItems: 'center'}}>
                <Ionicons name="alert-circle" size={20} color="#ff4444" style={{marginLeft: 8}} />
                <Text style={{color: '#ff4444', textAlign: 'right', flex: 1}}>
                    تعذر تحديث البيانات.
                </Text>
                <TouchableOpacity onPress={fetchDetails}>
                    <Text style={{color: '#fff', textDecorationLine: 'underline'}}>إعادة</Text>
                </TouchableOpacity>
            </View>
          )}

          {/* ✨✨ COMMENTS SECTION TAB ✨✨ */}
          {activeTab === 'comments' && (
              <CommentsSection novelId={novelId} user={userInfo} />
          )}

          {activeTab === 'about' && (
            <View style={styles.aboutSection}>
              <Text style={styles.sectionTitle}>القصة</Text>
              <Text style={styles.descriptionText}>
                  {fullNovel.description || 'لا يوجد وصف متاح.'}
              </Text>
              
              <Text style={styles.sectionTitle}>التصنيفات</Text>
              <View style={styles.tagsRow}>
                {uniqueTags.map((tag, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.tag}
                    onPress={() => navigation.navigate('Category', { category: tag })}
                  >
                    <Text style={styles.tagText}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <AuthorWidget />
            </View>
          )} 
          
          {activeTab === 'chapters' && (
            <View style={styles.chaptersList}>
               {/* Sort Controls */}
               <TouchableOpacity 
                   style={styles.sortHeader} 
                   onPress={() => setSortPickerVisible(true)}
               >
                   <Ionicons name="caret-down" size={14} color="#888" />
                   <Text style={styles.sortHeaderText}>
                       {sortDesc ? 'ترتيب من أعلى لأقل' : 'ترتيب من أقل لأعلى'}
                   </Text>
               </TouchableOpacity>

               {loading && chapters.length === 0 ? (
                   <ActivityIndicator color="#4a7cc7" style={{marginTop: 20}} />
               ) : displayedChapters.length > 0 ? (
                   <>
                       {displayedChapters.map(item => (
                         <View key={item._id || item.number}>
                            {renderChapterItem({ item })}
                         </View>
                       ))}
                       {/* PAGINATION AT BOTTOM */}
                       {renderPagination()}
                   </>
               ) : (
                   <Text style={{color: '#666', textAlign: 'center', marginTop: 20}}>لا توجد فصول بعد.</Text>
               )}
            </View>
          )}
        </View>
      </Animated.ScrollView>

      {/* Page Picker Modal */}
      <Modal visible={isPagePickerVisible} transparent animationType="fade" onRequestClose={() => setPagePickerVisible(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPagePickerVisible(false)}>
              <View style={styles.pickerContainer}>
                  <Text style={styles.pickerTitle}>اختر الصفحة</Text>
                  <FlatList
                      data={Array.from({length: totalPages}, (_, i) => i + 1)}
                      keyExtractor={item => item.toString()}
                      contentContainerStyle={{paddingVertical: 10}}
                      showsVerticalScrollIndicator={false}
                      renderItem={({item}) => (
                          <TouchableOpacity 
                            style={[styles.pickerItem, item === currentPage && styles.pickerItemActive]}
                            onPress={() => {
                                setCurrentRangeIndex(item - 1);
                                setPagePickerVisible(false);
                            }}
                          >
                              <Text style={[styles.pickerItemText, item === currentPage && {color: '#fff', fontWeight: 'bold'}]}>{item}</Text>
                              {item === currentPage && <Ionicons name="checkmark" size={18} color="#fff" />}
                          </TouchableOpacity>
                      )}
                  />
              </View>
          </TouchableOpacity>
      </Modal>

      {/* Sort Picker Modal */}
      <Modal visible={isSortPickerVisible} transparent animationType="fade" onRequestClose={() => setSortPickerVisible(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSortPickerVisible(false)}>
              <View style={[styles.pickerContainer, {maxHeight: 200}]}>
                  <Text style={styles.pickerTitle}>الترتيب</Text>
                  
                  <TouchableOpacity 
                    style={[styles.pickerItem, !sortDesc && styles.pickerItemActive]}
                    onPress={() => { setSortDesc(false); setCurrentRangeIndex(0); setSortPickerVisible(false); }}
                  >
                      <Text style={[styles.pickerItemText, !sortDesc && {color:'#fff', fontWeight:'bold'}]}>ترتيب من أقل لأعلى</Text>
                      {!sortDesc && <Ionicons name="checkmark" size={18} color="#fff" />}
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.pickerItem, sortDesc && styles.pickerItemActive]}
                    onPress={() => { setSortDesc(true); setCurrentRangeIndex(0); setSortPickerVisible(false); }}
                  >
                      <Text style={[styles.pickerItemText, sortDesc && {color:'#fff', fontWeight:'bold'}]}>ترتيب من أعلى لأقل</Text>
                      {sortDesc && <Ionicons name="checkmark" size={18} color="#fff" />}
                  </TouchableOpacity>
                  
              </View>
          </TouchableOpacity>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 90, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  headerSafe: { paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  floatingControls: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, pointerEvents: 'box-none' },
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  coverContainer: { height: height * 0.55, width: '100%' },
  coverImage: { width: '100%', height: '100%' },
  coverGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%' },
  contentContainer: { marginTop: -40, paddingHorizontal: 20 },
  
  statusBadgeContainer: { alignItems: 'center', marginBottom: 10 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 25 },
  statsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20, backgroundColor: '#111', paddingVertical: 15, borderRadius: 16, borderWidth: 1, borderColor: '#222' },
  statItem: { alignItems: 'center', paddingHorizontal: 20 },
  statValue: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: '#666', fontSize: 12, marginTop: 4 },
  statDivider: { width: 1, height: 30, backgroundColor: '#333' },
  
  actionRow: { flexDirection: 'row', gap: 15, marginBottom: 30 },
  readButton: { flex: 1, height: 56, backgroundColor: '#fff', borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  readButtonText: { color: '#000', fontSize: 18, fontWeight: 'bold' },
  libraryButton: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#333' },
  libraryButtonActive: { backgroundColor: '#4a7cc7', borderColor: '#4a7cc7' },
  tabsContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1A1A1A', marginBottom: 20 },
  tabButton: { flex: 1, paddingVertical: 15, alignItems: 'center' },
  tabButtonActive: { borderBottomWidth: 2, borderBottomColor: '#fff' },
  tabText: { fontSize: 16, color: '#666', fontWeight: '500' },
  tabTextActive: { color: '#fff', fontWeight: 'bold' },
  aboutSection: { paddingBottom: 40 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 12, textAlign: 'right', marginTop: 10 },
  descriptionText: { color: '#ccc', fontSize: 16, lineHeight: 26, textAlign: 'right', marginBottom: 25 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 10 },
  tag: { backgroundColor: '#1A1A1A', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#333' },
  tagText: { color: '#ccc', fontSize: 14 },
  
  // --- Pagination Styles ---
  paginationContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 0,
      marginTop: 20,
      marginBottom: 30,
      gap: 10
  },
  pageNavBtn: {
      width: 45,
      height: 45,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#333',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#111'
  },
  disabledBtn: { opacity: 0.5, borderColor: '#222', backgroundColor: '#0a0a0a' },
  pageSelector: {
      flex: 1,
      height: 45,
      borderWidth: 1,
      borderColor: '#333',
      borderRadius: 8,
      backgroundColor: '#111',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 15,
      justifyContent: 'space-between'
  },
  pageLabel: { fontSize: 9, color: '#888', position: 'absolute', top: -8, right: 0, backgroundColor: '#111', paddingHorizontal: 2 },
  pageValue: { fontSize: 14, color: '#fff', fontWeight: 'bold', marginTop: 2 },

  // --- Modal Styles ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  pickerContainer: {
      width: '80%',
      maxHeight: '60%',
      backgroundColor: '#1a1a1a',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#333',
      padding: 15
  },
  pickerTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 10 },
  pickerItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#2a2a2a', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10 },
  pickerItemActive: { backgroundColor: '#4a7cc7', borderRadius: 8, borderBottomColor: 'transparent' },
  pickerItemText: { color: '#ccc', fontSize: 16 },

  // --- New Chapter List Styles (ZEUS Style: Badge Right, Black BG) ---
  chaptersList: { paddingBottom: 20 },
  sortHeader: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', // Puts text left, icon right (or vice versa based on direction)
      alignItems: 'center',
      paddingVertical: 10, 
      marginBottom: 5, 
      borderBottomWidth: 1, 
      borderBottomColor: '#333' 
  },
  sortHeaderText: { color: '#888', fontSize: 12, textAlign: 'right' },

  chapterRowContainer: { 
      flexDirection: 'row-reverse', // Badge on Right
      alignItems: 'center', 
      borderBottomWidth: 1, 
      borderBottomColor: '#1A1A1A',
      paddingVertical: 12,
      justifyContent: 'space-between'
  },
  
  // Badge (Right Side)
  chapterBadge: {
      backgroundColor: '#000000', // Black BG as requested
      borderRadius: 4,
      paddingHorizontal: 8,
      paddingVertical: 5,
      minWidth: 45,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 10, // Margin left because it's on the right
      borderWidth: 1,
      borderColor: '#333'
  },
  chapterBadgeText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  readDot: { position: 'absolute', top: -3, right: -3, width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ade80', borderWidth: 1, borderColor: '#000' },

  // Details (Left Side, Aligned Right)
  chapterInfo: {
      flex: 1,
      alignItems: 'flex-end', // Align text to right
      justifyContent: 'center'
  },
  chapterTitle: { 
      color: '#fff', 
      fontSize: 14, 
      fontWeight: 'bold', 
      textAlign: 'right', 
      marginBottom: 3 
  },
  chapterMeta: { color: '#666', fontSize: 10, textAlign: 'right' },
  textRead: { color: '#888' },

  adminControls: { flexDirection: 'row', gap: 10, marginRight: 5 }, // Fixed layout to ROW
  adminBtn: { padding: 4, backgroundColor: '#1a1a1a', borderRadius: 4, borderWidth: 1, borderColor: '#333' },
  
  authorSection: { marginTop: 30, borderTopWidth: 1, borderColor: '#222', paddingTop: 20 },
  authorCardContainer: { borderRadius: 16, overflow: 'hidden', marginTop: 10, borderWidth: 1, borderColor: '#222' },
  authorBannerWrapper: { width: '100%', height: 140, justifyContent: 'center', alignItems: 'center', position: 'relative', backgroundColor: '#000' },
  authorBannerImage: { position: 'absolute', width: '100%', height: '100%' },
  authorOverlayContent: { alignItems: 'center', justifyContent: 'center', zIndex: 2, width: '100%' },
  authorAvatarWrapper: { width: 76, height: 76, borderRadius: 38, borderWidth: 3, borderColor: '#fff', backgroundColor: '#333', marginBottom: 8, overflow: 'hidden' },
  authorAvatarImage: { width: '100%', height: '100%' },
  authorDisplayName: { color: '#fff', fontSize: 20, fontWeight: 'bold', textTransform: 'uppercase', textShadowColor: 'rgba(0, 0, 0, 0.9)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 6 }
});
