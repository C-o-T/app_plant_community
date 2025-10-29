// API 기본 설정
// Android Emulator는 10.0.2.2 사용, 실제 디바이스는 192.168.30.97 사용

export const API_BASE_URL = 'http://192.168.30.97:8080' // 에뮬레이터용



// API 엔드포인트
export const API_ENDPOINTS = {
  // 회원
  GET_ALL_MEMBERS: '/members/admin',

  // 채팅방
  GET_MY_CHAT_ROOMS: (memId) => `/api/chat/rooms/${memId}`,
  GET_CHAT_ROOM: (roomId) => `/api/chat/room/${roomId}`,
  CREATE_DIRECT_CHAT: '/api/chat/room/direct',
  CREATE_GROUP_CHAT: '/api/chat/room/group',

  // 채팅 메시지
  GET_MESSAGES: (roomId) => `/api/chat/messages/${roomId}`,
  SEND_MESSAGE: '/api/chat/message',
  DELETE_MESSAGE: (msgId) => `/api/chat/message/${msgId}`,

  // 참여자
  GET_PARTICIPANTS: (roomId) => `/api/chat/room/${roomId}/participants`,
  ADD_PARTICIPANT: (roomId, memId) => `/api/chat/room/${roomId}/participant/${memId}`,
  LEAVE_CHAT_ROOM: (roomId, memId) => `/api/chat/room/${roomId}/leave/${memId}`,

  // 읽음 처리
  MARK_AS_READ: (roomId, memId) => `/api/chat/room/${roomId}/read/${memId}`,
  GET_UNREAD_COUNT: (memId, roomId) => `/api/chat/unread/${memId}/${roomId}`,
}

// 공통 fetch 함수
const apiFetch = async (url, options = {}) => {
  // timeout 설정 (5초)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    // Content-Type 확인해서 JSON 또는 텍스트로 파싱
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      return await response.json()
    } else {
      // JSON이 아니면 텍스트로 반환
      return await response.text()
    }
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      console.error('API Timeout:', url)
      throw new Error('요청 시간 초과')
    }
    console.error('API Error:', error)
    throw error
  }
}

// 채팅 API 함수들
export const chatAPI = {
  // 채팅방 목록 조회
  getMyChatRooms: async (memId) => {
    return await apiFetch(API_ENDPOINTS.GET_MY_CHAT_ROOMS(memId))
  },

  // 채팅방 조회
  getChatRoom: async (roomId) => {
    return await apiFetch(API_ENDPOINTS.GET_CHAT_ROOM(roomId))
  },

  // 1:1 채팅방 생성
  createDirectChat: async (memId1, memId2) => {
    return await apiFetch(
      `${API_ENDPOINTS.CREATE_DIRECT_CHAT}?memId1=${memId1}&memId2=${memId2}`,
      { method: 'POST' }
    )
  },

  // 단체 채팅방 생성
  createGroupChat: async (roomName, memberIds) => {
    return await apiFetch(
      `${API_ENDPOINTS.CREATE_GROUP_CHAT}?roomName=${encodeURIComponent(roomName)}`,
      {
        method: 'POST',
        body: JSON.stringify(memberIds),
      }
    )
  },

  // 메시지 목록 조회
  getMessages: async (roomId, page = 1, size = 50) => {
    return await apiFetch(
      `${API_ENDPOINTS.GET_MESSAGES(roomId)}?page=${page}&size=${size}`
    )
  },

  // 메시지 전송
  sendMessage: async (messageData) => {
    return await apiFetch(API_ENDPOINTS.SEND_MESSAGE, {
      method: 'POST',
      body: JSON.stringify(messageData),
    })
  },

  // 메시지 삭제
  deleteMessage: async (msgId) => {
    return await apiFetch(API_ENDPOINTS.DELETE_MESSAGE(msgId), {
      method: 'DELETE',
    })
  },

  // 참여자 목록 조회
  getParticipants: async (roomId) => {
    return await apiFetch(API_ENDPOINTS.GET_PARTICIPANTS(roomId))
  },

  // 참여자 추가
  addParticipant: async (roomId, memId) => {
    return await apiFetch(API_ENDPOINTS.ADD_PARTICIPANT(roomId, memId), {
      method: 'POST',
    })
  },

  // 채팅방 나가기
  leaveChatRoom: async (roomId, memId) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.LEAVE_CHAT_ROOM(roomId, memId)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // 텍스트 응답 처리 (JSON이 아님)
      return await response.text()
    } catch (error) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        throw new Error('요청 시간 초과')
      }
      throw error
    }
  },

  // 읽음 처리
  markAsRead: async (roomId, memId) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.MARK_AS_READ(roomId, memId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // 텍스트 응답 처리 (JSON이 아님)
      return await response.text()
    } catch (error) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        throw new Error('요청 시간 초과')
      }
      throw error
    }
  },

  // 안 읽은 메시지 수
  getUnreadCount: async (memId, roomId) => {
    return await apiFetch(API_ENDPOINTS.GET_UNREAD_COUNT(memId, roomId))
  },
}

// 회원 API 함수들
export const memberAPI = {
  // 전체 회원 목록 조회
  getAllMembers: async () => {
    return await apiFetch(API_ENDPOINTS.GET_ALL_MEMBERS)
  },
}
