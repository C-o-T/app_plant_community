import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const CommentItem = ({
  comment,
  currentUser,
  allComments,
  onReply,
  onEdit,
  onDelete,
  isReply = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showReplies, setShowReplies] = useState(true);

  const isAuthor = currentUser === comment.memId;

  // 대댓글 목록 (현재 댓글의 자식 댓글)
  const replies = allComments.filter(
    (c) => c.parentCommentNum === comment.commentNum
  );

  // 댓글 수정 저장
  const handleSaveEdit = () => {
    if (!editText.trim()) return;
    onEdit(comment.commentNum, editText);
    setIsEditing(false);
  };

  // 대댓글 작성
  const handleSubmitReply = () => {
    if (!replyText.trim()) return;
    onReply(comment.commentNum, replyText);
    setReplyText('');
    setShowReplyInput(false);
  };

  return (
    <View style={[styles.container, isReply && styles.replyContainer]}>
      {/* 댓글 헤더 */}
      <View style={styles.header}>
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{comment.memId}</Text>
          <Text style={styles.date}>
            {new Date(comment.createDate).toLocaleDateString()}
          </Text>
        </View>
        {isAuthor && !isEditing && (
          <View style={styles.actionButtons}>
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <Text style={styles.editButton}>수정</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(comment.commentNum)}>
              <Text style={styles.deleteButton}>삭제</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 댓글 내용 */}
      {!isEditing && <Text style={styles.content}>{comment.content}</Text>}

      {/* 답글 버튼 (부모 댓글만) */}
      {!isReply && !isEditing && (
        <View style={styles.replyButtonContainer}>
          <TouchableOpacity onPress={() => setShowReplyInput(!showReplyInput)}>
            <Text style={styles.replyButton}>답글 작성</Text>
          </TouchableOpacity>
          {replies.length > 0 && (
            <TouchableOpacity onPress={() => setShowReplies(!showReplies)}>
              <Text style={styles.toggleRepliesButton}>
                {showReplies ? '답글 숨기기' : `답글 ${replies.length}개 보기`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* 답글 작성 입력 */}
      {showReplyInput && !isReply && (
        <View style={styles.replyInputContainer}>
          <TextInput
            style={styles.replyInput}
            placeholder="답글을 입력하세요"
            value={replyText}
            onChangeText={setReplyText}
            multiline
            autoFocus
            textAlignVertical="top"
            blurOnSubmit={false}
          />
          <View style={styles.replyInputButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowReplyInput(false);
                setReplyText('');
              }}
            >
              <Text style={styles.cancelButtonText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSubmitReply}
            >
              <Text style={styles.saveButtonText}>작성</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 대댓글 목록 */}
      {!isReply && showReplies && replies.length > 0 && (
        <View style={styles.repliesContainer}>
          {replies.map((reply) => (
            <CommentItem
              key={reply.commentNum}
              comment={reply}
              currentUser={currentUser}
              allComments={allComments}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              isReply={true}
            />
          ))}
        </View>
      )}

      {/* 수정 입력창 (맨 아래) */}
      {isEditing && (
        <View style={styles.editContainer}>
          <TextInput
            style={styles.editInput}
            value={editText}
            onChangeText={setEditText}
            multiline
            autoFocus
            textAlignVertical="top"
            blurOnSubmit={false}
          />
          <View style={styles.editButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setIsEditing(false);
                setEditText(comment.content);
              }}
            >
              <Text style={styles.cancelButtonText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveEdit}>
              <Text style={styles.saveButtonText}>저장</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

export default CommentItem;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  replyContainer: {
    backgroundColor: '#F9F9F9',
    marginLeft: 20,
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  authorName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
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
    fontSize: 12,
    fontWeight: 'bold',
  },
  deleteButton: {
    color: '#F44336',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
    marginBottom: 10,
  },
  editContainer: {
    marginBottom: 10,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    padding: 10,
    fontSize: 14,
    minHeight: 60,
    backgroundColor: '#FFF',
    marginBottom: 10,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 4,
    backgroundColor: '#F0F0F0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 12,
    fontWeight: 'bold',
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  replyButtonContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  replyButton: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: 'bold',
  },
  toggleRepliesButton: {
    color: '#666',
    fontSize: 12,
    fontWeight: 'bold',
  },
  replyInputContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  replyInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    padding: 10,
    fontSize: 14,
    minHeight: 60,
    backgroundColor: '#F9F9F9',
    marginBottom: 10,
  },
  replyInputButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  repliesContainer: {
    marginTop: 10,
  },
});
