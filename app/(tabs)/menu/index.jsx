import { StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import Button from '../../../components/common/Button'
import { useRouter } from 'expo-router'
import { Keyboard } from 'react-native'

const index = () => {
  const router = useRouter();
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView>
          <Text>전체메뉴</Text>
            <Button 
              title = '로그인'
              onPress={()=>router.push('/auth/login')}
            />
            <Button 
              title = '회원가입'
              onPress={()=>router.push('/auth/join')}
            />
      </SafeAreaView>
    </TouchableWithoutFeedback>
  )
}

export default index

const styles = StyleSheet.create({})