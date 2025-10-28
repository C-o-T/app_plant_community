// React Native에서는 localhost 대신 PC의 실제 IP 주소 사용

// const API_BASE_URL = 'http://192.168.30.107:8080';
// 라즈베리파이 직접 연결용 (네트워크 연결 시)
const API_BASE_URL = 'http://192.168.30.97:8080';


/**
 * 센서 데이터 조회
 * @returns {Promise<Object>} 센서 데이터
 */
export const fetchSensorData = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/sensor/last`);
    if (!response.ok) {
      throw new Error('센서 데이터 조회 실패');
    }
    return await response.json();
  } catch (error) {
    console.error('센서 데이터 조회 에러:', error);
    throw error;
  }
};

/**
 * 센서 히스토리 조회 (전체 리스트)
 * @returns {Promise<Array>} 센서 데이터 배열
 */
export const fetchSensorHistory = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/sensor`);
    if (!response.ok) {
      throw new Error('센서 히스토리 조회 실패');
    }
    return await response.json();
  } catch (error) {
    console.error('센서 히스토리 조회 에러:', error);
    throw error;
  }
};
