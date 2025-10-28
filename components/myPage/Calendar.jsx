// components/myPage/Calendar.jsx
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LocaleConfig, Calendar as RNCalendar } from 'react-native-calendars';
import { COLORS } from '../../constants/myPageConstant';
import {
  addDiary as apiAddDiary,
  addWateringSchedule as apiAddWatering,
  fetchDiaries,
  fetchWateringSchedules,
} from '../../services/calendarService';

// ✅ ESM/CJS 호환 안전 import (date-holidays)
import HolidaysLib from 'date-holidays';
const Holidays = HolidaysLib.default ?? HolidaysLib;

// ─────────────────────────────────────
// Locale: Korean
// ─────────────────────────────────────
LocaleConfig.locales['ko'] = {
  monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  monthNamesShort: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
  dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
  today: '오늘',
};
LocaleConfig.defaultLocale = 'ko';

const CalendarComponent = () => {
  const [selectedDate, setSelectedDate] = useState('');
  const [markedDates, setMarkedDates] = useState({});
  const [events, setEvents] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [diaryModalVisible, setDiaryModalVisible] = useState(false);  // TODO: 로그인 연동 후 교체
  const memId = 'user1';

  // 물주기 일정 입력 폼
  const [wateringData, setWateringData] = useState({
    plantName: '',
    cycle: '7',
    count: '4',
  });

  // 일기 입력 폼
  const [diaryData, setDiaryData] = useState({
    title: '',
    content: '',
    weather: '맑음',
  });

  // 초기 로딩
  useEffect(() => {
    loadAllData();
    loadHolidays();
  }, []);

  // ─────────────────────────────────────
  // 공휴일 로드 및 마킹
  // ─────────────────────────────────────
  const loadHolidays = () => {
    try {
      const hd = new Holidays('KR'); // 한국
      const currentYear = new Date().getFullYear();
      const list = hd.getHolidays(currentYear);

      const holidayMarks = {};
      list.forEach((holiday) => {
        // holiday.date 가 문자열/Date 둘 다 가능 → 방어
        const d =
          holiday?.date instanceof Date
            ? holiday.date
            : new Date(String(holiday?.date ?? '').split(' ')[0] || '');

        if (!isNaN(d)) {
          const dateString = d.toISOString().slice(0, 10); // YYYY-MM-DD
          holidayMarks[dateString] = {
            marked: true,
            dotColor: '#FF6B6B',
            customStyles: {
              container: { backgroundColor: '#FF6B6B20' },
              text: { color: '#FF6B6B', fontWeight: 'bold' },
            },
          };
        }
      });

      setMarkedDates((prev) => ({ ...prev, ...holidayMarks }));
    } catch (e) {
      console.warn('공휴일 로드 실패:', e);
    }
  };

  // ─────────────────────────────────────
  // 전체 데이터 로드
  // ─────────────────────────────────────
  const loadAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadWateringSchedules(), loadDiaries()]);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      Alert.alert('오류', '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 물주기 일정 로드
  const loadWateringSchedules = async () => {
    try {
      const waterings = await fetchWateringSchedules(memId);
      const wateringEvents = (waterings ?? []).map((w) => ({
        id: w.wateringId ?? `watering-${w.wateringDate}-${w.plantName}`,
        type: 'watering',
        date: w.wateringDate, // YYYY-MM-DD
        plantName: w.plantName,
        cycle: w.cycleDay,
      }));

      updateEventsAndMarkers(wateringEvents, 'watering');
    } catch (error) {
      console.error('물주기 일정 로드 실패:', error);
    }
  };

  // 일기 로드
  const loadDiaries = async () => {
    try {
      const diaries = await fetchDiaries(memId);
      const diaryEvents = (diaries ?? []).map((d) => ({
        id: d.diaryId ?? `diary-${d.diaryDate}-${d.diaryTitle}`,
        type: 'diary',
        date: d.diaryDate, // YYYY-MM-DD
        title: d.diaryTitle,
        content: d.diaryContent,
        weather: d.weather ?? d.diaryWeather ?? '맑음', // 서비스 키 이름 차이 방어
      }));

      updateEventsAndMarkers(diaryEvents, 'diary');
    } catch (error) {
      console.error('일기 로드 실패:', error);
    }
  };

  // 이벤트/마커 업데이트 (타입별 교체)
  const updateEventsAndMarkers = (newEvents, type) => {
    setEvents((prev) => {
      const filtered = prev.filter((e) => e.type !== type);
      return [...filtered, ...newEvents];
    });

    const newMarked = {};
    newEvents.forEach((event) => {
      newMarked[event.date] = {
        ...(markedDates[event.date] ?? {}),
        marked: true,
        dotColor: type === 'watering' ? COLORS.primary : '#FFD700',
        // customStyles 는 공휴일용에서만 사용해도 되지만,
        // 필요하면 타입별 스타일 추가 가능
      };
    });

    setMarkedDates((prev) => ({ ...prev, ...newMarked }));
  };

  // 날짜 선택
  const onDayPress = (day) => {
    setSelectedDate(day.dateString); // YYYY-MM-DD
    // console.log('선택된 날짜:', day.dateString);
  };

  // 물주기 일정 추가
  const addWateringSchedule = async () => {
    if (!wateringData.plantName) {
      Alert.alert('알림', '식물 이름을 입력해주세요.');
      return;
    }

    try {
      const cycle = parseInt(wateringData.cycle, 10);
      const count = parseInt(wateringData.count, 10);
      const startDate = new Date(selectedDate);

      if (isNaN(cycle) || isNaN(count) || !selectedDate) {
        Alert.alert('알림', '날짜/주기/횟수를 확인해주세요.');
        return;
      }

      // 여러 일정 등록
      for (let i = 0; i < count; i++) {
        const eventDate = new Date(startDate);
        eventDate.setDate(startDate.getDate() + i * cycle);
        const dateString = eventDate.toISOString().split('T')[0];

        await apiAddWatering(memId, {
          plantName: wateringData.plantName,
          date: dateString,
          cycle: cycle,
        });
      }

      await loadWateringSchedules(); // 리로드

      setModalVisible(false);
      setWateringData({ plantName: '', cycle: '7', count: '4' });
      Alert.alert('성공', '물주기 일정이 추가되었습니다.');
    } catch (error) {
      console.error('물주기 일정 추가 실패:', error);
      Alert.alert('오류', '물주기 일정 추가에 실패했습니다.');
    }
  };

  // 일기 작성
  const addDiary = async () => {
    if (!diaryData.title || !diaryData.content) {
      Alert.alert('알림', '제목과 내용을 입력해주세요.');
      return;
    }
    if (!selectedDate) {
      Alert.alert('알림', '날짜를 먼저 선택해주세요.');
      return;
    }

    try {
      await apiAddDiary(memId, {
        title: diaryData.title,
        content: diaryData.content,
        weather: diaryData.weather,
        date: selectedDate,
      });

      await loadDiaries(); // 리로드

      setDiaryModalVisible(false);
      setDiaryData({ title: '', content: '', weather: '맑음' });
      Alert.alert('성공', '일기가 작성되었습니다.');
    } catch (error) {
      console.error('일기 작성 실패:', error);
      Alert.alert('오류', '일기 작성에 실패했습니다.');
    }
  };

  // 특정 날짜 이벤트
  const getEventsForDate = (date) => events.filter((event) => event.date === date);
  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>데이터를 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>농사 캘린더</Text>
          <Text style={styles.headerSubtitle}>물주기와 일기를 기록하세요</Text>
        </View>

        {/* 캘린더 */}
        <View style={styles.calendarContainer}>
          <RNCalendar
            markingType="custom" // ✅ customStyles 사용을 위해 필요
            onDayPress={onDayPress}
            markedDates={{
              ...markedDates,
              ...(selectedDate
                ? {
                    [selectedDate]: {
                      ...(markedDates[selectedDate] ?? {}),
                      selected: true,
                      selectedColor: COLORS.primary,
                    },
                  }
                : {}),
            }}
            theme={{
              selectedDayBackgroundColor: COLORS.primary,
              todayTextColor: COLORS.primary,
              dotColor: COLORS.primary,
              arrowColor: COLORS.primary,
              monthTextColor: COLORS.text,
              textMonthFontSize: 18,
              textMonthFontWeight: 'bold',
              'stylesheet.day.basic': {
                base: {
                  width: 32,
                  height: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                text: {
                  marginTop: 4,
                  fontSize: 16,
                  fontFamily: 'System',
                  fontWeight: '300',
                  color: '#2d4150',
                  backgroundColor: 'rgba(255, 255, 255, 0)',
                },
              },
            }}
            dayComponent={({ date, state, marking }) => {
              // ✅ 요일 계산은 date.dateString으로 해야 정확
              const weekday = new Date(date.dateString).getDay(); // 0=일,6=토
              const isSunday = weekday === 0;
              const isSaturday = weekday === 6;

              let textColor = '#2d4150';
              if (state === 'disabled') {
                textColor = '#d9e1e8';
              } else if (state === 'today') {
                textColor = COLORS.primary;
              } else if (marking?.textColor) {
                textColor = marking.textColor; // 공휴일 적용
              } else if (isSunday) {
                textColor = '#FF6B6B';
              } else if (isSaturday) {
                textColor = '#4285F4';
              }

              const isSelected = !!marking?.selected;
              const bgColor = isSelected
                ? COLORS.primary
                : marking?.selectedColor || 'transparent';

              return (
                <TouchableOpacity
                  onPress={() => onDayPress(date)}
                  style={{
                    width: 32,
                    height: 32,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: bgColor,
                    borderRadius: isSelected ? 16 : 0,
                  }}
                >
                  {marking?.marked && (
                    <View
                      style={{
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: marking.dotColor || COLORS.primary,
                      }}
                    />
                  )}
                  <Text
                    style={{
                      fontSize: 16,
                      color: isSelected ? '#FFFFFF' : textColor,
                      fontWeight: state === 'today' ? 'bold' : '300',
                    }}
                  >
                    {date.day}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* 선택된 날짜 표시 */}
        {selectedDate && (
          <View style={styles.selectedDateContainer}>
            <Text style={styles.selectedDateText}>📅 {selectedDate}</Text>

            {/* 버튼 그룹 */}
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: COLORS.primary }]}
                onPress={() => setModalVisible(true)}
              >
                <Text style={styles.actionButtonText}>💧 물주기</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#FFD700' }]}
                onPress={() => setDiaryModalVisible(true)}
              >
                <Text style={styles.actionButtonText}>📝 일기쓰기</Text>
              </TouchableOpacity>
            </View>

            {/* 선택된 날짜의 이벤트 */}
            {selectedDateEvents.length > 0 && (
              <View style={styles.eventsContainer}>
                <Text style={styles.eventsTitle}>이날의 일정</Text>
                {selectedDateEvents.map((event) => (
                  <View
                    key={event.id}
                    style={[
                      styles.eventCard,
                      { borderLeftColor: event.type === 'watering' ? COLORS.primary : '#FFD700' },
                    ]}
                  >
                    {event.type === 'watering' ? (
                      <>
                        <Text style={styles.eventType}>💧 물주기</Text>
                        <Text style={styles.eventContent}>{event.plantName}</Text>
                        <Text style={styles.eventDetail}>주기: {event.cycle}일</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.eventType}>📝 일기</Text>
                        <Text style={styles.eventContent}>{event.title}</Text>
                        <Text style={styles.eventDetail}>날씨: {event.weather ?? '맑음'}</Text>
                      </>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* 물주기 모달 */}
        <Modal
          animationType="slide"
          transparent
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>💧 물주기 일정 추가</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>식물 이름</Text>
                <TextInput
                  style={styles.input}
                  placeholder="예: 토마토"
                  value={wateringData.plantName}
                  onChangeText={(text) => setWateringData({ ...wateringData, plantName: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>물주기 주기 (일)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="예: 7"
                  keyboardType="numeric"
                  value={wateringData.cycle}
                  onChangeText={(text) => setWateringData({ ...wateringData, cycle: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>반복 횟수</Text>
                <TextInput
                  style={styles.input}
                  placeholder="예: 4"
                  keyboardType="numeric"
                  value={wateringData.count}
                  onChangeText={(text) => setWateringData({ ...wateringData, count: text })}
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalButtonText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={addWateringSchedule}
                >
                  <Text style={styles.modalButtonText}>추가</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* 일기 모달 */}
        <Modal
          animationType="slide"
          transparent
          visible={diaryModalVisible}
          onRequestClose={() => setDiaryModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>📝 농사 일기 작성</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>제목</Text>
                <TextInput
                  style={styles.input}
                  placeholder="일기 제목"
                  value={diaryData.title}
                  onChangeText={(text) => setDiaryData({ ...diaryData, title: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>날씨</Text>
                <View style={styles.weatherButtons}>
                  {['맑음', '흐림', '비', '눈'].map((weather) => (
                    <TouchableOpacity
                      key={weather}
                      style={[
                        styles.weatherButton,
                        diaryData.weather === weather && styles.weatherButtonActive,
                      ]}
                      onPress={() => setDiaryData({ ...diaryData, weather })}
                    >
                      <Text
                        style={[
                          styles.weatherButtonText,
                          diaryData.weather === weather && styles.weatherButtonTextActive,
                        ]}
                      >
                        {weather}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>내용</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="오늘의 농사 일기를 작성하세요..."
                  value={diaryData.content}
                  onChangeText={(text) => setDiaryData({ ...diaryData, content: text })}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setDiaryModalVisible(false)}
                >
                  <Text style={styles.modalButtonText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={addDiary}
                >
                  <Text style={styles.modalButtonText}>저장</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: COLORS.textLight },
  scrollView: { flex: 1 },

  header: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: COLORS.textLight },

  calendarContainer: {
    backgroundColor: COLORS.white,
    margin: 16,
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  selectedDateContainer: { margin: 16, marginTop: 0 },
  selectedDateText: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: 12 },

  buttonGroup: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  actionButton: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  actionButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },

  eventsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventsTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  eventCard: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  eventType: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  eventContent: { fontSize: 16, color: COLORS.text, marginBottom: 2 },
  eventDetail: { fontSize: 12, color: COLORS.textLight },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: COLORS.white, borderRadius: 16, padding: 24, width: '90%', maxWidth: 400 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginBottom: 20, textAlign: 'center' },

  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  textArea: { height: 120, paddingTop: 12 },

  weatherButtons: { flexDirection: 'row', gap: 8 },
  weatherButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  weatherButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  weatherButtonText: { fontSize: 14, color: COLORS.textLight },
  weatherButtonTextActive: { color: COLORS.white, fontWeight: '600' },

  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  cancelButton: { backgroundColor: COLORS.border },
  confirmButton: { backgroundColor: COLORS.primary },
  modalButtonText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
});

export default CalendarComponent;
