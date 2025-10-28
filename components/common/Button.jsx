import { Pressable, StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { colors } from '@/constants/colorConstant'

const Button = ({title='버튼', size='large', textColor=colors.WHITE, backgroundColor=colors.MAIN, onPress, ...props}) => {
  return (
    <Pressable
      //pressable 컴포넌트는 터치 유무에 따른 디자인 적용 가능
      //매개변수 pressed는 pressable 컴포넌트가 touch 됐을 때 true를 변환
      style={({pressed})=>[
        styles.btnContainer,
        {backgroundColor: backgroundColor},
        styles[size],
        pressed && styles.pressed
      ]}
      onPress={()=>onPress()}
      {...props}
    >
      <Text
        style={{
          color: textColor
        }}
      >
        {title}
      </Text>
    </Pressable>
  )
}

export default Button

const styles = StyleSheet.create({
  btnContainer : {
    backgroundColor: colors.MAIN,
    borderRadius : 8,
    justifyContent : 'center',
    alignItems : 'center',
    margin : 5
  },
  pressed:{
    opacity : 0.8
  },
  large : {
    width : '98%',
    height : 40
  },
  normal : {
    width : '70%',
    height : 40
  },
  small : {
    width : '50%',
    height : 40
  },
  extraSmall : {
    width : '30%',
    height : 40
  }
})