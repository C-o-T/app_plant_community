import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/myFarmConstant';
import { controlActuator, fetchActuatorStatus } from '../../services/actuatorService';
import { fetchSensorData } from '../../services/sensorService';

const FarmManagement = () => {
  const router = useRouter();
  const [sensorData, setSensorData] = useState(null);
  const [actuatorStatus, setActuatorStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true); // 자동 새로고침 토글

  const raspNum = "1"; // 현재 농장 번호 (문자열 - DB VARCHAR 타입과 일치)
  const REFRESH_INTERVAL = 5000; // 5초마다 새로고침

  // 센서 데이터 불러오기
  const loadSensorData = async () => {
    try {
      const data = await fetchSensorData();
      console.log('센서 데이터:', data);
      setSensorData(data);
    } catch (error) {
      console.error('센서 데이터 로드 실패:', error);
    }
  };

  // 액추에이터 상태 불러오기
  const loadActuatorStatus = async () => {
    try {
      const actuators = ['PUMP', 'FAN', 'LED'];
      const statusPromises = actuators.map(async (actName) => {
        const status = await fetchActuatorStatus(raspNum, actName);
        return { [actName]: status };
      });
      const statuses = await Promise.all(statusPromises);
      const statusObj = Object.assign({}, ...statuses);
      setActuatorStatus(statusObj);
    } catch (error) {
      console.error('액추에이터 상태 로드 실패:', error);
    }
  };

  // 초기 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await loadSensorData();
      await loadActuatorStatus();
      setLoading(false);
    };
    loadData();
  }, []);

  // 자동 새로고침
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(async () => {
      console.log('🔄 자동 새로고침 중...');
      await loadSensorData();
      await loadActuatorStatus();
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval); // 컴포넌트 언마운트시 타이머 정리
  }, [autoRefresh]);

  // 새로고침
  const onRefresh = async () => {
    setRefreshing(true);
    await loadSensorData();
    await loadActuatorStatus();
    setRefreshing(false);
  };

  // 액추에이터 제어
  const handleActuatorControl = async (actName, command) => {
    try {
      console.log(`🎮 제어 시도: ${actName} - ${command}`);
      console.log(`📡 API URL: http://192.168.30.107:8080/control/control`);
      console.log(`📦 요청 데이터:`, { raspNum, actName, command });
      
      if (command === 'AUTO') {
        // AUTO 모드로 전환하는 경우
        await controlActuator(raspNum, actName, 'AUTO');
        // UI에 즉시 반영
        setActuatorStatus(prev => ({
          ...prev,
          [actName]: { state: 'AUTO', mode: 'AUTO' }
        }));
      } else {
        // ON/OFF 명령인 경우
        await controlActuator(raspNum, actName, command);
        // UI에 즉시 반영
        setActuatorStatus(prev => ({
          ...prev,
          [actName]: { state: command, mode: 'MANUAL' }
        }));
      }
      
      console.log('✅ 제어 성공!');
      
    } catch (error) {
      console.error('❌ 액추에이터 제어 실패:', error);
      console.error('❌ 에러 상세:', error.message);
      alert(`제어에 실패했습니다.\n${error.message || '네트워크 오류'}`);
    }
  };

  // 모든 기기를 AUTO로 초기화
  const resetAllToAuto = async () => {
    try {
      console.log('🔄 모든 기기 AUTO 초기화 시작...');
      await Promise.all([
        controlActuator(raspNum, 'PUMP', 'AUTO'),
        controlActuator(raspNum, 'FAN', 'AUTO'),
        controlActuator(raspNum, 'LED', 'AUTO')
      ]);
      
      // UI 업데이트
      setActuatorStatus({
        PUMP: { state: 'AUTO', mode: 'AUTO' },
        FAN: { state: 'AUTO', mode: 'AUTO' },
        LED: { state: 'AUTO', mode: 'AUTO' }
      });
      
      console.log('✅ 모든 기기 AUTO로 초기화 완료!');
      alert('모든 기기가 자동 모드로 전환되었습니다.');
      
      // 상태 재조회
      await loadActuatorStatus();
    } catch (error) {
      console.error('❌ AUTO 초기화 실패:', error);
      alert('AUTO 초기화에 실패했습니다.');
    }
  };

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
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🌱 농장 #{raspNum}</Text>
          <Text style={styles.headerSubtitle}>
            {sensorData?.sensorTime 
              ? `마지막 업데이트: ${new Date(sensorData.sensorTime).toLocaleString('ko-KR')}`
              : '실시간 모니터링 및 제어'}
          </Text>
        </View>

        {/* 센서 데이터 섹션 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.titleContainer}>
              <Text style={styles.sectionTitle}>센서 데이터</Text>
              {sensorData?.sensorTime && (
                <Text style={styles.sectionSubtitle}>
                  {(() => {
                    const dataDate = new Date(sensorData.sensorTime);
                    const now = new Date();
                    const diffMs = now - dataDate;
                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                    
                    if (diffDays > 0) {
                      return `⚠️ ${diffDays}일 전 데이터`;
                    } else {
                      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                      if (diffHours > 0) return `⚠️ ${diffHours}시간 전`;
                      const diffMinutes = Math.floor(diffMs / (1000 * 60));
                      if (diffMinutes > 5) return `⚠️ ${diffMinutes}분 전`;
                      return '✅ 최신';
                    }
                  })()}
                </Text>
              )}
            </View>
            
            {/* 자동 새로고침 토글 버튼 */}
            <TouchableOpacity
              style={[styles.autoRefreshButton, autoRefresh && styles.autoRefreshButtonActive]}
              onPress={() => setAutoRefresh(!autoRefresh)}>
              <Text style={[styles.autoRefreshText, autoRefresh && styles.autoRefreshTextActive]}>
                {autoRefresh ? '🔄 자동' : '⏸️ 수동'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* 2x2 그리드 레이아웃 */}
          <View style={styles.sensorContainer}>
            <View style={styles.sensorRow}>
              <View style={[styles.sensorCard, { borderLeftColor: COLORS.temperature }]}>
                <Text style={styles.sensorIcon}>🌡️</Text>
                <Text style={styles.sensorLabel}>온도</Text>
                <Text style={styles.sensorValue}>
                  {sensorData?.temperature ? `${sensorData.temperature.toFixed(1)}°C` : '-'}
                </Text>
              </View>
              <View style={[styles.sensorCard, { borderLeftColor: COLORS.humidity }]}>
                <Text style={styles.sensorIcon}>💧</Text>
                <Text style={styles.sensorLabel}>습도</Text>
                <Text style={styles.sensorValue}>
                  {sensorData?.humidity ? `${sensorData.humidity.toFixed(1)}%` : '-'}
                </Text>
              </View>
            </View>
            
            <View style={styles.sensorRow}>
              <View style={[styles.sensorCard, { borderLeftColor: COLORS.light }]}>
                <Text style={styles.sensorIcon}>☀️</Text>
                <Text style={styles.sensorLabel}>조도</Text>
                <Text style={styles.sensorValue}>
                  {sensorData?.illuminance ? `${sensorData.illuminance}lux` : '-'}
                </Text>
              </View>
              <View style={[styles.sensorCard, { borderLeftColor: COLORS.soil }]}>
                <Text style={styles.sensorIcon}>🌱</Text>
                <Text style={styles.sensorLabel}>토양 수분</Text>
                <Text style={styles.sensorValue}>
                  {sensorData?.soilMoisture ? `${sensorData.soilMoisture.toFixed(1)}%` : '-'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 액추에이터 제어 섹션 */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderWithButton}>
            <Text style={styles.sectionTitle}>장치 제어</Text>
            <View style={styles.headerButtonGroup}>
              <TouchableOpacity 
                style={styles.logButton}
                onPress={() => router.push('/myFarm/logs')}>
                <Text style={styles.logButtonText}>📊 로그</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.resetButton}
                onPress={resetAllToAuto}>
                <Text style={styles.resetButtonText}>🔄 전체 AUTO</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* PUMP 제어 */}
          <View style={styles.actuatorCard}>
            <View style={styles.actuatorHeader}>
              <View style={[styles.actuatorIcon, { backgroundColor: `${COLORS.pump}20` }]}>
                <Text style={styles.actuatorEmoji}>💧</Text>
              </View>
              <View style={styles.actuatorInfo}>
                <Text style={styles.actuatorName}>급수 펌프</Text>
                <Text style={styles.actuatorState}>
                  상태: {actuatorStatus.PUMP?.state === 'ON' ? '🟢 작동중' : '⚪ 정지'}
                </Text>
                <Text style={styles.actuatorMode}>
                  {actuatorStatus.PUMP?.mode || 'AUTO'} 모드
                </Text>
              </View>
            </View>
            <View style={styles.controlButtons}>
              <TouchableOpacity
                style={[styles.controlButton, styles.onButton]}
                onPress={() => handleActuatorControl('PUMP', 'ON')}>
                <Text style={styles.controlButtonText}>켜기</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.controlButton, styles.offButton]}
                onPress={() => handleActuatorControl('PUMP', 'OFF')}>
                <Text style={styles.controlButtonText}>끄기</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.controlButton, styles.autoButton]}
                onPress={() => handleActuatorControl('PUMP', 'AUTO')}>
                <Text style={styles.controlButtonText}>자동</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* FAN 제어 */}
          <View style={styles.actuatorCard}>
            <View style={styles.actuatorHeader}>
              <View style={[styles.actuatorIcon, { backgroundColor: `${COLORS.fan}20` }]}>
                <Text style={styles.actuatorEmoji}>💨</Text>
              </View>
              <View style={styles.actuatorInfo}>
                <Text style={styles.actuatorName}>환풍기</Text>
                <Text style={styles.actuatorState}>
                  상태: {actuatorStatus.FAN?.state === 'ON' ? '🟢 작동중' : '⚪ 정지'}
                </Text>
                <Text style={styles.actuatorMode}>
                  {actuatorStatus.FAN?.mode || 'AUTO'} 모드
                </Text>
              </View>
            </View>
            <View style={styles.controlButtons}>
              <TouchableOpacity
                style={[styles.controlButton, styles.onButton]}
                onPress={() => handleActuatorControl('FAN', 'ON')}>
                <Text style={styles.controlButtonText}>켜기</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.controlButton, styles.offButton]}
                onPress={() => handleActuatorControl('FAN', 'OFF')}>
                <Text style={styles.controlButtonText}>끄기</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.controlButton, styles.autoButton]}
                onPress={() => handleActuatorControl('FAN', 'AUTO')}>
                <Text style={styles.controlButtonText}>자동</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* LED 제어 */}
          <View style={styles.actuatorCard}>
            <View style={styles.actuatorHeader}>
              <View style={[styles.actuatorIcon, { backgroundColor: `${COLORS.led}20` }]}>
                <Text style={styles.actuatorEmoji}>💡</Text>
              </View>
              <View style={styles.actuatorInfo}>
                <Text style={styles.actuatorName}>LED 조명</Text>
                <Text style={styles.actuatorState}>
                  상태: {actuatorStatus.LED?.state === 'ON' ? '🟢 작동중' : '⚪ 정지'}
                </Text>
                <Text style={styles.actuatorMode}>
                  {actuatorStatus.LED?.mode || 'AUTO'} 모드
                </Text>
              </View>
            </View>
            <View style={styles.controlButtons}>
              <TouchableOpacity
                style={[styles.controlButton, styles.onButton]}
                onPress={() => handleActuatorControl('LED', 'ON')}>
                <Text style={styles.controlButtonText}>켜기</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.controlButton, styles.offButton]}
                onPress={() => handleActuatorControl('LED', 'OFF')}>
                <Text style={styles.controlButtonText}>끄기</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.controlButton, styles.autoButton]}
                onPress={() => handleActuatorControl('LED', 'AUTO')}>
                <Text style={styles.controlButtonText}>자동</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default FarmManagement;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textLight,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 24,
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
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  sectionHeaderWithButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  logButton: {
    backgroundColor: COLORS.info,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  resetButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  autoRefreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  autoRefreshButtonActive: {
    backgroundColor: `${COLORS.primary}20`,
    borderColor: COLORS.primary,
  },
  autoRefreshText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  autoRefreshTextActive: {
    color: COLORS.primary,
  },
  sensorContainer: {
    gap: 8,
  },
  sensorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  sensorGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sensorCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sensorIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  sensorLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  sensorValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  actuatorCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actuatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  actuatorIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actuatorEmoji: {
    fontSize: 24,
  },
  actuatorInfo: {
    flex: 1,
  },
  actuatorName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  actuatorState: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  actuatorMode: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  controlButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  onButton: {
    backgroundColor: '#4CAF50',
  },
  offButton: {
    backgroundColor: '#757575',
  },
  autoButton: {
    backgroundColor: COLORS.primary,
  },
  controlButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  infoBox: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoBoxText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
  },
});
