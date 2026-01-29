
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
  Platform,
  TextInput,
  Keyboard
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import api, { incrementView } from '../services/api';
import CommentsSection from '../components/CommentsSection'; 
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.85; 

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
const { showToast } = useToast();
const { novel, chapterId } = route.params;
const [chapter, setChapter] = useState(null);
const [loading, setLoading] = useState(true);
const [realTotalChapters, setRealTotalChapters] = useState(novel.chaptersCount || 0);
const [commentCount, setCommentCount] = useState(0);
const [authorProfile, setAuthorProfile] = useState(null);

// Settings State
const [fontSize, setFontSize] = useState(19);
const [bgColor, setBgColor] = useState('#0a0a0a');
const [textColor, setTextColor] = useState('#e0e0e0');
const [fontFamily, setFontFamily] = useState(FONT_OPTIONS[0]);
const [showMenu, setShowMenu] = useState(false);
const [showSettings, setShowSettings] = useState(false);
const [settingsView, setSettingsView] = useState('main'); 

// --- REPLACEMENTS STATE (New Structure) ---
const [folders, setFolders] = useState([]); // [{id, name, replacements: []}]
const [currentFolderId, setCurrentFolderId] = useState(null); // ID of currently active folder
const [replacementViewMode, setReplacementViewMode] = useState('folders'); // 'folders' or 'list'
const [replaceSearch, setReplaceSearch] = useState(''); // Search query
const [replaceSortDesc, setReplaceSortDesc] = useState(true); // Sort order (Newest first by default)

// Inputs
const [newOriginal, setNewOriginal] = useState('');
const [newReplacement, setNewReplacement] = useState('');
const [editingId, setEditingId] = useState(null); 

// Folder Creation Modal
const [showFolderModal, setShowFolderModal] = useState(false);
const [newFolderName, setNewFolderName] = useState('');

// Global Cleaner State (Admin Only)
const [cleanerWords, setCleanerWords] = useState([]);
const [newCleanerWord, setNewCleanerWord] = useState('');
const [cleanerEditingId, setCleanerEditingId] = useState(null); 
const [cleaningLoading, setCleaningLoading] = useState(false);

// Drawer State
const [drawerMode, setDrawerMode] = useState('none'); 
const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current; 
const slideAnimRight = useRef(new Animated.Value(DRAWER_WIDTH)).current; 
const fadeAnim = useRef(new Animated.Value(0)).current; 
const backdropAnim = useRef(new Animated.Value(0)).current;

const [showComments, setShowComments] = useState(false);

const insets = useSafeAreaInsets();
const webViewRef = useRef(null);
const flatListRef = useRef(null);
const androidListRef = useRef(null);

const novelId = novel._id || novel.id || novel.novelId;
const isAdmin = userInfo?.role === 'admin';

