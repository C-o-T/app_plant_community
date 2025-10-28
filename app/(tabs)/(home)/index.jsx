import { Keyboard, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const HomeScreen = () => {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>홈</Text>
          <Text style={styles.subtitle}>인기글 및 추천 콘텐츠</Text>
          <Text style={styles.info}>개발 예정</Text>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

export default HomeScreen;

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
