import { Keyboard, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'

const MyPageScreen = () => {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView>
          <Text>마이페이지 캘린더, 농장관리</Text>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  )
}

export default MyPageScreen

const styles = StyleSheet.create({})