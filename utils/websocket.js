import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { API_BASE_URL } from './api'

class WebSocketService {
  constructor() {
    this.client = null
    this.subscriptions = new Map()
    this.connected = false
  }

  // WebSocket 연결
  connect(onConnected, onError) {
    // SockJS를 사용한 STOMP 클라이언트 생성
    this.client = new Client({
      webSocketFactory: () => new SockJS(`${API_BASE_URL}/ws-chat`),

      debug: (str) => {
        console.log('STOMP Debug:', str)
      },

      reconnectDelay: 5000, // 5초마다 재연결 시도
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      onConnect: (frame) => {
        console.log('WebSocket 연결 성공:', frame)
        this.connected = true
        if (onConnected) onConnected()
      },

      onStompError: (frame) => {
        console.error('STOMP 에러:', frame)
        this.connected = false
        if (onError) onError(frame)
      },

      onWebSocketError: (error) => {
        console.error('WebSocket 에러:', error)
        this.connected = false
        if (onError) onError(error)
      },

      onDisconnect: () => {
        console.log('WebSocket 연결 해제')
        this.connected = false
      },
    })

    this.client.activate()
  }

  // 연결 해제
  disconnect() {
    if (this.client) {
      // 모든 구독 해제
      this.subscriptions.forEach((subscription) => {
        subscription.unsubscribe()
      })
      this.subscriptions.clear()

      this.client.deactivate()
      this.connected = false
      console.log('WebSocket 연결 종료')
    }
  }

  // 채팅방 구독
  subscribeToRoom(roomId, onMessageReceived) {
    if (!this.connected || !this.client) {
      console.error('WebSocket이 연결되지 않았습니다')
      return null
    }

    const destination = `/topic/room/${roomId}`

    const subscription = this.client.subscribe(destination, (message) => {
      const receivedMessage = JSON.parse(message.body)
      console.log('메시지 수신:', receivedMessage)
      if (onMessageReceived) {
        onMessageReceived(receivedMessage)
      }
    })

    this.subscriptions.set(roomId, subscription)
    console.log(`채팅방 ${roomId} 구독 완료`)

    return subscription
  }

  // 채팅방 구독 해제
  unsubscribeFromRoom(roomId) {
    const subscription = this.subscriptions.get(roomId)
    if (subscription) {
      subscription.unsubscribe()
      this.subscriptions.delete(roomId)
      console.log(`채팅방 ${roomId} 구독 해제`)
    }
  }

  // 채팅방 입장
  joinRoom(roomId, userId, userName) {
    if (!this.connected || !this.client) {
      console.error('WebSocket이 연결되지 않았습니다')
      return
    }

    const message = {
      roomId: roomId,
      senderId: userId,
      senderName: userName,
      messageType: 'SYSTEM',
    }

    this.client.publish({
      destination: `/app/chat.join/${roomId}`,
      body: JSON.stringify(message),
    })

    console.log(`채팅방 ${roomId} 입장`)
  }

  // 채팅방 퇴장
  leaveRoom(roomId, userId, userName) {
    if (!this.connected || !this.client) {
      console.error('WebSocket이 연결되지 않았습니다')
      return
    }

    const message = {
      roomId: roomId,
      senderId: userId,
      senderName: userName,
      messageType: 'SYSTEM',
    }

    this.client.publish({
      destination: `/app/chat.leave/${roomId}`,
      body: JSON.stringify(message),
    })

    console.log(`채팅방 ${roomId} 퇴장`)
  }

  // 메시지 전송
  sendMessage(roomId, userId, userName, content, messageType = 'TEXT') {
    if (!this.connected || !this.client) {
      console.error('WebSocket이 연결되지 않았습니다')
      return
    }

    const message = {
      roomId: parseInt(roomId),
      senderId: userId,
      senderName: userName,
      content: content,
      messageType: messageType,
    }

    this.client.publish({
      destination: `/app/chat.send/${roomId}`,
      body: JSON.stringify(message),
    })

    console.log('메시지 전송:', message)
  }

  // 입력 중 알림
  sendTyping(roomId, userId) {
    if (!this.connected || !this.client) {
      return
    }

    this.client.publish({
      destination: `/app/chat.typing/${roomId}`,
      body: userId,
    })
  }

  // 연결 상태 확인
  isConnected() {
    return this.connected
  }
}

// 싱글톤 인스턴스 생성
const webSocketService = new WebSocketService()

export default webSocketService
