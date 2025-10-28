import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/myFarmConstant';
import { fetchActuatorLogs } from '../../services/actuatorService';

const ActuatorLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('ALL'); // ALL, PUMP, FAN, LED

  const raspNum = '1'; // TODO: 로그인 연동 후 동적으로 변경

  // 로그 불러오기
  const loadLogs = async () => {
    try {
      setLoading(true);
      const actName = selectedFilter === 'ALL' ? null : selectedFilter;
      const data = await fetchActuatorLogs(raspNum, actName, 100);
      setLogs(data || []);
    } catch (error) {
      console.error('로그 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 새로고침
  const onRefresh = async () => {
    setRefreshing(true);
    await loadLogs();
    setRefreshing(false);
  };

  // 초기 로드
  useEffect(() => {
    loadLogs();
  }, [selectedFilter]);

  // 날짜 포맷팅
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${month}/${day} ${hours}:${minutes}:${seconds}`;
  };

  // 기기별 아이콘
  const getDeviceIcon = (actName) => {
    switch (actName) {
      case 'PUMP':
        return '💧';
      case 'FAN':
        return '💨';
      case 'LED':
        return '💡';
      case 'MOTION':
        return '🚶';
      default:
        return '⚙️';
    }
  };

  // 상태별 색상
  const getStateColor = (state) => {
    return state === 'ON' ? COLORS.success : COLORS.textLight;
  };

  // 모드별 배지 색상
  const getModeColor = (mode) => {
    if (mode === 'AUTO') return COLORS.info;
    if (mode === 'MANUAL') return COLORS.warning;
    return '#999'; // NULL이나 알 수 없는 경우
  };

  // 모드 표시 텍스트
  const getModeText = (mode) => {
    if (mode === 'AUTO') return 'AUTO';
    if (mode === 'MANUAL') return 'MANUAL';
    return '?'; // NULL이나 알 수 없는 경우
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>로그를 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>기기 상호작용 로그</Text>
        <Text style={styles.headerSubtitle}>제어 기록 및 히스토리</Text>
      </View>

      {/* 필터 버튼 */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['ALL', 'PUMP', 'FAN', 'LED', 'MOTION'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                selectedFilter === filter && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedFilter(filter)}>
              <Text
                style={[
                  styles.filterButtonText,
                  selectedFilter === filter && styles.filterButtonTextActive,
                ]}>
                {filter === 'ALL' ? '전체' : filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 로그 목록 */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }>
        {logs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>로그가 없습니다</Text>
          </View>
        ) : (
          logs.map((log, index) => (
            <View key={`${log.logId}-${index}`} style={styles.logCard}>
              <View style={styles.logHeader}>
                <View style={styles.logDeviceInfo}>
                  <Text style={styles.logIcon}>{getDeviceIcon(log.actName)}</Text>
                  <Text style={styles.logDevice}>{log.actName}</Text>
                </View>
                <View style={styles.logBadges}>
                  <View
                    style={[
                      styles.modeBadge,
                      { backgroundColor: getModeColor(log.mode) },
                    ]}>
                    <Text style={styles.modeBadgeText}>{getModeText(log.mode)}</Text>
                  </View>
                  <View
                    style={[
                      styles.stateBadge,
                      { backgroundColor: getStateColor(log.state) },
                    ]}>
                    <Text style={styles.stateBadgeText}>{log.state}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.logBody}>
                <View style={styles.logInfoRow}>
                  <Text style={styles.logInfoLabel}>상태:</Text>
                  <Text
                    style={[
                      styles.logInfoValue,
                      { color: getStateColor(log.state) },
                    ]}>
                    {log.state === 'ON' ? '켜짐' : '꺼짐'}
                  </Text>
                </View>
                <View style={styles.logInfoRow}>
                  <Text style={styles.logInfoLabel}>모드:</Text>
                  <Text style={[
                    styles.logInfoValue,
                    !log.mode && styles.logInfoValueError
                  ]}>
                    {log.mode === 'AUTO' ? '자동' : log.mode === 'MANUAL' ? '수동' : '미기록 (Python 스크립트 수정 필요)'}
                  </Text>
                </View>
                <View style={styles.logInfoRow}>
                  <Text style={styles.logInfoLabel}>시간:</Text>
                  <Text style={styles.logInfoValue}>
                    {formatDate(log.eventTime)}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* 통계 정보 */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>총 {logs.length}개 기록</Text>
      </View>
    </SafeAreaView>
  );
};

export default ActuatorLogs;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textLight,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 20,
    paddingTop: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
  },
  filterContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  logCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  logDeviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  logDevice: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  logBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  modeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modeBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  stateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stateBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  logBody: {
    gap: 8,
  },
  logInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logInfoLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    width: 60,
  },
  logInfoValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
    flex: 1,
  },
  logInfoValueError: {
    color: '#ff6b6b',
    fontStyle: 'italic',
  },
  statsContainer: {
    padding: 12,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
  },
  statsText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
});
