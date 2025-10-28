import {
  Alert,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Image,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import {
  createBoard,
  updateBoard,
  fetchBoardDetail,
  uploadBoardImages,
} from '../../../services/boardService';

const WriteBoard = () => {
  const router = useRouter();
  const { boardNum, mode } = useLocalSearchParams();
  const isEditMode = mode === 'edit';

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contentParts, setContentParts] = useState([]); // 텍스트와 이미지를 순서대로 저장
  const [memId, setMemId] = useState('');
  const [cateNum, setCateNum] = useState(1);
  const [loading, setLoading] = useState(false);

  // 사용자 정보 가져오기
  useEffect(() => {
    const getUserInfo = async () => {
      try {
        const userInfo = await SecureStore.getItemAsync('loginInfo');
        if (userInfo) {
          const user = JSON.parse(userInfo);
          setMemId(user.memId);
        }
      } catch (error) {
        console.error('사용자 정보 가져오기 실패:', error);
      }
    };
    getUserInfo();
  }, []);

  // 수정 모드일 경우 기존 게시글 정보 불러오기
  useEffect(() => {
    if (isEditMode && boardNum) {
      const loadBoardData = async () => {
        try {
          const data = await fetchBoardDetail(boardNum);
          setTitle(data.title);
          setContent(data.content);
          setCateNum(data.cateNum);

          // 기존 content를 텍스트와 이미지로 파싱
          const parts = parseContentToParts(data.content);
          setContentParts(parts);
        } catch (error) {
          console.error('게시글 정보 불러오기 실패:', error);
          Alert.alert('오류', '게시글 정보를 불러올 수 없습니다.');
        }
      };
      loadBoardData();
    }
  }, [isEditMode, boardNum]);

  // HTML content를 텍스트와 이미지 파트로 파싱
  const parseContentToParts = (htmlContent) => {
    const parts = [];
    const imgRegex = /<img[^>]+src="([^">]+)"[^>]*>/g;
    let lastIndex = 0;
    let match;

    while ((match = imgRegex.exec(htmlContent)) !== null) {
      // 이미지 태그 이전의 텍스트
      if (match.index > lastIndex) {
        const text = htmlContent.substring(lastIndex, match.index).trim();
        if (text) {
          parts.push({ type: 'text', content: text });
        }
      }
      // 이미지
      parts.push({ type: 'image', url: match[1] });
      lastIndex = match.index + match[0].length;
    }

    // 마지막 이미지 이후의 텍스트
    if (lastIndex < htmlContent.length) {
      const text = htmlContent.substring(lastIndex).trim();
      if (text) {
        parts.push({ type: 'text', content: text });
      }
    }

    return parts;
  };

  // 이미지 선택 및 업로드
  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        setLoading(true);
        try {
          // 이미지 업로드
          const uploadedUrls = await uploadBoardImages(result.assets);

          // 업로드된 이미지를 contentParts에 추가
          const newImageParts = uploadedUrls.map(url => ({ type: 'image', url }));
          setContentParts(prev => [...prev, ...newImageParts]);

          Alert.alert('성공', '이미지가 추가되었습니다.');
        } catch (error) {
          console.error('이미지 업로드 실패:', error);
          Alert.alert('오류', '이미지 업로드에 실패했습니다.');
        } finally {
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('이미지 선택 실패:', error);
      Alert.alert('오류', '이미지 선택에 실패했습니다.');
    }
  };

  // 텍스트 입력 처리
  const handleTextChange = (text) => {
    setContent(text);
  };

  // 텍스트 입력이 끝났을 때 contentParts에 추가
  const handleTextBlur = () => {
    if (content.trim()) {
      setContentParts(prev => [...prev, { type: 'text', content }]);
      setContent('');
    }
  };

  // contentPart 삭제
  const handleRemovePart = (index) => {
    setContentParts(prev => prev.filter((_, i) => i !== index));
  };

  // 게시글 저장
  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('알림', '제목을 입력해주세요.');
      return;
    }

    // 현재 입력중인 텍스트를 contentParts에 추가
    const finalParts = [...contentParts];
    if (content.trim()) {
      finalParts.push({ type: 'text', content });
    }

    if (finalParts.length === 0) {
      Alert.alert('알림', '내용을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      // contentParts를 HTML로 변환
      let finalContent = '';
      finalParts.forEach(part => {
        if (part.type === 'text') {
          finalContent += part.content + '\n';
        } else if (part.type === 'image') {
          finalContent += `<img src="${part.url}" alt="image" />\n`;
        }
      });

      const boardData = {
        title,
        content: finalContent,
        memId,
        cateNum,
      };

      if (isEditMode) {
        await updateBoard(boardNum, boardData);
        Alert.alert('성공', '게시글이 수정되었습니다.', [
          { text: '확인', onPress: () => router.back() },
        ]);
      } else {
        const newBoardNum = await createBoard(boardData);
        Alert.alert('성공', '게시글이 작성되었습니다.', [
          {
            text: '확인',
            onPress: () => router.replace(`/(tabs)/(home)/boardDetail?boardNum=${newBoardNum}`),
          },
        ]);
      }
    } catch (error) {
      console.error('게시글 저장 실패:', error);
      Alert.alert('오류', '게시글 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };
  console.log(content)
  console.log(contentParts)
  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <View style={styles.content}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.pageTitle}>
              {isEditMode ? '게시글 수정' : '게시글 작성'}
            </Text>

            {/* 제목 */}
            <Text style={styles.label}>제목</Text>
            <TextInput
              style={styles.input}
              placeholder="제목을 입력하세요"
              value={title}
              onChangeText={setTitle}
            />

            {/* 카테고리 선택 */}
            <Text style={styles.label}>카테고리</Text>
            <View style={styles.categoryContainer}>
              <TouchableOpacity
                style={[styles.categoryButton, cateNum === 1 && styles.categoryButtonActive]}
                onPress={() => setCateNum(1)}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    cateNum === 1 && styles.categoryButtonTextActive,
                  ]}
                >
                  일반
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.categoryButton, cateNum === 2 && styles.categoryButtonActive]}
                onPress={() => setCateNum(2)}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    cateNum === 2 && styles.categoryButtonTextActive,
                  ]}
                >
                  질문
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.categoryButton, cateNum === 3 && styles.categoryButtonActive]}
                onPress={() => setCateNum(3)}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    cateNum === 3 && styles.categoryButtonTextActive,
                  ]}
                >
                  팁
                </Text>
              </TouchableOpacity>
            </View>

            {/* 내용 */}
            <Text style={styles.label}>내용</Text>

            {/* 컨텐츠 영역 - 텍스트와 이미지가 섞여서 표시됨 */}
            <View style={styles.contentContainer}>
              {/* 이미 추가된 contentParts 표시 */}
              {contentParts.map((part, index) => (
                <View key={index} style={styles.contentPart}>
                  {part.type === 'text' ? (
                    <View style={styles.textPart}>
                      <Text style={styles.textContent}>{part.content}</Text>
                      <TouchableOpacity
                        style={styles.removePartButton}
                        onPress={() => handleRemovePart(index)}
                      >
                        <Text style={styles.removeButtonText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.imagePart}>
                      <Image source={{ uri: part.url }} style={styles.contentImage} />
                      <TouchableOpacity
                        style={styles.removePartButton}
                        onPress={() => handleRemovePart(index)}
                      >
                        <Text style={styles.removeButtonText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}

              {/* 현재 입력중인 텍스트 */}
              <TextInput
                style={styles.contentInput}
                placeholder="내용을 입력하세요"
                value={content}
                onChangeText={handleTextChange}
                onBlur={handleTextBlur}
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* 이미지 선택 */}
            <TouchableOpacity style={styles.imageButton} onPress={handlePickImage}>
              <Text style={styles.imageButtonText}>이미지 선택</Text>
            </TouchableOpacity>

            {/* 저장 버튼 */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? '저장 중...' : isEditMode ? '수정하기' : '작성하기'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

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
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 10,
    color: '#333',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#FFF',
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  categoryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  categoryButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  categoryButtonTextActive: {
    color: '#FFF',
  },
  contentContainer: {
    minHeight: 200,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 15,
    backgroundColor: '#FFF',
    marginBottom: 15,
  },
  contentPart: {
    marginBottom: 10,
  },
  textPart: {
    position: 'relative',
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 8,
  },
  textContent: {
    fontSize: 16,
    color: '#333',
    paddingRight: 30,
  },
  imagePart: {
    position: 'relative',
    marginBottom: 10,
  },
  contentImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'contain',
    backgroundColor: '#F0F0F0',
  },
  removePartButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF5252',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  removeButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  contentInput: {
    minHeight: 100,
    fontSize: 16,
    color: '#333',
    textAlignVertical: 'top',
  },
  imageButton: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  imageButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  submitButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
})
