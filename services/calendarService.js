const API_BASE_URL = 'http://192.168.30.107:8080';

// 물주기 일정 추가
export const addWateringSchedule = async (memId, wateringData) => {
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
  if (!response.ok) throw new Error('물주기 일정 추가 실패');
  return await response.json();
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
  if (!response.ok) throw new Error('물주기 일정 삭제 실패');
  return await response.json();
};

// 일기 작성
export const addDiary = async (memId, diaryData) => {
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
  if (!response.ok) throw new Error('일기 작성 실패');
  return await response.json();
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
  if (!response.ok) throw new Error('일기 삭제 실패');
  return await response.json();
};
