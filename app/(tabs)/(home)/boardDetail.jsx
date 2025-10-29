import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import RenderHtml from 'react-native-render-html';
import { fetchBoardDetail, deleteBoard } from '../../../services/boardService';
import { toggleLike, checkLike } from '../../../services/likeService';
import { fetchComments, createComment, updateComment, deleteComment } from '../../../services/commentService';
import { fetchProfileImage } from '../../../services/memberService';
import CommentItem from '../../../components/board/CommentItem';

// 댓글 입력 컴포넌트를 외부로 분리
const CommentInputComponent = React.memo(
  ({ commentText, onChangeText, onSubmit, styles }) => {
    return (
      <View style={styles.commentInputContainer}>
        <Text style={styles.sectionTitle}>댓글 작성</Text>
        <View style={styles.commentInputRow}>
          <TextInput
            style={styles.commentInput}
            placeholder="댓글을 입력하세요"
            value={commentText}
            onChangeText={onChangeText}
            multiline
            maxLength={500}
            textAlignVertical="top"
            blurOnSubmit={false}
            returnKeyType="default"
            autoCorrect={false}
            keyboardType="default"
          />
          <TouchableOpacity style={styles.submitButton} onPress={onSubmit}>
            <Text style={styles.submitButtonText}>작성</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  },
  (prevProps, nextProps) => {
    // onChangeText와 onSubmit은 항상 같은 참조를 유지
    return prevProps.commentText === nextProps.commentText;
  }
);

const BoardDetailScreen = () => {
  const router = useRouter();
  const { boardNum } = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState(null);

  // 현재 로그인한 사용자 정보 가져오기
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const userInfo = await SecureStore.getItemAsync('loginInfo');
        if (userInfo) {
          const user = JSON.parse(userInfo);
          setCurrentUser(user.memId);
        }
      } catch (error) {
        console.error('사용자 정보 가져오기 실패:', error);
      }
    };
    getCurrentUser();
  }, []);

  // 댓글 목록 조회
  const loadComments = async () => {
    try {
      const data = await fetchComments(boardNum);
      setComments(data);
    } catch (error) {
      console.error('댓글 조회 실패:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // HTML 내 이미지 URL 변환 함수
  const replaceImageUrls = (html) => {
    if (!html) return html;
    // localhost를 실제 서버 IP로 변경
    return html
      .replace(/http:\/\/localhost:8080/g, 'http://192.168.30.97:8080')
      .replace(/http:\/\/127.0.0.1:8080/g, 'http://192.168.30.97:8080');
  };

  // 게시글 상세 조회
  useEffect(() => {
    const getBoardDetail = async () => {
      try {
        setLoading(true);
        const data = await fetchBoardDetail(boardNum);
        // content의 이미지 URL 변환
        if (data.content) {
          data.content = replaceImageUrls(data.content);
        }

        // 카테고리 디버깅
        console.log('=== 게시글 데이터 ===');
        console.log('전체 데이터:', data);
        console.log('categoryDTO:', data.categoryDTO);
        if (data.categoryDTO) {
          console.log('cateName:', data.categoryDTO.cateName);
        } else {
          console.log('categoryDTO가 없습니다');
        }

        setBoard(data);

        // 프로필 이미지 로드
        if (data.memId) {
          // 모든 사용자의 프로필 이미지를 API로 조회
          const profileImg = await fetchProfileImage(data.memId);
          if (profileImg) {
            setProfileImageUrl(profileImg);
          }
        }

        // 댓글 로드
        await loadComments();
      } catch (error) {
        console.error('게시글 조회 실패:', error);
        Alert.alert('오류', '게시글을 불러올 수 없습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (boardNum) {
      getBoardDetail();
    }
  }, [boardNum]);

  // 좋아요 상태 확인 (별도 useEffect)
  useEffect(() => {
    const checkLikeStatus = async () => {
      if (currentUser && boardNum) {
        try {
          const likeStatus = await checkLike(boardNum, currentUser);
          setIsLiked(likeStatus);
        } catch (error) {
          console.error('좋아요 상태 확인 실패:', error);
        }
      }
    };
    checkLikeStatus();
  }, [currentUser, boardNum]);

  // 좋아요 토글
  const handleLikeToggle = async () => {
    if (!currentUser) {
      Alert.alert('알림', '로그인이 필요합니다.');
      return;
    }

    try {
      await toggleLike(boardNum, currentUser);
      const newIsLiked = !isLiked;
      setIsLiked(newIsLiked);

      // 좋아요 수만 로컬에서 업데이트
      setBoard(prevBoard => ({
        ...prevBoard,
        likeCnt: newIsLiked ? prevBoard.likeCnt + 1 : prevBoard.likeCnt - 1
      }));
    } catch (error) {
      console.error('좋아요 처리 실패:', error);
      Alert.alert('오류', '좋아요 처리에 실패했습니다.');
    }
  };

  // 게시글 수정
  const handleEdit = () => {
    router.push({
      pathname: '/(tabs)/(home)/write',
      params: { boardNum, mode: 'edit' },
    });
  };

  // 게시글 삭제
  const handleDelete = () => {
    Alert.alert('삭제 확인', '정말 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBoard(boardNum);
            Alert.alert('성공', '게시글이 삭제되었습니다.', [
              { text: '확인', onPress: () => router.back() },
            ]);
          } catch (error) {
            console.error('게시글 삭제 실패:', error);
            Alert.alert('오류', '게시글 삭제에 실패했습니다.');
          }
        },
      },
    ]);
  };

  // 댓글 작성
  const handleSubmitComment = useCallback(async () => {
    if (!currentUser) {
      Alert.alert('알림', '로그인이 필요합니다.');
      return;
    }

    if (!commentText.trim()) {
      Alert.alert('알림', '댓글 내용을 입력해주세요.');
      return;
    }

    try {
      await createComment({
        boardNum,
        memId: currentUser,
        content: commentText,
        parentCommentNum: null,
      });

      setCommentText('');
      loadComments();
    } catch (error) {
      console.error('댓글 작성 실패:', error);
      Alert.alert('오류', '댓글 작성에 실패했습니다.');
    }
  }, [currentUser, commentText, boardNum]);

  // 대댓글 작성
  const handleSubmitReply = async (parentCommentNum, replyText) => {
    if (!currentUser) {
      Alert.alert('알림', '로그인이 필요합니다.');
      return;
    }

    if (!replyText.trim()) {
      Alert.alert('알림', '답글 내용을 입력해주세요.');
      return;
    }

    try {
      await createComment({
        boardNum,
        memId: currentUser,
        content: replyText,
        parentCommentNum,
      });

      loadComments();
    } catch (error) {
      console.error('답글 작성 실패:', error);
      Alert.alert('오류', '답글 작성에 실패했습니다.');
    }
  };

  // 댓글 수정
  const handleEditComment = async (commentNum, newContent) => {
    try {
      await updateComment(commentNum, { content: newContent });
      loadComments();
    } catch (error) {
      console.error('댓글 수정 실패:', error);
      Alert.alert('오류', '댓글 수정에 실패했습니다.');
    }
  };

  // 댓글 삭제
  const handleDeleteComment = async (commentNum) => {
    Alert.alert('삭제 확인', '정말 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteComment(commentNum);
            loadComments();
          } catch (error) {
            console.error('댓글 삭제 실패:', error);
            Alert.alert('오류', '댓글 삭제에 실패했습니다.');
          }
        },
      },
    ]);
  };

  // 새로고침
  const handleRefresh = () => {
    setRefreshing(true);
    loadComments();
  };

  // 부모 댓글만 필터링 (대댓글 제외)
  const parentComments = comments.filter((comment) => !comment.parentCommentNum);

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </SafeAreaView>
    );
  }

  if (!board) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text>게시글을 찾을 수 없습니다.</Text>
      </SafeAreaView>
    );
  }

  const isAuthor = currentUser === board.memId;


  // 게시글 내용만 렌더링 (댓글 작성 제외)
  const renderBoardContent = () => (
    <View style={styles.boardContainer}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.authorInfoContainer}>
          {/* 프로필 이미지 */}
          {profileImageUrl ? (
            <Image
              source={{ uri: profileImageUrl }}
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.defaultProfileImage}>
              <Text style={styles.defaultProfileText}>
                {board.memId.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {/* 작성자 정보 */}
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{board.memId}</Text>
            <Text style={styles.date}>
              {new Date(board.createDate).toLocaleDateString()}
            </Text>
          </View>
        </View>
        {isAuthor && (
          <View style={styles.actionButtons}>
            <TouchableOpacity onPress={handleEdit}>
              <Text style={styles.editButton}>수정</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete}>
              <Text style={styles.deleteButton}>삭제</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 카테고리 + 제목 */}
      <View style={styles.titleContainer}>
        {board.categoryDTO && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{board.categoryDTO.cateName}</Text>
          </View>
        )}
        <Text style={styles.title}>{board.title}</Text>
      </View>

      {/* 내용 */}
      <RenderHtml
        contentWidth={width - 40}
        source={{ html: board.content || '<p></p>' }}
        tagsStyles={{
          body: {
            fontSize: 16,
            lineHeight: 24,
            color: '#333',
          },
          p: {
            marginBottom: 10,
          },
          img: {
            width: '100%',
            height: 'auto',
            maxWidth: width - 40,
          },
        }}
        renderers={{
          img: (props) => {
            const { tnode } = props;
            const { src } = tnode.attributes;
            return (
              <Image
                source={{ uri: src }}
                style={{
                  width: width - 40,
                  height: 300,
                  resizeMode: 'contain',
                  marginVertical: 10,
                }}
              />
            );
          },
        }}
      />

      {/* 이미지 */}
      {board.imgList && board.imgList.imgUrl && (
        <Image
          source={{ uri: board.imgList.imgUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      )}

      {/* 통계 정보 */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>조회</Text>
          <Text style={styles.statValue}>{board.readCnt}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>댓글</Text>
          <Text style={styles.statValue}>{comments.length}</Text>
        </View>
        <TouchableOpacity style={styles.statItem} onPress={handleLikeToggle}>
          <Text style={styles.statLabel}>좋아요</Text>
          <Text style={[styles.statValue, isLiked && styles.likedText]}>
            {board.likeCnt}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 좋아요 버튼 */}
      <TouchableOpacity
        style={[styles.likeButton, isLiked && styles.likeButtonActive]}
        onPress={handleLikeToggle}
      >
        <Text style={[styles.likeButtonText, isLiked && styles.likeButtonTextActive]}>
          {isLiked ? '♥' : '♡'} 좋아요
        </Text>
      </TouchableOpacity>

      {/* 댓글 섹션 제목 */}
      <View style={styles.commentSectionHeader}>
        <Text style={styles.sectionTitle}>댓글 {comments.length}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          data={parentComments}
          keyExtractor={(item) => item.commentNum.toString()}
          renderItem={({ item }) => (
            <CommentItem
              comment={item}
              currentUser={currentUser}
              allComments={comments}
              onReply={handleSubmitReply}
              onEdit={handleEditComment}
              onDelete={handleDeleteComment}
            />
          )}
          ListHeaderComponent={renderBoardContent}
          ListFooterComponent={
            <CommentInputComponent
              commentText={commentText}
              onChangeText={setCommentText}
              onSubmit={handleSubmitComment}
              styles={styles}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>첫 댓글을 작성해보세요!</Text>
            </View>
          }
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={styles.flatListContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default BoardDetailScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  flatListContent: {
    flexGrow: 1,
  },
  boardContainer: {
    backgroundColor: '#FFF',
    padding: 20,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  authorInfoContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E0E0E0',
  },
  defaultProfileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultProfileText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  editButton: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
  },
  deleteButton: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: 'bold',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 15,
    marginRight: 10,
  },
  categoryText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 20,
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  likedText: {
    color: '#F44336',
  },
  likeButton: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
  },
  likeButtonActive: {
    backgroundColor: '#4CAF50',
  },
  likeButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  likeButtonTextActive: {
    color: '#FFF',
  },
  commentSectionHeader: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  commentInputContainer: {
    backgroundColor: '#FFF',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  commentInputRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  commentInput: {
    flex: 1,
    minHeight: 50,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#F9F9F9',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    backgroundColor: '#FFF',
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
});