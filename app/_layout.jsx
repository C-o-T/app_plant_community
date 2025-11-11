import { StyleSheet, Text, View } from 'react-native'
import { useEffect, useRef } from 'react'
import { Stack, useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { registerForPushNotificationsAsync, setupNotificationListeners } from '@/utils/notifications'
import { updatePushToken } from '@/services/memberService'

const RootLayout = () => {
  const router = useRouter();
  const notificationListener = useRef();

  useEffect(() => {
    const checkAuth = async () => {
      const loginInfo = await SecureStore.getItemAsync('loginInfo');
      if (loginInfo) {
        // 로그인 정보가 있으면 메인 화면으로
        router.replace('/(tabs)');

        // 푸시 알림 토큰 등록 (에뮬레이터에서는 주석 처리)
        // registerPushToken();
      } else {
        // 로그인 정보가 없으면 로그인 화면으로
        router.replace('/auth/login');
      }
    };
    checkAuth();

    // 푸시 알림 리스너 설정 (에뮬레이터에서는 주석 처리)
    // notificationListener.current = setupNotificationListeners(
    //   (notification) => {
    //     // 알림 수신 시 처리 (앱이 foreground일 때)
    //     console.log('새 알림:', notification);
    //   },
    //   (response) => {
    //     // 알림 클릭 시 처리
    //     const data = response.notification.request.content.data;
    //     if (data?.boardNum) {
    //       // 게시글 알림이면 해당 게시글로 이동
    //       router.push(`/(tabs)/(home)/boardDetail?boardNum=${data.boardNum}`);
    //     }
    //   }
    // );

    // cleanup
    return () => {
      if (notificationListener.current) {
        notificationListener.current();
      }
    };
  }, []);

  // 푸시 토큰 등록 함수
  const registerPushToken = async () => {
    try {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        // 토큰을 SecureStore에 저장
        await SecureStore.setItemAsync('pushToken', token);

        // 백엔드에 토큰 전송
        const loginInfo = await SecureStore.getItemAsync('loginInfo');
        if (loginInfo) {
          const { memId } = JSON.parse(loginInfo);
          await updatePushToken(memId, token);
          console.log('푸시 토큰 백엔드 저장 완료:', token);
        }
      }
    } catch (error) {
      console.error('푸시 토큰 등록 실패:', error);
    }
  };

  return (
    <Stack screenOptions={{headerShown:false}}/>
  )
}

export default RootLayout

const styles = StyleSheet.create({})