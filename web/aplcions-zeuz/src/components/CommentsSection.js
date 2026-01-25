
import React, { useState, useEffect, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  Modal,
  Alert,
  Dimensions,
  Keyboard
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Helper to calculate time ago (Arabic)
const getTimeAgo = (date) => {
  if (!date) return '';
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return `منذ ${Math.floor(interval)} سنة`;
  interval = seconds / 2592000;
  if (interval > 1) return `منذ ${Math.floor(interval)} شهر`;
  interval = seconds / 86400;
  if (interval > 1) return `منذ ${Math.floor(interval)} يوم`;
  interval = seconds / 3600;
  if (interval > 1) return `منذ ${Math.floor(interval)} ساعة`;
  interval = seconds / 60;
  if (interval > 1) return `منذ ${Math.floor(interval)} دقيقة`;
  return 'الآن';
};

// --- Animated Reaction Button Component ---
const ReactionButton = ({ type, count, isSelected, onPress, icon }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePress = () => {
        Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 1.2, duration: 100, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true })
        ]).start();
        onPress(type);
    };

    return (
        <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
            <Animated.View style={[
                styles.reactionItem, 
                isSelected && styles.reactionItemActive,
                { transform: [{ scale: scaleAnim }] }
            ]}>
                <Text style={styles.emoji}>{icon}</Text>
                <Text style={[styles.emojiCount, isSelected && {color: '#4a7cc7'}]}>{count}</Text>
            </Animated.View>
        </TouchableOpacity>
    );
};

