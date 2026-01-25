import React, { useState, useRef, useEffect, useMemo, useCallback, useContext } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  Animated,
  Modal,
  StatusBar,
  Dimensions,
  Alert,
  ScrollView,
  FlatList,
  TouchableWithoutFeedback,
  Platform
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import api, { incrementView } from '../services/api';
import CommentsSection from '../components/CommentsSection'; 
import { AuthContext } from '../context/AuthContext';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.8;

const FONT_OPTIONS = [
  { id: 'Cairo', name: 'القاهرة', family: Platform.OS === 'ios' || Platform.OS === 'web' ? "'Cairo', sans-serif" : "Cairo", url: 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap' },
  { id: 'Amiri', name: 'أميري', family: Platform.OS === 'ios' || Platform.OS === 'web' ? "'Amiri', serif" : "Amiri", url: 'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap' },
  { id: 'Geeza', name: 'جيزة', family: "'Geeza Pro', 'Segoe UI', Tahoma, sans-serif", url: '' },
  { id: 'Noto', name: 'نوتو كوفي', family: Platform.OS === 'ios' || Platform.OS === 'web' ? "'Noto Kufi Arabic', sans-serif" : "NotoKufi", url: 'https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;700&display=swap' },
  { id: 'Arial', name: 'آريال', family: "Arial, sans-serif", url: '' },
  { id: 'Times', name: 'تايمز', family: "'Times New Roman', serif", url: '' },
];

export default function ReaderScreen({ route, navigation }) {
const { userInfo } = useContext(AuthContext);
const { novel, chapterId } = route.params;
const [chapter, setChapter] = useState(null);
const [loading, setLoading] = useState(true);
const [realTotalChapters, setRealTotalChapters] = useState(novel.chaptersCount || 0);
const [commentCount, setCommentCount] = useState(0);
const [authorProfile, setAuthorProfile] = useState(null);

const [fontSize, setFontSize] = useState(19);
const [bgColor, setBgColor] = useState('#0a0a0a');
const [textColor, setTextColor] = useState('#e0e0e0');
const [fontFamily, setFontFamily] = useState(FONT_OPTIONS[0]);
const [showMenu, setShowMenu] = useState(false);
const [showSettings, setShowSettings] = useState(false);

const [showChapterList, setShowChapterList] = useState(false);
const [isAscending, setIsAscending] = useState(true);
const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
const fadeAnim = useRef(new Animated.Value(0)).current; 
const backdropAnim = useRef(new Animated.Value(0)).current;

const [showComments, setShowComments] = useState(false);

const insets = useSafeAreaInsets();
const webViewRef = useRef(null);
const flatListRef = useRef(null);
const androidListRef = useRef(null);

const novelId = novel._id || novel.id || novel.novelId;

useEffect(() => {
    loadSettings();
    fetchAuthorData();
}, []);

const fetchAuthorData = async () => {
    if (novel.authorEmail) {
        try {
            const res = await api.get(`/api/user/stats?email=${novel.authorEmail}`);
            if (res.data && res.data.user) {
                setAuthorProfile(res.data.user);
            }
        } catch (e) {
            console.log("Failed to fetch author for reader");
        }
    }
};

const loadSettings = async () => {
    try {
        const saved = await AsyncStorage.getItem('@reader_settings');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.fontSize) setFontSize(parsed.fontSize);
            if (parsed.bgColor) {
                setBgColor(parsed.bgColor);
                setTextColor(parsed.bgColor === '#fff' ? '#1a1a1a' : '#e0e0e0');
            }
            if (parsed.fontId) {
                const foundFont = FONT_OPTIONS.find(f => f.id === parsed.fontId);
                if (foundFont) setFontFamily(foundFont);
            }
        }
    } catch (e) { console.error("Error loading settings", e); }
};

const saveSettings = async (newSettings) => {
    try {
        const current = await AsyncStorage.getItem('@reader_settings');
        const existing = current ? JSON.parse(current) : {};
        await AsyncStorage.setItem('@reader_settings', JSON.stringify({ ...existing, ...newSettings }));
    } catch (e) { console.error("Error saving settings", e); }
};

