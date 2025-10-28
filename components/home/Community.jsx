import { Image, Pressable, StyleSheet, Text, View, Alert } from 'react-native';
import React, { useState, useEffect } from 'react';
import Entypo from '@expo/vector-icons/Entypo';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { toggleLike, checkLike } from '../../services/likeService';

const Community = ({ item }) => {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCnt, setLikeCnt] = useState(item.likeCnt);

  // 사용자 정보 가져오기
  useEffect(() => {
    const getUserInfo = async () => {
      try {
        const userInfo = await SecureStore.getItemAsync('loginInfo');
        if (userInfo) {
          const user = JSON.parse(userInfo);
          setCurrentUser(user.memId);
          // 좋아요 상태 확인
          const likeStatus = await checkLike(item.boardNum, user.memId);
          setIsLiked(likeStatus);
        }
      } catch (error) {
        console.error('사용자 정보 가져오기 실패:', error);
      }
    };
    getUserInfo();
  }, []);

  // HTML 태그 제거 함수
  const stripHtmlTags = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  };

  // 게시글 상세로 이동
  const handlePress = () => {
    router.push(`/(tabs)/(home)/boardDetail?boardNum=${item.boardNum}`);
  };

  // 좋아요 토글
  const handleLikeToggle = async (e) => {
    e.stopPropagation(); // 카드 클릭 이벤트 방지

    if (!currentUser) {
      Alert.alert('알림', '로그인이 필요합니다.');
      return;
    }

    try {
      await toggleLike(item.boardNum, currentUser);
      const newIsLiked = !isLiked;
      setIsLiked(newIsLiked);
      setLikeCnt(newIsLiked ? likeCnt + 1 : likeCnt - 1);
    } catch (error) {
      console.error('좋아요 처리 실패:', error);
      Alert.alert('오류', '좋아요 처리에 실패했습니다.');
    }
  };

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      <View style={styles.content}>
        {/* 이미지 */}
        {item.imgList && item.imgList.imgUrl && (
          <Image
            style={styles.image}
            source={{ uri: item.imgList.imgUrl }}
            resizeMode="cover"
          />
        )}

        {/* 본문 */}
        <View style={styles.textContainer}>
          {/* 카테고리 */}
          {item.categoryDTO && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.categoryDTO.cateName}</Text>
            </View>
          )}

          {/* 제목 */}
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>

          {/* 내용 미리보기 */}
          <Text style={styles.preview} numberOfLines={2}>
            {stripHtmlTags(item.content)}
          </Text>

          {/* 작성자 및 날짜 */}
          <View style={styles.metaContainer}>
            <Text style={styles.author}>{item.memId}</Text>
            <Text style={styles.date}>
              {new Date(item.createDate).toLocaleDateString()}
            </Text>
          </View>

          {/* 통계 정보 */}
          <View style={styles.statsContainer}>
            <Pressable style={styles.statItem} onPress={handleLikeToggle}>
              <Entypo
                name={isLiked ? "heart" : "heart-outlined"}
                size={16}
                color={isLiked ? "#F44336" : "#666"}
              />
              <Text style={[styles.statText, isLiked && styles.likedText]}>
                {likeCnt}
              </Text>
            </Pressable>
            <View style={styles.statItem}>
              <FontAwesome name="commenting-o" size={16} color="#666" />
              <Text style={styles.statText}>{item.commentCnt}</Text>
            </View>
            <View style={styles.statItem}>
              <Entypo name="eye" size={16} color="#666" />
              <Text style={styles.statText}>{item.readCnt}</Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

export default Community

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    marginHorizontal: 15,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  content: {
    flexDirection: 'row',
    padding: 15,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 15,
    backgroundColor: '#F0F0F0',
  },
  textContainer: {
    flex: 1,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 6,
  },
  categoryText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
    lineHeight: 22,
  },
  preview: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 8,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  author: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
    marginRight: 8,
  },
  date: {
    fontSize: 11,
    color: '#999',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#666',
  },
  likedText: {
    color: '#F44336',
    fontWeight: 'bold',
  },
})