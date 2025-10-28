import { StyleSheet, Text, TextInput, View } from 'react-native'
import React, { useState } from 'react'
import { colors } from '@/constants/colorConstant'

const Input = ({lable='', isPw=false, ...props}) => {
  //input 태그의 focus 여부를 저장하는 변수
  const [isFocus, setIsFocus] = useState(false);
  return (
    <View>
      {
        lable && <Text style={styles.lable}>{lable}</Text>
      }
      <TextInput
        style={[
          styles.input,
          isFocus&&styles.focused
        ]}
        //focus 상태일때 실행 함수
        onFocus={()=>{
          setIsFocus(true)
        }}
        onBlur={()=>{
          setIsFocus(false)
        }}
        //비밀번호 여부
        secureTextEntry={isPw}
        {...props}
      />
    </View>
  )
}

export default Input

const styles = StyleSheet.create({
  input : {
    borderWidth : 1,
    borderColor : colors.SUB1,
    shadowColor : colors.SUB2,
    shadowOffset : {
      width : 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    marginHorizontal: 6,
    marginVertical : 4,
    borderRadius: 8,
    height : 40
  }
})