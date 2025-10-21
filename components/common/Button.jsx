import { Pressable, StyleSheet, Text, View } from 'react-native'
import React from 'react'

const Button = ({title='버튼', size='large', onPress, ...props}) => {
  return (
    <Pressable
      //pressable 컴포넌트는 터치 유무에 따른 디자인 적용 가능
      //매개변수 pressed는 pressable 컴포넌트가 touch 됐을 때 true를 변환
      style={({pressed})=>[
        styles.btnContainer, 
        styles[size], 
        pressed && styles.pressed
      ]}
      onPress={()=>onPress()}
      {...props}
    >
      <Text>
        {title}
      </Text>
    </Pressable>
  )
}

export default Button

const styles = StyleSheet.create({})