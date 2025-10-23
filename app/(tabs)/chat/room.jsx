import { chatAPI } from '@/utils/api'
import webSocketService from '@/utils/websocket'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const ChatRoomScreen = () => {
  const { roomId, roomName } = useLocalSearchParams()
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const [wsConnected, setWsConnected] = useState(false)
  const flatListRef = useRef(null)

  // TODO: 실제 사용자 ID로 교체 필요
  const currentUserId = 'user123'
  const currentUserName = '나'

  useEffect(() => {
    // WebSocket 연결
    connectWebSocket()

    // 기존 메시지 로드
    fetchMessages()

    // 컴포넌트 언마운트 시 정리
    return () => {
      if (wsConnected) {
        webSocketService.leaveRoom(roomId, currentUserId, currentUserName)
        webSocketService.unsubscribeFromRoom(roomId)
      }
    }
  }, [])

  const connectWebSocket = () => {
    webSocketService.connect(
      () => {
        console.log('✅ WebSocket 연결 성공 - 실시간 채팅 모드')
        setWsConnected(true)

        // 채팅방 구독
        webSocketService.subscribeToRoom(roomId, (message) => {
          console.log('📨 새 메시지 수신:', message)

          // 받은 메시지를 목록에 추가
          setMessages((prev) => {
            // msgId가 없으면 임시로 생성 (백엔드에서 안 보내주는 경우)
            if (!message.msgId) {
              message.msgId = `ws-${Date.now()}-${Math.random()}`
            }

            // 중복 방지: 같은 내용과 시간의 메시지가 있으면 추가하지 않음
            const isDuplicate = prev.some(m =>
              m.content === message.content &&
              m.senderId === message.senderId &&
              Math.abs(new Date(m.sentAt) - new Date(message.sentAt)) < 1000 // 1초 이내
            )

            if (isDuplicate) {
              console.log('중복 메시지 무시:', message.content)
              return prev
            }

            return [...prev, message]
          })

          // 자동 스크롤
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true })
          }, 100)
        })

        // 채팅방 입장 알림
        webSocketService.joinRoom(roomId, currentUserId, currentUserName)
      },
      (error) => {
        console.log('⚠️ WebSocket 연결 실패 - 더미 모드로 작동')
        console.log('서버가 실행되지 않았거나 네트워크 오류일 수 있습니다')
        setWsConnected(false)
        // Alert 제거 - 더미 모드로 조용히 작동
      }
    )
  }

  const fetchMessages = async () => {
    try {
      // 백엔드 API로 기존 메시지 조회
      const data = await chatAPI.getMessages(roomId)
      setMessages(data)
    } catch (error) {
      console.error('메시지 조회 실패:', error)

      // API 실패 시 더미 데이터 표시 (개발용)
      const dummyMessages = [
        {
          msgId: 1,
          roomId: parseInt(roomId),
          senderId: 'user456',
          senderName: '홍길동',
          content: '안녕하세요!',
          sentAt: new Date(Date.now() - 3600000).toISOString(),
          messageType: 'TEXT',
        },
        {
          msgId: 2,
          roomId: parseInt(roomId),
          senderId: currentUserId,
          senderName: currentUserName,
          content: '안녕하세요. 반갑습니다!',
          sentAt: new Date(Date.now() - 3000000).toISOString(),
          messageType: 'TEXT',
        },
      ]
      setMessages(dummyMessages)
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!inputText.trim()) return

    const messageContent = inputText.trim()
    setInputText('') // 입력창 바로 비우기

    const newMessage = {
      msgId: Date.now(),
      roomId: parseInt(roomId),
      senderId: currentUserId,
      senderName: currentUserName,
      content: messageContent,
      sentAt: new Date().toISOString(),
      messageType: 'TEXT',
    }

    try {
      if (wsConnected) {
        // WebSocket 연결되어 있으면 WebSocket으로 전송 (실시간)
        webSocketService.sendMessage(
          roomId,
          currentUserId,
          currentUserName,
          messageContent,
          'TEXT'
        )
      } else {
        // WebSocket 연결 안 되어 있으면 로컬에 바로 추가 (더미 모드)
        console.log('더미 모드: 로컬에만 메시지 추가')
        setMessages((prev) => [...prev, newMessage])
      }

      // 메시지 전송 후 스크롤 하단으로 이동
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true })
      }, 100)
    } catch (error) {
      console.error('메시지 전송 실패:', error)
      // 실패해도 로컬에는 추가
      setMessages((prev) => [...prev, newMessage])
    }
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  }

  const renderMessage = ({ item, index }) => {
    const isMyMessage = item.senderId === currentUserId
    const showTime =
      index === messages.length - 1 ||
      messages[index + 1].senderId !== item.senderId ||
      new Date(messages[index + 1].sentAt) - new Date(item.sentAt) > 60000

    return (
      <View
        style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer,
        ]}
      >
        {!isMyMessage && (
          <View style={styles.messageHeader}>
            <Text style={styles.senderName}>{item.senderName}</Text>
          </View>
        )}

        <View style={styles.messageRow}>
          {isMyMessage && showTime && (
            <Text style={styles.messageTime}>{formatTime(item.sentAt)}</Text>
          )}

          <View
            style={[
              styles.messageBubble,
              isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                isMyMessage ? styles.myMessageText : styles.otherMessageText,
              ]}
            >
              {item.content}
            </Text>
          </View>

          {!isMyMessage && showTime && (
            <Text style={styles.messageTime}>{formatTime(item.sentAt)}</Text>
          )}
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{roomName}</Text>
          <View style={styles.connectionStatus}>
            <View
              style={[
                styles.connectionDot,
                { backgroundColor: wsConnected ? '#4CAF50' : '#999' },
              ]}
            />
            <Text style={styles.connectionText}>
              {wsConnected ? '연결됨' : '연결 중...'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="menu" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <Text>로딩 중...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.msgId.toString()}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.addButton}>
            <Ionicons name="add-circle-outline" size={28} color="#666" />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="메시지를 입력하세요"
            multiline
            maxLength={1000}
          />

          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <Ionicons
              name="send"
              size={24}
              color={inputText.trim() ? '#FFE08C' : '#ccc'}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default ChatRoomScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#B5D4A5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  connectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  connectionText: {
    fontSize: 11,
    color: '#666',
  },
  menuButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
  },
  myMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  messageHeader: {
    marginBottom: 4,
  },
  senderName: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
    marginLeft: 8,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    maxWidth: '80%',
  },
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
    maxWidth: '100%',
  },
  myMessageBubble: {
    backgroundColor: '#FFE08C',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#000',
  },
  otherMessageText: {
    color: '#000',
  },
  messageTime: {
    fontSize: 11,
    color: '#666',
    marginHorizontal: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  addButton: {
    padding: 6,
    marginRight: 4,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    fontSize: 15,
  },
  sendButton: {
    padding: 6,
    marginLeft: 4,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
