const API_BASE_URL = 'http://192.168.30.97:8080';

// 전체 회원 목록 캐시 (프로필 이미지 조회용)
let membersCache = null;
let cacheTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5분

// 전체 회원 목록 조회 (캐시 사용)
const getAllMembers = async () => {
  const now = Date.now();

  // 캐시가 있고 유효하면 캐시 반환
  if (membersCache && cacheTime && (now - cacheTime < CACHE_DURATION)) {
    return membersCache;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/members/admin`);
    if (!response.ok) {
      console.error('회원 목록 조회 실패:', response.status);
      return [];
    }

    const members = await response.json();
    membersCache = members;
    cacheTime = now;
    return members;
  } catch (error) {
    console.error('회원 목록 조회 오류:', error);
    return [];
  }
};

// 프로필 이미지 조회 - 회원 목록에서 찾기
export const fetchProfileImage = async (memId) => {
  try {
    // 회원 목록에서 해당 memId 찾기
    const members = await getAllMembers();
    const member = members.find(m => m.memId === memId);

    if (!member) {
      console.log(`회원을 찾을 수 없음: ${memId}`);
      return null;
    }

    // 프로필 이미지 URL 확인
    if (member.profileImageUrl) {
      const fullUrl = member.profileImageUrl.startsWith('http')
        ? member.profileImageUrl
        : API_BASE_URL + member.profileImageUrl;
      return fullUrl;
    }

    return null;
  } catch (error) {
    console.error('프로필 이미지 조회 실패:', error);
    return null;
  }
};

// 캐시 초기화 (프로필 업데이트 후 사용)
export const clearMembersCache = () => {
  membersCache = null;
  cacheTime = null;
};
