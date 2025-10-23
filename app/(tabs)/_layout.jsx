import { StyleSheet, Text, View } from 'react-native'
import React, { useState, useEffect } from 'react'
import { Tabs } from 'expo-router'
import * as SecureStore from 'expo-secure-store'

const TabLayout = () => {
  const [loginInfo, setLoginInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 로그인 정보 가져오기
    const getLoginInfo = async () => {
      const info = await SecureStore.getItemAsync('loginInfo');
      if (info) {
        setLoginInfo(JSON.parse(info));
      }
      setIsLoading(false);
    };
    getLoginInfo();
  }, []);

  // 로딩 중일 때는 빈 화면 표시
  if (isLoading) {
    return null;
  }

  return (
    <Tabs screenOptions={{headerShown:false}}>
      <Tabs.Screen
        name='(home)'
        options={{
          title:'홈'
        }}
      />
      <Tabs.Screen
        name='myFarm'
        options={{
          title:'마이팜',
          href: loginInfo?.memGrade === 'BUSINESS' ? undefined : null
        }}
      />
      <Tabs.Screen
        name='chat'
        options={{
          title:'채팅'
        }}
      />
      <Tabs.Screen
        name='myPage'
        options={{
          title:'마이페이지'
        }}
      />
    </Tabs>
  )
}

export default TabLayout

const styles = StyleSheet.create({})