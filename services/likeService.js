const API_BASE_URL = 'http://192.168.30.97:8080';

// 좋아요 토글 (누르기/취소)
export const toggleLike = async (boardNum, memId) => {
  const response = await fetch(`${API_BASE_URL}/likes/${boardNum}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ memId }),
  });

  if (!response.ok) throw new Error('좋아요 처리 실패');
  return await response.text();
};

// 좋아요 상태 확인
export const checkLike = async (boardNum, memId) => {
  const response = await fetch(`${API_BASE_URL}/likes/${boardNum}/check?memId=${memId}`);

  if (!response.ok) throw new Error('좋아요 상태 확인 실패');
  return await response.json();
};