const updateProgressOnServer = async (currentChapter) => {
  if (!currentChapter) return;
  try {
    await api.post('/api/novel/update', {
      novelId: novelId,
      title: novel.title,
      cover: novel.cover,
      author: novel.author || novel.translator,
      lastChapterId: parseInt(chapterId),
      lastChapterTitle: currentChapter.title
    });
  } catch (error) {
    console.error("Failed to update progress on server");
  }
};

const fetchCommentCount = async () => {
    try {
        const res = await api.get(`/api/novels/${novelId}/comments?chapterNumber=${chapterId}`);
        setCommentCount(res.data.totalComments || 0);
    } catch (e) {
        console.log("Failed to fetch comment count");
    }
};

useEffect(() => {
const fetchChapter = async () => {
setLoading(true);
try {
const response = await api.get(`/api/novels/${novelId}/chapters/${chapterId}`);
setChapter(response.data);

if (response.data.totalChapters) {
    setRealTotalChapters(response.data.totalChapters);
}

incrementView(novelId, chapterId);
updateProgressOnServer(response.data);
fetchCommentCount();

} catch (error) {
console.error("Error fetching chapter:", error);
Alert.alert("خطأ", "فشل تحميل الفصل");
} finally {
setLoading(false);
}
};
fetchChapter();
}, [chapterId]);

const toggleMenu = useCallback(() => {
  if (showChapterList) {
      closeChapterList();
      return;
  }
  
  setShowMenu(prevShowMenu => {
      const nextShowMenu = !prevShowMenu;
      Animated.timing(fadeAnim, {
        toValue: nextShowMenu ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
      return nextShowMenu;
  });
}, [showChapterList]);

useEffect(() => {
  if (Platform.OS === 'web') {
    const handleMessage = (event) => {
      if (event.data === 'toggleMenu') {
        toggleMenu();
      } else if (event.data === 'openComments') {
          setShowComments(true);
      } else if (event.data === 'openProfile' && authorProfile) {
          navigation.push('UserProfile', { userId: authorProfile._id });
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }
}, [toggleMenu, authorProfile]);

const openChapterList = () => {
    setShowChapterList(true);
    Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 300, useNativeDriver: true })
    ]).start();
};

const closeChapterList = () => {
    Animated.parallel([
        Animated.timing(slideAnim, { toValue: -DRAWER_WIDTH, duration: 300, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 300, useNativeDriver: true })
    ]).start(() => setShowChapterList(false));
};

const sortedChapters = useMemo(() => {
    if (!novel.chapters) return [];
    let list = [...novel.chapters];
    if (!isAscending) list.reverse();
    return list;
}, [novel.chapters, isAscending]);

const toggleSort = () => {
    setIsAscending(!isAscending);
};

const onMessage = (event) => {
  const data = event.nativeEvent.data;
  if (data === 'toggleMenu') {
    toggleMenu();
  } else if (data === 'openComments') {
      setShowComments(true);
  } else if (data === 'openProfile' && authorProfile) {
      navigation.push('UserProfile', { userId: authorProfile._id });
  }
};

const navigateChapter = (targetId) => {
    closeChapterList();
    if (parseInt(targetId) === parseInt(chapterId)) return;
    setTimeout(() => {
        navigation.replace('Reader', { novel, chapterId: targetId });
    }, 300);
};

const navigateNextPrev = (offset) => {
    const nextNum = parseInt(chapterId) + offset;
    if (offset < 0 && nextNum < 1) return;
    if (offset > 0 && realTotalChapters > 0 && nextNum > realTotalChapters) {
        Alert.alert("تنبيه", "أنت في آخر فصل متاح.");
        return;
    }
    navigation.replace('Reader', { novel, chapterId: nextNum });
};

const changeFontSize = (delta) => {
const newSize = fontSize + delta;
if (newSize >= 14 && newSize <= 32) {
setFontSize(newSize);
saveSettings({ fontSize: newSize });
}
};

