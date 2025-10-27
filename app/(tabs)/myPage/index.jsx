import { StyleSheet, TouchableWithoutFeedback, Keyboard } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Button from '@/components/common/Button'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { colors } from '@/constants/colorConstant'

const MyPageScreen = () => {
  const router = useRouter();

  //logout 실행시 실행할 함수
  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('loginInfo');
    router.replace('/auth/login');
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <Button
          title='로그아웃'
          backgroundColor={colors.SUB1}
          onPress={handleLogout}
        />
      </SafeAreaView>
    </TouchableWithoutFeedback>
  )
}

export default MyPageScreen

const styles = StyleSheet.create({
  container : {
    flex : 1,
    backgroundColor : colors.WHITE
  }
})