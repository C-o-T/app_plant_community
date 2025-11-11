import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// 푸시 알림 동작 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * 푸시 알림 권한 요청 및 토큰 받기
 * @returns {Promise<string|null>} Expo Push Token
 */
export async function registerForPushNotificationsAsync() {
  let token = null;

  // 실제 디바이스인지 확인 (에뮬레이터는 푸시 지원 안 함)
  if (!Device.isDevice) {
    console.log('[테스트 모드] 에뮬레이터에서 푸시 토큰 생성 시도 중...');
  }

  // Android 푸시 알림 채널 설정
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4CAF50',
    });
  }

  // 푸시 알림 권한 확인
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // 권한이 없으면 요청
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  // 권한이 거부되면 null 반환
  if (finalStatus !== 'granted') {
    console.log('푸시 알림 권한이 거부되었습니다.');
    return null;
  }

  // Expo Push Token 받기
  try {
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Expo Push Token:', token);
  } catch (error) {
    console.error('푸시 토큰 받기 실패:', error);
  }

  return token;
}

/**
 * 푸시 알림 리스너 등록
 * @param {Function} onNotificationReceived - 알림 수신 시 콜백
 * @param {Function} onNotificationResponse - 알림 클릭 시 콜백
 * @returns {Object} cleanup 함수들
 */
export function setupNotificationListeners(onNotificationReceived, onNotificationResponse) {
  // 알림 수신 리스너 (앱이 foreground일 때)
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('알림 수신:', notification);
    if (onNotificationReceived) {
      onNotificationReceived(notification);
    }
  });

  // 알림 클릭 리스너
  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('알림 클릭:', response);
    if (onNotificationResponse) {
      onNotificationResponse(response);
    }
  });

  // cleanup 함수 반환
  return () => {
    Notifications.removeNotificationSubscription(notificationListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
}
