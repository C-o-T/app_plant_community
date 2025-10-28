// React Native에서는 localhost 대신 PC의 실제 IP 주소 사용

// const API_BASE_URL = 'http://192.168.30.107:8080';
// 라즈베리파이 직접 연결용 (네트워크 연결 시)
const API_BASE_URL = 'http://192.168.30.97:8080';


export const controlActuator = async (raspNum, actName, command) => {
  // command가 AUTO면 AUTO 모드로, ON/OFF면 MANUAL 모드로
  const mode = command === 'AUTO' ? 'AUTO' : 'MANUAL';
  
  const url = `${API_BASE_URL}/control/control`;
  const payload = { raspNum, actName, command, mode };
  
  console.log('📡 controlActuator 호출');
  console.log('  URL:', url);
  console.log('  Payload:', JSON.stringify(payload));
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload),
    });
    
    console.log('  응답 상태:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('  응답 에러:', errorText);
      throw new Error(`제어 실패: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    console.log('  응답 성공:', result);
    return result;
  } catch (error) {
    console.error('  Fetch 에러:', error.message);
    throw error;
  }
};

export const fetchActuatorStatus = async (raspNum, actName) => {
  const response = await fetch(`${API_BASE_URL}/control/status?raspNum=${raspNum}&actName=${actName}`);
  if (!response.ok) throw new Error('상태 조회 실패');
  return await response.json();
};

export const fetchActuatorLogs = async (raspNum, actName = null, limit = 50) => {
  let url = `${API_BASE_URL}/control/logs?raspNum=${raspNum}&limit=${limit}`;
  if (actName) url += `&actName=${actName}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('로그 조회 실패');
  return await response.json();
};

export const changeMode = async (raspNum, mode) => {
  const response = await fetch(`${API_BASE_URL}/control/mode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ raspNum, mode }),
  });
  if (!response.ok) throw new Error('모드 변경 실패');
  return await response.json();
};
