// API 기본 설정
// 서버를 실행하는 컴퓨터의 IP 주소로 변경하세요
// 예: export const API_BASE_URL = 'http://192.168.30.151:8080'
export const API_BASE_URL = 'http://192.168.30.151:8080' // 서버 컴퓨터 IP:포트

// API 엔드포인트
export const API_ENDPOINTS = {
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
  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
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
    return await apiFetch(API_ENDPOINTS.LEAVE_CHAT_ROOM(roomId, memId), {
      method: 'DELETE',
    })
  },

  // 읽음 처리
  markAsRead: async (roomId, memId) => {
    return await apiFetch(API_ENDPOINTS.MARK_AS_READ(roomId, memId), {
      method: 'PUT',
    })
  },

  // 안 읽은 메시지 수
  getUnreadCount: async (memId, roomId) => {
    return await apiFetch(API_ENDPOINTS.GET_UNREAD_COUNT(memId, roomId))
  },
}
