import React, { useState, useMemo } from 'react';
import { 
  StyleSheet, View, Text, Modal, TouchableOpacity, ScrollView, 
   Alert, Share, Dimensions, KeyboardAvoidingView, Platform 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TextInput } from '@/components/ui/TextInput';
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useAppStore, Post } from '@/store/useAppStore';
import { getFormattedPostTime } from '@/utils/timeFormat';
import { PdfViewerModal } from './PdfViewerModal';
import { CIVIL_SYLLABUS_DETAILED, SubjectDetail } from '@/data/syllabus';
import { useThemeColors } from '@/hooks/useThemeColors';

const { width, height } = Dimensions.get('window');

interface NotepadModalProps {
  isEmbedded?: boolean;
  visible: boolean;
  onClose: () => void;
}

export function NotepadModal({ visible, onClose, isEmbedded }: NotepadModalProps) {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const storeNotes = useAppStore(state => state.localNotes);
  const storeBookmarks = useAppStore(state => state.bookmarkedSubjects);
  const storePosts = useAppStore(state => state.posts);
  const bookmarkedPostIds = useAppStore(state => state.bookmarkedPostIds) || [];
  const savedMaterials = useAppStore(state => state.savedMaterials) || [];
  const savedNotices = useAppStore(state => state.savedNotices) || [];
  
  const addLocalNote = useAppStore(state => state.addLocalNote);
  const updateLocalNote = useAppStore(state => state.updateLocalNote);
  const deleteLocalNote = useAppStore(state => state.deleteLocalNote);
  const toggleSubjectBookmark = useAppStore(state => state.toggleSubjectBookmark);
  const togglePostBookmark = useAppStore(state => state.togglePostBookmark);
  const toggleMaterialBookmark = useAppStore(state => state.toggleMaterialBookmark);
  const toggleNoticeBookmark = useAppStore(state => state.toggleNoticeBookmark);

  // Modal active tabs: 'notepad' | 'saved'
  const [activeTab, setActiveTab] = useState<'notepad' | 'saved'>('notepad');

  // Multi-select state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Universal Search Query State
  const [searchQuery, setSearchQuery] = useState('');

  // Notes editor states
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

  // Local PDF Viewer State
  const [activePdfUrl, setActivePdfUrl] = useState('');
  const [activePdfTitle, setActivePdfTitle] = useState('');
  const [isPdfVisible, setIsPdfVisible] = useState(false);
  const [activePdfMaterial, setActivePdfMaterial] = useState<any>(null);

  // Expand states for saved coursework details
  const [expandedSavedSubjects, setExpandedSavedSubjects] = useState<Record<string, boolean>>({});

  // Filter bookmarked posts from store
  const savedPosts = useMemo(() => {
    return storePosts.filter(post => bookmarkedPostIds.includes(post.id));
  }, [storePosts, bookmarkedPostIds]);

  // Helper to query syllabus database by subject name
  const findSubjectByName = (name: string): (SubjectDetail & { semester: string }) | null => {
    for (const sem of CIVIL_SYLLABUS_DETAILED) {
      const sub = sem.subjects.find(s => s.name === name);
      if (sub) return { ...sub, semester: sem.semester };
    }
    return null;
  };

  // Notes filter selector based on search query
  const filteredNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return storeNotes;
    return storeNotes.filter(note => 
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query)
    );
  }, [storeNotes, searchQuery]);

  // Saved syllabus subjects filter selector based on search query
  const filteredSubjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return storeBookmarks;
    return storeBookmarks.filter(subName => {
      const details = findSubjectByName(subName);
      if (!details) return subName.toLowerCase().includes(query);
      return (
        details.name.toLowerCase().includes(query) ||
        details.code.toLowerCase().includes(query) ||
        details.description.toLowerCase().includes(query) ||
        (details.semester && details.semester.toLowerCase().includes(query))
      );
    });
  }, [storeBookmarks, searchQuery]);

  // Saved community feed posts filter selector based on search query
  const filteredPosts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return savedPosts;
    return savedPosts.filter(post => 
      (post.title && post.title.toLowerCase().includes(query)) ||
      (post.content && post.content.toLowerCase().includes(query)) ||
      (post.authorName && post.authorName.toLowerCase().includes(query)) ||
      (post.category && post.category.toLowerCase().includes(query))
    );
  }, [savedPosts, searchQuery]);

  // Saved study materials filter selector based on search query
  const filteredMaterials = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return savedMaterials;
    return savedMaterials.filter(item => 
      (item.title && item.title.toLowerCase().includes(query)) ||
      (item.branch && item.branch.toLowerCase().includes(query)) ||
      (item.semester && item.semester.toLowerCase().includes(query)) ||
      (item.subject && item.subject.toLowerCase().includes(query)) ||
      (item.materialType && item.materialType.toLowerCase().includes(query))
    );
  }, [savedMaterials, searchQuery]);

  // Saved notices filter selector
  const filteredNotices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return savedNotices;
    return savedNotices.filter(notice => 
      (notice.text && notice.text.toLowerCase().includes(query)) ||
      (notice.authorName && notice.authorName.toLowerCase().includes(query))
    );
  }, [savedNotices, searchQuery]);

  const totalSavedCount = storeBookmarks.length + bookmarkedPostIds.length + savedMaterials.length + savedNotices.length;

  const handleOpenAddNote = () => {
    setEditingNoteId(null);
    setNoteTitle('');
    setNoteContent('');
    setIsEditingNote(true);
  };

  const handleOpenEditNote = (note: { id: string; title: string; content: string }) => {
    setEditingNoteId(note.id);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setIsEditingNote(true);
  };

  const handleSaveNote = async () => {
    if (!noteContent.trim()) {
      Alert.alert('Empty Note', 'Please enter some text in the note content!');
      return;
    }

    try {
      const isEdit = !!editingNoteId;
      if (editingNoteId) {
        await updateLocalNote(editingNoteId, noteTitle, noteContent);
      } else {
        await addLocalNote(noteTitle, noteContent);
      }
      setIsEditingNote(false);
      setEditingNoteId(null);
      setNoteTitle('');
      setNoteContent('');
      setSearchQuery('');
      useAppStore.getState().showToast(isEdit ? 'Note updated successfully! 📝' : 'Note created successfully! 📝', 'success');
    } catch (e) {
      Alert.alert('Error', 'Failed to save note.');
    }
  };

  const handleDeleteNote = (id: string, title: string) => {
    Alert.alert(
      'Delete Note',
      `Are you sure you want to delete "${title || 'Untitled Note'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteLocalNote(id)
        }
      ]
    );
  };

  const handleShareNote = async (note: { title: string; content: string; date: string }) => {
    try {
      await Share.share({
        message: `${note.title || 'Untitled Note'} (${note.date})\n\n${note.content}\n\nDownload App: MCE Motihari connect
https://play.google.com/store/apps/details?id=mcemotihari.app`,
        title: note.title || 'MCE Personal Note',
      });
    } catch (error) {
      Alert.alert('Share failed', 'Unable to share note.');
    }
  };

  const handleDeleteSelected = () => {
    if (selectedItems.length === 0) return;

    Alert.alert(
      'Delete Selected Items',
      'Are you sure you want to permanently delete these items? This action cannot be undone and items will be deleted from the database.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            selectedItems.forEach(itemKey => {
              if (itemKey.startsWith('note-')) {
                deleteLocalNote(itemKey.replace('note-', ''));
              } else if (itemKey.startsWith('subject-')) {
                toggleSubjectBookmark(itemKey.replace('subject-', ''));
              } else if (itemKey.startsWith('material-')) {
                const matId = itemKey.replace('material-', '');
                const mat = savedMaterials.find(m => String(m.id) === matId || m.fileUrl === matId);
                if (mat) toggleMaterialBookmark(mat);
              } else if (itemKey.startsWith('post-')) {
                togglePostBookmark(itemKey.replace('post-', ''));
              } else if (itemKey.startsWith('notice-')) {
                const noticeId = itemKey.replace('notice-', '');
                const notice = savedNotices.find(n => String(n.id) === noticeId);
                if (notice) toggleNoticeBookmark(notice);
              }
            });
            setIsSelectMode(false);
            setSelectedItems([]);
            useAppStore.getState().showToast('Selected items permanently deleted', 'success');
          }
        }
      ]
    );
  };

  const toggleSelection = (key: string) => {
    setSelectedItems(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleShareSubject = async (subject: SubjectDetail) => {
    try {
      await Share.share({
        message: `MCE Motihari Syllabus - ${subject.name} (Code: ${subject.code}, Credits: ${subject.credits})\nModules:\n${subject.modules.map((m, i) => `${i + 1}. ${m}`).join('\n')}\n\nDownload App: MCE Motihari connect
https://play.google.com/store/apps/details?id=mcemotihari.app`,
        title: `${subject.name} Syllabus Details`,
      });
    } catch (error) {
      Alert.alert('Share failed', 'Unable to share syllabus details.');
    }
  };

  const handleSharePost = async (post: Post) => {
    try {
      await Share.share({
        message: `${post.title || 'MCE Connect Saved Post'}\n\nShared by ${post.authorName}\n\n${post.content}\n\nDownload App: MCE Motihari connect
https://play.google.com/store/apps/details?id=mcemotihari.app`,
        title: post.title || 'MCE Connect Saved Post',
      });
    } catch (error) {
      Alert.alert('Share failed', 'Unable to share post.');
    }
  };

  const toggleExpandSaved = (name: string) => {
    setExpandedSavedSubjects(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  
  const mainContent = (
    <View style={[isEmbedded ? { flex: 1 } : styles.bottomSheet, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
      {!isEmbedded && <View style={[styles.sheetHandle, { backgroundColor: theme.cardBorder }]} />}

          
          {/* Header */}
          <View style={[styles.sheetHeader, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder, paddingTop: isEmbedded ? Math.max(16, insets.top) : 0 }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.hubIconContainer, { backgroundColor: theme.isDark ? 'rgba(249, 115, 22, 0.12)' : '#FFF7ED' }]}>
                <Ionicons name="journal-sharp" size={20} color="#F97316" />
              </View>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>Academic Notepad & Hub</Text>
            </View>
            <View style={styles.headerRightRow}>
              <TouchableOpacity 
                onPress={() => {
                  if (isSelectMode) {
                    setIsSelectMode(false);
                    setSelectedItems([]);
                  } else {
                    setIsSelectMode(true);
                  }
                }}
                style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: isSelectMode ? theme.cardBorder : 'transparent', borderRadius: 16 }}
              >
                <Text style={{ color: isSelectMode ? theme.text : '#F97316', fontSize: 13, fontWeight: '700' }}>
                  {isSelectMode ? 'Cancel' : 'Select'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.closeBtn} activeOpacity={0.6}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
          >

          {/* Privacy Disclaimer Banner */}
          <View style={[styles.privacyBanner, { backgroundColor: theme.isDark ? 'rgba(22, 163, 74, 0.12)' : '#F0FDF4', borderColor: theme.isDark ? 'rgba(22, 163, 74, 0.2)' : '#DCFCE7' }]}>
            <Ionicons name="lock-closed" size={16} color="#16A34A" style={styles.shieldIcon} />
            <Text style={[styles.privacyBannerText, { color: theme.isDark ? '#4ADE80' : '#166534' }]}>
              🔒 <Text style={{ fontWeight: 'bold' }}>E2E Encrypted Cloud Sync:</Text> Your vault data is encrypted and synced to the cloud. Even developers cannot read it.
            </Text>
          </View>

          {/* Interactive Navigation Tabs */}
          <View style={[styles.tabBar, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'notepad' && styles.tabButtonActive, activeTab === 'notepad' && { borderBottomColor: theme.accent }]}
              onPress={() => {
                setActiveTab('notepad');
                setIsEditingNote(false);
                setIsSelectMode(false);
                setSelectedItems([]);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="document-text" size={18} color={activeTab === 'notepad' ? '#F97316' : theme.textSecondary} />
              <Text style={[styles.tabButtonText, { color: theme.textSecondary }, activeTab === 'notepad' && styles.tabButtonTextActive]}>
                My Notepad ({storeNotes.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'saved' && styles.tabButtonActive, activeTab === 'saved' && { borderBottomColor: theme.accent }]}
              onPress={() => {
                setActiveTab('saved');
                setIsEditingNote(false);
                setIsSelectMode(false);
                setSelectedItems([]);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="star" size={18} color={activeTab === 'saved' ? '#F97316' : theme.textSecondary} />
              <Text style={[styles.tabButtonText, { color: theme.textSecondary }, activeTab === 'saved' && styles.tabButtonTextActive]}>
                Saved Hub ({totalSavedCount})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Universal Premium Search Bar (shown only when not editing notes) */}
          {!isEditingNote && (
            <View style={[styles.searchBarContainer, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
              <View style={[styles.searchBar, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
                <Ionicons name="search" size={16} color="#94A3B8" style={styles.searchIcon} />
                <TextInput
                  style={[styles.searchInput, { color: theme.text }]}
                  placeholder={activeTab === 'notepad' ? "Search notepad notes..." : "Search saved coursework & posts..."}
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  clearButtonMode="while-editing"
                 autoCapitalize="sentences" />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                    <Ionicons name="close-circle" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Core Body Scroll Container */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            
            {activeTab === 'notepad' ? (
              // ─────────────────── TAB 1: NOTEPAD ───────────────────
              <View style={styles.notepadContainer}>
                
                {isEditingNote ? (
                  // Inline Note Editor
                  <View style={[styles.noteEditorCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
                    <Text style={[styles.editorCardTitle, { color: theme.text }]}>
                      {editingNoteId ? '✏️ Edit Note' : '📝 Create New Note'}
                    </Text>
                    <TextInput
                      style={[styles.editorTitleInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.cardBorder }]}
                      placeholder="Note Title (Optional)"
                      placeholderTextColor="#94A3B8"
                      value={noteTitle}
                      onChangeText={setNoteTitle}
                     autoCapitalize="sentences" />
                    <TextInput
                      style={[styles.editorContentInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.cardBorder }]}
                      placeholder="Type your notes here... credentials, schedules, or checklists..."
                      placeholderTextColor="#94A3B8"
                      multiline
                      value={noteContent}
                      onChangeText={setNoteContent}
                      textAlignVertical="top"
                     autoCapitalize="sentences" />
                    <View style={styles.editorActionsRow}>
                      <TouchableOpacity 
                        style={[styles.cancelEditorBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
                        onPress={() => setIsEditingNote(false)}
                      >
                        <Text style={[styles.cancelEditorBtnText, { color: theme.textSecondary }]}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.saveEditorBtn}
                        onPress={handleSaveNote}
                      >
                        <Text style={styles.saveEditorBtnText}>Save offline</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  // Notes list
                  <View>
                    <TouchableOpacity 
                      style={styles.addNoteBtn} 
                      onPress={handleOpenAddNote}
                      activeOpacity={0.9}
                    >
                      <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                      <Text style={styles.addNoteBtnText}>Write a New Note</Text>
                    </TouchableOpacity>

                    {filteredNotes.length > 0 ? (
                      <View style={styles.notesList}>
                        {filteredNotes.map(note => {
                          const isSelected = selectedItems.includes(`note-${note.id}`);
                          return (
                          <TouchableOpacity 
                            key={note.id} 
                            style={[
                              styles.noteItemCard, 
                              { backgroundColor: isSelected ? (theme.isDark ? 'rgba(249, 115, 22, 0.15)' : '#FFF7ED') : theme.backgroundElement, 
                                borderColor: isSelected ? '#F97316' : theme.cardBorder }
                            ]}
                            activeOpacity={isSelectMode ? 0.7 : 1}
                            onPress={() => isSelectMode && toggleSelection(`note-${note.id}`)}
                          >
                            {isSelectMode && (
                              <View style={[styles.checkboxOverlay, { borderColor: isSelected ? '#F97316' : theme.textSecondary, backgroundColor: isSelected ? '#F97316' : 'transparent' }]}>
                                {isSelected && <Ionicons name="checkmark" size={12} color="#FFF" />}
                              </View>
                            )}
                            <View style={[styles.noteItemHeader, { borderBottomColor: theme.cardBorder }]}>
                              <Text style={[styles.noteItemTitle, { color: theme.text, marginLeft: isSelectMode ? 24 : 0 }]} numberOfLines={1}>
                                {note.title || 'Untitled Note'}
                              </Text>
                              <Text style={styles.noteItemDate}>{note.date}</Text>
                            </View>
                            
                            <Text style={[styles.noteItemBody, { color: theme.textSecondary }]} numberOfLines={3}>
                              {note.content}
                            </Text>

                            {!isSelectMode && (
                              <View style={[styles.noteItemActionsRow, { borderTopColor: theme.cardBorder }]}>
                                <TouchableOpacity 
                                  style={styles.noteActionIconBtn}
                                  onPress={() => handleOpenEditNote(note)}
                                >
                                  <Ionicons name="pencil" size={14} color={theme.textSecondary} />
                                  <Text style={[styles.noteActionLabel, { color: theme.textSecondary }]}>Edit</Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                  style={styles.noteActionIconBtn}
                                  onPress={() => handleShareNote(note)}
                                >
                                  <Ionicons name="share-social-outline" size={14} color={theme.textSecondary} />
                                  <Text style={[styles.noteActionLabel, { color: theme.textSecondary }]}>Share</Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                  style={[styles.noteActionIconBtn, { marginLeft: 'auto' }]}
                                  onPress={() => handleDeleteNote(note.id, note.title)}
                                >
                                  <Ionicons name="trash-outline" size={14} color="#EF4444" />
                                  <Text style={[styles.noteActionLabel, { color: '#EF4444' }]}>Delete</Text>
                                </TouchableOpacity>
                              </View>
                            )}
                          </TouchableOpacity>
                        )})}
                      </View>
                    ) : (
                      <View style={styles.emptyContainer}>
                        <View style={[styles.emptyIconFrame, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
                          <Ionicons name="document-text-outline" size={40} color={theme.isDark ? '#475569' : '#CBD5E1'} />
                        </View>
                        <Text style={[styles.emptyText, { color: theme.text }]}>
                          {searchQuery ? "No matching notes found" : "Notepad is empty"}
                        </Text>
                        <Text style={[styles.emptySubText, { color: theme.textSecondary }]}>
                          {searchQuery 
                            ? "Try searching for a different keyword or character."
                            : "Use this local scratchpad to scribble notes, exam dates, syllabus summaries, or placement guidelines."}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ) : (
              // ─────────────────── TAB 2: SAVED SYLLABUS & POSTS ───────────────────
              <View style={styles.savedContainer}>
                {filteredSubjects.length === 0 && filteredPosts.length === 0 && filteredMaterials.length === 0 && filteredNotices.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <View style={[styles.emptyIconFrame, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
                      <Ionicons name="star-outline" size={40} color={theme.isDark ? '#475569' : '#CBD5E1'} />
                    </View>
                    <Text style={[styles.emptyText, { color: theme.text }]}>
                      {searchQuery ? "No bookmarks found" : "No saved items"}
                    </Text>
                    <Text style={[styles.emptySubText, { color: theme.textSecondary }]}>
                      {searchQuery
                        ? "Try searching for another coursework code, library document, or feed content keyword."
                        : "Syllabus bookmarks, saved library study materials, and community posts will appear in this tab."}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.savedList}>
                    
                    {/* SECTION 1: SYLLABUS COURSEWORK BOOKMARKS */}
                    {filteredSubjects.length > 0 && (
                      <View style={styles.savedSection}>
                        <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>📚 SAVED COURSEWORK ({filteredSubjects.length})</Text>
                        
                        {filteredSubjects.map((subName, index) => {
                          const subjectDetails = findSubjectByName(subName);
                          const isExpanded = !!expandedSavedSubjects[subName];
                          const itemKey = `subject-${subName}`;
                          const isSelected = selectedItems.includes(itemKey);

                          if (!subjectDetails) {
                            return (
                              <TouchableOpacity 
                                key={`fallback-${index}`} 
                                style={[styles.savedFallbackItem, { 
                                  backgroundColor: isSelected ? (theme.isDark ? 'rgba(249, 115, 22, 0.15)' : '#FFF7ED') : theme.backgroundElement, 
                                  borderColor: isSelected ? '#F97316' : theme.cardBorder 
                                }]}
                                onPress={() => isSelectMode && toggleSelection(itemKey)}
                                activeOpacity={isSelectMode ? 0.7 : 1}
                              >
                                {isSelectMode && (
                                  <View style={[styles.checkboxOverlay, { position: 'relative', top: 0, left: 0, marginRight: 8, borderColor: isSelected ? '#F97316' : theme.textSecondary, backgroundColor: isSelected ? '#F97316' : 'transparent' }]}>
                                    {isSelected && <Ionicons name="checkmark" size={12} color="#FFF" />}
                                  </View>
                                )}
                                <Text style={[styles.savedFallbackTitle, { color: theme.textSecondary, flex: 1 }]}>{subName}</Text>
                                {!isSelectMode && (
                                  <TouchableOpacity 
                                    onPress={() => toggleSubjectBookmark(subName)} 
                                    style={styles.unsaveBtn}
                                  >
                                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                                  </TouchableOpacity>
                                )}
                              </TouchableOpacity>
                            );
                          }

                          return (
                            <TouchableOpacity 
                              key={`subject-${index}`} 
                              style={[
                                styles.savedSubjectCard, 
                                { backgroundColor: isSelected ? (theme.isDark ? 'rgba(249, 115, 22, 0.15)' : '#FFF7ED') : theme.backgroundElement, 
                                  borderColor: isSelected ? '#F97316' : theme.cardBorder }, 
                                isExpanded && !isSelected && styles.savedSubjectCardExpanded
                              ]}
                              onPress={() => {
                                if (isSelectMode) toggleSelection(itemKey);
                                else toggleExpandSaved(subName);
                              }}
                              activeOpacity={0.8}
                            >
                              {isSelectMode && (
                                <View style={[styles.checkboxOverlay, { borderColor: isSelected ? '#F97316' : theme.textSecondary, backgroundColor: isSelected ? '#F97316' : 'transparent' }]}>
                                  {isSelected && <Ionicons name="checkmark" size={12} color="#FFF" />}
                                </View>
                              )}
                              <View style={styles.savedCardHeader}>
                                <View style={[styles.savedHeaderLeft, { marginLeft: isSelectMode ? 24 : 0 }]}>
                                  <Text style={[styles.savedSubjectName, { color: theme.text }]}>{subjectDetails.name}</Text>
                                  <View style={styles.savedMetaRow}>
                                    <View style={[styles.savedMetaBadge, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
                                      <Text style={[styles.savedMetaBadgeText, { color: theme.textSecondary }]}>CODE: {subjectDetails.code}</Text>
                                    </View>
                                    <View style={[styles.savedMetaBadge, { backgroundColor: theme.isDark ? 'rgba(22, 163, 74, 0.12)' : '#F0FDF4', borderColor: theme.isDark ? 'rgba(22, 163, 74, 0.2)' : '#BBF7D0' }]}>
                                      <Text style={[styles.savedMetaBadgeText, { color: '#16A34A' }]}>
                                        {subjectDetails.credits} Credits
                                      </Text>
                                    </View>
                                    <View style={[styles.savedMetaBadge, { backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.12)' : '#EFF6FF', borderColor: theme.isDark ? 'rgba(59, 130, 246, 0.2)' : '#BFDBFE' }]}>
                                      <Text style={[styles.savedMetaBadgeText, { color: '#2563EB' }]}>
                                        {subjectDetails.semester}
                                      </Text>
                                    </View>
                                  </View>
                                </View>
                                {!isSelectMode && (
                                  <Ionicons 
                                    name={isExpanded ? "chevron-up" : "chevron-down"} 
                                    size={18} 
                                    color={theme.textSecondary} 
                                  />
                                )}
                              </View>

                              {/* Expanded subject info */}
                              {isExpanded && !isSelectMode && (
                                <View style={[styles.savedCardDetails, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
                                  <Text style={[styles.savedSecTitle, { color: theme.textSecondary }]}>COURSE DESCRIPTION</Text>
                                  <Text style={[styles.savedDescText, { color: theme.text }]}>{subjectDetails.description}</Text>

                                  <Text style={[styles.savedSecTitle, { color: theme.textSecondary }]}>SYLLABUS MODULES</Text>
                                  <View style={styles.savedModulesList}>
                                    {subjectDetails.modules.map((mod, mIdx) => (
                                      <View key={mIdx} style={styles.savedModuleRow}>
                                        <View style={styles.savedModuleDot} />
                                        <Text style={[styles.savedModuleText, { color: theme.text }]}>{mod}</Text>
                                      </View>
                                    ))}
                                  </View>
                                </View>
                              )}

                              {/* Subject Card action bar */}
                              {!isSelectMode && (
                                <View style={[styles.savedCardActionsBar, { borderTopColor: theme.cardBorder }]}>
                                  <TouchableOpacity 
                                    style={styles.savedActionBtn}
                                    onPress={() => handleShareSubject(subjectDetails)}
                                  >
                                    <Ionicons name="share-social-outline" size={14} color={theme.textSecondary} />
                                    <Text style={[styles.savedActionBtnLabel, { color: theme.textSecondary }]}>Share Text</Text>
                                  </TouchableOpacity>

                                  <TouchableOpacity 
                                    style={[styles.savedActionBtn, { marginLeft: 'auto' }]}
                                    onPress={() => toggleSubjectBookmark(subName)}
                                  >
                                    <Ionicons name="star" size={14} color="#EF4444" />
                                    <Text style={[styles.savedActionBtnLabel, { color: '#EF4444' }]}>Remove</Text>
                                  </TouchableOpacity>
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    {/* SECTION 1.5: SAVED STUDY MATERIALS */}
                    {filteredMaterials.length > 0 && (
                      <View style={[styles.savedSection, { marginTop: 18 }]}>
                        <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>📁 SAVED STUDY MATERIALS ({filteredMaterials.length})</Text>
                        
                        {filteredMaterials.map((item, index) => {
                          const itemKey = `material-${item.id || item.fileUrl}`;
                          const isSelected = selectedItems.includes(itemKey);
                          return (
                          <TouchableOpacity 
                            key={`material-${item.id}-${index}`} 
                            style={[styles.savedPostCard, { 
                              backgroundColor: isSelected ? (theme.isDark ? 'rgba(249, 115, 22, 0.15)' : '#FFF7ED') : theme.backgroundElement, 
                              borderColor: isSelected ? '#F97316' : theme.cardBorder, 
                              marginBottom: 12 
                            }]}
                            activeOpacity={isSelectMode ? 0.7 : 1}
                            onPress={() => isSelectMode && toggleSelection(itemKey)}
                          >
                            {isSelectMode && (
                              <View style={[styles.checkboxOverlay, { borderColor: isSelected ? '#F97316' : theme.textSecondary, backgroundColor: isSelected ? '#F97316' : 'transparent' }]}>
                                {isSelected && <Ionicons name="checkmark" size={12} color="#FFF" />}
                              </View>
                            )}
                            <View style={[styles.savedPostHeader, { marginLeft: isSelectMode ? 24 : 0 }]}>
                              <Ionicons name="document-text" size={14} color="#F97316" style={{ marginRight: 6 }} />
                              <Text style={[styles.savedPostAuthor, { color: theme.text, flex: 1 }]} numberOfLines={1}>
                                {item.title}
                              </Text>
                              <Text style={[styles.savedPostTime, { color: theme.textSecondary }]}>
                                {item.materialType || 'PDF'}
                              </Text>
                            </View>
                            
                            <Text style={[styles.savedPostContent, { color: theme.textSecondary, marginTop: 4 }]} numberOfLines={2}>
                              Semester: {item.semester || 'All'} | Branch: {item.branch || 'General'}
                              {item.description ? `\nDescription: ${item.description}` : ''}
                            </Text>
                            
                            {!isSelectMode && (
                              <View style={[styles.savedPostFooter, { borderTopColor: theme.cardBorder, borderTopWidth: 0.5, paddingTop: 8, marginTop: 8, flexDirection: 'row', gap: 10 }]}>
                                <TouchableOpacity 
                                  style={[styles.savedPostActionBtn, { flex: 1.5, backgroundColor: theme.isDark ? 'rgba(249, 115, 22, 0.1)' : '#FFF7ED', paddingVertical: 6, borderRadius: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 0 }]}
                                  onPress={() => {
                                    setActivePdfUrl(item.fileUrl);
                                    setActivePdfTitle(item.title);
                                    setActivePdfMaterial(item);
                                    setIsPdfVisible(true);
                                  }}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="eye-outline" size={13} color="#F97316" />
                                  <Text style={{ color: '#F97316', fontWeight: 'bold', fontSize: 11.5 }}>View Document</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                  style={[styles.unsavePostBtn, { flex: 1, paddingVertical: 6, borderRadius: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 0 }]}
                                  onPress={() => toggleMaterialBookmark(item)}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="star" size={13} color="#EF4444" />
                                  <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 11.5 }}>Remove</Text>
                                </TouchableOpacity>
                              </View>
                            )}
                          </TouchableOpacity>
                        )})}
                      </View>
                    )}

                    {/* SECTION 1.8: SAVED NOTICES */}
                    {filteredNotices.length > 0 && (
                      <View style={[styles.savedSection, { marginTop: 18 }]}>
                        <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>📌 SAVED NOTICES ({filteredNotices.length})</Text>
                        
                        {filteredNotices.map((notice, index) => {
                          const itemKey = `notice-${notice.id}`;
                          const isSelected = selectedItems.includes(itemKey);
                          const noticeText = notice.text ? (notice.text.length > 100 ? notice.text.substring(0, 100) + '...' : notice.text) : 'Image attached';
                          return (
                          <TouchableOpacity 
                            key={`notice-${notice.id}-${index}`} 
                            style={[styles.savedPostCard, { 
                              backgroundColor: isSelected ? (theme.isDark ? 'rgba(249, 115, 22, 0.15)' : '#FFF7ED') : theme.backgroundElement, 
                              borderColor: isSelected ? '#F97316' : theme.cardBorder, 
                              marginBottom: 12 
                            }]}
                            activeOpacity={isSelectMode ? 0.7 : 1}
                            onPress={() => isSelectMode && toggleSelection(itemKey)}
                          >
                            {isSelectMode && (
                              <View style={[styles.checkboxOverlay, { borderColor: isSelected ? '#F97316' : theme.textSecondary, backgroundColor: isSelected ? '#F97316' : 'transparent' }]}>
                                {isSelected && <Ionicons name="checkmark" size={12} color="#FFF" />}
                              </View>
                            )}
                            <View style={[styles.savedPostHeader, { marginLeft: isSelectMode ? 24 : 0 }]}>
                              <Ionicons name="notifications" size={14} color="#F97316" style={{ marginRight: 6 }} />
                              <Text style={[styles.savedPostAuthor, { color: theme.text, flex: 1 }]} numberOfLines={1}>
                                {notice.authorName}
                              </Text>
                              <Text style={[styles.savedPostTime, { color: theme.textSecondary }]}>
                                {getFormattedPostTime(notice.createdAt)}
                              </Text>
                            </View>
                            
                            <Text style={[styles.savedPostContent, { color: theme.textSecondary, marginTop: 4 }]} numberOfLines={3}>
                              {noticeText}
                            </Text>
                            
                            {!isSelectMode && (
                              <View style={[styles.savedPostFooter, { borderTopColor: theme.cardBorder, borderTopWidth: 0.5, paddingTop: 8, marginTop: 8, flexDirection: 'row', gap: 10 }]}>
                                
                                <TouchableOpacity 
                                  style={[styles.unsavePostBtn, { flex: 1, paddingVertical: 6, borderRadius: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 0 }]}
                                  onPress={() => toggleNoticeBookmark(notice)}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="bookmark" size={13} color="#EF4444" />
                                  <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 11.5 }}>Unsave</Text>
                                </TouchableOpacity>
                              </View>
                            )}
                          </TouchableOpacity>
                        )})}
                      </View>
                    )}

                    {/* SECTION 2: SAVED COMMUNITY FEED POSTS */}
                    {filteredPosts.length > 0 && (
                      <View style={[styles.savedSection, { marginTop: 18 }]}>
                        <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>💬 SAVED FEED POSTS ({filteredPosts.length})</Text>
                        
                        {filteredPosts.map(post => {
                          const itemKey = `post-${post.id}`;
                          const isSelected = selectedItems.includes(itemKey);
                          return (
                          <TouchableOpacity 
                            key={`post-${post.id}`} 
                            style={[styles.savedPostCard, { 
                              backgroundColor: isSelected ? (theme.isDark ? 'rgba(249, 115, 22, 0.15)' : '#FFF7ED') : theme.backgroundElement, 
                              borderColor: isSelected ? '#F97316' : theme.cardBorder 
                            }]}
                            activeOpacity={isSelectMode ? 0.7 : 1}
                            onPress={() => isSelectMode && toggleSelection(itemKey)}
                          >
                            {isSelectMode && (
                              <View style={[styles.checkboxOverlay, { borderColor: isSelected ? '#F97316' : theme.textSecondary, backgroundColor: isSelected ? '#F97316' : 'transparent' }]}>
                                {isSelected && <Ionicons name="checkmark" size={12} color="#FFF" />}
                              </View>
                            )}
                            <View style={[styles.savedPostHeader, { marginLeft: isSelectMode ? 24 : 0 }]}>
                              <Ionicons 
                                name={post.pollOptions ? "stats-chart" : "document-text"} 
                                size={14} 
                                color="#F97316" 
                              />
                              <Text style={[styles.savedPostAuthor, { color: theme.text }]} numberOfLines={1}>
                                {post.authorName}
                              </Text>
                              <Text style={[styles.savedPostTime, { color: theme.textSecondary }]}>
                                {getFormattedPostTime(post.createdAt, post.timestamp)}
                              </Text>
                            </View>
                            
                            {post.title ? (
                              <Text style={[styles.savedPostTitle, { color: theme.text }]} numberOfLines={1}>
                                {post.title}
                              </Text>
                            ) : null}
                            
                            <Text style={[styles.savedPostContent, { color: theme.textSecondary }]} numberOfLines={3}>
                              {post.content}
                            </Text>

                            {post.pollOptions && (
                              <View style={[styles.savedPostPollIndicator, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
                                <Ionicons name="bar-chart-sharp" size={11} color="#F97316" />
                                <Text style={[styles.savedPostPollText, { color: theme.textSecondary }]}>
                                  Includes active poll ({post.totalVotes || 0} votes)
                                </Text>
                              </View>
                            )}
                            
                            {!isSelectMode && (
                              <View style={[styles.savedPostFooter, { borderTopColor: theme.cardBorder }]}>
                                <View style={styles.savedPostStat}>
                                  <Ionicons name="heart" size={12} color="#EF4444" />
                                  <Text style={[styles.savedPostStatText, { color: theme.textSecondary }]}>
                                    {post.claps}
                                  </Text>
                                </View>
                                <View style={styles.savedPostStat}>
                                  <Ionicons name="chatbubble" size={12} color="#475569" />
                                  <Text style={[styles.savedPostStatText, { color: theme.textSecondary }]}>
                                    {post.commentsCount}
                                  </Text>
                                </View>

                                <TouchableOpacity 
                                  style={[styles.savedPostActionBtn, { marginLeft: 10 }]}
                                  onPress={() => handleSharePost(post)}
                                >
                                  <Ionicons name="share-social-outline" size={13} color={theme.textSecondary} />
                                  <Text style={[styles.savedPostActionLabel, { color: theme.textSecondary }]}>Share</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                  style={styles.unsavePostBtn}
                                  onPress={() => togglePostBookmark(post.id)}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="star" size={13} color="#EF4444" />
                                  <Text style={styles.unsavePostBtnLabel}>Remove</Text>
                                </TouchableOpacity>
                              </View>
                            )}
                          </TouchableOpacity>
                        )})}
                      </View>
                    )}

                  </View>
                )}
              </View>
            )}

            <View style={{ height: 60 }} />
          </ScrollView>

          {/* Floating Delete Button */}
          {isSelectMode && selectedItems.length > 0 && (
            <TouchableOpacity 
              style={[styles.floatingDeleteBtn, { bottom: Platform.OS === 'ios' ? 30 : 20 }]}
              onPress={handleDeleteSelected}
              activeOpacity={0.8}
            >
              <Ionicons name="trash" size={20} color="#FFF" />
              <Text style={styles.floatingDeleteBtnText}>
                Delete Selected ({selectedItems.length})
              </Text>
            </TouchableOpacity>
          )}

        </KeyboardAvoidingView>
      </View>
    
  );

  return (
    <>
      {isEmbedded ? (
        mainContent
      ) : (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={StyleSheet.absoluteFillObject} 
              activeOpacity={1} 
              onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} 
            />
            {mainContent}
          </View>
        </Modal>
      )}


      {isPdfVisible && (
        <PdfViewerModal
          visible={isPdfVisible}
          onClose={() => setIsPdfVisible(false)}
          url={activePdfUrl}
          title={activePdfTitle}
          material={activePdfMaterial}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.88,
    flex: 1,
    borderTopWidth: 1,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  sheetHandle: {
    width: 42,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hubIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetTitle: {
    fontSize: 15.5,
    fontWeight: '800',
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clearVaultBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  closeBtn: {
    padding: 4,
  },
  privacyBanner: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  shieldIcon: {
    marginTop: 2,
  },
  privacyBannerText: {
    fontSize: 10.5,
    lineHeight: 15,
    flex: 1,
    fontWeight: '500',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    // Dynamic borderBottomColor applied inline
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tabButtonTextActive: {
    color: '#F97316',
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 38,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    padding: 0,
    fontWeight: '500',
  },
  clearSearchBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    gap: 8,
  },
  emptyIconFrame: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  emptyText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  emptySubText: {
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 16,
    fontWeight: '500',
  },
  
  // Tab 1: Notepad Styles
  notepadContainer: {
    gap: 12,
  },
  addNoteBtn: {
    backgroundColor: '#F97316',
    borderRadius: 12,
    height: 44,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    boxShadow: Platform.OS === 'web' ? `${0}px ${4}px ${8}px #F97316` : undefined,

    elevation: 3,
  },
  addNoteBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  noteEditorCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  editorCardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    marginBottom: 4,
  },
  editorTitleInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13.5,
    fontWeight: '600',
  },
  editorContentInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    minHeight: 150,
    fontWeight: '500',
  },
  editorActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  cancelEditorBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelEditorBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  saveEditorBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F97316',
  },
  saveEditorBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  notesList: {
    gap: 14,
  },
  noteItemCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.015,
    shadowRadius: 8,
    elevation: 2,
  },
  noteItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 0.5,
    paddingBottom: 6,
  },
  noteItemTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    flex: 1,
    marginRight: 10,
  },
  noteItemDate: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#94A3B8',
  },
  noteItemBody: {
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '500',
    marginBottom: 12,
  },
  noteItemActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 0.5,
    paddingTop: 8,
  },
  noteActionIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  noteActionLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Tab 2: Saved Hub Styles
  savedContainer: {
    gap: 12,
  },
  savedList: {
    gap: 12,
  },
  savedSection: {
    gap: 10,
  },
  sectionHeading: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
    marginTop: 6,
  },
  savedFallbackItem: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  savedFallbackTitle: {
    fontSize: 12.5,
    fontWeight: 'bold',
  },
  unsaveBtn: {
    padding: 6,
  },
  savedSubjectCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.015,
    shadowRadius: 8,
    elevation: 2,
  },
  savedSubjectCardExpanded: {
    borderColor: '#FED7AA',
  },
  savedCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  savedHeaderLeft: {
    flex: 1,
    marginRight: 8,
  },
  savedSubjectName: {
    fontSize: 13.5,
    fontWeight: '800',
    lineHeight: 18,
  },
  savedMetaRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  savedMetaBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 0.5,
  },
  savedMetaBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
  },
  savedCardDetails: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  savedSecTitle: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  savedDescText: {
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '500',
  },
  savedModulesList: {
    gap: 6,
    marginTop: 2,
  },
  savedModuleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  savedModuleDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F97316',
  },
  savedModuleText: {
    fontSize: 11,
    fontWeight: '500',
  },
  savedCardActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 0.5,
    paddingTop: 10,
    marginTop: 12,
    gap: 12,
  },
  savedActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  savedActionBtnLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Saved Posts Styling inside Hub
  savedPostCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.015,
    shadowRadius: 8,
    elevation: 2,
  },
  savedPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  savedPostAuthor: {
    fontSize: 12.5,
    fontWeight: '800',
    flex: 1,
  },
  savedPostTime: {
    fontSize: 10,
  },
  savedPostTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    marginBottom: 6,
  },
  savedPostContent: {
    fontSize: 12,
    lineHeight: 16.5,
    fontWeight: '500',
    marginBottom: 10,
  },
  savedPostPollIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 0.8,
    marginBottom: 10,
  },
  savedPostPollText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  savedPostFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 0.5,
    paddingTop: 10,
    marginTop: 4,
    gap: 10,
  },
  savedPostStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginRight: 4,
  },
  savedPostStatText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  savedPostActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  savedPostActionLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  unsavePostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginLeft: 'auto',
  },
  unsavePostBtnLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
  checkboxOverlay: {
    position: 'absolute',
    top: 14,
    left: 14,
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  floatingDeleteBtn: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  floatingDeleteBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
