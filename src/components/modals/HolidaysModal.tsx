import React, { useState } from 'react';
import {Platform, StyleSheet, View, Text, TouchableOpacity, ScrollView,  Dimensions} from 'react-native';
import { TextInput } from '@/components/ui/TextInput';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { DetailModal } from './DetailModal';
import { getDaysUntilHoliday, getHolidayStatus, Holiday, HOLIDAYS_DATA } from '@/data/holidays';

const { width } = Dimensions.get('window');

interface HolidaysModalProps {
  isEmbedded?: boolean;
  visible: boolean;
  onClose: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function HolidaysModal({ visible, onClose, isEmbedded }: HolidaysModalProps) {
  const [isCalendarView, setIsCalendarView] = useState(true);
  const [holidaySearchQuery, setHolidaySearchQuery] = useState('');
  const [holidayCategory, setHolidayCategory] = useState<'All' | 'National' | 'Festival' | 'Religious' | 'Academic' | 'Vacation'>('All');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [selectedCalendarHoliday, setSelectedCalendarHoliday] = useState<Holiday | null>(null);

  const scrollViewRef = React.useRef<ScrollView>(null);
  const offsetsRef = React.useRef<{[key: number]: number}>({});
  const [listY, setListY] = useState(0);

  const scrollToCurrentMonth = () => {
    const currentMonth = new Date().getMonth() + 1; // 1-12
    const firstHoliday = HOLIDAYS_DATA.find(h => {
      const hMonth = parseInt(h.startDate.split('-')[1]);
      return hMonth >= currentMonth;
    });

    if (firstHoliday && scrollViewRef.current) {
      const y = offsetsRef.current[firstHoliday.id];
      if (y !== undefined) {
        scrollViewRef.current.scrollTo({ y: listY + y - 10, animated: true });
      }
    }
  };

  React.useEffect(() => {
    if (visible && !isCalendarView) {
      const timer = setTimeout(() => {
        scrollToCurrentMonth();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [visible, isCalendarView, listY]);

  // Helper to generate the day cells for a given month in 2026
  const getMonthDaysCells = (year: number, monthIndex: number) => {
    const firstDayIndex = new Date(year, monthIndex, 1).getDay();
    const totalDays = new Date(year, monthIndex + 1, 0).getDate();
    
    const cells = [];
    // Padding cells for grid alignment
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ day: null, dateStr: '' });
    }
    // Month day cells
    for (let d = 1; d <= totalDays; d++) {
      const padD = String(d).padStart(2, '0');
      const padM = String(monthIndex + 1).padStart(2, '0');
      cells.push({ day: d, dateStr: `${year}-${padM}-${padD}` });
    }
    return cells;
  };

  // Find if there is a holiday mapped to a specific calendar date cell
  const getHolidayForDate = (dateStr: string) => {
    if (!dateStr) return null;
    
    const [year, month, day] = dateStr.split('-');
    const cellTime = new Date(dateStr).getTime();
    
    if (year === '2026') {
      return HOLIDAYS_DATA.find(h => {
        const startTime = new Date(h.startDate).getTime();
        const endTime = new Date(h.endDate).getTime();
        return cellTime >= startTime && cellTime <= endTime;
      });
    } else {
      // Map 2026 holidays dynamically to the current calendar year
      return HOLIDAYS_DATA.find(h => {
        const mappedStart = h.startDate.replace('2026', year);
        const mappedEnd = h.endDate.replace('2026', year);
        const startTime = new Date(mappedStart).getTime();
        const endTime = new Date(mappedEnd).getTime();
        return cellTime >= startTime && cellTime <= endTime;
      });
    }
  };

  const getTodayDateStr = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  return (
    <DetailModal isEmbedded={isEmbedded} visible={visible} 
      title={`Academic Holidays ${isCalendarView ? calendarYear : new Date().getFullYear()}`} 
      onClose={onClose}
      disableScroll={true}
    >
      <ScrollView 
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
      <Text style={styles.richTextParagraph}>
        Official Bihar Engineering University (BEU) academic holiday calendar for MCE Motihari.
      </Text>

      {/* 1. View Toggle: List View vs Calendar View */}
      <View style={styles.viewToggleContainer}>
        <TouchableOpacity 
          style={[styles.viewToggleBtn, !isCalendarView && styles.viewToggleBtnActive]}
          onPress={() => { setIsCalendarView(false); setSelectedCalendarHoliday(null); }}
          activeOpacity={0.7}
        >
          <Ionicons name="list" size={15} color={!isCalendarView ? '#FFFFFF' : '#0F172A'} />
          <Text style={[styles.viewToggleText, !isCalendarView && styles.viewToggleTextActive]}>List View</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.viewToggleBtn, isCalendarView && styles.viewToggleBtnActive]}
          onPress={() => setIsCalendarView(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="calendar-outline" size={15} color={isCalendarView ? '#FFFFFF' : '#0F172A'} />
          <Text style={[styles.viewToggleText, isCalendarView && styles.viewToggleTextActive]}>Calendar View</Text>
        </TouchableOpacity>
      </View>

      {/* 2. LIST VIEW */}
      {!isCalendarView ? (
        <>
          {/* Search bar inside holiday modal */}
          <View style={styles.holidaySearchContainer}>
            <Ionicons name="search-outline" size={16} color="#94A3B8" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.holidaySearchInput}
              placeholder="Search holidays..."
              placeholderTextColor="#94A3B8"
              value={holidaySearchQuery}
              onChangeText={setHolidaySearchQuery}
              clearButtonMode="while-editing"
             autoCapitalize="sentences" />
          </View>

          {/* Holiday category filter chips */}
          <View style={styles.holidayChipsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {(['All', 'National', 'Festival', 'Religious', 'Academic', 'Vacation'] as const).map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.holidayChipBtn, holidayCategory === cat && styles.holidayChipBtnActive]}
                  onPress={() => setHolidayCategory(cat)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.holidayChipBtnText, holidayCategory === cat && styles.holidayChipBtnTextActive]}>
                    {cat === 'All' ? 'All Holidays' : cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Holidays list */}
          <View 
            onLayout={(e) => setListY(e.nativeEvent.layout.y)}
            style={{ gap: 10, paddingVertical: 10 }}
          >
            {HOLIDAYS_DATA.map(h => {
              const currentYear = new Date().getFullYear();
              return {
                ...h,
                startDate: h.startDate.replace('2026', String(currentYear)),
                endDate: h.endDate.replace('2026', String(currentYear))
              };
            }).filter(h => {
              const matchesSearch = h.title.toLowerCase().includes(holidaySearchQuery.toLowerCase()) || 
                                    h.titleEn.toLowerCase().includes(holidaySearchQuery.toLowerCase()) || 
                                    h.day.toLowerCase().includes(holidaySearchQuery.toLowerCase());
              
              const matchesCategory = holidayCategory === 'All' ? true : h.category === holidayCategory;

              return matchesSearch && matchesCategory;
            }).map((item) => {
              const status = getHolidayStatus(item);
              const daysLeft = getDaysUntilHoliday(item);

              const formatShortDate = (dString: string) => {
                const [y, m, d] = dString.split('-');
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                return `${monthNames[parseInt(m) - 1]} ${parseInt(d)}`;
              };
              const dateDisplay = item.startDate === item.endDate 
                ? formatShortDate(item.startDate) 
                : `${formatShortDate(item.startDate)} - ${formatShortDate(item.endDate)}`;

              return (
                <View 
                  key={item.id} 
                  onLayout={(e) => {
                    offsetsRef.current[item.id] = e.nativeEvent.layout.y;
                  }}
                  style={[
                    styles.holidayItemCard,
                    status === 'ongoing' && styles.holidayCardOngoing,
                    status === 'upcoming' && daysLeft <= 7 && styles.holidayCardImminent
                  ]}
                >
                  <View style={styles.holidayItemHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={styles.holidaySNoBadge}>
                        <Text style={styles.holidaySNoText}>{item.id}</Text>
                      </View>
                      <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0' }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>{dateDisplay}</Text>
                      </View>
                    </View>
                    
                    {/* Status / countdown badge */}
                    <View style={[
                      styles.holidayStatusBadge,
                      status === 'past' && styles.statusBadgePast,
                      status === 'ongoing' && styles.statusBadgeOngoing,
                      status === 'upcoming' && styles.statusBadgeUpcoming
                    ]}>
                      <Text style={[
                        styles.holidayStatusBadgeText,
                        status === 'past' && styles.statusTextPast,
                        status === 'ongoing' && styles.statusTextOngoing,
                        status === 'upcoming' && styles.statusTextUpcoming
                      ]}>
                        {status === 'past' ? 'Past' : status === 'ongoing' ? 'Active Now 🔥' : `In ${daysLeft} Days 📅`}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.holidayItemBody}>
                    <Text style={styles.holidayHindiName}>{item.title}</Text>
                    <Text style={styles.holidayEnglishName}>{item.titleEn}</Text>
                    <Text style={styles.holidayDescription}>{item.description}</Text>
                  </View>

                  {/* Long Vacation Timeline / Progress Visual */}
                  {item.isVacation && (
                    <View style={styles.timelineContainer}>
                      <View style={styles.timelineTrack} />
                      <View style={styles.timelineRow}>
                        <View style={styles.timelineDotContainer}>
                          <View style={styles.timelineDot} />
                          <Text style={styles.timelineText}>{item.startDate.split('-').slice(1).reverse().join('/')}</Text>
                        </View>
                        <View style={styles.timelineProgressPill}>
                          <Text style={styles.timelineProgressText}>{item.duration}</Text>
                        </View>
                        <View style={styles.timelineDotContainer}>
                          <View style={[styles.timelineDot, styles.timelineDotEnd]} />
                          <Text style={styles.timelineText}>{item.endDate.split('-').slice(1).reverse().join('/')}</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  <View style={styles.holidayItemFooter}>
                    <View style={styles.holidayFooterMeta}>
                      <Ionicons name="calendar-outline" size={12} color="#64748B" />
                      <Text style={styles.holidayFooterText}>{dateDisplay} • {item.day} • {item.category}</Text>
                    </View>
                    <View style={styles.holidayDurationPill}>
                      <Text style={styles.holidayDurationText}>{item.duration}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      ) : (
        /* 3. CALENDAR VIEW */
        <View style={styles.calendarContainer}>
          {/* Month Pager Switcher Bar */}
          <View style={styles.monthPager}>
            <TouchableOpacity 
              style={styles.pagerArrow}
              onPress={() => {
                setCalendarMonth(prev => {
                  if (prev === 0) {
                    setCalendarYear(y => y - 1);
                    return 11;
                  }
                  return prev - 1;
                });
              }}
              activeOpacity={0.6}
            >
              <Ionicons name="chevron-back" size={18} color="#0F172A" />
            </TouchableOpacity>

            <Text style={styles.pagerMonthText}>{MONTH_NAMES[calendarMonth]} {calendarYear}</Text>

            <TouchableOpacity 
              style={styles.pagerArrow}
              onPress={() => {
                setCalendarMonth(prev => {
                  if (prev === 11) {
                    setCalendarYear(y => y + 1);
                    return 0;
                  }
                  return prev + 1;
                });
              }}
              activeOpacity={0.6}
            >
              <Ionicons name="chevron-forward" size={18} color="#0F172A" />
            </TouchableOpacity>
          </View>

          {/* Weekday Row Header labels */}
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map(day => (
              <Text key={day} style={styles.weekdayLabel}>{day}</Text>
            ))}
          </View>

          {/* Calendar Days Grid */}
          <View style={styles.calendarGrid}>
            {getMonthDaysCells(calendarYear, calendarMonth).map((cell, idx) => {
              const holiday = cell.day ? getHolidayForDate(cell.dateStr) : null;
              const isSelected = selectedCalendarHoliday && holiday && selectedCalendarHoliday.id === holiday.id;
              const isToday = !!cell.day && cell.dateStr === getTodayDateStr();

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.calendarCell,
                    !cell.day && styles.calendarCellEmpty,
                    holiday && styles.calendarCellHoliday,
                    isToday && styles.calendarCellToday,
                    isSelected && styles.calendarCellSelected
                  ]}
                  onPress={() => { if (holiday) setSelectedCalendarHoliday(holiday); }}
                  disabled={!holiday}
                  activeOpacity={0.8}
                >
                  {cell.day ? (
                    <>
                      <Text style={[
                        styles.calendarCellText,
                        holiday && styles.calendarCellTextHoliday,
                        isToday && styles.calendarCellTextToday,
                        isSelected && styles.calendarCellTextSelected
                      ]}>
                        {cell.day}
                      </Text>
                      {holiday && !isSelected && <View style={styles.holidayIndicatorDot} />}
                    </>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Selected Holiday Detail Card immediately below Grid */}
          {selectedCalendarHoliday ? (
            <View style={styles.selectedHolidayCard}>
              <View style={styles.selectedHolidayHeader}>
                <View style={styles.selectedSNoBadge}>
                  <Text style={styles.selectedSNoText}>{selectedCalendarHoliday.id}</Text>
                </View>
                <View style={styles.selectedCategoryBadge}>
                  <Text style={styles.selectedCategoryText}>{selectedCalendarHoliday.category}</Text>
                </View>
              </View>
              <Text style={styles.selectedHindiTitle}>{selectedCalendarHoliday.title}</Text>
              <Text style={styles.selectedEnglishTitle}>{selectedCalendarHoliday.titleEn}</Text>
              <Text style={styles.selectedDescription}>{selectedCalendarHoliday.description}</Text>
              
              {/* Selected Vacation Timeline */}
              {selectedCalendarHoliday.isVacation && (
                <View style={[styles.timelineContainer, { marginTop: 10 }]}>
                  <View style={styles.timelineTrack} />
                  <View style={styles.timelineRow}>
                    <View style={styles.timelineDotContainer}>
                      <View style={styles.timelineDot} />
                      <Text style={styles.timelineText}>{selectedCalendarHoliday.startDate.split('-').slice(1).reverse().join('/')}</Text>
                    </View>
                    <View style={styles.timelineProgressPill}>
                      <Text style={styles.timelineProgressText}>{selectedCalendarHoliday.duration}</Text>
                    </View>
                    <View style={styles.timelineDotContainer}>
                      <View style={[styles.timelineDot, styles.timelineDotEnd]} />
                      <Text style={styles.timelineText}>{selectedCalendarHoliday.endDate.split('-').slice(1).reverse().join('/')}</Text>
                    </View>
                  </View>
                </View>
              )}

              <View style={styles.selectedFooter}>
                <Ionicons name="time" size={13} color="#F97316" />
                <Text style={styles.selectedFooterText}>
                  Day: {selectedCalendarHoliday.day} • Duration: {selectedCalendarHoliday.duration}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.calendarPrompt}>
              <Ionicons name="information-circle-outline" size={20} color="#F97316" />
              <Text style={styles.calendarPromptText}>
                Holidays are highlighted in orange. Tap any highlighted date cell to view specific holiday descriptions.
              </Text>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity 
        style={styles.circularTriggerBtn} 
        onPress={async () => {
          try {
            await WebBrowser.openBrowserAsync('https://beu-bih.ac.in/assets/static/doc/calandar%202026.pdf', {
              toolbarColor: '#0F172A',
              secondaryToolbarColor: '#F97316',
              enableBarCollapsing: true,
              showTitle: true,
            });
          } catch (error) {
            alert('Could not open the official circular link. Please visit the official BEU portal directly.');
          }
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="document-attach-outline" size={16} color="#0F172A" style={{ marginRight: 6 }} />
        <Text style={styles.circularTriggerText}>View Official BEU Holiday Circular</Text>
      </TouchableOpacity>
      </ScrollView>
    </DetailModal>
  );
}

const styles = StyleSheet.create({
  richTextParagraph: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 8,
  },
  holidaySearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
    marginBottom: 10,
  },
  holidaySearchInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#0F172A',
    fontWeight: '500',
    paddingVertical: 0,
  },
  holidayChipsContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  holidayChipBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  holidayChipBtnActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#F97316',
  },
  holidayChipBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  holidayChipBtnTextActive: {
    color: '#F97316',
    fontWeight: 'bold',
  },
  holidayItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    boxShadow: Platform.OS === 'web' ? `${0}px ${2}px ${6}px #0F172A` : undefined,

    elevation: 1,
  },
  holidayCardOngoing: {
    borderColor: '#EF4444',
    borderWidth: 1.2,
    backgroundColor: '#FFF5F5',
  },
  holidayCardImminent: {
    borderColor: '#F97316',
    backgroundColor: '#FFFBF7',
  },
  holidayItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  holidaySNoBadge: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  holidaySNoText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#475569',
  },
  holidayStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeImminent: {
    backgroundColor: '#FFF7ED',
  },
  statusBadgePast: {
    backgroundColor: '#F1F5F9',
  },
  statusBadgeOngoing: {
    backgroundColor: '#FEF2F2',
  },
  statusBadgeUpcoming: {
    backgroundColor: '#FFF7ED',
  },
  holidayStatusBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  statusTextPast: {
    color: '#64748B',
  },
  statusTextOngoing: {
    color: '#EF4444',
  },
  statusTextUpcoming: {
    color: '#F97316',
  },
  holidayItemBody: {
    marginBottom: 8,
  },
  holidayHindiName: {
    fontSize: 14.5,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  holidayEnglishName: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  holidayDescription: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
    lineHeight: 16,
  },
  holidayItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.8,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  holidayFooterMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  holidayFooterText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },
  holidayDurationPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  holidayDurationText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  viewToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 4,
    gap: 4,
    marginTop: 10,
    marginBottom: 14,
  },
  viewToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  viewToggleBtnActive: {
    backgroundColor: '#0F172A',
  },
  viewToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  viewToggleTextActive: {
    color: '#FFFFFF',
  },
  timelineContainer: {
    marginVertical: 12,
    paddingHorizontal: 8,
    position: 'relative',
    height: 40,
    justifyContent: 'center',
  },
  timelineTrack: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 3,
    backgroundColor: '#E2E8F0',
    top: 12,
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineDotContainer: {
    alignItems: 'center',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginBottom: 4,
  },
  timelineDotEnd: {
    backgroundColor: '#EF4444',
  },
  timelineText: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: '#64748B',
  },
  timelineProgressPill: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 2,
    top: -8,
  },
  timelineProgressText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F97316',
  },
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    boxShadow: Platform.OS === 'web' ? `${0}px ${2}px ${8}px #0F172A` : undefined,

    elevation: 1,
  },
  monthPager: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  pagerArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pagerMonthText: {
    fontSize: 14.5,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 6,
  },
  weekdayLabel: {
    width: (width - 80) / 7,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 4,
  },
  calendarCell: {
    width: (width - 92) / 7,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 4,
  },
  calendarCellEmpty: {
    backgroundColor: 'transparent',
  },
  calendarCellHoliday: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  calendarCellToday: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1.5,
    borderColor: '#2E7D32',
  },
  calendarCellSelected: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  calendarCellText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  calendarCellTextHoliday: {
    color: '#F97316',
    fontWeight: '800',
  },
  calendarCellTextToday: {
    color: '#2E7D32',
    fontWeight: '900',
  },
  calendarCellTextSelected: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  holidayIndicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F97316',
    position: 'absolute',
    bottom: 4,
  },
  selectedHolidayCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#F97316',
    padding: 12,
    marginTop: 14,
  },
  selectedHolidayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  selectedSNoBadge: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedSNoText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#F97316',
  },
  selectedCategoryBadge: {
    backgroundColor: '#0F172A',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  selectedCategoryText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  selectedHindiTitle: {
    fontSize: 14.5,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  selectedEnglishTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
  selectedDescription: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
    marginTop: 6,
    fontWeight: '500',
  },
  selectedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    borderTopWidth: 0.8,
    borderTopColor: '#FFE0C2',
    paddingTop: 8,
  },
  selectedFooterText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#F97316',
  },
  calendarPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    gap: 8,
    marginTop: 12,
  },
  calendarPromptText: {
    flex: 1,
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
    lineHeight: 15,
  },
  circularTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 16,
    width: '100%',
  },
  circularTriggerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
});
export default HolidaysModal;
