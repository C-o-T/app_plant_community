import React, { useCallback, useState } from 'react';
import {
  Keyboard,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '@/components/common/Button';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import { colors } from '@/constants/colorConstant';

const MyPageScreen = () => {
  const router = useRouter();
  const [profileImage, setProfileImage] = useState(null);

  // 페이지에 포커스될 때마다 프로필 이미지 로드
  useFocusEffect(
    useCallback(() => {
      const loadProfileImage = async () => {
        const info = await SecureStore.getItemAsync('loginInfo');
        if (info) {
          const parsedInfo = JSON.parse(info);
          if (parsedInfo.profileImageUrl) {

            setProfileImage('http://192.168.30.97:8080' + parsedInfo.profileImageUrl);

          }
        }
      };
      loadProfileImage();
    }, [])
  );

  //logout 실행시 실행할 함수
  const handleLogout = async () => {
    console.log('로그아웃 실행');
    await SecureStore.deleteItemAsync('loginInfo');
    console.log('SecureStore 삭제 완료');
    router.replace('/auth/login');
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* 프로필 이미지 */}
          <View style={styles.profileContainer}>
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.placeholderImage}>
                <Text style={styles.placeholderText}>프로필 사진</Text>
              </View>
            )}
          </View>

          {/* 버튼 영역 */}
          <View style={styles.buttonContainer}>
            <Button
              title='프로필 변경'
              backgroundColor={colors.MAIN}
              onPress={() => router.push('/myPage/editProfile')}
            />
            <Button
              title='로그아웃'
              backgroundColor={colors.SUB1}
              textColor={colors.BLACK}
              onPress={handleLogout}
            />
          </View>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

export default MyPageScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.WHITE
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  profileContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: colors.MAIN,
  },
  placeholderImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: colors.SUB1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.SUB2,
  },
  placeholderText: {
    fontSize: 14,
    color: colors.BLACK,
    opacity: 0.5,
  },
  buttonContainer: {
    width: '100%',
  },
})