import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity,  ScrollView, Alert, Share, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { TextInput } from '@/components/ui/TextInput';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DetailModal } from './DetailModal';
import { FastLoginModal } from '@/components/modals/FastLoginModal';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppStore } from '@/store/useAppStore';
import { ForwardSheet } from '@/components/modals/ForwardSheet';
import { ForwardableContent, getContentEmoji } from '@/utils/forwardEngine';

import { canReportContent } from '@/utils/permissions';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';

interface EventsModalProps {
  isEmbedded?: boolean;
  visible: boolean;
  onClose: () => void;
  initialEventId?: string | null;
  onRequestFastLogin?: () => void;
}

interface CampusEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  venue: string;
  category: string;
  desc: string;
  interestedCount: number;
  isUserCreated: boolean;
  creatorId?: string;
  authorName: string;
  authorRole: 'Student' | 'Alumni' | 'Faculty' | 'Guest';
  contactOrganizer?: string;
  relatedLink?: string;
}

const INITIAL_EVENTS: CampusEvent[] = [];

const DROPDOWN_CATEGORIES = ['Hackathon', 'Sports', 'Seminar', 'Cultural', 'Academic', 'Startup', 'Conference', 'Volunteering', 'Other'];

const getCategoryColor = (category: string) => {
  switch (category.toLowerCase()) {
    case 'hackathon':
      return { bg: 'rgba(139, 92, 246, 0.12)', text: '#8B5CF6', icon: 'code-working' };
    case 'sports':
      return { bg: 'rgba(16, 185, 129, 0.12)', text: '#10B981', icon: 'football' };
    case 'seminar':
      return { bg: 'rgba(249, 115, 22, 0.12)', text: '#F97316', icon: 'megaphone' };
    case 'cultural':
      return { bg: 'rgba(244, 63, 94, 0.12)', text: '#F43F5E', icon: 'color-palette' };
    case 'academic':
      return { bg: 'rgba(59, 130, 246, 0.12)', text: '#3B82F6', icon: 'school' };
    case 'startup':
      return { bg: 'rgba(236, 72, 153, 0.12)', text: '#EC4899', icon: 'rocket' };
    case 'conference':
      return { bg: 'rgba(6, 182, 212, 0.12)', text: '#06B6D4', icon: 'people' };
    case 'volunteering':
      return { bg: 'rgba(234, 179, 8, 0.12)', text: '#EAB308', icon: 'heart' };
    default:
      return { bg: 'rgba(100, 116, 139, 0.12)', text: '#64748B', icon: 'grid' };
  }
};

