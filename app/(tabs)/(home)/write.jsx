import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import {
  createBoard,
  updateBoard,
  fetchBoardDetail,
  uploadBoardImages,
} from '../../../services/boardService';
import { fetchCategoryList } from '../../../services/categoryService';

const WriteBoard = () => {
  const router = useRouter();
  const { boardNum, mode } = useLocalSearchParams();
  const isEditMode = mode === 'edit';
  const richText = useRef();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [memId, setMemId] = useState('');
  const [cateNum, setCateNum] = useState(null);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);

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

  // 카테고리 목록 가져오기
  useEffect(() => {
    const getCategories = async () => {
      try {
        const data = await fetchCategoryList();
        setCategories(data);
        // 첫 번째 카테고리를 기본값으로 설정
        if (data.length > 0 && !isEditMode) {
          setCateNum(data[0].cateNum);
        }
      } catch (error) {
        console.error('카테고리 조회 실패:', error);
        Alert.alert('오류', '카테고리를 불러올 수 없습니다.');
      }
    };
    getCategories();
  }, [isEditMode]);

  // 수정 모드일 경우 기존 게시글 정보 불러오기
  useEffect(() => {
    if (isEditMode && boardNum) {
      const loadBoardData = async () => {
        try {
          const data = await fetchBoardDetail(boardNum);
          setTitle(data.title);
          setContent(data.content);
          setCateNum(data.cateNum);
        } catch (error) {
          console.error('게시글 정보 불러오기 실패:', error);
          Alert.alert('오류', '게시글 정보를 불러올 수 없습니다.');
        }
      };
      loadBoardData();
    }
  }, [isEditMode, boardNum]);

  // 이미지 선택 및 에디터에 삽입
  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      if (!result.canceled) {
        setLoading(true);
        try {
          // 이미지 업로드
          const uploadedUrls = await uploadBoardImages(result.assets);

          // 에디터에 이미지 삽입
          if (uploadedUrls.length > 0) {
            richText.current?.insertImage(uploadedUrls[0]);
            Alert.alert('성공', '이미지가 삽입되었습니다.');
          }
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

  // 게시글 저장
  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('알림', '제목을 입력해주세요.');
      return;
    }

    if (!content.trim()) {
      Alert.alert('알림', '내용을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const boardData = {
        title,
        content, // RichEditor에서 나온 HTML 그대로 저장
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

  return (
    <SafeAreaView style={styles.container}>
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
            {categories.map((category) => (
              <TouchableOpacity
                key={category.cateNum}
                style={[
                  styles.categoryButton,
                  cateNum === category.cateNum && styles.categoryButtonActive,
                ]}
                onPress={() => setCateNum(category.cateNum)}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    cateNum === category.cateNum && styles.categoryButtonTextActive,
                  ]}
                >
                  {category.cateName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 내용 - Rich Editor */}
          <Text style={styles.label}>내용</Text>

          <View style={styles.editorContainer}>
            <RichEditor
              ref={richText}
              onChange={(html) => setContent(html)}
              placeholder="내용을 입력하세요..."
              initialContentHTML={content}
              androidHardwareAccelerationDisabled={true}
              style={styles.editor}
              initialHeight={300}
              editorStyle={{
                backgroundColor: '#fff',
                color: '#000',
                placeholderColor: '#999',
                contentCSSText: 'font-size: 16px; min-height: 300px; padding: 10px;',
              }}
            />

            <RichToolbar
              editor={richText}
              actions={[
                actions.setBold,
                actions.setItalic,
                actions.setUnderline,
                actions.insertBulletsList,
                actions.insertOrderedList,
                actions.insertImage,
              ]}
              onPressAddImage={handlePickImage}
              style={styles.toolbar}
            />
          </View>

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
  editorContainer: {
    height: 400,
    marginBottom: 15,
  },
  editor: {
    flex: 1,
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  toolbar: {
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    minHeight: 40,
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
