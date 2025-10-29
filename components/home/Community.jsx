import { Image, Pressable, StyleSheet, Text, View, Alert } from 'react-native';
import React, { useState, useEffect } from 'react';
import Entypo from '@expo/vector-icons/Entypo';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { toggleLike, checkLike } from '../../services/likeService';
import { fetchProfileImage } from '../../services/memberService';

const Community = ({ item }) => {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCnt, setLikeCnt] = useState(item.likeCnt);
  const [profileImageUrl, setProfileImageUrl] = useState(null);

  // 사용자 정보 및 프로필 이미지 가져오기
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

    const getProfileImage = async () => {
      try {
        if (item.memId) {
          // 모든 사용자의 프로필 이미지를 API로 조회
          const profileImg = await fetchProfileImage(item.memId);
          if (profileImg) {
            setProfileImageUrl(profileImg);
          }
        }
      } catch (error) {
        console.error('프로필 이미지 가져오기 실패:', error);
      }
    };

    getUserInfo();
    getProfileImage();
  }, [item.memId, item.boardNum]);

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
        <View style={styles.mainContainer}>
          {/* 왼쪽: 백엔드에서 제공하는 이미지 */}
          {item.imgList && item.imgList.imgUrl && (
            <Image
              source={{ uri: item.imgList.imgUrl }}
              style={styles.contentImage}
              resizeMode="cover"
            />
          )}

          {/* 오른쪽: 프로필 + 제목 + 내용 */}
          <View style={styles.rightContent}>
            {/* 상단: 프로필 이미지 + 작성자 정보 */}
            <View style={styles.header}>
              {/* 프로필 이미지 */}
              {profileImageUrl ? (
                <Image
                  source={{ uri: profileImageUrl }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={styles.defaultProfileImage}>
                  <Text style={styles.defaultProfileText}>
                    {item.memId.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}

              {/* 작성자 및 날짜 */}
              <View style={styles.authorInfo}>
                <Text style={styles.author}>{item.memId}</Text>
                <Text style={styles.date}>
                  {new Date(item.createDate).toLocaleDateString()}
                </Text>
              </View>
            </View>

            {/* 제목 */}
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>

            {/* 내용 미리보기 */}
            <Text style={styles.preview} numberOfLines={2}>
              {stripHtmlTags(item.content)}
            </Text>
          </View>
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
    padding: 15,
  },
  mainContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  contentImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  rightContent: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  profileImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
  },
  defaultProfileImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultProfileText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  },
  authorInfo: {
    flex: 1,
  },
  author: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
    marginBottom: 2,
  },
  date: {
    fontSize: 10,
    color: '#999',
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
    lineHeight: 20,
  },
  preview: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 15,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
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