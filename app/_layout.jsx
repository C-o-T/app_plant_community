import { StyleSheet, Text, View } from 'react-native'
import { useEffect } from 'react'
import { Stack, useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'

const RootLayout = () => {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const loginInfo = await SecureStore.getItemAsync('loginInfo');
      if (loginInfo) {
        // 로그인 정보가 있으면 메인 화면으로
        router.replace('/(tabs)');
      } else {
        // 로그인 정보가 없으면 로그인 화면으로
        router.replace('/auth/login');
      }
    };
    checkAuth();
  }, []);

  return (
    <Stack screenOptions={{headerShown:false}}/>
  )
}

export default RootLayout

const styles = StyleSheet.create({})