// --- Comments Header Component (Novel Reactions) ---
const CommentsHeader = memo(({ 
    stats, 
    totalCount, 
    text, 
    setText, 
    handlePostComment, 
    replyingTo, 
    setReplyingTo,
    sortBy,
    setSortBy,
    onReactionPress,
    showNovelReactions = true,
    isEditing,
    onCancelEdit
}) => {
    return (
        <View>
            {/* Interactive Novel Stats Bar - Only show if enabled */}
            {showNovelReactions && (
            <View style={styles.reactionContainer}>
                <View style={styles.reactionStats}>
                    <Text style={styles.reactionCount}>{stats.total || 0}</Text>
                    <Text style={styles.reactionLabel}>تفاعلات</Text>
                </View>
                <View style={styles.reactionIcons}>
                    <ReactionButton type="like" icon="👍" count={stats.like} isSelected={stats.userReaction === 'like'} onPress={onReactionPress} />
                    <ReactionButton type="love" icon="❤️" count={stats.love} isSelected={stats.userReaction === 'love'} onPress={onReactionPress} />
                    <ReactionButton type="funny" icon="😂" count={stats.funny} isSelected={stats.userReaction === 'funny'} onPress={onReactionPress} />
                    <ReactionButton type="sad" icon="😢" count={stats.sad} isSelected={stats.userReaction === 'sad'} onPress={onReactionPress} />
                    <ReactionButton type="angry" icon="😡" count={stats.angry} isSelected={stats.userReaction === 'angry'} onPress={onReactionPress} />
                </View>
            </View>
            )}

            {/* Input Area */}
            <View style={[styles.inputCard, isEditing && {borderColor: '#4a7cc7', borderWidth: 1}]}>
                <TextInput 
                    style={styles.textInput}
                    placeholder={replyingTo ? `الرد على ${replyingTo.user?.name || 'مستخدم'}...` : "أضف تعليقاً..."}
                    placeholderTextColor="#666"
                    multiline
                    value={text}
                    onChangeText={setText} 
                    textAlign="right" // Forced Right Align
                />
                <View style={styles.inputToolbar}>
                    <TouchableOpacity onPress={handlePostComment} style={styles.postBtn}>
                        <Text style={styles.postBtnText}>{isEditing ? 'حفظ التعديل' : 'نشر التعليق'}</Text>
                        <Ionicons name="send" size={14} color="#fff" style={{marginLeft: 5}} />
                    </TouchableOpacity>
                    
                    <View style={styles.formatTools}>
                        <Ionicons name="text" size={18} color="#666" style={styles.toolIcon} />
                        <Ionicons name="happy-outline" size={18} color="#666" style={styles.toolIcon} />
                        <Ionicons name="at" size={18} color="#666" style={styles.toolIcon} />
                    </View>
                </View>
                {(replyingTo || isEditing) && (
                    <TouchableOpacity 
                        style={styles.cancelReply} 
                        onPress={() => isEditing ? onCancelEdit() : setReplyingTo(null)}
                    >
                        <Text style={{color:'#ff4444', fontSize: 12}}>إلغاء</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Filter Bar */}
            <View style={styles.filterBar}>
                <View style={styles.sortButtons}>
                    {[{id:'newest', l:'الأحدث'}, {id:'best', l:'الأفضل'}, {id:'oldest', l:'الأقدم'}].map(opt => (
                        <TouchableOpacity 
                            key={opt.id} 
                            style={[styles.sortBtn, sortBy === opt.id && styles.sortBtnActive]}
                            onPress={() => setSortBy(opt.id)}
                        >
                            <Text style={[styles.sortBtnText, sortBy === opt.id && {color: '#fff'}]}>{opt.l}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <View style={styles.commentCountBadge}>
                    <Text style={styles.countText}>{totalCount}</Text>
                    <Ionicons name="chatbubble" size={14} color="#4a7cc7" style={{marginLeft: 5}} />
                    <Text style={styles.countLabel}>التعليقات</Text>
                </View>
            </View>
        </View>
    );
});

// --- Comment Item Component ---
const CommentItem = ({ item, onReply, onDelete, onEdit, onLikeAction, onBlockUser, currentUser }) => {
    const navigation = useNavigation();
    const [replies, setReplies] = useState([]);
    const [showReplies, setShowReplies] = useState(false);
    const [loadingReplies, setLoadingReplies] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    
    // Safety check for deleted users
    const user = item.user || { name: 'مستخدم محذوف', _id: 'deleted', picture: null, role: 'user', isCommentBlocked: false };
    
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const menuButtonRef = useRef(null);

    const animateLike = () => {
        Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 1.2, duration: 100, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true })
        ]).start();
    };

    const handleLike = (action) => {
        if (action === 'like') animateLike();
        onLikeAction(item._id, action);
    };

    const fetchReplies = async () => {
        if (item.replyCount === 0) return;
        if (showReplies) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setShowReplies(false);
            return;
        }

        setLoadingReplies(true);
        try {
            const res = await api.get(`/api/comments/${item._id}/replies`);
            setReplies(res.data);
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setShowReplies(true);
        } catch(e) { console.log(e); }
        finally { setLoadingReplies(false); }
    };

    const handleMenuPress = () => {
        if (menuButtonRef.current) {
            menuButtonRef.current.measure((fx, fy, width, height, px, py) => {
                // Calculate position: Below the button, aligned left
                setMenuPosition({ x: px, y: py + height + 5 });
                setMenuVisible(true);
            });
        }
    };

    const isLiked = item.likes.includes(currentUser?._id);
    const isDisliked = item.dislikes.includes(currentUser?._id);
    const isAdmin = currentUser?.role === 'admin';
    const isOwner = user._id === currentUser?._id;

    // --- Context Menu Actions ---
    const handleReport = () => {
        setMenuVisible(false);
        Alert.alert("تم الإبلاغ", "شكراً لك، سنقوم بمراجعة التعليق.");
    };

    const handleBlock = () => {
        setMenuVisible(false);
        onBlockUser(user._id, user.name);
    };

    return (
        <View style={styles.commentRow}>
            {/* Avatar - Navigates to Profile */}
            <TouchableOpacity onPress={() => user._id !== 'deleted' && navigation.push('UserProfile', { userId: user._id })}>
                <Image 
                    source={user.picture ? { uri: user.picture } : require('../../assets/adaptive-icon.png')} 
                    style={styles.avatar} 
                    contentFit="cover"
                />
            </TouchableOpacity>
            
            <View style={styles.commentBody}>
                {/* Header: Name + Time */}
                <View style={styles.commentHeader}>
                    <Text style={[styles.userName, user._id === 'deleted' && {color: '#888', fontStyle: 'italic'}]}>
                        {user.name}
                    </Text>
                    {user.role === 'admin' && <View style={styles.adminBadge}><Text style={styles.adminText}>Admin</Text></View>}
                    {user.isCommentBlocked && <View style={styles.blockedBadge}><Text style={styles.adminText}>محظور</Text></View>}
                    <Text style={styles.timeText}>{getTimeAgo(item.createdAt)}</Text>
                </View>

                {/* Content */}
                <Text style={styles.commentContent}>{item.content}</Text>
                
                {/* Edited Label */}
                {item.isEdited && (
                    <Text style={styles.editedLabel}>(تم تعديله)</Text>
                )}

                {/* Actions Bar */}
                <View style={styles.actionsBar}>
                    {/* Context Menu Trigger (Three Dots) - Now the LAST child because of row-reverse? No, visually Left means last in RTL? 
                        Let's keep it simple: row-reverse makes the first child appear on the RIGHT. 
                        To make it appear on the LEFT, it should be the LAST child in the list. 
                    */}
                    
                    <TouchableOpacity onPress={() => handleLike('like')} style={styles.actionBtn}>
                        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                            <Ionicons name={isLiked ? "thumbs-up" : "thumbs-up-outline"} size={16} color={isLiked ? "#4a7cc7" : "#888"} />
                        </Animated.View>
                        <Text style={[styles.actionText, isLiked && {color: '#4a7cc7'}]}>{item.likes.length || 0}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleLike('dislike')} style={styles.actionBtn}>
                        <Ionicons name={isDisliked ? "thumbs-down" : "thumbs-down-outline"} size={16} color={isDisliked ? "#ff4444" : "#888"} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => onReply(item)} style={styles.replyBtn}>
                        <Text style={styles.replyText}>رد</Text>
                    </TouchableOpacity>

                    {/* Dots on the LEFT (Last child in row-reverse = Leftmost visually) */}
                    <TouchableOpacity 
                        ref={menuButtonRef}
                        onPress={handleMenuPress} 
                        style={styles.menuTrigger}
                    >
                        <Ionicons name="ellipsis-horizontal" size={16} color="#666" />
                    </TouchableOpacity>
                </View>

                {/* Replies Toggle */}
                {(item.replyCount > 0 || replies.length > 0) && (
                    <TouchableOpacity style={styles.viewRepliesBtn} onPress={fetchReplies}>
                        <View style={styles.replyLine} />
                        <Text style={styles.viewRepliesText}>
                            {showReplies ? 'إخفاء الردود' : `عرض ${item.replyCount} ردود`}
                        </Text>
                    </TouchableOpacity>
                )}

                {/* Nested Replies */}
                {showReplies && (
                    <View style={styles.repliesContainer}>
                        {loadingReplies ? <ActivityIndicator size="small" color="#4a7cc7" /> : 
                            replies.map(reply => (
                                <CommentItem 
                                    key={reply._id} 
                                    item={reply} 
                                    onReply={onReply} 
                                    onDelete={onDelete} 
                                    onEdit={onEdit}
                                    onLikeAction={onLikeAction} 
                                    onBlockUser={onBlockUser}
                                    currentUser={currentUser} 
                                />
                            ))
                        }
                    </View>
                )}
            </View>

            {/* Dropdown Menu Modal */}
            <Modal transparent visible={menuVisible} animationType="fade" onRequestClose={() => setMenuVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
                    <View style={[styles.popoverMenu, { top: menuPosition.y, left: menuPosition.x }]}>
                        {/* Little Triangle Pointer */}
                        <View style={styles.menuArrow} />
                        
                        {/* Edit Option (Owner only) */}
                        {isOwner && (
                            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); onEdit(item); }}>
                                <Text style={styles.menuText}>تعديل</Text>
                                <Ionicons name="create-outline" size={18} color="#fff" />
                            </TouchableOpacity>
                        )}

                        {/* Delete Option (Admin or Owner) */}
                        {(isAdmin || isOwner) && (
                            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); onDelete(item._id); }}>
                                <Text style={[styles.menuText, {color: '#ff4444'}]}>حذف</Text>
                                <Ionicons name="trash-outline" size={18} color="#ff4444" />
                            </TouchableOpacity>
                        )}
                        
                        <TouchableOpacity style={styles.menuItem} onPress={handleReport}>
                            <Text style={styles.menuText}>إبلاغ</Text>
                            <Ionicons name="flag-outline" size={18} color="#fff" />
                        </TouchableOpacity>

                        {/* Admin Block Option */}
                        {isAdmin && !isOwner && user._id !== 'deleted' && (
                            <>
                                <TouchableOpacity style={styles.menuItem} onPress={handleBlock}>
                                    <Text style={[styles.menuText, {color: '#ff4444'}]}>
                                        {user.isCommentBlocked ? 'فك حظر التعليق' : 'حظر من التعليق'}
                                    </Text>
                                    <Ionicons name="ban-outline" size={18} color="#ff4444" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.menuItem} onPress={() => setMenuVisible(false)}>
                                    <Text style={[styles.menuText, {color: '#ff4444'}]}>تثبيت</Text>
                                    <Ionicons name="pin-outline" size={18} color="#ff4444" />
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

// --- Main Component ---
export default function CommentsSection({ novelId, user, chapterNumber = null }) {
    const { showToast } = useToast();
    const [comments, setComments] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [stats, setStats] = useState({}); 
    const [loading, setLoading] = useState(true);
    const [text, setText] = useState('');
    const [replyingTo, setReplyingTo] = useState(null); 
    const [sortBy, setSortBy] = useState('newest'); 
    
    // Edit State
    const [editingCommentId, setEditingCommentId] = useState(null);

    // Pagination
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        fetchComments(true);
    }, [novelId, sortBy, chapterNumber]);

    const fetchComments = async (reset = false) => {
        if (reset) {
            setLoading(true);
            setPage(1);
        } else {
            setLoadingMore(true);
        }

        try {
            const currentPage = reset ? 1 : page;
            const queryParams = new URLSearchParams({
                sort: sortBy,
                page: currentPage,
                limit: 10
            });
            if (chapterNumber !== null && chapterNumber !== undefined) {
                queryParams.append('chapterNumber', chapterNumber);
            }

            const res = await api.get(`/api/novels/${novelId}/comments?${queryParams.toString()}`);
            
            if (reset) {
                setComments(res.data.comments);
                setStats(res.data.stats || {}); 
            } else {
                setComments(prev => [...prev, ...res.data.comments]);
            }
            
            setTotalCount(res.data.totalComments);
            setHasMore(res.data.comments.length === 10);
            if (!reset) setPage(p => p + 1);
            else setPage(2); 

        } catch (e) {
            console.log("Comments error", e);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handlePostComment = async () => {
        if (!text.trim()) return;
        if (!user) {
            showToast("يجب تسجيل الدخول أولاً", "error");
            return;
        }

        try {
            if (editingCommentId) {
                // EDIT MODE
                const res = await api.put(`/api/comments/${editingCommentId}`, { content: text });
                
                // Update local list
                setComments(prev => prev.map(c => c._id === editingCommentId ? res.data : c));
                showToast("تم تعديل التعليق", "success");
                
                // Reset
                setEditingCommentId(null);
                setText('');
                Keyboard.dismiss();
            } else {
                // CREATE MODE
                const res = await api.post('/api/comments', {
                    novelId,
                    content: text,
                    parentId: replyingTo ? replyingTo._id : null,
                    chapterNumber: chapterNumber
                });

                if (replyingTo) {
                    showToast("تم إضافة الرد", "success");
                    fetchComments(true);
                } else {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setComments([res.data, ...comments]);
                    setTotalCount(c => c + 1);
                }

                setText('');
                setReplyingTo(null);
                Keyboard.dismiss();
            }
        } catch (e) {
            const msg = e.response?.data?.message || "فشل العملية";
            showToast(msg, "error");
        }
    };

    const handleLikeAction = async (commentId, action) => {
        if (!user) return; 
        
        setComments(prev => prev.map(c => {
            if (c._id === commentId) {
                let newLikes = [...c.likes];
                let newDislikes = [...c.dislikes];
                const userId = user._id;

                if (action === 'like') {
                    newDislikes = newDislikes.filter(id => id !== userId);
                    if (newLikes.includes(userId)) newLikes = newLikes.filter(id => id !== userId);
                    else newLikes.push(userId);
                } else {
                    newLikes = newLikes.filter(id => id !== userId);
                    if (newDislikes.includes(userId)) newDislikes = newDislikes.filter(id => id !== userId);
                    else newDislikes.push(userId);
                }
                return { ...c, likes: newLikes, dislikes: newDislikes };
            }
            return c;
        }));

        try {
            await api.post(`/api/comments/${commentId}/action`, { action });
        } catch (e) {
            console.log("Action failed");
        }
    };

    const handleDelete = async (commentId) => {
        try {
            await api.delete(`/api/comments/${commentId}`);
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setComments(prev => prev.filter(c => c._id !== commentId));
            setTotalCount(c => c - 1);
            showToast("تم الحذف", "info");
        } catch (e) {
            showToast("فشل الحذف", "error");
        }
    };

    const handleEdit = (comment) => {
        setEditingCommentId(comment._id);
        setText(comment.content);
        setReplyingTo(null); // Cancel reply if active
        // Ideally scroll to input
    };

    const handleCancelEdit = () => {
        setEditingCommentId(null);
        setText('');
    };

    const handleNovelReaction = async (type) => {
        if (!user) { showToast("سجل دخول للتفاعل", "error"); return; }
        
        try {
            const res = await api.post(`/api/novels/${novelId}/react`, { type });
            setStats(prev => ({
                ...prev,
                ...res.data,
                total: res.data.like + res.data.love + res.data.funny + res.data.sad + res.data.angry
            }));
        } catch (e) {
            console.log(e);
        }
    };

    const handleBlockUser = async (userId, userName) => {
        Alert.alert(
            "حظر التعليق",
            `هل تريد منع ${userName} من التعليق في جميع الروايات؟`,
            [
                { text: "إلغاء", style: "cancel" },
                { 
                    text: "حظر", 
                    style: "destructive", 
                    onPress: async () => {
                        try {
                            await api.put(`/api/admin/users/${userId}/block-comment`, { block: true });
                            showToast(`تم حظر ${userName} من التعليق`, "success");
                            fetchComments(true); 
                        } catch (e) {
                            showToast("فشل الحظر", "error");
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={comments}
                keyExtractor={item => item._id}
                renderItem={({item}) => (
                    <CommentItem 
                        item={item} 
                        currentUser={user}
                        onReply={setReplyingTo}
                        onDelete={handleDelete}
                        onEdit={handleEdit}
                        onLikeAction={handleLikeAction}
                        onBlockUser={handleBlockUser}
                    />
                )}
                ListHeaderComponent={
                    <CommentsHeader 
                        stats={stats}
                        totalCount={totalCount}
                        text={text}
                        setText={setText}
                        handlePostComment={handlePostComment}
                        replyingTo={replyingTo}
                        setReplyingTo={setReplyingTo}
                        sortBy={sortBy}
                        setSortBy={setSortBy}
                        onReactionPress={handleNovelReaction}
                        showNovelReactions={!chapterNumber}
                        isEditing={!!editingCommentId}
                        onCancelEdit={handleCancelEdit}
                    />
                }
                ListFooterComponent={() => (
                    hasMore ? (
                        <TouchableOpacity style={styles.loadMoreBtn} onPress={() => fetchComments(false)} disabled={loadingMore}>
                            {loadingMore ? <ActivityIndicator color="#fff" /> : <Text style={styles.loadMoreText}>عرض المزيد من التعليقات</Text>}
                        </TouchableOpacity>
                    ) : (
                        <View style={{height: 50}} />
                    )
                )}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
        paddingTop: 20
    },
    listContent: {
        paddingHorizontal: 15,
        paddingBottom: 50
    },
    
    // Reaction Bar
    reactionContainer: {
        backgroundColor: '#161616',
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        flexDirection: 'column',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#222'
    },
    reactionStats: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10
    },
    reactionCount: { color: '#4a7cc7', fontSize: 16, fontWeight: 'bold', marginRight: 5 },
    reactionLabel: { color: '#888', fontSize: 14 },
    reactionIcons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginTop: 5
    },
    reactionItem: { alignItems: 'center', backgroundColor: '#222', borderRadius: 12, paddingVertical: 5, paddingHorizontal: 10, minWidth: 50 },
    reactionItemActive: { backgroundColor: 'rgba(74, 124, 199, 0.2)', borderWidth: 1, borderColor: '#4a7cc7' },
    emoji: { fontSize: 20, marginBottom: 2 },
    emojiCount: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

    // Input Card
    inputCard: {
        backgroundColor: '#161616',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333',
        marginBottom: 20,
        padding: 10
    },
    textInput: {
        color: '#fff',
        minHeight: 80,
        textAlignVertical: 'top',
        fontSize: 14,
        marginBottom: 10,
        textAlign: 'right' // Force Right Align
    },
    inputToolbar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#222',
        paddingTop: 10
    },
    postBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#333',
        paddingHorizontal: 15,
        paddingVertical: 6,
        borderRadius: 6
    },
    postBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    formatTools: { flexDirection: 'row', gap: 15 },
    toolIcon: { opacity: 0.7 },
    cancelReply: { position: 'absolute', top: 10, left: 10 },

    // Filter Bar
    filterBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#222',
        paddingBottom: 10
    },
    sortButtons: { flexDirection: 'row', gap: 8 },
    sortBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: '#1a1a1a',
        borderWidth: 1,
        borderColor: '#333'
    },
    sortBtnActive: {
        backgroundColor: '#4a7cc7', 
        borderColor: '#4a7cc7'
    },
    sortBtnText: { color: '#888', fontSize: 12 },
    commentCountBadge: { flexDirection: 'row', alignItems: 'center' },
    countText: { color: '#4a7cc7', fontSize: 14, fontWeight: 'bold' },
    countLabel: { color: '#fff', fontSize: 14, marginLeft: 5, fontWeight: 'bold' },

    // Comment Item
    commentRow: {
        flexDirection: 'row-reverse', 
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#1a1a1a',
        paddingBottom: 15
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginLeft: 10,
        backgroundColor: '#333',
        borderWidth: 1,
        borderColor: '#444'
    },
    commentBody: { flex: 1 },
    commentHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: 5,
        justifyContent: 'flex-start'
    },
    userName: { color: '#fff', fontSize: 13, fontWeight: 'bold', marginLeft: 8 },
    adminBadge: { backgroundColor: '#4a7cc7', paddingHorizontal: 4, borderRadius: 3, marginLeft: 5 },
    blockedBadge: { backgroundColor: '#222', borderWidth: 1, borderColor: '#ff4444', paddingHorizontal: 4, borderRadius: 3, marginLeft: 5 },
    adminText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
    timeText: { color: '#666', fontSize: 10 },
    commentContent: { color: '#ccc', fontSize: 14, lineHeight: 22, textAlign: 'right', marginBottom: 5 },
    
    editedLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, textAlign: 'right', marginBottom: 10, fontStyle: 'italic' },

    actionsBar: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 15
    },
    actionBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, padding: 5, borderRadius: 4, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#222', minWidth: 40, justifyContent: 'center' },
    actionText: { color: '#888', fontSize: 11 },
    replyBtn: { paddingHorizontal: 10, paddingVertical: 4 },
    replyText: { color: '#888', fontSize: 12 },
    menuTrigger: { padding: 5 },

    // Popover Menu (Styled Dropdown)
    modalOverlay: {
        flex: 1,
        backgroundColor: 'transparent', // Transparent to see behind
    },
    popoverMenu: {
        position: 'absolute',
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333',
        padding: 5,
        width: 180,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 10,
        zIndex: 9999
    },
    menuArrow: {
        position: 'absolute',
        top: -8,
        left: 10, // Align with dots roughly
        width: 0, 
        height: 0, 
        borderLeftWidth: 8,
        borderRightWidth: 8,
        borderBottomWidth: 8,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: '#333', // Match border color
    },
    menuItem: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#222',
        gap: 10
    },
    menuText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600'
    },

    // Replies
    viewRepliesBtn: { flexDirection: 'row-reverse', alignItems: 'center', marginTop: 10 },
    replyLine: { width: 30, height: 1, backgroundColor: '#333', marginLeft: 10 },
    viewRepliesText: { color: '#4a7cc7', fontSize: 12 },
    repliesContainer: { marginTop: 10, paddingRight: 10, borderRightWidth: 2, borderRightColor: '#222' },

    // Load More
    loadMoreBtn: {
        alignSelf: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#444',
        borderRadius: 8,
        marginTop: 10
    },
    loadMoreText: { color: '#888', fontSize: 12 }
});