const changeTheme = (newBgColor) => {
setBgColor(newBgColor);
const newTextColor = newBgColor === '#fff' ? '#1a1a1a' : '#e0e0e0';
setTextColor(newTextColor);
saveSettings({ bgColor: newBgColor });
};

const handleFontChange = (font) => {
    setFontFamily(font);
    saveSettings({ fontId: font.id });
};

const androidTextLines = useMemo(() => {
  if (Platform.OS !== 'android' || !chapter || !chapter.content) return [];
  return chapter.content.split('\n').filter(line => line.trim() !== '');
}, [chapter]);

const generateHTML = () => {
if (!chapter) return '';

const formattedContent = chapter.content
    .split('\n')
    .filter(line => line.trim() !== '')
    .map(line => `<p>${line}</p>`)
    .join('');

const fontImports = FONT_OPTIONS.map(f => f.url ? `@import url('${f.url}');` : '').join('\n');

const authorName = authorProfile?.name || novel.author || 'Zeus';
const authorAvatar = authorProfile?.picture || 'https://via.placeholder.com/150';
const authorBanner = authorProfile?.banner || null;
const bannerStyle = authorBanner ? `background-image: url('${authorBanner}');` : 'background-color: #000;';

const publisherBanner = `
<div class="author-section-wrapper">
    <div class="section-title">الناشر</div>
    <div class="author-card" id="authorCard">
        <div class="author-banner" style="${bannerStyle}"></div>
        <div class="author-overlay"></div>
        <div class="author-content">
            <div class="author-avatar-wrapper">
                <img src="${authorAvatar}" class="author-avatar-img" />
            </div>
            <div class="author-name">${authorName}</div>
        </div>
    </div>
</div>
`;

const commentsButton = `
<div class="comments-btn-container">
    <button class="comments-btn" id="commentsBtn">
        <span class="icon">💬</span>
        <span>عرض التعليقات (${commentCount})</span>
    </button>
</div>
`;

return `
  <!DOCTYPE html>
  <html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
      ${fontImports}
      * { -webkit-tap-highlight-color: transparent; -webkit-touch-callout: none; box-sizing: border-box; }
      body, html { 
        margin: 0; padding: 0; background-color: ${bgColor}; color: ${textColor};
        font-family: ${fontFamily.family}; line-height: 1.8; 
        -webkit-overflow-scrolling: touch; 
        overflow-x: hidden;
      }
      .container { padding: 25px 20px 120px 20px; width: 100%; max-width: 800px; margin: 0 auto; }
      .title { 
        font-size: ${fontSize + 8}px; font-weight: bold; margin-bottom: 40px; 
        color: ${bgColor === '#fff' ? '#000' : '#fff'}; border-bottom: 1px solid rgba(128,128,128,0.3);
        padding-bottom: 15px; font-family: ${fontFamily.family};
      }
      .content-area { font-size: ${fontSize}px; text-align: justify; word-wrap: break-word; }
      p { margin-bottom: 1.5em; }
      body { user-select: none; -webkit-user-select: none; }
      .author-section-wrapper { margin-top: 50px; margin-bottom: 20px; border-top: 1px solid #222; padding-top: 20px; }
      .section-title { color: ${bgColor === '#fff' ? '#000' : '#fff'}; font-size: 18px; font-weight: bold; margin-bottom: 12px; text-align: right; }
      .author-card { border-radius: 16px; overflow: hidden; margin-top: 10px; border: 1px solid #222; position: relative; height: 140px; width: 100%; cursor: pointer; }
      .author-banner { position: absolute; width: 100%; height: 100%; background-size: cover; background-position: center; }
      .author-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.8)); z-index: 1; }
      .author-content { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 2; width: 100%; }
      .author-avatar-wrapper { width: 76px; height: 76px; border-radius: 38px; border: 3px solid #fff; background-color: #333; margin-bottom: 8px; overflow: hidden; }
      .author-avatar-img { width: 100%; height: 100%; object-fit: cover; }
      .author-name { color: #fff; font-size: 20px; font-weight: bold; text-transform: uppercase; text-shadow: 0 1px 6px rgba(0, 0, 0, 0.9); text-align: center; }
      .comments-btn-container { margin-bottom: 40px; padding: 0 5px; }
      .comments-btn { width: 100%; background-color: ${bgColor === '#fff' ? '#f0f0f0' : '#1a1a1a'}; border: 1px solid ${bgColor === '#fff' ? '#ddd' : '#333'}; color: ${bgColor === '#fff' ? '#333' : '#fff'}; padding: 15px; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    </style>
  </head>
  <body>
    <div class="container" id="clickable-area">
      <div class="title">${chapter.title}</div>
      <div class="content-area">${formattedContent}</div>
      ${publisherBanner}
      ${commentsButton}
    </div>
    <script>
      function sendMessage(msg) {
          if (window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(msg); } 
          else if (window.parent) { window.parent.postMessage(msg, '*'); }
      }
      document.addEventListener('click', function(e) {
        try {
            if (e.target.closest('#commentsBtn')) { e.stopPropagation(); sendMessage('openComments'); return; }
            if (e.target.closest('#authorCard')) { e.stopPropagation(); sendMessage('openProfile'); return; }
            var selection = window.getSelection();
            if (selection && selection.toString().length > 0) return;
            sendMessage('toggleMenu');
        } catch(err) {}
      });
    </script>
  </body>
  </html>
`;
};

