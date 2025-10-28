import { chatAPI } from '@/utils/api'
import webSocketService from '@/utils/websocket'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as SecureStore from 'expo-secure-store'

const ChatRoomScreen = () => {
  const { roomId, roomName } = useLocalSearchParams()

  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const [wsConnected, setWsConnected] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [participants, setParticipants] = useState([])
  const flatListRef = useRef(null)

  // 로그인한 사용자 정보
  const [currentUserId, setCurrentUserId] = useState('')
  const [currentUserName, setCurrentUserName] = useState('')

  // 로그인 정보 불러오기
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const userInfoString = await SecureStore.getItemAsync('loginInfo')
        if (userInfoString) {
          const userInfo = JSON.parse(userInfoString)
          setCurrentUserId(userInfo.memId)
          setCurrentUserName(userInfo.memName)
        } else {
          // 로그인 정보가 없으면 로그인 페이지로 이동
          console.warn('로그인 정보가 없습니다.')
          router.replace('/auth/login')
        }
      } catch (error) {
        console.error('사용자 정보 로드 실패:', error)
      }
    }

    loadUserInfo()
  }, [])

  useEffect(() => {
    // 사용자 정보가 로드된 후에만 실행
    if (!currentUserId || !currentUserName) return

    // WebSocket 연결
    connectWebSocket()

    // 기존 메시지 로드
    fetchMessages()

    // 참여자 목록 로드
    fetchParticipants()

    // 채팅방 입장 시 읽음 처리
    markMessagesAsRead()

    // 컴포넌트 언마운트 시 정리
    return () => {
      if (wsConnected) {
        webSocketService.leaveRoom(roomId, currentUserId, currentUserName)
        webSocketService.unsubscribeFromRoom(roomId)
      }
    }
  }, [currentUserId, currentUserName])

  // 참여자 목록 조회
  const fetchParticipants = async () => {
    try {
      const data = await chatAPI.getParticipants(roomId)
      setParticipants(data)
    } catch (error) {
      console.error('참여자 목록 조회 실패:', error)
      setParticipants([])
    }
  }

  // 읽음 처리
  const markMessagesAsRead = async () => {
    try {
      await chatAPI.markAsRead(roomId, currentUserId)
    } catch (error) {
      console.error('읽음 처리 실패:', error.message)
    }
  }

  const connectWebSocket = () => {
    webSocketService.connect(
      () => {
        setWsConnected(true)

        // 채팅방 구독
        webSocketService.subscribeToRoom(roomId, (message) => {
          // SYSTEM 메시지 처리
          if (message.messageType === 'SYSTEM') {
            // 입장 메시지는 무시, 퇴장 메시지만 표시
            if (message.content && message.content.includes('퇴장')) {
              setMessages((prev) => {
                if (!message.msgId || message.msgId === 0) {
                  message.msgId = `system-${Date.now()}-${Math.random()}`
                }
                return [...prev, message]
              })

              // 참여자 목록 새로고침
              fetchParticipants()

              // 자동 스크롤
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true })
              }, 100)
            }
            return
          }

          // 받은 메시지를 목록에 추가
          setMessages((prev) => {
            // msgId가 0이거나 없으면 임시로 생성
            if (!message.msgId || message.msgId === 0) {
              message.msgId = `ws-${Date.now()}-${Math.random()}`
            }

            // 중복 방지
            const isDuplicate = prev.some(m =>
              m.content === message.content &&
              m.senderId === message.senderId &&
              Math.abs(new Date(m.sentAt) - new Date(message.sentAt)) < 1000
            )

            if (isDuplicate) {
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
      () => {
        setWsConnected(false)
      }
    )
  }

  const fetchMessages = async () => {
    try {
      const data = await chatAPI.getMessages(roomId)
      setMessages(data)

      // 메시지 로드 후 최하단으로 스크롤
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false })
      }, 100)
    } catch (error) {
      console.error('메시지 조회 실패:', error)
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!inputText.trim()) return

    const messageContent = inputText.trim()
    setInputText('')

    const newMessage = {
      roomId: parseInt(roomId),
      senderId: currentUserId,
      senderName: currentUserName,
      content: messageContent,
      messageType: 'TEXT',
    }

    try {
      // 1. DB에 메시지 저장
      const savedMessage = await chatAPI.sendMessage(newMessage)

      // 2. WebSocket으로 실시간 전송
      if (wsConnected) {
        webSocketService.sendMessage(
          roomId,
          currentUserId,
          currentUserName,
          messageContent,
          'TEXT'
        )
      } else {
        // WebSocket 연결 안 되어 있으면 로컬에 바로 추가
        setMessages((prev) => [...prev, {
          ...savedMessage,
          msgId: savedMessage.msgId || Date.now(),
          sentAt: savedMessage.sentAt || new Date().toISOString(),
        }])
      }

      // 자동 스크롤
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true })
      }, 100)
    } catch (error) {
      console.error('메시지 전송 실패:', error)
      // 실패해도 로컬에는 추가
      setMessages((prev) => [...prev, {
        ...newMessage,
        msgId: `temp-${Date.now()}`,
        sentAt: new Date().toISOString(),
      }])
    }
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  }

  // 채팅방 나가기
  const handleLeaveChatRoom = () => {
    Alert.alert(
      '채팅방 나가기',
      '정말 채팅방을 나가시겠습니까?',
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '나가기',
          style: 'destructive',
          onPress: async () => {
            try {
              // 1. WebSocket으로 퇴장 알림 전송
              if (wsConnected) {
                webSocketService.leaveRoom(roomId, currentUserId, currentUserName)
                webSocketService.unsubscribeFromRoom(roomId)
              }

              // 2. 백엔드 API로 채팅방 나가기
              await chatAPI.leaveChatRoom(roomId, currentUserId)

              // 3. 채팅방 목록으로 이동
              router.back()
            } catch (error) {
              console.error('채팅방 나가기 실패:', error)
              Alert.alert('오류', '채팅방 나가기에 실패했습니다.')
            }
          },
        },
      ]
    )
  }

  const renderMessage = ({ item, index }) => {
    // SYSTEM 메시지인 경우 (퇴장 메시지)
    if (item.messageType === 'SYSTEM') {
      return (
        <View style={styles.systemMessageContainer}>
          <Text style={styles.systemMessageText}>{item.content}</Text>
        </View>
      )
    }

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
        <TouchableOpacity style={styles.menuButton} onPress={() => setShowMenu(true)}>
          <Ionicons name="menu" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* 메뉴 모달 */}
      <Modal
        visible={showMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            {/* 참여자 목록 */}
            <View style={styles.participantsSection}>
              <Text style={styles.participantsTitle}>
                참여자 ({participants.length}명)
              </Text>
              {participants.map((participant, index) => (
                <View key={participant.memId || index} style={styles.participantItem}>
                  <View style={styles.participantAvatar}>
                    <Text style={styles.participantAvatarText}>
                      {participant.memName ? participant.memName.charAt(0) : '?'}
                    </Text>
                  </View>
                  <Text style={styles.participantName}>
                    {participant.memName || participant.memId}
                    {participant.memId === currentUserId && ' (나)'}
                  </Text>
                </View>
              ))}
            </View>

            {/* 구분선 */}
            <View style={styles.menuDivider} />

            {/* 나가기 버튼 */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false)
                handleLeaveChatRoom()
              }}
            >
              <Ionicons name="exit-outline" size={22} color="#FF6B6B" />
              <Text style={styles.menuItemText}>채팅방 나가기</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  systemMessageText: {
    fontSize: 12,
    color: '#999',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
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
  // 메뉴 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menuContainer: {
    backgroundColor: '#fff',
    marginTop: 60,
    marginRight: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 220,
    maxWidth: 280,
  },
  participantsSection: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    maxHeight: 300,
  },
  participantsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  participantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFE08C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantAvatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  participantName: {
    fontSize: 15,
    color: '#333',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: '500',
  },
})
