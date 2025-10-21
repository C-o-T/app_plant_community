import { StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'

const join = () => {
  return (
    <TouchableWithoutFeedback>
      <SafeAreaView>
        <Text>join</Text>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  )
}

export default join

const styles = StyleSheet.create({})