useEffect(() => {
    loadSettings();
    loadFoldersAndPrefs(); // Load folders instead of simple replacements
    fetchAuthorData();
    if (isAdmin) fetchCleanerWords();
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

const fetchCleanerWords = async () => {
    try {
        const res = await api.get('/api/admin/cleaner');
        setCleanerWords(res.data);
    } catch (e) {
        console.log("Failed to fetch cleaner words");
    }
};

// --- Settings Logic ---
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

// --- NEW FOLDERS & REPLACEMENTS LOGIC ---

const loadFoldersAndPrefs = async () => {
    try {
        // Load Folders
        const savedFolders = await AsyncStorage.getItem('@reader_folders_v2');
        let parsedFolders = [];
        
        if (savedFolders) {
            parsedFolders = JSON.parse(savedFolders);
        } else {
            // Migration: Check for old simple list
            const oldReplacements = await AsyncStorage.getItem('@reader_replacements');
            if (oldReplacements) {
                parsedFolders = [{
                    id: 'default_migrated',
                    name: 'عام (قديم)',
                    replacements: JSON.parse(oldReplacements)
                }];
                await AsyncStorage.setItem('@reader_folders_v2', JSON.stringify(parsedFolders));
            }
        }
        setFolders(parsedFolders);

        // Load UI Prefs (Last folder, Sort order)
        const prefs = await AsyncStorage.getItem('@reader_ui_prefs');
        if (prefs) {
            const { lastFolderId, sortDesc } = JSON.parse(prefs);
            if (sortDesc !== undefined) setReplaceSortDesc(sortDesc);
            
            // Auto-open last folder if it exists
            if (lastFolderId) {
                const folderExists = parsedFolders.find(f => f.id === lastFolderId);
                if (folderExists) {
                    setCurrentFolderId(lastFolderId);
                    setReplacementViewMode('list');
                }
            }
        }
    } catch (e) { console.error("Error loading folders", e); }
};

const saveFoldersData = async (newFolders) => {
    try {
        setFolders(newFolders);
        await AsyncStorage.setItem('@reader_folders_v2', JSON.stringify(newFolders));
    } catch (e) { console.error("Error saving folders", e); }
};

const saveUiPrefs = async (prefs) => {
    try {
        const current = await AsyncStorage.getItem('@reader_ui_prefs');
        const existing = current ? JSON.parse(current) : {};
        const newPrefs = { ...existing, ...prefs };
        await AsyncStorage.setItem('@reader_ui_prefs', JSON.stringify(newPrefs));
    } catch (e) { console.error("Error saving prefs", e); }
};

// Folder Actions
const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    
    const newFolder = {
        id: Date.now().toString(),
        name: newFolderName.trim(),
        replacements: []
    };
    
    const updatedFolders = [...folders, newFolder];
    saveFoldersData(updatedFolders);
    setShowFolderModal(false);
    setNewFolderName('');
};

const deleteFolder = (folderId) => {
    Alert.alert("حذف المجلد", "هل أنت متأكد؟ سيتم حذف جميع الاستبدالات داخله.", [
        { text: "إلغاء" },
        { 
            text: "حذف", 
            style: 'destructive', 
            onPress: () => {
                const updated = folders.filter(f => f.id !== folderId);
                saveFoldersData(updated);
                if (currentFolderId === folderId) {
                    setCurrentFolderId(null);
                    setReplacementViewMode('folders');
                }
            }
        }
    ]);
};

const openFolder = (folderId) => {
    setCurrentFolderId(folderId);
    setReplacementViewMode('list');
    saveUiPrefs({ lastFolderId: folderId });
    setReplaceSearch(''); // Clear search on enter
};

const backToFolders = () => {
    setReplacementViewMode('folders');
    // We don't clear currentFolderId so the replacements keep working, 
    // but we can clear it from prefs if we want 'clean slate' next launch.
    // For now, let's keep it active.
};

const toggleSortOrder = () => {
    const newOrder = !replaceSortDesc;
    setReplaceSortDesc(newOrder);
    saveUiPrefs({ sortDesc: newOrder });
};

// Replacement Item Actions (Scoped to Current Folder)
const handleAddReplacement = () => {
    if (!currentFolderId) return;
    if (!newOriginal.trim() || !newReplacement.trim()) {
        Alert.alert('تنبيه', 'يرجى إدخال الكلمة الأصلية والبديلة');
        return;
    }

    const folderIndex = folders.findIndex(f => f.id === currentFolderId);
    if (folderIndex === -1) return;

    const currentFolder = folders[folderIndex];
    let updatedReplacements = [...currentFolder.replacements];

    if (editingId !== null) {
        // Edit existing
        updatedReplacements = updatedReplacements.map((item, index) => 
            index === editingId ? { original: newOriginal.trim(), replacement: newReplacement.trim() } : item
        );
        setEditingId(null);
    } else {
        // Add new
        updatedReplacements.push({ original: newOriginal.trim(), replacement: newReplacement.trim() });
    }

    const updatedFolders = [...folders];
    updatedFolders[folderIndex] = { ...currentFolder, replacements: updatedReplacements };
    
    saveFoldersData(updatedFolders);
    setNewOriginal('');
    setNewReplacement('');
    Keyboard.dismiss();
};

const handleEditReplacement = (item, realIndex) => {
    setNewOriginal(item.original);
    setNewReplacement(item.replacement);
    setEditingId(realIndex); // Store the actual index in the main array
};

const handleDeleteReplacement = (realIndex) => {
    if (!currentFolderId) return;
    const folderIndex = folders.findIndex(f => f.id === currentFolderId);
    if (folderIndex === -1) return;

    const currentFolder = folders[folderIndex];
    const updatedReplacements = currentFolder.replacements.filter((_, i) => i !== realIndex);

    const updatedFolders = [...folders];
    updatedFolders[folderIndex] = { ...currentFolder, replacements: updatedReplacements };
    saveFoldersData(updatedFolders);

    if (editingId === realIndex) {
        setEditingId(null);
        setNewOriginal('');
        setNewReplacement('');
    }
};

// --- Computed Data for Render ---
const activeReplacementsList = useMemo(() => {
    if (!currentFolderId) return [];
    const folder = folders.find(f => f.id === currentFolderId);
    return folder ? folder.replacements : [];
}, [folders, currentFolderId]);

const filteredSortedReplacements = useMemo(() => {
    let list = activeReplacementsList.map((item, index) => ({ ...item, realIndex: index }));
    
    // Search
    if (replaceSearch.trim()) {
        const q = replaceSearch.toLowerCase();
        list = list.filter(item => 
            item.original.toLowerCase().includes(q) || 
            item.replacement.toLowerCase().includes(q)
        );
    }

    // Sort (Since user adds to end, 'Newest' means higher index if we consider push order.
    // Assuming standard array order is Oldest -> Newest)
    if (replaceSortDesc) {
        list.reverse(); 
    }

    return list;
}, [activeReplacementsList, replaceSearch, replaceSortDesc]);


// --- Global Cleaner Logic (Admin) ---
const handleExecuteCleaner = async () => {
    if (!newCleanerWord.trim()) {
        Alert.alert('تنبيه', 'يرجى إدخال النص المراد حذفه');
        return;
    }

    Alert.alert(
        "تأكيد الحذف الشامل",
        `سيتم حذف أي فقرة أو نص مطابق لما أدخلته من جميع الفصول في السيرفر.`,
        [
            { text: "إلغاء", style: "cancel" },
            { 
                text: "تنفيذ الحذف", 
                style: "destructive",
                onPress: async () => {
                    setCleaningLoading(true);
                    try {
                        if (cleanerEditingId !== null) {
                            // Edit existing cleaner word (update logic)
                            await api.put(`/api/admin/cleaner/${cleanerEditingId}`, { word: newCleanerWord }); // No trim to preserve newlines if meant
                            setCleanerEditingId(null);
                        } else {
                            // Add new cleaner word
                            await api.post('/api/admin/cleaner', { word: newCleanerWord });
                        }
                        
                        setNewCleanerWord('');
                        await fetchCleanerWords();
                        showToast("تم الحذف من جميع الفصول بنجاح", "success");
                        // Refresh chapter content to show changes
                        fetchChapter();
                    } catch (e) {
                        showToast("فشل تنفيذ الحذف", "error");
                    } finally {
                        setCleaningLoading(false);
                    }
                }
            }
        ]
    );
};

const handleEditCleaner = (item, index) => {
    setNewCleanerWord(item);
    setCleanerEditingId(index);
};

const handleDeleteCleaner = async (item) => {
    Alert.alert("حذف", "هل تريد إزالة هذا النص من القائمة؟ (لن تعود النصوص المحذوفة سابقاً)", [
        { text: "إلغاء" },
        { 
            text: "حذف", 
            style: 'destructive',
            onPress: async () => {
                try {
                    await api.delete(`/api/admin/cleaner/${encodeURIComponent(item)}`);
                    fetchCleanerWords();
                    if (newCleanerWord === item) {
                        setNewCleanerWord('');
                        setCleanerEditingId(null);
                    }
                } catch (e) { showToast("فشل الحذف", "error"); }
            } 
        }
    ]);
};

// --- Content Processing ---
const getProcessedContent = useMemo(() => {
    if (!chapter || !chapter.content) return '';
    let content = chapter.content;
    
    // Apply Active Folder Replacements
    // Note: We use activeReplacementsList (raw order) for consistent processing
    activeReplacementsList.forEach(rep => {
        if (rep.original && rep.replacement) {
            const escapedOriginal = rep.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedOriginal, 'g');
            content = content.replace(regex, rep.replacement);
        }
    });
    return content;
}, [chapter, activeReplacementsList]);