const renderChapterItem = ({ item }) => {
    const isCurrent = parseInt(item.number) === parseInt(chapterId);
    return (
        <TouchableOpacity 
            style={[styles.drawerItem, isCurrent && styles.drawerItemActive]} 
            onPress={() => navigateChapter(item.number)}
        >
            <View style={{flex: 1}}>
                <Text style={[styles.drawerItemTitle, isCurrent && styles.drawerItemTextActive]} numberOfLines={1}>{item.title || `فصل ${item.number}`}</Text>
                <Text style={styles.drawerItemSubtitle}>فصل {item.number}</Text>
            </View>
            {isCurrent && <Ionicons name="eye" size={16} color="#4a7cc7" />}
        </TouchableOpacity>
    );
};

if (loading) {
return (
<View style={[styles.loadingContainer, { backgroundColor: bgColor }]}>
<ActivityIndicator size="large" color="#4a7cc7" />
<Text style={[styles.loadingText, { color: textColor }]}>جاري التحميل…</Text>
</View>
);
}

const renderAndroidContent = () => (
  <View style={{ flex: 1 }}>
    <FlatList
      ref={androidListRef}
      data={androidTextLines}
      keyExtractor={(_, index) => index.toString()}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: insets.top + 60, paddingBottom: 150 }}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={true}
      ListHeaderComponent={() => (
        <TouchableOpacity activeOpacity={1} onPress={toggleMenu}>
          <Text style={[styles.androidTitle, { color: textColor, fontSize: fontSize + 8, fontFamily: fontFamily.id === 'Cairo' || fontFamily.id === 'Amiri' ? fontFamily.id : undefined }]}>
            {chapter.title}
          </Text>
        </TouchableOpacity>
      )}
      renderItem={({ item }) => (
        <TouchableOpacity activeOpacity={1} onPress={toggleMenu}>
          <Text style={{
            fontSize: fontSize,
            color: textColor,
            fontFamily: fontFamily.id === 'Cairo' || fontFamily.id === 'Amiri' ? fontFamily.id : undefined,
            lineHeight: fontSize * 1.8,
            textAlign: 'right',
            marginBottom: 20,
            writingDirection: 'rtl'
          }}>
            {item}
          </Text>
        </TouchableOpacity>
      )}
      ListFooterComponent={() => (
        <View style={{ marginTop: 30 }}>
          {authorProfile && (
            <TouchableOpacity onPress={() => navigation.push('UserProfile', { userId: authorProfile._id })} style={styles.androidAuthorCard}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>الناشر: {authorProfile.name}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setShowComments(true)} style={[styles.androidCommentBtn, { borderColor: textColor }]}>
            <Text style={{ color: textColor }}>عرض التعليقات ({commentCount})</Text>
          </TouchableOpacity>
          {/* مساحة إضافية في النهاية تسمح بفتح القائمة عند الضغط على الفراغ */}
          <TouchableOpacity style={{height: 100}} onPress={toggleMenu} />
        </View>
      )}
    />
  </View>
);

