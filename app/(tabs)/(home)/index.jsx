import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../../components/common/Button';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native'; // ✅ expo-router ❌, 올바른 출처
import Community from '../../../components/home/Community';


const HomeScreen = () => {
  // 게시글 목록 조회하는 변수
  const [boardList, setBoardList] = useState([]);
  const [page, setPage] = useState(1);           // 현재 페이지
  const [loading, setLoading] = useState(false);        // 로딩 중
  const [hasMore, setHasMore] = useState(true);         // 더 있는지

  //게시글 조회 함수 
  const getBoardList = async(pageNum) => {
    // 이미 로딩 중이거나 더 이상 없으면 중단
    if (loading || !hasMore) return;

    setLoading(true);

        try{
          const res = await axios.get('http://192.168.30.151:5000/boards/boardList-paging', {
            params : {
              nowPage : pageNum
            }
          });

          const newBoards = res.data.boardList;

           // 데이터가 없거나 적으면 마지막 페이지
          if (!newBoards || newBoards.length === 0) {
            setHasMore(false);
            return;
          }
          setBoardList((prev) => [...prev, ...newBoards]);

          setPage(pageNum + 1)

          if(newBoards.length < 10){
            setHasMore(false);
          }

        }catch(error){
          console.log(error)
        } finally {
          setLoading(false);
        }
      };

  // 마운트시 게시글 목록 조회
  useFocusEffect(
    useCallback(() => {
      
      setBoardList([]);
      setPage(1);
      setHasMore(true);

      getBoardList(1);
    },[])
  );

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

  // 데이터 확인 
  console.log(boardList)
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView>
          <FlatList 
            data = {boardList}
            renderItem = {({item}) => <Community item = {item}/>}
            keyExtractor = {item => item.boardNum}

             // ⭐ 무한 스크롤 전용 Props
            onEndReached={handleLoadMore}        // 스크롤 끝에 도달 시 실행
            onEndReachedThreshold={0}          // 언제 실행할지 (0.5 = 50% 남았을 때)
            ListFooterComponent={renderFooter}   // 로딩 인디케이터 표시
            maxToRenderPerBatch={10}
          />
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
