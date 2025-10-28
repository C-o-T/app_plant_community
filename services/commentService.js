const API_BASE_URL = 'http://192.168.30.97:8080';

// 댓글 작성
export const createComment = async (commentData) => {
  const response = await fetch(`${API_BASE_URL}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(commentData),
  });

  if (!response.ok) throw new Error('댓글 작성 실패');
  return await response.text();
};

// 댓글 목록 조회 (게시글별)
export const fetchComments = async (boardNum) => {
  const response = await fetch(`${API_BASE_URL}/comments/${boardNum}`);

  if (!response.ok) throw new Error('댓글 조회 실패');
  return await response.json();
};

// 댓글 개수 조회
export const fetchCommentCount = async (boardNum) => {
  const response = await fetch(`${API_BASE_URL}/comments/${boardNum}/count`);

  if (!response.ok) throw new Error('댓글 개수 조회 실패');
  return await response.json();
};

// 댓글 수정
export const updateComment = async (commentNum, commentData) => {
  const response = await fetch(`${API_BASE_URL}/comments/${commentNum}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(commentData),
  });

  if (!response.ok) throw new Error('댓글 수정 실패');
  return await response.text();
};

// 댓글 삭제
export const deleteComment = async (commentNum) => {
  const response = await fetch(`${API_BASE_URL}/comments/${commentNum}`, {
    method: 'DELETE',
  });

  if (!response.ok) throw new Error('댓글 삭제 실패');
  return await response.text();
};
