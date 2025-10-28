import { Pressable, StyleSheet, Text, TouchableWithoutFeedback, View, Keyboard } from 'react-native'
import React, { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import axios from 'axios'
import { router, useRouter } from 'expo-router'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input.jsx'
import * as SecureStore from 'expo-secure-store'
import { colors } from '../../constants/colorConstant'

const login = () => {
  const route = useRouter();
  const [loginInfo, setLoginInfo] = useState({
    memId : '',
    memPw : ''
  });

  //로그인 함수
  const handleLogin = async () => {
    // Android Emulator는 10.0.2.2, 실제 디바이스는 192.168.30.97
    const API_URL = 'http://192.168.30.97:8080/members/login';

    try {
      const res = await axios.get(API_URL, {
        params: {memId: loginInfo.memId, memPw: loginInfo.memPw},
      });

      if (res.data && res.data.memId) {
        //로그인 성공 - 아이디, 이름, 권한, 주소, 프로필 이미지 정보를 받는 객체 생성
        const userInfo = {
          'memId' : res.data.memId,
          'memName' : res.data.memName,
          'memGrade' : res.data.memGrade,
          'memAddr' : res.data.memAddr || '',
          'profileImageUrl' : res.data.profileImageUrl || ''
        }

        //로그인한 유저의 정보를 secureStore에 저장
        await SecureStore.setItemAsync('loginInfo', JSON.stringify(userInfo));

        route.push('/');

      } else {
        alert('아이디 또는 비밀번호가 잘못 입력되었습니다.')
      }
    } catch (e) {
      console.log('로그인 에러:', e.message);
      alert('로그인 중 오류가 발생했습니다.');
    }
  }


  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} style={styles.container}>
      <SafeAreaView>

        <Input
          placeholder="아이디"
          value={loginInfo.memId}
          onChangeText={(text) => setLoginInfo({...loginInfo, memId: text})}
        />
        <Input
          placeholder="비밀번호"
          value={loginInfo.memPw}
          onChangeText={(text) => setLoginInfo({...loginInfo, memPw: text})}
          secureTextEntry
        />
        <Button
          onPress={handleLogin}
          title='로그인'
        >
        </Button>
        <Button
          onPress={()=>router.push('/auth/join')}
          title='회원가입'
          backgroundColor={colors.SUB1}
        >
        </Button>

      </SafeAreaView>
    </TouchableWithoutFeedback>
  )
}

export default login

const styles = StyleSheet.create({
  container : {
    flex : 1,
    backgroundColor : colors.WHITE
  }
})