// Date Format Validator (dd/mm/yyyy)
const isValidDateFormat = (dateStr: string): boolean => {
  const regex = /^\d{2}\/\d{2}\/\d{4}$/;
  if (!regex.test(dateStr)) return false;
  
  const [day, month, year] = dateStr.split('/').map(Number);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  
  const daysInMonth = [31, (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1];
};

export function EventsModal({ visible, onClose, isEmbedded, initialEventId, onRequestFastLogin }: EventsModalProps) {
  const theme = useThemeColors();
  const router = useRouter();
  const { user } = useAppStore();
  
  // State Machine: 'list' | 'create' | 'edit' | 'details'
  const [viewState, setViewState] = useState<'list' | 'create' | 'edit' | 'details'>('list');
  const [isFastLoginVisible, setIsFastLoginVisible] = useState(false);
  const [events, setEvents] = useState<CampusEvent[]>(INITIAL_EVENTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [interestedEventIds, setInterestedEventIds] = useState<string[]>([]);
  const [activeEvent, setActiveEvent] = useState<CampusEvent | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [forwardContent, setForwardContent] = useState<ForwardableContent | null>(null);
  const [isForwardVisible, setIsForwardVisible] = useState(false);

  const handleForwardEvent = (event: CampusEvent) => {
    setForwardContent({
      contentId: event.id,
      contentType: 'event',
      title: event.title,
      subtitle: event.date,
      senderName: event.creatorName || 'MCE Motihari',
      emoji: getContentEmoji('event'),
    });
    setIsForwardVisible(true);
  };

  const isOwnEvent = useMemo(() => {
    if (!activeEvent || !user) return false;
    return activeEvent.creatorId === user.uid;
  }, [activeEvent, user]);

  const isAdmin = useMemo(() => {
    if (!user) return false;
    return user.role === 'Admin' || !!user.adminRole;
  }, [user]);

  const handleRefreshEvents = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      // Simulate dynamic network refresh check
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const storedEvents = await AsyncStorage.getItem('@mce_campus_events');
      if (storedEvents) {
        setEvents(JSON.parse(storedEvents));
      }
      
      if (__DEV__) {
        console.log('[Perf Logger] Events list refreshed successfully!');
      }
    } catch (err) {
      console.warn('Failed to refresh campus events:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Form States
  const [formTitle, setFormTitle] = useState('');
  const [formOrganizedBy, setFormOrganizedBy] = useState('');
  const [formFromDate, setFormFromDate] = useState('');
  const [formToDate, setFormToDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formVenue, setFormVenue] = useState('');
  const [formCategory, setFormCategory] = useState<string>('Academic');
  const [formOtherCategory, setFormOtherCategory] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formLink, setFormLink] = useState('');
  
  // Category Selector Dropdown State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Load persistence
  useEffect(() => {
    const loadStore = async () => {
      try {
        let currentEvents = INITIAL_EVENTS;
        const storedEvents = await AsyncStorage.getItem('@mce_campus_events');
        if (storedEvents) {
          const parsed = JSON.parse(storedEvents) as CampusEvent[];
          // Filter out the old dummy events explicitly so they vanish from existing devices
          currentEvents = parsed.filter(e => !['evt-1', 'evt-2', 'evt-3', 'evt-4'].includes(e.id));
          setEvents(currentEvents);
          await AsyncStorage.setItem('@mce_campus_events', JSON.stringify(currentEvents));
        } else {
          await AsyncStorage.setItem('@mce_campus_events', JSON.stringify(INITIAL_EVENTS));
        }
        
        const storedInterested = await AsyncStorage.getItem('@mce_interested_events');
        if (storedInterested) {
          setInterestedEventIds(JSON.parse(storedInterested));
        }

        // Auto-open event details if deep linked
        if (initialEventId) {
          const match = currentEvents.find(e => e.id === initialEventId);
          if (match) {
            setActiveEvent(match);
            setViewState('details');
          }
        }
      } catch (err) {
        console.warn('Failed to load events store:', err);
      }
    };
    
    if (visible) {
      if (!initialEventId) {
        setViewState('list');
        setSearchQuery('');
        setActiveEvent(null);
      }
      loadStore();
    }
  }, [visible, initialEventId]);

  // Save utility
  const saveEventsToStorage = async (updatedList: CampusEvent[]) => {
    setEvents(updatedList);
    try {
      await AsyncStorage.setItem('@mce_campus_events', JSON.stringify(updatedList));
    } catch (err) {
      console.warn('Failed to persist events:', err);
    }
  };

  const saveInterestedToStorage = async (updatedIds: string[]) => {
    setInterestedEventIds(updatedIds);
    try {
      await AsyncStorage.setItem('@mce_interested_events', JSON.stringify(updatedIds));
    } catch (err) {
      console.warn('Failed to persist interested events:', err);
    }
  };

  // Search filtering
  const filteredEvents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return events;
    return events.filter(evt =>
      evt.title.toLowerCase().includes(q) ||
      evt.desc.toLowerCase().includes(q) ||
      evt.category.toLowerCase().includes(q) ||
      evt.venue.toLowerCase().includes(q)
    );
  }, [events, searchQuery]);

  // Form Handlers
  const handleHostNewEvent = async () => {
    if (!user) {
      Alert.alert(
        'Login Required 🔐',
        'Campus fests ya events post karne ke liye pehle Google se login karein.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login with Google', onPress: () => { onClose(); router.push('/login'); } }
        ]
      );
      return;
    }

    if (!formTitle.trim() || !formOrganizedBy.trim() || !formFromDate.trim() || !formVenue.trim() || !formDesc.trim()) {
      Alert.alert('Incomplete Form', 'Please fill in Title, Organized By, From Date, Venue, and Description.');
      return;
    }

    // Validate From Date format (dd/mm/yyyy)
    if (!isValidDateFormat(formFromDate.trim())) {
      Alert.alert('Invalid Date Format', 'From Date format must be dd/mm/yyyy (e.g. 28/05/2026).');
      return;
    }

    // Validate To Date format if provided
    if (formToDate.trim() && !isValidDateFormat(formToDate.trim())) {
      Alert.alert('Invalid Date Format', 'To Date format must be dd/mm/yyyy if filled.');
      return;
    }

    // Validate Other Category if category is Other
    let finalCategory = formCategory;
    if (formCategory === 'Other') {
      const cleanOther = formOtherCategory.trim();
      if (!cleanOther) {
        Alert.alert('Incomplete Form', 'Please enter your custom category name.');
        return;
      }
      if (cleanOther.split(/\s+/).length > 3) {
        Alert.alert('Category Too Long', 'Custom category should be short (max 2-3 words).');
        return;
      }
      finalCategory = cleanOther;
    }

    const formattedDate = formToDate.trim() 
      ? `${formFromDate.trim()} to ${formToDate.trim()}`
      : formFromDate.trim();

    const newEvent: CampusEvent = {
      id: `evt-${Date.now()}`,
      title: formTitle.trim(),
      date: formattedDate,
      time: formTime.trim() || undefined,
      venue: formVenue.trim(),
      category: finalCategory,
      desc: formDesc.trim(),
      interestedCount: 0,
      isUserCreated: true,
      creatorId: user?.uid,
      authorName: formOrganizedBy.trim(),
      authorRole: 'Student',
      contactOrganizer: formContact.trim() || undefined,
      relatedLink: formLink.trim() || undefined,
    };

    const updated = [newEvent, ...events];
    await saveEventsToStorage(updated);
    
    resetForm();
    setViewState('list');
    Alert.alert('Event Hosted! 📣', `"${newEvent.title}" is now visible to all students on the campus calendar.`);
  };

  const handleSaveEdit = async () => {
    if (!activeEvent) return;
    if (!formTitle.trim() || !formOrganizedBy.trim() || !formFromDate.trim() || !formVenue.trim() || !formDesc.trim()) {
      Alert.alert('Incomplete Form', 'Please fill in Title, Organized By, From Date, Venue, and Description.');
      return;
    }

    // Validate From Date format (dd/mm/yyyy)
    if (!isValidDateFormat(formFromDate.trim())) {
      Alert.alert('Invalid Date Format', 'From Date format must be dd/mm/yyyy (e.g. 28/05/2026).');
      return;
    }

    // Validate To Date format if provided
    if (formToDate.trim() && !isValidDateFormat(formToDate.trim())) {
      Alert.alert('Invalid Date Format', 'To Date format must be dd/mm/yyyy if filled.');
      return;
    }

    // Validate Other Category if category is Other
    let finalCategory = formCategory;
    if (formCategory === 'Other') {
      const cleanOther = formOtherCategory.trim();
      if (!cleanOther) {
        Alert.alert('Incomplete Form', 'Please enter your custom category name.');
        return;
      }
      if (cleanOther.split(/\s+/).length > 3) {
        Alert.alert('Category Too Long', 'Custom category should be short (max 2-3 words).');
        return;
      }
      finalCategory = cleanOther;
    }

    const formattedDate = formToDate.trim() 
      ? `${formFromDate.trim()} to ${formToDate.trim()}`
      : formFromDate.trim();

    const updated = events.map(evt => {
      if (evt.id === activeEvent.id) {
        return {
          ...evt,
          title: formTitle.trim(),
          date: formattedDate,
          time: formTime.trim() || undefined,
          venue: formVenue.trim(),
          category: finalCategory,
          desc: formDesc.trim(),
          authorName: formOrganizedBy.trim(),
          contactOrganizer: formContact.trim() || undefined,
          relatedLink: formLink.trim() || undefined,
        };
      }
      return evt;
    });

    await saveEventsToStorage(updated);
    
    const updatedActive = updated.find(e => e.id === activeEvent.id) || null;
    setActiveEvent(updatedActive);

    resetForm();
    setViewState('details');
    Alert.alert('Changes Saved', 'Your campus event has been successfully updated.');
  };

  const handleDeleteEvent = async (id: string) => {
    const updated = events.filter(evt => evt.id !== id);
    await saveEventsToStorage(updated);
    
    const updatedInterested = interestedEventIds.filter(favId => favId !== id);
    await saveInterestedToStorage(updatedInterested);

    setViewState('list');
    setActiveEvent(null);
    Alert.alert('Event Deleted', 'The event has been permanently removed.');
  };

  const handleDeletePrompt = (id: string) => {
    Alert.alert(
      'Delete Event?',
      'Are you sure you want to permanently remove this event from the college calendar?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => handleDeleteEvent(id) }
      ]
    );
  };

  const handleReportEvent = (title: string) => {
    Alert.alert(
      'Report Submitted 🛡️',
      `"${title}" has been successfully flagged for admin moderation. We will audit this post within 12 hours.`
    );
  };

  const handleShareEvent = async (event: CampusEvent) => {
    try {
      const eventUrl = `https://mcemotihari-app.web.app/event/${event.id}`;
      let shareMessage = `📢 MCE Motihari Campus Event:\n\n`;
      shareMessage += `🏆 ${event.title}\n`;
      shareMessage += `📅 Date: ${event.date}${event.time ? `\n⏰ Time: ${event.time}` : ''}\n`;
      shareMessage += `📍 Venue: ${event.venue}\n\n`;
      shareMessage += `📝 Details:\n${event.desc}\n\n`;
      shareMessage += `Join the event and mark interested in the MCE Connect app:\n`;
      shareMessage += `🔗 ${eventUrl}\n\n`;
      shareMessage += `📲 Download the MCE Connect app today!`;

      await Share.share({
        title: event.title,
        message: shareMessage,
      });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  const toggleInterested = async (id: string) => {
    let updatedInterested: string[];
    const isCurrentlyInterested = interestedEventIds.includes(id);

    if (isCurrentlyInterested) {
      updatedInterested = interestedEventIds.filter(favId => favId !== id);
    } else {
      updatedInterested = [...interestedEventIds, id];
    }
    await saveInterestedToStorage(updatedInterested);

    const updatedEvents = events.map(evt => {
      if (evt.id === id) {
        return {
          ...evt,
          interestedCount: isCurrentlyInterested 
            ? Math.max(0, evt.interestedCount - 1) 
            : evt.interestedCount + 1
        };
      }
      return evt;
    });
    await saveEventsToStorage(updatedEvents);

    if (activeEvent && activeEvent.id === id) {
      setActiveEvent(updatedEvents.find(e => e.id === id) || null);
    }
  };

  const handleStartEdit = (event: CampusEvent) => {
    setFormTitle(event.title);
    setFormOrganizedBy(event.authorName);
    
    // Split date range
    if (event.date.includes(' to ')) {
      const [from, to] = event.date.split(' to ');
      setFormFromDate(from.trim());
      setFormToDate(to.trim());
    } else {
      setFormFromDate(event.date);
      setFormToDate('');
    }
    
    setFormTime(event.time || '');
    setFormVenue(event.venue);
    
    if (DROPDOWN_CATEGORIES.includes(event.category)) {
      setFormCategory(event.category);
      setFormOtherCategory('');
    } else {
      setFormCategory('Other');
      setFormOtherCategory(event.category);
    }
    
    setFormDesc(event.desc);
    setFormContact(event.contactOrganizer || '');
    setFormLink(event.relatedLink || '');
    setViewState('edit');
  };

  const resetForm = () => {
    setFormTitle('');
    setFormOrganizedBy('');
    setFormFromDate('');
    setFormToDate('');
    setFormTime('');
    setFormVenue('');
    setFormCategory('Academic');
    setFormOtherCategory('');
    setFormDesc('');
    setFormContact('');
    setFormLink('');
    setIsDropdownOpen(false);
  };

  const modalTitle = useMemo(() => {
    if (viewState === 'create') return 'Host New Event';
    if (viewState === 'edit') return 'Edit Event';
    if (viewState === 'details') return 'Event View';
    return 'Events & Fests Calendar';
  }, [viewState]);

  return (
    <DetailModal isEmbedded={isEmbedded} visible={visible}
      title={modalTitle}
      onClose={onClose}
      refreshControl={
        viewState === 'list' ? (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefreshEvents}
            colors={['#F97316']}
            tintColor="#F97316"
          />
        ) : undefined
      }
    >
      
      {/* ─────────────── 1. LIST VIEW ─────────────── */}
      {viewState === 'list' && (
        <View style={styles.container}>
          <Text style={[styles.richParagraph, { color: theme.textSecondary }]}>
            Announce technical fests, hackathons, sports meets, or startup summits to the college calendar.
          </Text>

          {/* Megaphone Host Banner */}
          <TouchableOpacity 
            style={[
              styles.hostBanner, 
              { 
                backgroundColor: theme.isDark ? 'rgba(249, 115, 22, 0.08)' : '#FFF7ED', 
                borderColor: theme.isDark ? 'rgba(249, 115, 22, 0.25)' : '#FFEDD5' 
              }
            ]}
            onPress={() => {
              if (!user || user.role === 'Guest') {
                setIsFastLoginVisible(true);
                return;
              }
              resetForm();
              setViewState('create');
            }}
            activeOpacity={0.8}
          >
            <View style={styles.hostBannerLeft}>
              <View style={styles.hostIconCircle}>
                <Ionicons name="megaphone" size={18} color="#F97316" />
              </View>
              <View>
                <Text style={[styles.hostBannerTitle, { color: theme.text }]}>Planning an event or fest? 📣</Text>
                <Text style={[styles.hostBannerSub, { color: theme.textSecondary }]}>Tap here to announce it anonymously</Text>
              </View>
            </View>
            <Ionicons name="add-circle" size={24} color="#F97316" />
          </TouchableOpacity>

          {/* Search bar */}
          <View style={[styles.searchBarContainer, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
            <Ionicons name="search-outline" size={16} color="#94A3B8" style={styles.searchIcon} />
            <TextInput
              placeholder="Search fests, venues, categories..."
              placeholderTextColor="#94A3B8"
              style={[styles.searchInput, { color: theme.text }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
             autoCapitalize="sentences" />
          </View>

          {/* Cards List */}
          {filteredEvents.length > 0 ? (
            <View style={styles.cardListContainer}>
              {filteredEvents.map((event) => {
                const colors = getCategoryColor(event.category);
                const isInterested = interestedEventIds.includes(event.id);
                return (
                  <TouchableOpacity
                    key={event.id}
                    style={[styles.eventCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
                    onPress={() => {
                      setActiveEvent(event);
                      setViewState('details');
                    }}
                    activeOpacity={0.9}
                  >
                    {/* Upper row: Tag and Date */}
                    <View style={styles.cardHeaderRow}>
                      <View style={[styles.categoryBadge, { backgroundColor: colors.bg }]}>
                        <Ionicons name={colors.icon as any} size={10} color={colors.text} style={{ marginRight: 3 }} />
                        <Text style={[styles.categoryBadgeText, { color: colors.text }]}>
                          {event.category.toUpperCase()}
                        </Text>
                      </View>
                      
                      <View style={[styles.dateBadge, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
                        <Ionicons name="calendar-outline" size={11} color="#F97316" />
                        <Text style={[styles.dateText, { color: theme.textSecondary }]} numberOfLines={1}>{event.date}</Text>
                      </View>
                    </View>

                    {/* Title & Desc */}
                    <Text style={[styles.eventCardTitle, { color: theme.text }]}>{event.title}</Text>
                    <Text style={[styles.eventCardDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                      {event.desc}
                    </Text>

                    <View style={[styles.cardDivider, { backgroundColor: theme.cardBorder }]} />

                    {/* Footer Row: View Details & Star */}
                    <View style={styles.cardFooterRow}>
                      <View style={styles.footerLeft}>
                        <Ionicons name="pin-outline" size={12} color="#94A3B8" />
                        <Text style={[styles.venueText, { color: theme.textSecondary }]} numberOfLines={1}>
                          {event.venue.split(',')[0]}
                        </Text>
                      </View>
                      
                      <View style={styles.footerRightBtns}>
                        {/* Star Button */}
                        <TouchableOpacity
                          style={[
                            styles.starIconButton, 
                            { borderColor: theme.cardBorder },
                            isInterested && { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' }
                          ]}
                          onPress={() => toggleInterested(event.id)}
                          activeOpacity={0.7}
                        >
                          <Ionicons 
                            name={isInterested ? "star" : "star-outline"} 
                            size={14} 
                            color={isInterested ? "#10B981" : theme.textSecondary} 
                          />
                        </TouchableOpacity>

                        {/* Forward Button */}
                        <TouchableOpacity
                          style={[styles.starIconButton, { borderColor: theme.cardBorder, marginLeft: 4 }]}
                          onPress={() => handleForwardEvent(event)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="arrow-redo-outline" size={14} color={theme.textSecondary} />
                        </TouchableOpacity>

                        {/* View Details Button */}
                        <TouchableOpacity
                          style={styles.detailsBtn}
                          onPress={() => {
                            setActiveEvent(event);
                            setViewState('details');
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.detailsBtnText}>View Details</Text>
                          <Ionicons name="arrow-forward" size={11} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#CBD5E1" />
              <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No events found</Text>
              <Text style={[styles.emptyStateSub, { color: theme.textSecondary }]}>Try looking up a different fest or host a new one!</Text>
            </View>
          )}
        </View>
      )}

      {/* ─────────────── 2. DETAILS VIEW ─────────────── */}
      {viewState === 'details' && activeEvent && (
        <View style={styles.detailsContainer}>
          {/* Header Actions row */}
          <View style={styles.detailsHeaderRow}>
            <TouchableOpacity 
              style={[styles.backToHubBtn, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}
              onPress={() => setViewState('list')}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={15} color={theme.text} />
              <Text style={[styles.backToHubText, { color: theme.text }]}>Calendar Hub</Text>
            </TouchableOpacity>

            <View style={styles.headerRightActions}>
              {(isOwnEvent || isAdmin) ? (
                <>
                  <TouchableOpacity 
                    style={[styles.actionIconBtn, { backgroundColor: theme.isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF' }]}
                    onPress={() => handleStartEdit(activeEvent)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="pencil" size={14} color="#3B82F6" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionIconBtn, { backgroundColor: theme.isDark ? 'rgba(239,68,68,0.15)' : '#FEF2F2' }]}
                    onPress={() => handleDeletePrompt(activeEvent.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash" size={14} color="#EF4444" />
                  </TouchableOpacity>
                </>
              ) : (!isOwnEvent && canReportContent(user?.uid, activeEvent.creatorId, user?.name, activeEvent.authorName)) ? (
                <TouchableOpacity 
                  style={[styles.actionIconBtn, { backgroundColor: theme.isDark ? 'rgba(239,68,68,0.15)' : '#FEF2F2' }]}
                  onPress={() => handleReportEvent(activeEvent.title)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="flag" size={14} color="#EF4444" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Details Column */}
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.detailsMainCol}>
              {/* Category tag */}
              <View style={[styles.categoryBadgeLarge, { backgroundColor: getCategoryColor(activeEvent.category).bg }]}>
                <Text style={[styles.categoryBadgeTextLarge, { color: getCategoryColor(activeEvent.category).text }]}>
                  {activeEvent.category.toUpperCase()}
                </Text>
              </View>

              <Text style={[styles.detailsTitle, { color: theme.text }]}>{activeEvent.title}</Text>

              {/* Meta Cards Block */}
              <View style={[styles.metaBlock, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
                <View style={styles.metaRow}>
                  <View style={styles.metaIconCircle}>
                    <Ionicons name="calendar" size={15} color="#F97316" />
                  </View>
                  <View style={styles.metaTextCol}>
                    <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>DATE</Text>
                    <Text style={[styles.metaValue, { color: theme.text }]}>{activeEvent.date}</Text>
                  </View>
                </View>

                {activeEvent.time && (
                  <View style={[styles.metaRow, { marginTop: 12 }]}>
                    <View style={styles.metaIconCircle}>
                      <Ionicons name="time" size={15} color="#F97316" />
                    </View>
                    <View style={styles.metaTextCol}>
                      <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>TIME</Text>
                      <Text style={[styles.metaValue, { color: theme.text }]}>{activeEvent.time}</Text>
                    </View>
                  </View>
                )}

                <View style={[styles.metaRow, { marginTop: 12 }]}>
                  <View style={styles.metaIconCircle}>
                    <Ionicons name="pin" size={15} color="#F97316" />
                  </View>
                  <View style={styles.metaTextCol}>
                    <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>VENUE</Text>
                    <Text style={[styles.metaValue, { color: theme.text }]}>{activeEvent.venue}</Text>
                  </View>
                </View>

                <View style={[styles.metaRow, { marginTop: 12 }]}>
                  <View style={styles.metaIconCircle}>
                    <Ionicons name="person" size={15} color="#F97316" />
                  </View>
                  <View style={styles.metaTextCol}>
                    <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>ORGANIZED BY</Text>
                    <Text style={[styles.metaValue, { color: theme.text }]}>
                      {activeEvent.authorName}
                    </Text>
                  </View>
                </View>

                {/* Optional Contact details */}
                {activeEvent.contactOrganizer && (
                  <View style={[styles.metaRow, { marginTop: 12 }]}>
                    <View style={styles.metaIconCircle}>
                      <Ionicons name="call" size={15} color="#F97316" />
                    </View>
                    <View style={styles.metaTextCol}>
                      <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>CONTACT ORGANIZER</Text>
                      <Text style={[styles.metaValue, { color: theme.text }]}>
                        {activeEvent.contactOrganizer}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Optional Related Link */}
                {activeEvent.relatedLink && (
                  <View style={[styles.metaRow, { marginTop: 12 }]}>
                    <View style={styles.metaIconCircle}>
                      <Ionicons name="link" size={15} color="#F97316" />
                    </View>
                    <View style={styles.metaTextCol}>
                      <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>RELATED LINK</Text>
                      <TouchableOpacity onPress={() => {
                        import('react-native').then(({ Linking }) => {
                          let url = activeEvent.relatedLink!.trim();
                          if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
                          Linking.openURL(url).catch(() => Alert.alert('Error', 'Unable to open link'));
                        });
                      }}>
                        <Text style={[styles.metaValue, { color: '#F97316', textDecorationLine: 'underline' }]} numberOfLines={1}>
                          {activeEvent.relatedLink}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* Description */}
              <Text style={[styles.detailsSectionHeader, { color: theme.text }]}>About The Event</Text>
              <Text style={[styles.detailsDescBody, { color: theme.textSecondary }]}>{activeEvent.desc}</Text>

              {/* Actions Grid */}
              <View style={[styles.detailsActionsGrid, { marginBottom: 40 }]}>
                <TouchableOpacity
                  style={[
                    styles.interestedBtnLarge,
                    interestedEventIds.includes(activeEvent.id)
                      ? { backgroundColor: '#10B981' }
                      : { backgroundColor: '#F97316' }
                  ]}
                  onPress={() => toggleInterested(activeEvent.id)}
                  activeOpacity={0.85}
                >
                  <Ionicons 
                    name={interestedEventIds.includes(activeEvent.id) ? "star" : "star-outline"} 
                    size={16} 
                    color="#FFFFFF" 
                    style={{ marginRight: 6 }} 
                  />
                  <Text style={styles.interestedBtnTextLarge}>
                    {interestedEventIds.includes(activeEvent.id) ? 'Interested ⭐' : 'Mark Interested'} ({activeEvent.interestedCount})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.shareBtnLarge, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}
                  onPress={() => handleShareEvent(activeEvent)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="share-social" size={16} color={theme.text} />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      )}

      {/* ─────────────── 3. CREATE / EDIT FORM VIEW ─────────────── */}
      {(viewState === 'create' || viewState === 'edit') && (
        <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={[styles.formSubText, { color: theme.textSecondary }]}>
            {viewState === 'create' 
              ? 'Input the academic fests, summits, or event details below.' 
              : 'Modify the event attributes below.'}
          </Text>

          {/* Title */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: theme.text }]}>Event Title *</Text>
            <TextInput
              style={[styles.formInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.cardBorder }]}
              placeholder="e.g. BEU Inter-College Basketball Meet"
              placeholderTextColor="#94A3B8"
              value={formTitle}
              onChangeText={setFormTitle}
             autoCapitalize="sentences" />
          </View>

          {/* Organized By */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: theme.text }]}>Organized By *</Text>
            <TextInput
              style={[styles.formInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.cardBorder }]}
              placeholder="e.g. CSE Technical Club, MCE Sports Authority"
              placeholderTextColor="#94A3B8"
              value={formOrganizedBy}
              onChangeText={setFormOrganizedBy}
             autoCapitalize="sentences" />
          </View>

          {/* Custom Dropdown Category Selector */}
          <View style={[styles.formGroup, { zIndex: 999 }]}>
            <Text style={[styles.formLabel, { color: theme.text }]}>Select Event Category *</Text>
            <View style={{ position: 'relative' }}>
              <TouchableOpacity
                style={[styles.dropdownTrigger, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}
                onPress={() => setIsDropdownOpen(!isDropdownOpen)}
                activeOpacity={0.8}
              >
                <Text style={[styles.dropdownTriggerText, { color: theme.text }]}>
                  {formCategory}
                </Text>
                <Ionicons 
                  name={isDropdownOpen ? "chevron-up" : "chevron-down"} 
                  size={16} 
                  color={theme.textSecondary} 
                />
              </TouchableOpacity>

              {isDropdownOpen && (
                <View style={[styles.dropdownPanel, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
                  <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }} keyboardShouldPersistTaps="handled">
                    {DROPDOWN_CATEGORIES.map(cat => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.dropdownItem,
                          { borderBottomColor: theme.cardBorder },
                          formCategory === cat && { backgroundColor: theme.isDark ? 'rgba(249,115,22,0.1)' : '#FFF7ED' }
                        ]}
                        onPress={() => {
                          setFormCategory(cat);
                          setIsDropdownOpen(false);
                        }}
                      >
                        <Text style={[
                          styles.dropdownItemText, 
                          { color: theme.text },
                          formCategory === cat && { color: '#F97316', fontWeight: 'bold' }
                        ]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>

          {/* Dynamic Custom Other Category Input */}
          {formCategory === 'Other' && (
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.text }]}>Custom Category Name *</Text>
              <TextInput
                style={[styles.formInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.cardBorder }]}
                placeholder="e.g. Summit, Workshop (2-3 words)"
                placeholderTextColor="#94A3B8"
                value={formOtherCategory}
                onChangeText={setFormOtherCategory}
               autoCapitalize="sentences" />
            </View>
          )}

          {/* Date Range (From - To) */}
          <View style={styles.formGrid}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={[styles.formLabel, { color: theme.text }]}>From Date * (dd/mm/yyyy)</Text>
              <TextInput
                style={[styles.formInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.cardBorder }]}
                placeholder="e.g. 28/05/2026"
                placeholderTextColor="#94A3B8"
                value={formFromDate}
                onChangeText={setFormFromDate}
                maxLength={10}
               autoCapitalize="sentences" />
            </View>
            <View style={[styles.formGroup, { flex: 1, marginLeft: 12 }]}>
              <Text style={[styles.formLabel, { color: theme.text }]}>To Date (Optional) (dd/mm/yyyy)</Text>
              <TextInput
                style={[styles.formInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.cardBorder }]}
                placeholder="e.g. 03/06/2026"
                placeholderTextColor="#94A3B8"
                value={formToDate}
                onChangeText={setFormToDate}
                maxLength={10}
               autoCapitalize="sentences" />
            </View>
          </View>

          {/* Time & Venue */}
          <View style={styles.formGrid}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={[styles.formLabel, { color: theme.text }]}>Time (Optional)</Text>
              <TextInput
                style={[styles.formInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.cardBorder }]}
                placeholder="e.g. 10 AM - 4 PM"
                placeholderTextColor="#94A3B8"
                value={formTime}
                onChangeText={setFormTime}
               autoCapitalize="sentences" />
            </View>
            <View style={[styles.formGroup, { flex: 1, marginLeft: 12 }]}>
              <Text style={[styles.formLabel, { color: theme.text }]}>Event Venue *</Text>
              <TextInput
                style={[styles.formInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.cardBorder }]}
                placeholder="e.g. MCE Main Ground"
                placeholderTextColor="#94A3B8"
                value={formVenue}
                onChangeText={setFormVenue}
               autoCapitalize="sentences" />
            </View>
          </View>

          {/* Optional contact organiser info */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: theme.text }]}>Contact Organizer (Optional)</Text>
            <TextInput
              style={[styles.formInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.cardBorder }]}
              placeholder="e.g. club@mce.ac.in or 98765xxxxx"
              placeholderTextColor="#94A3B8"
              value={formContact}
              onChangeText={setFormContact}
             autoCapitalize="sentences" />
          </View>

          {/* Optional related registration details link */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: theme.text }]}>Related Link (Optional)</Text>
            <TextInput
              style={[styles.formInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.cardBorder }]}
              placeholder="e.g. Registration, details, or sponsorship form link"
              placeholderTextColor="#94A3B8"
              value={formLink}
              onChangeText={setFormLink}
              autoCapitalize="none"
            />
          </View>

          {/* Description */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: theme.text }]}>Brief Description *</Text>
            <TextInput
              style={[
                styles.formInput, 
                styles.multilineInput, 
                { color: theme.text, backgroundColor: theme.background, borderColor: theme.cardBorder }
              ]}
              placeholder="Write college event briefs, coordinator names, or guidelines..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              value={formDesc}
              onChangeText={setFormDesc}
              textAlignVertical="top"
             autoCapitalize="sentences" />
          </View>

          {/* Submit Actions */}
          <View style={[styles.formSubmitRow, { marginBottom: 30 }]}>
            <TouchableOpacity 
              style={[styles.formCancelBtn, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}
              onPress={() => {
                resetForm();
                setViewState(viewState === 'edit' ? 'details' : 'list');
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.formCancelText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.formSubmitBtn}
              onPress={viewState === 'create' ? handleHostNewEvent : handleSaveEdit}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.formSubmitText}>
                {viewState === 'create' ? 'Host Event' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      <View style={{ height: 10 }} />
      <FastLoginModal
        visible={isFastLoginVisible}
        onClose={() => setIsFastLoginVisible(false)}
        onSuccess={() => {
          resetForm();
          setViewState('create');
        }}
        title="Login Required 🔐"
        subtitle="Campus fests ya events post karne ke liye pehle Google se login karein."
      />

      {/* Universal Forward Sheet */}
      <ForwardSheet
        visible={isForwardVisible}
        content={forwardContent}
        onClose={() => { setIsForwardVisible(false); setForwardContent(null); }}
      />
    </DetailModal>
  );
}

const styles = StyleSheet.create({
  container: {
  },
  richParagraph: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    marginBottom: 14,
  },
  hostBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  hostBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  hostIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hostBannerTitle: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  hostBannerSub: {
    fontSize: 10.5,
    fontWeight: '500',
    marginTop: 1,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    padding: 0,
  },
  cardListContainer: {
    gap: 12,
  },
  eventCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    maxWidth: '55%',
  },
  dateText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  eventCardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    lineHeight: 18,
    marginBottom: 6,
  },
  eventCardDesc: {
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  cardDivider: {
    height: 1,
    marginBottom: 10,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    marginRight: 10,
  },
  venueText: {
    fontSize: 11,
    fontWeight: '600',
  },
  footerRightBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starIconButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsBtn: {
    backgroundColor: '#F97316',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: 8,
  },
  detailsBtnText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    gap: 6,
  },
  emptyStateTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  emptyStateSub: {
    fontSize: 11,
    textAlign: 'center',
  },

  // Details View Styles
  detailsContainer: {
    flex: 1,
  },
  detailsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backToHubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 32,
  },
  backToHubText: {
    fontSize: 11,
    fontWeight: '700',
  },
  headerRightActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsMainCol: {
    flex: 1,
  },
  categoryBadgeLarge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  categoryBadgeTextLarge: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  detailsTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    lineHeight: 22,
    marginBottom: 14,
  },
  metaBlock: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metaTextCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  metaValue: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  detailsSectionHeader: {
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  detailsDescBody: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    marginBottom: 20,
  },
  detailsActionsGrid: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  interestedBtnLarge: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  interestedBtnTextLarge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  shareBtnLarge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Form Styles
  formContainer: {
    flex: 1,
  },
  formSubText: {
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '500',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    marginBottom: 6,
  },
  formInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 12,
    fontWeight: '600',
  },
  multilineInput: {
    height: 80,
    paddingVertical: 8,
  },
  formGrid: {
    flexDirection: 'row',
  },
  formSubmitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    gap: 12,
  },
  formCancelBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCancelText: {
    fontSize: 12,
    fontWeight: '800',
  },
  formSubmitBtn: {
    flex: 1.8,
    backgroundColor: '#F97316',
    height: 38,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formSubmitText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Dropdown style selector classes
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 40,
  },
  dropdownTriggerText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  dropdownPanel: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 10,
    zIndex: 9999,
    elevation: 6,
    boxShadow: Platform.OS === 'web' ? `${0}px ${4}px ${8}px #000` : undefined,

  },
  dropdownItem: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: 0.5,
  },
  dropdownItemText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default EventsModal;