return (
<View style={[styles.container, { backgroundColor: bgColor }]}>
  <StatusBar hidden={!showMenu} barStyle={bgColor === '#fff' ? 'dark-content' : 'light-content'} animated />

  {/* Top Bar */}
  <Animated.View style={[styles.topBar, { opacity: fadeAnim, paddingTop: insets.top + 10, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [-100, 0] }) }] }]} pointerEvents={showMenu ? 'auto' : 'none'}>
    <View style={styles.topBarContent}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}><Ionicons name="arrow-forward" size={26} color="#fff" /></TouchableOpacity>
      <View style={styles.headerInfo}>
        <Text style={styles.headerTitle} numberOfLines={1}>{chapter.title}</Text>
        <Text style={styles.headerSubtitle}>الفصل {chapterId} من {realTotalChapters > 0 ? realTotalChapters : '؟'}</Text>
      </View>
    </View>
  </Animated.View>

  {/* المنصات */}
  {Platform.OS === 'web' ? (
      <iframe srcDoc={generateHTML()} style={{ flex: 1, border: 'none', backgroundColor: bgColor, width: '100%', height: '100%' }} />
  ) : Platform.OS === 'ios' ? (
      <WebView 
        ref={webViewRef} 
        originWhitelist={['*']} 
        source={{ html: generateHTML() }} 
        style={{ backgroundColor: bgColor, flex: 1 }} 
        onMessage={onMessage} 
        scrollEnabled={true}
        bounces={true}
        decelerationRate="normal"
        alwaysBounceVertical={true}
        showsVerticalScrollIndicator={false}
      />
  ) : (
      renderAndroidContent()
  )}

  {/* Bottom Bar */}
  <Animated.View style={[styles.bottomBar, { opacity: fadeAnim, paddingBottom: Math.max(insets.bottom, 20), transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [100, 0] }) }] }]} pointerEvents={showMenu ? 'auto' : 'none'}>
    <View style={styles.bottomBarContent}>
      <View style={styles.leftControls}>
          <TouchableOpacity onPress={openChapterList} style={styles.iconButton}><Ionicons name="list" size={26} color="#fff" /></TouchableOpacity>
          <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.iconButton}><Ionicons name="settings-outline" size={26} color="#fff" /></TouchableOpacity>
      </View>
      <View style={styles.navigationGroup}>
        <TouchableOpacity style={[styles.navButton, { opacity: chapterId <= 1 ? 0.4 : 1 }]} disabled={chapterId <= 1} onPress={() => navigateNextPrev(-1)}>
          <Ionicons name="chevron-forward" size={20} color="#fff" /><Text style={styles.navText}>السابق</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navButton, styles.nextButton, { opacity: (realTotalChapters > 0 && chapterId >= realTotalChapters) ? 0.4 : 1 }]} disabled={realTotalChapters > 0 && chapterId >= realTotalChapters} onPress={() => navigateNextPrev(1)}>
          <Text style={[styles.navText, { color: '#000' }]}>التالي</Text><Ionicons name="chevron-back" size={20} color="#000" />
        </TouchableOpacity>
      </View>
    </View>
  </Animated.View>

  {/* Chapter List Drawer */}
  {showChapterList && (
      <View style={[StyleSheet.absoluteFill, { zIndex: 1000 }]}>
          <TouchableWithoutFeedback onPress={closeChapterList}><Animated.View style={[styles.drawerBackdrop, { opacity: backdropAnim }]} /></TouchableWithoutFeedback>
          <Animated.View style={[styles.drawerContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20, transform: [{ translateX: slideAnim }] }]}>
              <View style={styles.drawerHeader}>
                  <TouchableOpacity onPress={closeChapterList}><Ionicons name="close" size={24} color="#888" /></TouchableOpacity>
                  <Text style={styles.drawerTitle}>الفصول ({sortedChapters.length})</Text>
                  <TouchableOpacity onPress={toggleSort} style={styles.sortButton}><Ionicons name={isAscending ? "arrow-down" : "arrow-up"} size={18} color="#4a7cc7" /></TouchableOpacity>
              </View>
              <FlatList ref={flatListRef} data={sortedChapters} keyExtractor={(item) => item._id || item.number.toString()} renderItem={renderChapterItem} initialNumToRender={20} contentContainerStyle={styles.drawerList} showsVerticalScrollIndicator={true} indicatorStyle="white" />
          </Animated.View>
      </View>
  )}

  {/* Comments Modal */}
  <Modal visible={showComments} transparent animationType="slide" onRequestClose={() => setShowComments(false)}>
      <View style={styles.commentsModalContainer}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowComments(false)} />
          <View style={styles.commentsSheet}>
              <View style={styles.commentsHandle} />
              <View style={styles.commentsHeader}>
                  <Text style={styles.commentsTitle}>تعليقات الفصل {chapterId}</Text>
                  <TouchableOpacity onPress={() => setShowComments(false)}><Ionicons name="close-circle" size={28} color="#555" /></TouchableOpacity>
              </View>
              <CommentsSection novelId={novelId} user={userInfo} chapterNumber={chapterId} />
          </View>
      </View>
  </Modal>

  {/* Settings Modal */}
  <Modal visible={showSettings} transparent animationType="slide" onRequestClose={() => setShowSettings(false)}>
    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSettings(false)}>
      <View style={styles.settingsSheet}>
        <View style={styles.settingsHandle} />
        <View style={styles.settingsHeader}>
          <Text style={styles.settingsTitle}>إعدادات القراءة</Text>
          <TouchableOpacity onPress={() => setShowSettings(false)}><Ionicons name="close-circle" size={30} color="#555" /></TouchableOpacity>
        </View>
        <View style={styles.settingSection}>
          <Text style={styles.settingLabel}>نوع الخط</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fontScroll}>
            {FONT_OPTIONS.map((font) => (
              <TouchableOpacity key={font.id} onPress={() => handleFontChange(font)} style={[styles.fontOptionBtn, fontFamily.id === font.id && styles.fontOptionBtnActive]}>
                <Text style={[styles.fontOptionText, fontFamily.id === font.id && styles.fontOptionTextActive]}>{font.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View style={styles.settingSection}>
          <Text style={styles.settingLabel}>حجم الخط</Text>
          <View style={styles.settingRow}>
            <TouchableOpacity onPress={() => changeFontSize(2)} style={styles.fontSizeBtn}><Ionicons name="add" size={24} color="#fff" /></TouchableOpacity>
            <Text style={styles.fontSizeDisplay}>{fontSize}</Text>
            <TouchableOpacity onPress={() => changeFontSize(-2)} style={styles.fontSizeBtn}><Ionicons name="remove" size={24} color="#fff" /></TouchableOpacity>
          </View>
        </View>
        <View style={styles.settingSection}>
          <Text style={styles.settingLabel}>السمة</Text>
          <View style={styles.themeRow}>
            {[ { color: '#fff', name: 'فاتح' }, { color: '#2d2d2d', name: 'داكن' }, { color: '#0a0a0a', name: 'أسود' } ].map(theme => (
              <TouchableOpacity key={theme.color} onPress={() => changeTheme(theme.color)} style={styles.themeContainer}>
                <View style={[styles.themeOption, { backgroundColor: theme.color, borderWidth: bgColor === theme.color ? 3 : 1, borderColor: bgColor === theme.color ? '#4a7cc7' : '#555' }]} />
                <Text style={styles.themeName}>{theme.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  </Modal>
</View>
);
}

const styles = StyleSheet.create({
container: { flex: 1 },
loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
loadingText: { marginTop: 15, fontSize: 16 },
topBar: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: 'rgba(15,15,15,0.97)', zIndex: 10, borderBottomWidth: 1, borderBottomColor: '#333' },
topBarContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 12 },
iconButton: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)' },
headerInfo: { flex: 1, alignItems: 'flex-end', marginRight: 15 },
headerTitle: { color: '#fff', fontWeight: 'bold', fontSize: 17 },
headerSubtitle: { color: '#999', fontSize: 13 },
bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(15,15,15,0.97)', zIndex: 10 },
bottomBarContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 15 },
leftControls: { flexDirection: 'row', gap: 12 },
navigationGroup: { flexDirection: 'row', gap: 12 },
navButton: { paddingVertical: 10, paddingHorizontal: 18, backgroundColor: '#333', borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 5 },
nextButton: { backgroundColor: '#fff' },
navText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
settingsSheet: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 25, borderTopRightRadius: 25, paddingHorizontal: 20, paddingBottom: 40, alignSelf: 'stretch' },
settingsHandle: { width: 40, height: 5, backgroundColor: '#444', borderRadius: 3, alignSelf: 'center', marginVertical: 12 },
settingsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
settingsTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
settingSection: { marginBottom: 20 },
settingLabel: { color: '#888', fontSize: 13, marginBottom: 12, textAlign: 'right' },
settingRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 30 },
fontSizeBtn: { backgroundColor: '#333', width: 45, height: 45, borderRadius: 22.5, alignItems: 'center', justifyContent: 'center' },
fontSizeDisplay: { color: '#fff', fontSize: 22, fontWeight: 'bold', minWidth: 40, textAlign: 'center' },
fontScroll: { flexDirection: 'row-reverse', paddingVertical: 5 },
fontOptionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: '#262626', marginLeft: 10, borderWidth: 1, borderColor: '#333' },
fontOptionBtnActive: { backgroundColor: '#4a7cc7', borderColor: '#4a7cc7' },
fontOptionText: { color: '#aaa', fontSize: 14 },
fontOptionTextActive: { color: '#fff', fontWeight: 'bold' },
themeRow: { flexDirection: 'row', justifyContent: 'space-around' },
themeContainer: { alignItems: 'center', gap: 8 },
themeOption: { width: 50, height: 50, borderRadius: 25 },
themeName: { color: '#888', fontSize: 12 },
drawerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)' },
drawerContent: { position: 'absolute', top: 0, bottom: 0, left: 0, width: DRAWER_WIDTH, backgroundColor: '#161616', borderRightWidth: 1, borderRightColor: '#333', shadowColor: '#000', shadowOffset: { width: 5, height: 0 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 20 },
drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#2a2a2a', marginBottom: 5 },
drawerTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
sortButton: { padding: 5, backgroundColor: 'rgba(74, 124, 199, 0.1)', borderRadius: 8 },
drawerList: { paddingHorizontal: 10 },
drawerItem: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#222' },
drawerItemActive: { backgroundColor: 'rgba(74, 124, 199, 0.15)', borderRadius: 8, borderBottomColor: 'transparent', borderWidth: 1, borderColor: 'rgba(74, 124, 199, 0.3)' },
drawerItemTitle: { color: '#ccc', fontSize: 14, textAlign: 'right', marginBottom: 2 },
drawerItemTextActive: { color: '#4a7cc7', fontWeight: 'bold' },
drawerItemSubtitle: { color: '#666', fontSize: 11, textAlign: 'right' },
commentsModalContainer: { flex: 1, justifyContent: 'flex-end' },
modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
commentsSheet: { height: '80%', backgroundColor: '#0a0a0a', borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
commentsHandle: { width: 40, height: 5, backgroundColor: '#333', borderRadius: 3, alignSelf: 'center', marginTop: 10 },
commentsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderColor: '#222' },
commentsTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
androidTitle: { fontWeight: 'bold', textAlign: 'center', marginBottom: 30, borderBottomWidth: 1, borderBottomColor: 'rgba(128,128,128,0.3)', paddingBottom: 15 },
androidAuthorCard: { backgroundColor: '#111', padding: 20, borderRadius: 12, marginBottom: 20, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
androidCommentBtn: { padding: 15, borderRadius: 8, borderWidth: 1, alignItems: 'center', marginBottom: 50 }
});