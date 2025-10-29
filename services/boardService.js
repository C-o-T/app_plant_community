const API_BASE_URL = 'http://192.168.30.97:8080';

// 이미지 업로드
export const uploadBoardImages = async (images) => {
  const formData = new FormData();
  images.forEach((image, index) => {
    formData.append('img', {
      uri: image.uri,
      type: 'image/jpeg',
      name: `image_${index}.jpg`,
    });
  });

  const response = await fetch(`${API_BASE_URL}/boards/upload/img`, {
    method: 'POST',
    body: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  if (!response.ok) throw new Error('이미지 업로드 실패');
  return await response.json();
};

// 게시글 작성
export const createBoard = async (boardData) => {
  const response = await fetch(`${API_BASE_URL}/boards`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(boardData),
  });

  if (!response.ok) throw new Error('게시글 작성 실패');
  return await response.json();
};

// 게시글 목록 조회 (페이징)
export const fetchBoardList = async (params = {}) => {
  const queryParamsObj = {
    nowPage: params.pageNo || 1,
  };

  // searchType과 searchKeyword가 실제 값이 있을 때만 추가 (빈 문자열 제외)
  if (params.searchKeyword && params.searchKeyword.trim() !== '') {
    queryParamsObj.searchType = params.searchType;
    queryParamsObj.searchKeyword = params.searchKeyword.trim();
  }
  // 빈 문자열이면 searchType, searchKeyword 파라미터를 아예 보내지 않음

  const queryParams = new URLSearchParams(queryParamsObj).toString();

  const response = await fetch(`${API_BASE_URL}/boards/boardList-paging?${queryParams}`);

  if (!response.ok) throw new Error('게시글 목록 조회 실패');
  return await response.json();
};

// 전체 게시글 목록 조회
export const fetchAllBoardList = async () => {
  const response = await fetch(`${API_BASE_URL}/boards/boardList`);

  if (!response.ok) throw new Error('전체 게시글 조회 실패');
  return await response.json();
};

// 인기글 조회
export const fetchPopularBoards = async () => {
  const response = await fetch(`${API_BASE_URL}/boards`);

  if (!response.ok) throw new Error('인기글 조회 실패');
  return await response.json();
};

// 마이팜 게시글 조회
export const fetchMyFarmBoards = async (memId) => {
  const response = await fetch(`${API_BASE_URL}/boards/${memId}`);

  if (!response.ok) throw new Error('마이팜 게시글 조회 실패');
  return await response.json();
};

// 게시글 상세 조회
export const fetchBoardDetail = async (boardNum) => {
  const response = await fetch(`${API_BASE_URL}/boards/boardDetail/${boardNum}`);

  if (!response.ok) throw new Error('게시글 상세 조회 실패');
  return await response.json();
};

// 게시글 수정
export const updateBoard = async (boardNum, boardData) => {
  const response = await fetch(`${API_BASE_URL}/boards/boardDetail/${boardNum}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(boardData),
  });

  if (!response.ok) throw new Error('게시글 수정 실패');
  return await response.text();
};

// 게시글 삭제
export const deleteBoard = async (boardNum) => {
  const response = await fetch(`${API_BASE_URL}/boards/boardDetail/${boardNum}`, {
    method: 'DELETE',
  });

  if (!response.ok) throw new Error('게시글 삭제 실패');
  return await response.text();
};

// 관리자 게시글 삭제
export const deleteBoardByAdmin = async (boardNum) => {
  const response = await fetch(`${API_BASE_URL}/boards/${boardNum}`, {
    method: 'DELETE',
  });

  if (!response.ok) throw new Error('게시글 삭제 실패');
  return await response.text();
};