// --- Progress & API ---
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

const fetchCommentCount = async () => {
    try {
        const res = await api.get(`/api/novels/${novelId}/comments?chapterNumber=${chapterId}`);
        setCommentCount(res.data.totalComments || 0);
    } catch (e) {
        console.log("Failed to fetch comment count");
    }
};

useEffect(() => {
    fetchChapter();
}, [chapterId]);

const toggleMenu = useCallback(() => {
  if (drawerMode !== 'none') {
      closeDrawers();
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
}, [drawerMode]);

// --- Drawer Logic ---
const openLeftDrawer = () => {
    setDrawerMode('chapters');
    Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 300, useNativeDriver: true })
    ]).start();
};

const openRightDrawer = (mode) => { // 'replacements' or 'cleaner'
    setShowSettings(false);
    setDrawerMode(mode);
    // If opening replacements, ensure we are in the right view mode based on history
    if (mode === 'replacements' && !currentFolderId) {
        setReplacementViewMode('folders');
    }
    Animated.parallel([
        Animated.timing(slideAnimRight, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 300, useNativeDriver: true })
    ]).start();
};

const closeDrawers = () => {
    Keyboard.dismiss();
    Animated.parallel([
        Animated.timing(slideAnim, { toValue: -DRAWER_WIDTH, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnimRight, { toValue: DRAWER_WIDTH, duration: 300, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 300, useNativeDriver: true })
    ]).start(() => {
        setDrawerMode('none');
        // Reset Inputs
        setEditingId(null);
        setNewOriginal('');
        setNewReplacement('');
        setCleanerEditingId(null);
        setNewCleanerWord('');
    });
};

const sortedChapters = useMemo(() => {
    if (!novel.chapters) return [];
    let list = [...novel.chapters];
    if (!isAscending) list.reverse();
    return list;
}, [novel.chapters, isAscending]);

const [isAscending, setIsAscending] = useState(true);
const toggleSort = () => {
    setIsAscending(!isAscending);
};

const navigateChapter = (targetId) => {
    closeDrawers();
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

// Android Lines
const androidTextLines = useMemo(() => {
  if (Platform.OS !== 'android') return [];
  return getProcessedContent.split('\n').filter(line => line.trim() !== '');
}, [getProcessedContent]);

const generateHTML = () => {
if (!chapter) return '';

const formattedContent = getProcessedContent
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

const onMessage = (event) => {
    if (event && event.nativeEvent && event.nativeEvent.data) {
        const msg = event.nativeEvent.data;
        if (msg === 'toggleMenu') {
            toggleMenu();
        } else if (msg === 'openComments') {
            setShowComments(true);
        } else if (msg === 'openProfile') {
            if (authorProfile) {
                navigation.push('UserProfile', { userId: authorProfile._id });
            }
        }
    }
};

const renderFolderItem = ({ item }) => (
    <TouchableOpacity style={styles.drawerItem} onPress={() => openFolder(item.id)}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Ionicons name="folder" size={20} color="#4a7cc7" style={{marginLeft: 10}} />
            <Text style={styles.drawerItemTitle}>{item.name}</Text>
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Text style={{color: '#666', fontSize: 12, marginRight: 10}}>{item.replacements.length} كلمة</Text>
            <TouchableOpacity onPress={() => deleteFolder(item.id)} style={{padding: 5}}>
                <Ionicons name="trash-outline" size={18} color="#ff4444" />
            </TouchableOpacity>
        </View>
    </TouchableOpacity>
);

const renderReplacementItem = ({ item, index }) => (
    <TouchableOpacity style={styles.replacementItem} onPress={() => handleEditReplacement(item, index)}>
        <View style={styles.replacementInfo}>
            <Text style={[styles.replacementText, {color: '#888', fontSize: 12, marginBottom: 2}]}>{item.original}</Text>
            <Ionicons name="arrow-down" size={12} color="#4a7cc7" style={{marginVertical: 2}} />
            <Text style={[styles.replacementText, {fontWeight: 'bold', color: '#fff'}]}>{item.replacement}</Text>
        </View>
        <View style={styles.replacementActions}>
            <TouchableOpacity onPress={() => handleDeleteReplacement(index)} style={styles.actionBtn}>
                <Ionicons name="trash-outline" size={18} color="#ff4444" />
            </TouchableOpacity>
        </View>
    </TouchableOpacity>
);

const renderCleanerItem = ({ item, index }) => (
    <View style={styles.replacementItem}>
        <View style={styles.replacementInfo}>
            <Text style={[styles.replacementText, {color: '#ccc', textAlign: 'right'}]} numberOfLines={2}>{item}</Text>
        </View>
        <View style={styles.replacementActions}>
            <TouchableOpacity onPress={() => handleEditCleaner(item, index)} style={styles.actionBtn}>
                <Ionicons name="create-outline" size={18} color="#4a7cc7" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteCleaner(item)} style={styles.actionBtn}>
                <Ionicons name="trash-outline" size={18} color="#ff4444" />
            </TouchableOpacity>
        </View>
    </View>
);

const renderChapterItem = ({ item }) => {
    return (
        <TouchableOpacity 
            style={[styles.drawerItem, item.number == chapterId && styles.drawerItemActive]} 
            onPress={() => navigateChapter(item.number)}
        >
            <Text style={[styles.drawerItemTitle, item.number == chapterId && styles.drawerItemTextActive]}>
                {item.title || `فصل ${item.number}`}
            </Text>
            <Text style={styles.drawerItemSubtitle}>{item.number}</Text>
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

  {/* Bottom Bar - Redesigned V2 */}
  <Animated.View style={[styles.bottomBar, { opacity: fadeAnim, paddingBottom: Math.max(insets.bottom, 20), transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [100, 0] }) }] }]} pointerEvents={showMenu ? 'auto' : 'none'}>
    <View style={styles.bottomBarContent}>
      
      {/* Row 1: Icons */}
      <View style={styles.topIconsRow}>
          {/* Menu - Top Left */}
          <TouchableOpacity onPress={openLeftDrawer} style={styles.circleIconBtn}>
              <Ionicons name="list" size={24} color="#fff" />
          </TouchableOpacity>

          {/* Settings - Top Right */}
          <TouchableOpacity onPress={() => { setSettingsView('main'); setShowSettings(true); }} style={styles.circleIconBtn}>
              <Ionicons name="settings-outline" size={24} color="#fff" />
          </TouchableOpacity>
      </View>

      {/* Row 2: Navigation Buttons */}
      <View style={styles.navigationGroup}>
        {/* Previous - Left - Dark Gray */}
        <TouchableOpacity 
            style={[styles.navButton, styles.prevButton, { opacity: chapterId <= 1 ? 0.5 : 1 }]} 
            disabled={chapterId <= 1} 
            onPress={() => navigateNextPrev(-1)}
        >
          <Ionicons name="chevron-forward" size={20} color="#fff" />
          <Text style={styles.prevText}>السابق</Text>
        </TouchableOpacity>

        {/* Next - Right - White */}
        <TouchableOpacity 
            style={[styles.navButton, styles.nextButton, { opacity: (realTotalChapters > 0 && chapterId >= realTotalChapters) ? 0.5 : 1 }]} 
            disabled={realTotalChapters > 0 && chapterId >= realTotalChapters} 
            onPress={() => navigateNextPrev(1)}
        >
          <Text style={styles.nextText}>التالي</Text>
          <Ionicons name="chevron-back" size={20} color="#000" />
        </TouchableOpacity>
      </View>

    </View>
  </Animated.View>

  {/* Drawers Container (Single Backdrop) */}
  {drawerMode !== 'none' && (
      <View style={[StyleSheet.absoluteFill, { zIndex: 1000 }]}>
          <TouchableWithoutFeedback onPress={closeDrawers}><Animated.View style={[styles.drawerBackdrop, { opacity: backdropAnim }]} /></TouchableWithoutFeedback>
          
          {/* Left Drawer (Chapters) */}
          <Animated.View style={[styles.drawerContent, { left: 0, borderRightWidth: 1, borderRightColor: '#333', paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20, transform: [{ translateX: slideAnim }] }]}>
              <View style={styles.drawerHeader}>
                  <TouchableOpacity onPress={closeDrawers}><Ionicons name="close" size={24} color="#888" /></TouchableOpacity>
                  <Text style={styles.drawerTitle}>الفصول ({sortedChapters.length})</Text>
                  <TouchableOpacity onPress={toggleSort} style={styles.sortButton}><Ionicons name={isAscending ? "arrow-down" : "arrow-up"} size={18} color="#4a7cc7" /></TouchableOpacity>
              </View>
              <FlatList ref={flatListRef} data={sortedChapters} keyExtractor={(item) => item._id || item.number.toString()} renderItem={renderChapterItem} initialNumToRender={20} contentContainerStyle={styles.drawerList} showsVerticalScrollIndicator={true} indicatorStyle="white" />
          </Animated.View>

          {/* Right Drawer (Replacements OR Cleaner) */}
          <Animated.View style={[styles.drawerContent, { right: 0, borderLeftWidth: 1, borderLeftColor: '#333', paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20, transform: [{ translateX: slideAnimRight }] }]}>
              {drawerMode === 'replacements' && (
                  <>
                      {/* VIEW: FOLDERS LIST */}
                      {replacementViewMode === 'folders' && (
                          <>
                              <View style={styles.drawerHeader}>
                                  <Text style={styles.drawerTitle}>مجلدات الاستبدال</Text>
                                  <TouchableOpacity onPress={closeDrawers}><Ionicons name="close" size={24} color="#888" /></TouchableOpacity>
                              </View>
                              
                              <View style={styles.inputContainer}>
                                  <TouchableOpacity 
                                    style={styles.addButton} 
                                    onPress={() => {
                                        setNewFolderName(novel.title || '');
                                        setShowFolderModal(true);
                                    }}
                                  >
                                      <Text style={styles.addButtonText}>إضافة مجلد جديد</Text>
                                      <Ionicons name="add-circle-outline" size={20} color="#fff" />
                                  </TouchableOpacity>
                              </View>

                              <Text style={styles.listLabel}>المجلدات ({folders.length})</Text>
                              <FlatList 
                                data={folders} 
                                keyExtractor={(item) => item.id} 
                                renderItem={renderFolderItem} 
                                contentContainerStyle={styles.drawerList} 
                                showsVerticalScrollIndicator={true} 
                                indicatorStyle="white"
                                ListEmptyComponent={<Text style={styles.emptyText}>لا توجد مجلدات</Text>}
                              />
                          </>
                      )}

                      {/* VIEW: REPLACEMENT ITEMS */}
                      {replacementViewMode === 'list' && (
                          <>
                              <View style={styles.drawerHeader}>
                                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                                      <TouchableOpacity onPress={backToFolders}>
                                          <Ionicons name="arrow-back" size={24} color="#fff" />
                                      </TouchableOpacity>
                                      <Text style={styles.drawerTitle}>
                                          {folders.find(f => f.id === currentFolderId)?.name || 'كلمات'}
                                      </Text>
                                  </View>
                                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                                      <TouchableOpacity onPress={toggleSortOrder} style={styles.sortButton}>
                                          <Ionicons name={replaceSortDesc ? "arrow-up" : "arrow-down"} size={18} color="#4a7cc7" />
                                      </TouchableOpacity>
                                      <TouchableOpacity onPress={closeDrawers}><Ionicons name="close" size={24} color="#888" /></TouchableOpacity>
                                  </View>
                              </View>
                              
                              {/* Search Bar */}
                              <View style={{paddingHorizontal: 15, marginBottom: 10}}>
                                  <View style={styles.searchBar}>
                                      <Ionicons name="search" size={16} color="#666" />
                                      <TextInput 
                                          style={styles.searchInput}
                                          placeholder="بحث في الكلمات..."
                                          placeholderTextColor="#666"
                                          value={replaceSearch}
                                          onChangeText={setReplaceSearch}
                                      />
                                      {replaceSearch.length > 0 && (
                                          <TouchableOpacity onPress={() => setReplaceSearch('')}>
                                              <Ionicons name="close-circle" size={16} color="#666" />
                                          </TouchableOpacity>
                                      )}
                                  </View>
                              </View>

                              <View style={styles.inputContainer}>
                                 <View style={styles.inputRow}>
                                    <TextInput 
                                        style={styles.textInput} 
                                        placeholder="الكلمة الأصلية" 
                                        placeholderTextColor="#666" 
                                        value={newOriginal}
                                        onChangeText={setNewOriginal}
                                    />
                                    <Ionicons name="arrow-down" size={20} color="#444" />
                                    <TextInput 
                                        style={styles.textInput} 
                                        placeholder="الكلمة البديلة" 
                                        placeholderTextColor="#666"
                                        value={newReplacement}
                                        onChangeText={setNewReplacement}
                                    />
                                 </View>
                                 <TouchableOpacity style={styles.addButton} onPress={handleAddReplacement}>
                                     <Text style={styles.addButtonText}>{editingId !== null ? "تحديث الكلمة" : "إضافة استبدال"}</Text>
                                     <Ionicons name={editingId !== null ? "save-outline" : "add-circle-outline"} size={20} color="#fff" />
                                 </TouchableOpacity>
                              </View>

                              <Text style={styles.listLabel}>الكلمات المستبدلة ({filteredSortedReplacements.length})</Text>
                              <FlatList 
                                data={filteredSortedReplacements} 
                                keyExtractor={(item) => item.realIndex.toString()} 
                                renderItem={({ item }) => renderReplacementItem({ item, index: item.realIndex })} 
                                contentContainerStyle={styles.drawerList} 
                                showsVerticalScrollIndicator={true} 
                                indicatorStyle="white"
                                ListEmptyComponent={<Text style={styles.emptyText}>لا توجد استبدالات</Text>}
                              />
                          </>
                      )}
                  </>
              )}

              {drawerMode === 'cleaner' && (
                  <>
                      <View style={styles.drawerHeader}>
                          <Text style={[styles.drawerTitle, {color: '#ff4444'}]}>الحذف الشامل</Text>
                          <TouchableOpacity onPress={closeDrawers}><Ionicons name="close" size={24} color="#888" /></TouchableOpacity>
                      </View>

                      <View style={styles.alertBox}>
                          <Ionicons name="warning" size={20} color="#ff4444" />
                          <Text style={styles.alertText}>
                              سيتم حذف هذه الجملة أو أي فقرة تحتوي عليها من جميع الفصول.
                          </Text>
                      </View>
                      
                      <View style={styles.inputContainer}>
                         <View style={styles.inputRow}>
                            <TextInput 
                                style={[styles.textInput, {width: '100%', height: 120, textAlignVertical: 'top'}]} 
                                placeholder="الصق النص أو الجملة المراد حذفها هنا..." 
                                placeholderTextColor="#666" 
                                value={newCleanerWord}
                                onChangeText={setNewCleanerWord}
                                multiline={true}
                                numberOfLines={4}
                            />
                         </View>
                         <TouchableOpacity style={[styles.addButton, {backgroundColor: '#b91c1c'}]} onPress={handleExecuteCleaner} disabled={cleaningLoading}>
                             {cleaningLoading ? <ActivityIndicator color="#fff" size="small" /> : (
                                 <>
                                    <Text style={styles.addButtonText}>{cleanerEditingId !== null ? "تحديث الحذف" : "تنفيذ الحذف الشامل"}</Text>
                                    <Ionicons name="trash-bin-outline" size={20} color="#fff" />
                                 </>
                             )}
                         </TouchableOpacity>
                      </View>

                      <Text style={styles.listLabel}>قائمة الحذف ({cleanerWords.length})</Text>
                      <FlatList 
                        data={cleanerWords} 
                        keyExtractor={(_, index) => index.toString()} 
                        renderItem={renderCleanerItem} 
                        contentContainerStyle={styles.drawerList} 
                        showsVerticalScrollIndicator={true} 
                        indicatorStyle="white"
                        ListEmptyComponent={<Text style={styles.emptyText}>القائمة فارغة</Text>}
                      />
                  </>
              )}
          </Animated.View>
      </View>
  )}

  {/* Folder Name Modal */}
  <Modal visible={showFolderModal} transparent animationType="fade" onRequestClose={() => setShowFolderModal(false)}>
      <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>اسم المجلد</Text>
              <TextInput 
                  style={styles.modalInput} 
                  placeholder="اسم الرواية" 
                  placeholderTextColor="#666"
                  value={newFolderName}
                  onChangeText={setNewFolderName}
                  textAlign="right"
              />
              <View style={styles.modalButtons}>
                  <TouchableOpacity style={[styles.modalBtn, {backgroundColor: '#333'}]} onPress={() => setShowFolderModal(false)}>
                      <Text style={styles.modalBtnText}>إلغاء</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, {backgroundColor: '#4a7cc7'}]} onPress={handleCreateFolder}>
                      <Text style={styles.modalBtnText}>تم</Text>
                  </TouchableOpacity>
              </View>
          </View>
      </View>
  </Modal>

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

  {/* Unified Settings Modal */}
  <Modal visible={showSettings} transparent animationType="slide" onRequestClose={() => setShowSettings(false)}>
    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSettings(false)}>
      <View style={styles.settingsSheet}>
        <View style={styles.settingsHandle} />
        
        {settingsView === 'main' ? (
            // Main Settings Menu (Hub)
            <>
                <View style={styles.settingsHeader}>
                    <Text style={styles.settingsTitle}>الإعدادات</Text>
                    <TouchableOpacity onPress={() => setShowSettings(false)}><Ionicons name="close-circle" size={30} color="#555" /></TouchableOpacity>
                </View>
                <View style={styles.settingsGrid}>
                    <TouchableOpacity style={styles.settingsCard} onPress={() => setSettingsView('appearance')}>
                        <View style={styles.cardIcon}>
                            <Ionicons name="text-outline" size={32} color="#fff" />
                        </View>
                        <Text style={styles.cardTitle}>مظهر القراءة</Text>
                        <Text style={styles.cardSub}>الخط، الحجم، الألوان</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingsCard} onPress={() => openRightDrawer('replacements')}>
                        <View style={[styles.cardIcon, { backgroundColor: '#4a7cc7' }]}>
                            <Ionicons name="swap-horizontal-outline" size={32} color="#fff" />
                        </View>
                        <Text style={styles.cardTitle}>استبدال الكلمات</Text>
                        <Text style={styles.cardSub}>تغيير كلمات داخل الفصل</Text>
                    </TouchableOpacity>

                    {/* 🔥 New Global Cleaner Option (Admin Only) */}
                    {isAdmin && (
                        <TouchableOpacity style={[styles.settingsCard, {borderColor: '#b91c1c'}]} onPress={() => openRightDrawer('cleaner')}>
                            <View style={[styles.cardIcon, { backgroundColor: '#b91c1c' }]}>
                                <Ionicons name="trash-outline" size={32} color="#fff" />
                            </View>
                            <Text style={[styles.cardTitle, {color: '#ff4444'}]}>الحذف الشامل</Text>
                            <Text style={styles.cardSub}>حذف حقوق/نصوص من السيرفر</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </>
        ) : (
            // Appearance Settings View
            <>
                <View style={styles.settingsHeader}>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                        <TouchableOpacity onPress={() => setSettingsView('main')} style={{padding: 5}}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.settingsTitle}>مظهر القراءة</Text>
                    </View>
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
            </>
        )}

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
bottomBarContent: { flexDirection: 'column', paddingHorizontal: 20, paddingTop: 15, gap: 15 },
topIconsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
circleIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
navigationGroup: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 15 },
navButton: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, gap: 5, justifyContent: 'center' },
prevButton: { backgroundColor: '#1a1a1a' },
nextButton: { backgroundColor: '#fff' },
prevText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
nextText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', alignItems: 'center' },
settingsSheet: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 25, borderTopRightRadius: 25, paddingHorizontal: 20, paddingBottom: 40, alignSelf: 'stretch', minHeight: 400 },
settingsHandle: { width: 40, height: 5, backgroundColor: '#444', borderRadius: 3, alignSelf: 'center', marginVertical: 12 },
settingsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
settingsTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
settingsGrid: { gap: 15 },
settingsCard: { flexDirection: 'column', alignItems: 'center', backgroundColor: '#262626', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#333' },
cardIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
cardTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
cardSub: { color: '#888', fontSize: 12 },
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
drawerContent: { position: 'absolute', top: 0, bottom: 0, width: DRAWER_WIDTH, backgroundColor: '#161616', shadowColor: '#000', shadowOffset: { width: 5, height: 0 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 20 },
drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#2a2a2a', marginBottom: 5 },
drawerTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
sortButton: { padding: 5, backgroundColor: 'rgba(74, 124, 199, 0.1)', borderRadius: 8 },
drawerList: { paddingHorizontal: 10 },
drawerItem: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#222', justifyContent: 'space-between' },
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
androidCommentBtn: { padding: 15, borderRadius: 8, borderWidth: 1, alignItems: 'center', marginBottom: 50 },
// Styles for Replacements & Cleaner
inputContainer: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#333', marginBottom: 10 },
inputRow: { flexDirection: 'column', gap: 10, marginBottom: 15 },
textInput: { backgroundColor: '#222', color: '#fff', borderRadius: 8, padding: 12, textAlign: 'right', fontSize: 14, borderWidth: 1, borderColor: '#333' },
addButton: { backgroundColor: '#4a7cc7', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 8, gap: 8 },
addButtonText: { color: '#fff', fontWeight: 'bold' },
listLabel: { color: '#666', fontSize: 12, textAlign: 'right', marginRight: 15, marginBottom: 10 },
replacementItem: { backgroundColor: '#1a1a1a', borderRadius: 8, padding: 12, marginBottom: 8, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#333' },
replacementInfo: { flex: 1, alignItems: 'flex-end' },
replacementText: { color: '#ddd', fontSize: 14, textAlign: 'right' },
replacementActions: { flexDirection: 'column', gap: 8, paddingRight: 10, borderRightWidth: 1, borderRightColor: '#333' },
actionBtn: { padding: 5 },
emptyText: { color: '#555', textAlign: 'center', marginTop: 50, fontSize: 14 },
alertBox: { backgroundColor: 'rgba(255, 68, 68, 0.1)', borderColor: '#ff4444', borderWidth: 1, borderRadius: 8, padding: 10, flexDirection: 'row-reverse', gap: 10, margin: 15, alignItems: 'center' },
alertText: { color: '#ff4444', fontSize: 12, flex: 1, textAlign: 'right' },
// Modal specific
modalContent: { width: '80%', backgroundColor: '#1a1a1a', borderRadius: 12, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
modalInput: { width: '100%', backgroundColor: '#222', color: '#fff', borderRadius: 8, padding: 12, textAlign: 'right', marginBottom: 20, borderWidth: 1, borderColor: '#333' },
modalButtons: { flexDirection: 'row', gap: 10, width: '100%' },
modalBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
modalBtnText: { color: '#fff', fontWeight: 'bold' },
// Search
searchBar: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#222', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, gap: 5, borderWidth: 1, borderColor: '#333' },
searchInput: { flex: 1, color: '#fff', textAlign: 'right', fontSize: 14 }
});
