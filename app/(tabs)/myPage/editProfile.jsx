import { StyleSheet, Text, View, Image, TouchableOpacity, Alert } from 'react-native'
import { useState, useEffect } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import * as SecureStore from 'expo-secure-store'
import axios from 'axios'
import Button from '@/components/common/Button'
import { colors } from '@/constants/colorConstant'

const EditProfile = () => {
  const router = useRouter();
  const [profileImage, setProfileImage] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loginInfo, setLoginInfo] = useState(null);

  useEffect(() => {
    // 로그인 정보 가져오기
    const getLoginInfo = async () => {
      const info = await SecureStore.getItemAsync('loginInfo');
      if (info) {
        const parsedInfo = JSON.parse(info);
        setLoginInfo(parsedInfo);
        // 기존 프로필 이미지가 있으면 표시
        if (parsedInfo.profileImageUrl) {

          setProfileImage('http://192.168.30.97:8080' + parsedInfo.profileImageUrl);
        }
      }
    };
    getLoginInfo();
  }, []);

  // 갤러리에서 이미지 선택
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.log('이미지 선택 에러:', error);
      Alert.alert('오류', '이미지를 선택할 수 없습니다.');
    }
  };

  // 프로필 사진 저장
  const saveProfileImage = async () => {
    if (!selectedImage) {
      Alert.alert('알림', '이미지를 선택해주세요.');
      return;
    }

    try {
      // FormData 생성
      const formData = new FormData();

      // 이미지 파일 추가
      const filename = selectedImage.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('profileImage', {
        uri: selectedImage,
        name: filename,
        type: type,
      });

      // 회원 ID 추가
      formData.append('memId', loginInfo.memId);

      // 서버에 업로드
      const response = await axios.post(

        'http://192.168.30.97:8080/members/profile-image',

        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data) {
        // SecureStore에 업데이트된 정보 저장
        const updatedInfo = {
          ...loginInfo,
          profileImageUrl: response.data.profileImageUrl
        };

        await SecureStore.setItemAsync('loginInfo', JSON.stringify(updatedInfo));

        Alert.alert('성공', '프로필 사진이 변경되었습니다.', [
          { text: '확인', onPress: () => router.back() }
        ]);
      }
    } catch (error) {
      console.log('프로필 업로드 에러:', error);
      Alert.alert('오류', '프로필 사진 업로드 중 오류가 발생했습니다.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>프로필 사진 변경</Text>

        {/* 프로필 이미지 미리보기 */}
        <View style={styles.imageContainer}>
          {selectedImage || profileImage ? (
            <Image
              source={{ uri: selectedImage || profileImage }}
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
            title="사진 선택"
            onPress={pickImage}
            backgroundColor={colors.SUB1}
            textColor={colors.BLACK}
          />

          <Button
            title="저장"
            onPress={saveProfileImage}
            backgroundColor={colors.MAIN}
          />

          <Button
            title="취소"
            onPress={() => router.back()}
            backgroundColor={colors.SUB2}
            textColor={colors.BLACK}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default EditProfile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.WHITE,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    marginTop: 20,
  },
  imageContainer: {
    marginBottom: 40,
  },
  profileImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: colors.MAIN,
  },
  placeholderImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.SUB1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.SUB2,
  },
  placeholderText: {
    fontSize: 16,
    color: colors.BLACK,
    opacity: 0.5,
  },
  buttonContainer: {
    width: '100%',
    gap: 10,
  },
});
