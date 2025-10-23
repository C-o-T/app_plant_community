import { StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import Button from '../../../components/common/Button'
import { useRouter } from 'expo-router'
import { Keyboard } from 'react-native'
import * as SecureStore from 'expo-secure-store'

const MyPageScreen = () => {
  const router = useRouter();
  const loginInfo = SecureStore.getItem('loginInfo');
  console.log(loginInfo)

  //logout 실행시 실행할 함수?
  const handleLogout = () => {
    SecureStore.deleteItemAsync('loginInfo')
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
                onPress={()=>{
                  handleLogout();
                  router.canDismiss() && router.dismissAll();
                  router.push('/');
                }}
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