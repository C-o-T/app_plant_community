
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { fetchBoardList } from '../../../services/boardService';
import Community from '../../../components/home/Community';

const HomeScreen = () => {
  const router = useRouter();
  const [boardList, setBoardList] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchType, setSearchType] = useState('title');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [tempKeyword, setTempKeyword] = useState('');

  // 게시글 조회 함수
  const getBoardList = async (pageNum, isNewSearch = false) => {
    if (loading || (!hasMore && !isNewSearch)) return;

    setLoading(true);
    try {
      const response = await fetchBoardList({
        pageNo: pageNum,
        searchType: searchType,
        searchKeyword: searchKeyword,
      });

      const newBoards = response.boardList;

      if (!newBoards || newBoards.length === 0) {
        setHasMore(false);
        if (isNewSearch) {
          setBoardList([]);
          // 알람 제거 - 빈 리스트로 ListEmptyComponent가 표시됨
        }
        return;
      }

      if (isNewSearch) {
        setBoardList(newBoards);
      } else {
        // 중복 제거: 이미 존재하는 boardNum은 제외
        setBoardList((prev) => {
          const existingIds = new Set(prev.map(board => board.boardNum));
          const uniqueNewBoards = newBoards.filter(board => !existingIds.has(board.boardNum));
          return [...prev, ...uniqueNewBoards];
        });
      }

      setPage(pageNum + 1);

      if (newBoards.length < 10) {
        setHasMore(false);
      }
    } catch (error) {
      console.error('게시글 조회 실패:', error);
      console.error('Error details:', error.message);
      Alert.alert('오류', `게시글을 불러오는데 실패했습니다.\n${error.message}`);
      setHasMore(false);
      if (isNewSearch) {
        setBoardList([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // 화면 포커스 시 초기화 및 조회
  useFocusEffect(
    useCallback(() => {
      setBoardList([]);
      setPage(1);
      setHasMore(true);
      getBoardList(1, true);
    }, [searchKeyword])
  );

  // 검색 실행
  const handleSearch = () => {
    setSearchKeyword(tempKeyword);
    setBoardList([]);
    setPage(1);
    setHasMore(true);
  };

  // 스크롤 끝에 도달 시 실행
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      getBoardList(page);
    }
  };
  
   // 로딩 인디케이터 (리스트 하단)
  const renderFooter = () => {
    if (!loading) return null;
    
    return (
      <View style={{padding: 20}}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  };

  // 글쓰기 버튼 핸들러
  const handleWritePost = () => {
    router.push('/write');
  };
  return (
    <SafeAreaView style={styles.container}>
      {/* 검색 영역 */}
      <View style={styles.searchContainer}>
        <View style={styles.searchTypeContainer}>
          <TouchableOpacity
            style={[
              styles.searchTypeButton,
              searchType === 'title' && styles.searchTypeButtonActive,
            ]}
            onPress={() => setSearchType('title')}
          >
            <Text
              style={[
                styles.searchTypeText,
                searchType === 'title' && styles.searchTypeTextActive,
              ]}
            >
              제목
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.searchTypeButton,
              searchType === 'titleAndContent' && styles.searchTypeButtonActive,
            ]}
            onPress={() => setSearchType('titleAndContent')}
          >
            <Text
              style={[
                styles.searchTypeText,
                searchType === 'titleAndContent' && styles.searchTypeTextActive,
              ]}
            >
              내용
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.searchTypeButton,
              searchType === 'memId' && styles.searchTypeButtonActive,
            ]}
            onPress={() => setSearchType('memId')}
          >
            <Text
              style={[
                styles.searchTypeText,
                searchType === 'memId' && styles.searchTypeTextActive,
              ]}
            >
              작성자
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchInputContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="검색어를 입력하세요"
            value={tempKeyword}
            onChangeText={setTempKeyword}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>검색</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 게시글 목록 */}
      <FlatList
        data={boardList}
        renderItem={({ item }) => <Community item={item} />}
        keyExtractor={(item) => item.boardNum.toString()}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchKeyword && searchKeyword.trim() !== ''
                  ? '검색된 결과가 없습니다.'
                  : '등록된 글이 없습니다.'}
              </Text>
            </View>
          )
        }
        maxToRenderPerBatch={10}
        contentContainerStyle={styles.listContent}
      />

      {/* 글쓰기 버튼 */}
      <TouchableOpacity style={styles.writeButton} onPress={handleWritePost}>
        <Text style={styles.writeButtonText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  searchContainer: {
    backgroundColor: '#FFF',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchTypeContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 10,
  },
  searchTypeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  searchTypeButtonActive: {
    backgroundColor: '#4CAF50',
  },
  searchTypeText: {
    fontSize: 14,
    color: '#666',
  },
  searchTypeTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  searchInputContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 15,
    backgroundColor: '#FFF',
  },
  searchButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  listContent: {
    paddingBottom: 80,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  writeButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  writeButtonText: {
    fontSize: 30,
    color: '#FFF',
    fontWeight: 'bold',
  },
});
