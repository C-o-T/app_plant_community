import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Tabs } from 'expo-router'

const TabLayout = () => {
  return (
    <Tabs screenOptions={{headerShown:false}}>
      <Tabs.Screen 
        name='(home)'
        options={{
          title:'홈'
        }}
      />
      <Tabs.Screen 
        name='chat'
        options={{
          title:'채팅'
        }}
      />
      <Tabs.Screen 
        name='myPage'
        options={{
          title:'마이페이지'
        }}
      />
      <Tabs.Screen 
        name='menu'
        options={{
          title:'전체메뉴'
        }}
      />
    </Tabs>
  )
}

export default TabLayout

const styles = StyleSheet.create({})