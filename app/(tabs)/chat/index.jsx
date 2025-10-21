import { Keyboard, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'

const ChatScreen = () => {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView>
          <Text>ChatScreen 채팅</Text>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  )
}

export default ChatScreen

const styles = StyleSheet.create({})