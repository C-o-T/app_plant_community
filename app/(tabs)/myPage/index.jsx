import { StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native'
import React, { useState, useEffect } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import Button from '../../../components/common/Button'
import { useRouter } from 'expo-router'
import { Keyboard } from 'react-native'
import * as SecureStore from 'expo-secure-store'

const MyPageScreen = () => {
  const router = useRouter();
  const [loginInfo, setLoginInfo] = useState(null);

  useEffect(() => {
    // 로그인 정보 가져오기
    const getLoginInfo = async () => {
      const info = await SecureStore.getItemAsync('loginInfo');
      if (info) {
        setLoginInfo(JSON.parse(info));
      }
    };
    getLoginInfo();
  }, []);

  //logout 실행시 실행할 함수
  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('loginInfo');
    setLoginInfo(null);
    router.replace('/auth/login');
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView>
          <Text>전체메뉴</Text>
            {
              loginInfo === null 
              ?
              <Button 
              title = '로그인'
              onPress={()=>router.push('/auth/login')}
              />
              :
              <Button
                title='로그아웃'
                onPress={handleLogout}
              />
            }
            
            <Button 
              title = '회원가입'
              onPress={()=>router.push('/auth/join')}
            />
      </SafeAreaView>
    </TouchableWithoutFeedback>
  )
}

export default MyPageScreen

const styles = StyleSheet.create({})