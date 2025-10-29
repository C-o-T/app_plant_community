const API_BASE_URL = 'http://192.168.30.97:8080';

// 카테고리 목록 조회
export const fetchCategoryList = async () => {
  const response = await fetch(`${API_BASE_URL}/categories`);

  if (!response.ok) throw new Error('카테고리 목록 조회 실패');
  return await response.json();
};
