
const API_BASE_URL = 'http://192.168.30.97:8080';


/**
 * 물주기 일정 추가
 */
export const addWateringSchedule = async (memId, wateringData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/watering`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        memId,
        plantName: wateringData.plantName,
        wateringDate: wateringData.date,
        cycleDay: wateringData.cycle,
      }),
    });
    
    const text = await response.text();
    console.log('물주기 일정 추가 응답:', response.status, text);
    
    if (!response.ok) {
      try {
        const errorData = JSON.parse(text);
        throw new Error(errorData.message || '물주기 일정 추가 실패');
      } catch (e) {
        // 에러 메시지 처리
        let errorMsg = '물주기 일정 추가 실패';
        
        if (text.includes('foreign key constraint fails')) {
          errorMsg = '⚠️ 로그인이 필요하거나 사용자 정보가 유효하지 않습니다.';
        } else if (text.includes('Duplicate entry')) {
          errorMsg = '⚠️ 이미 같은 일정이 존재합니다.';
        } else if (response.status === 409) {
          errorMsg = '⚠️ 데이터 충돌이 발생했습니다.';
        } else if (response.status === 400) {
          errorMsg = '⚠️ 입력 데이터가 올바르지 않습니다.';
        }
        
        throw new Error(errorMsg);
      }
    }

    // 성공 시 JSON 파싱 시도, 실패하면 성공 메시지 반환
    try {
      return JSON.parse(text);
    } catch (parseError) {
      // JSON이 아닌 텍스트 응답이면 성공으로 처리
      console.log('물주기 일정 추가 성공 (텍스트 응답):', text);
      return { success: true, message: text };
    }
  } catch (error)   {
    console.error('물주기 일정 추가 에러:', error);
    throw error;
  }
};

// 물주기 일정 조회
export const fetchWateringSchedules = async (memId) => {
  const response = await fetch(`${API_BASE_URL}/watering?memId=${memId}`);
  if (!response.ok) throw new Error('물주기 일정 조회 실패');
  return await response.json();
};

// 물주기 일정 삭제
export const deleteWateringSchedule = async (wateringId) => {
  const response = await fetch(`${API_BASE_URL}/watering/${wateringId}`, {
    method: 'DELETE',
  });

  const text = await response.text();
  console.log('물주기 일정 삭제 응답:', response.status, text);
  
  if (!response.ok) throw new Error('물주기 일정 삭제 실패');
  
  // JSON 파싱 시도, 실패하면 성공 메시지 반환
  try {
    return JSON.parse(text);
  } catch (parseError) {
    console.log('물주기 일정 삭제 성공 (텍스트 응답):', text);
    return { success: true, message: text };
  }
};

// 일기 작성
export const addDiary = async (memId, diaryData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/diaries`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        memId,
        diaryTitle: diaryData.title,
        diaryContent: `날씨: ${diaryData.weather}\n\n${diaryData.content}`,
        diaryDate: diaryData.date,
      }),
    });
    
    // 응답 텍스트 먼저 확인
    const text = await response.text();
    console.log('일기 작성 응답:', response.status, text);
    
    if (!response.ok) {
      // JSON 파싱 시도
      try {
        const errorData = JSON.parse(text);
        throw new Error(errorData.message || '일기 작성 실패');
      } catch (e) {
        // JSON이 아니면 텍스트에서 의미있는 에러 추출
        let errorMsg = '일기 작성 실패';
        
        // 외래키 에러 확인
        if (text.includes('foreign key constraint fails')) {
          errorMsg = '⚠️ 로그인이 필요하거나 사용자 정보가 유효하지 않습니다.';
        } 
        // 중복 에러 확인
        else if (text.includes('Duplicate entry')) {
          errorMsg = '⚠️ 이미 같은 날짜에 일기가 존재합니다.';
        }
        // 기타 SQL 에러
        else if (text.includes('SQL') || text.includes('database')) {
          errorMsg = '⚠️ 데이터베이스 오류가 발생했습니다.';
        }
        // 상태 코드별 메시지
        else if (response.status === 409) {
          errorMsg = '⚠️ 데이터 충돌이 발생했습니다. 이미 존재하는 데이터이거나 유효하지 않은 정보입니다.';
        } else if (response.status === 400) {
          errorMsg = '⚠️ 입력 데이터가 올바르지 않습니다.';
        } else if (response.status === 404) {
          errorMsg = '⚠️ 서버를 찾을 수 없습니다.';
        } else if (response.status >= 500) {
          errorMsg = '⚠️ 서버 오류가 발생했습니다.';
        }
        
        throw new Error(errorMsg);
      }
    }
    
    // 성공 시 JSON 파싱 시도, 실패하면 성공 메시지 반환
    try {
      return JSON.parse(text);
    } catch (parseError) {
      // JSON이 아닌 텍스트 응답이면 성공으로 처리
      console.log('일기 작성 성공 (텍스트 응답):', text);
      return { success: true, message: text };
    }
  } catch (error) {
    console.error('일기 작성 에러:', error);
    throw error;
  }
};

// 일기 조회
export const fetchDiaries = async (memId) => {
  const response = await fetch(`${API_BASE_URL}/diaries?memId=${memId}`);
  if (!response.ok) throw new Error('일기 조회 실패');
  return await response.json();
};

// 일기 삭제
export const deleteDiary = async (diaryId) => {
  const response = await fetch(`${API_BASE_URL}/diaries/${diaryId}`, {
    method: 'DELETE',
  });
  
  const text = await response.text();
  console.log('일기 삭제 응답:', response.status, text);
  
  if (!response.ok) throw new Error('일기 삭제 실패');
  
  // JSON 파싱 시도, 실패하면 성공 메시지 반환
  try {
    return JSON.parse(text);
  } catch (parseError) {
    console.log('일기 삭제 성공 (텍스트 응답):', text);
    return { success: true, message: text };
  }
};
