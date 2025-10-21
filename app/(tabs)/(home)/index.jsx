import { Keyboard, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import Button from '../../../components/common/Button'

const HomeScreen = () => {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView>
          <Text>인기글</Text>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  )
}

export default HomeScreen

const styles = StyleSheet.create({})