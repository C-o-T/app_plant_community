import { Keyboard, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MyPageScreen = () => {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>마이페이지</Text>
          <Text style={styles.subtitle}>사용자 설정 및 정보</Text>
          <Text style={styles.info}>개발 예정</Text>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

export default MyPageScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  info: {
    fontSize: 14,
    color: '#999',
  },
});
