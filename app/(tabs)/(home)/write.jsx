import { Keyboard, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import Input from '@/components/common/Input'
import PellEditor from '../../../components/home/PellEditor'

const WriteBoard = () => {
  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
         <View style={styles.content}>
            <Text style={styles.title}>글쓰기</Text>
            <Text style={styles.label}>제목</Text>
            <Input />
            <Text style={styles.label}>내용</Text>
            <PellEditor />
         </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  )
}

export default WriteBoard

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 10,
  },
})
