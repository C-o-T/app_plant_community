import { chatAPI, memberAPI } from '@/utils/api'
import webSocketService from '@/utils/websocket'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Linking
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as SecureStore from 'expo-secure-store'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'

const ChatRoomScreen = () => {
  const { roomId, roomName } = useLocalSearchParams()

  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const [wsConnected, setWsConnected] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [participants, setParticipants] = useState([])
  const [participantProfiles, setParticipantProfiles] = useState({}) // senderId -> profileImageUrl 매핑
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [allMembers, setAllMembers] = useState([])
  const [selectedMembers, setSelectedMembers] = useState([])
  const [uploadingFile, setUploadingFile] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [viewingImage, setViewingImage] = useState(null) // 전체화면 이미지
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

      // 전체 회원 정보 조회해서 프로필 이미지 매핑
      const profileMap = {}
      try {
        const members = await memberAPI.getAllMembers()
        members.forEach(member => {
          if (member.profileImageUrl) {
            profileMap[member.memId] = member.profileImageUrl
          }
        })
        console.log('프로필 맵:', profileMap)
      } catch (error) {
        console.warn('회원 정보 로드 실패')
      }

      setParticipantProfiles(profileMap)
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

      // 메시지 로드 후 최하단으로 스크롤 (여러 번 시도)
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false })
      }, 100)
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false })
      }, 300)
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false })
      }, 500)
    } catch (error) {
      console.error('메시지 조회 실패:', error)
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

  // 이미지 선택
  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (permissionResult.granted === false) {
        Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        setSelectedFile({
          uri: result.assets[0].uri,
          type: 'image',
          name: result.assets[0].fileName || `image_${Date.now()}.jpg`,
          mimeType: 'image/jpeg'
        })
      }
    } catch (error) {
      console.error('이미지 선택 실패:', error)
      Alert.alert('오류', '이미지 선택에 실패했습니다')
    }
  }

  // 파일 선택
  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      })

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0]
        setSelectedFile({
          uri: file.uri,
          type: 'file',
          name: file.name,
          mimeType: file.mimeType,
          size: file.size
        })
      }
    } catch (error) {
      console.error('파일 선택 실패:', error)
      Alert.alert('오류', '파일 선택에 실패했습니다')
    }
  }

  // 파일 업로드 및 메시지 전송
  const sendFileMessage = async () => {
    if (!selectedFile) return

    setUploadingFile(true)

    try {
      // FormData 생성
      const formData = new FormData()
      formData.append('file', {
        uri: selectedFile.uri,
        type: selectedFile.mimeType,
        name: selectedFile.name,
      })
      formData.append('roomId', roomId)
      formData.append('senderId', currentUserId)

      // 파일 업로드
      const response = await fetch('http://192.168.30.97:8080/api/chat/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      if (!response.ok) {
        throw new Error('파일 업로드 실패')
      }

      const data = await response.json()

      // 메시지 전송
      const newMessage = {
        roomId: parseInt(roomId),
        senderId: currentUserId,
        senderName: currentUserName,
        content: selectedFile.name,
        messageType: selectedFile.type === 'image' ? 'IMAGE' : 'FILE',
        fileUrl: data.fileUrl,
      }

      // DB에 메시지 저장
      const savedMessage = await chatAPI.sendMessage(newMessage)

      // WebSocket으로 실시간 전송
      if (wsConnected) {
        webSocketService.sendMessage(
          roomId,
          currentUserId,
          currentUserName,
          selectedFile.name,
          newMessage.messageType,
          data.fileUrl
        )
      } else {
        setMessages((prev) => [...prev, {
          ...savedMessage,
          msgId: savedMessage.msgId || Date.now(),
          sentAt: savedMessage.sentAt || new Date().toISOString(),
        }])
      }

      // 선택된 파일 초기화
      setSelectedFile(null)

      // 자동 스크롤
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true })
      }, 100)
    } catch (error) {
      console.error('파일 전송 실패:', error)
      Alert.alert('오류', '파일 전송에 실패했습니다')
    } finally {
      setUploadingFile(false)
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

  // 전체 회원 목록 가져오기 (초대용)
  const fetchAllMembersForInvite = async () => {
    try {
      const members = await memberAPI.getAllMembers()

      // 이미 참여 중인 회원 제외
      const participantIds = participants.map(p => p.memId)
      const availableMembers = members.filter(
        member => !participantIds.includes(member.memId)
      )

      setAllMembers(availableMembers)
    } catch (error) {
      console.error('회원 목록 조회 실패:', error)
      setAllMembers([])
    }
  }

  // 회원 선택 토글
  const toggleMemberSelection = (memId) => {
    setSelectedMembers(prev =>
      prev.includes(memId)
        ? prev.filter(id => id !== memId)
        : [...prev, memId]
    )
  }

  // 대화상대 추가
  const handleAddMembers = async () => {
    if (selectedMembers.length === 0) {
      Alert.alert('알림', '추가할 회원을 선택해주세요')
      return
    }

    try {
      // 선택된 회원들을 채팅방에 추가
      for (const memId of selectedMembers) {
        await chatAPI.addParticipant(roomId, memId)
      }

      Alert.alert('성공', '대화상대가 추가되었습니다')
      setShowAddMemberModal(false)
      setSelectedMembers([])

      // 참여자 목록 새로고침
      await fetchParticipants()
    } catch (error) {
      console.error('대화상대 추가 실패:', error)
      Alert.alert('오류', '대화상대 추가에 실패했습니다')
    }
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

    // 프로필 이미지 URL (다른 사용자의 메시지인 경우에만)
    const senderProfileImageUrl = !isMyMessage && participantProfiles[item.senderId]
    const otherUserProfileUrl = senderProfileImageUrl
      ? `http://192.168.30.97:8080${senderProfileImageUrl}`
      : null

    // 메시지 내용 렌더링
    const renderMessageContent = () => {
      if (item.messageType === 'IMAGE' && item.fileUrl) {
        return (
          <TouchableOpacity
            onPress={() => {
              // 이미지 전체화면으로 보기
              setViewingImage(`http://192.168.30.97:8080${item.fileUrl}`)
            }}
          >
            <Image
              source={{ uri: `http://192.168.30.97:8080${item.fileUrl}` }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )
      } else if (item.messageType === 'FILE' && item.fileUrl) {
        return (
          <TouchableOpacity
            style={styles.fileMessageContainer}
            onPress={() => {
              // 파일 다운로드/열기
              const fileUrl = `http://192.168.30.97:8080${item.fileUrl}`
              Alert.alert(
                '파일',
                item.content,
                [
                  {
                    text: '취소',
                    style: 'cancel'
                  },
                  {
                    text: '열기',
                    onPress: async () => {
                      // React Native Linking API로 파일 열기
                      try {
                        const supported = await Linking.canOpenURL(fileUrl)
                        if (supported) {
                          await Linking.openURL(fileUrl)
                        } else {
                          Alert.alert('오류', '파일을 열 수 없습니다')
                        }
                      } catch (error) {
                        console.error('파일 열기 실패:', error)
                        Alert.alert('오류', '파일을 여는 중 오류가 발생했습니다')
                      }
                    }
                  }
                ]
              )
            }}
          >
            <Ionicons name="document-attach" size={24} color={isMyMessage ? "#000" : "#666"} />
            <Text style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.otherMessageText,
            ]}>
              {item.content}
            </Text>
          </TouchableOpacity>
        )
      } else {
        return (
          <Text
            style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.otherMessageText,
            ]}
          >
            {item.content}
          </Text>
        )
      }
    }

    if (isMyMessage) {
      // 내 메시지
      return (
        <View style={[styles.messageContainer, styles.myMessageContainer]}>
          <View style={styles.bubbleRow}>
            {showTime && (
              <Text style={styles.messageTime}>{formatTime(item.sentAt)}</Text>
            )}
            <View
              style={[
                styles.messageBubble,
                styles.myMessageBubble,
                item.messageType === 'IMAGE' && styles.imageMessageBubble,
              ]}
            >
              {renderMessageContent()}
            </View>
          </View>
        </View>
      )
    }

    // 상대방 메시지
    return (
      <View style={[styles.messageContainer, styles.otherMessageContainer]}>
        <View style={styles.messageRow}>
          {/* 프로필 이미지 */}
          <View style={styles.profileImageContainer}>
            {otherUserProfileUrl ? (
              <Image
                source={{ uri: otherUserProfileUrl }}
                style={styles.messageProfileImage}
              />
            ) : (
              <View style={styles.messageProfilePlaceholder}>
                <Text style={styles.messageProfileText}>
                  {item.senderName ? item.senderName.charAt(0) : '?'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.messageContentContainer}>
            {/* 사용자 이름 */}
            <Text style={styles.senderName}>{item.senderName}</Text>

            <View style={styles.bubbleRow}>
              <View
                style={[
                  styles.messageBubble,
                  styles.otherMessageBubble,
                  item.messageType === 'IMAGE' && styles.imageMessageBubble,
                ]}
              >
                {renderMessageContent()}
              </View>

              {showTime && (
                <Text style={styles.messageTime}>{formatTime(item.sentAt)}</Text>
              )}
            </View>
          </View>
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
              <FlatList
                data={participants}
                keyExtractor={(item, index) => item.memId || index.toString()}
                renderItem={({ item: participant }) => {
                  // participantProfiles에서 프로필 이미지 가져오기
                  const profileImageUrl = participantProfiles[participant.memId]
                  const participantProfileUrl = profileImageUrl
                    ? `http://192.168.30.97:8080${profileImageUrl}`
                    : null

                  return (
                    <View style={styles.participantItem}>
                      {participantProfileUrl ? (
                        <Image
                          source={{ uri: participantProfileUrl }}
                          style={styles.participantAvatar}
                        />
                      ) : (
                        <View style={styles.participantAvatar}>
                          <Text style={styles.participantAvatarText}>
                            {participant.memName ? participant.memName.charAt(0) : '?'}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.participantName}>
                        {participant.memName || participant.memId}
                        {participant.memId === currentUserId && ' (나)'}
                      </Text>
                    </View>
                  )
                }}
                style={styles.participantsList}
                nestedScrollEnabled
              />
            </View>

            {/* 구분선 */}
            <View style={styles.menuDivider} />

            {/* 대화상대 추가하기 버튼 */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false)
                fetchAllMembersForInvite()
                setShowAddMemberModal(true)
              }}
            >
              <Ionicons name="person-add-outline" size={22} color="#4CAF50" />
              <Text style={[styles.menuItemText, { color: '#4CAF50' }]}>대화상대 추가하기</Text>
            </TouchableOpacity>

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

      {/* 대화상대 추가 모달 */}
      <Modal
        visible={showAddMemberModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddMemberModal(false)}
      >
        <View style={styles.addMemberModalOverlay}>
          <View style={styles.addMemberModalContainer}>
            <View style={styles.addMemberHeader}>
              <Text style={styles.addMemberTitle}>대화상대 추가하기</Text>
              <TouchableOpacity onPress={() => setShowAddMemberModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={allMembers}
              keyExtractor={(item) => item.memId}
              renderItem={({ item }) => {
                const isSelected = selectedMembers.includes(item.memId)
                const memberProfileUrl = participantProfiles[item.memId]
                  ? `http://192.168.30.97:8080${participantProfiles[item.memId]}`
                  : null

                return (
                  <TouchableOpacity
                    style={[
                      styles.memberSelectItem,
                      isSelected && styles.memberSelectItemSelected
                    ]}
                    onPress={() => toggleMemberSelection(item.memId)}
                  >
                    {memberProfileUrl ? (
                      <Image
                        source={{ uri: memberProfileUrl }}
                        style={styles.memberSelectAvatar}
                      />
                    ) : (
                      <View style={styles.memberSelectAvatar}>
                        <Text style={styles.memberSelectAvatarText}>
                          {item.memName ? item.memName.charAt(0) : '?'}
                        </Text>
                      </View>
                    )}
                    <View style={styles.memberSelectInfo}>
                      <Text style={styles.memberSelectName}>{item.memName}</Text>
                      <Text style={styles.memberSelectId}>{item.memId}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                    )}
                  </TouchableOpacity>
                )
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>추가 가능한 회원이 없습니다</Text>
                </View>
              }
              style={styles.memberList}
            />

            <View style={styles.addMemberFooter}>
              <TouchableOpacity
                style={styles.addMemberCancelButton}
                onPress={() => {
                  setShowAddMemberModal(false)
                  setSelectedMembers([])
                }}
              >
                <Text style={styles.addMemberCancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.addMemberConfirmButton,
                  selectedMembers.length === 0 && styles.addMemberConfirmButtonDisabled
                ]}
                onPress={handleAddMembers}
                disabled={selectedMembers.length === 0}
              >
                <Text style={styles.addMemberConfirmButtonText}>
                  추가 ({selectedMembers.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
            }}
          />
        )}

        {/* 선택된 파일 미리보기 */}
        {selectedFile && (
          <View style={styles.filePreviewContainer}>
            {selectedFile.type === 'image' ? (
              <Image
                source={{ uri: selectedFile.uri }}
                style={styles.filePreviewImage}
              />
            ) : (
              <View style={styles.filePreviewFile}>
                <Ionicons name="document-attach" size={32} color="#666" />
                <Text style={styles.filePreviewText} numberOfLines={1}>
                  {selectedFile.name}
                </Text>
              </View>
            )}
            <View style={styles.filePreviewActions}>
              <TouchableOpacity
                style={styles.filePreviewButton}
                onPress={() => setSelectedFile(null)}
              >
                <Ionicons name="close-circle" size={24} color="#FF6B6B" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filePreviewButton, styles.filePreviewSendButton]}
                onPress={sendFileMessage}
                disabled={uploadingFile}
              >
                {uploadingFile ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={24} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.inputContainer}>
          {/* 파일 첨부 버튼들 */}
          <TouchableOpacity
            style={styles.attachButton}
            onPress={pickImage}
          >
            <Ionicons name="image-outline" size={24} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.attachButton}
            onPress={pickFile}
          >
            <Ionicons name="attach-outline" size={24} color="#666" />
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

      {/* 이미지 전체화면 뷰어 */}
      <Modal
        visible={!!viewingImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setViewingImage(null)}
      >
        <View style={styles.imageViewerContainer}>
          <TouchableOpacity
            style={styles.imageViewerClose}
            onPress={() => setViewingImage(null)}
          >
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          {viewingImage && (
            <Image
              source={{ uri: viewingImage }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
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
    marginBottom: 8,
    paddingHorizontal: 4,
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
    marginBottom: 4,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    maxWidth: '80%',
  },
  messageContentContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  profileImageContainer: {
    marginRight: 10,
    marginTop: 2,
  },
  messageProfileImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: '#ddd',
  },
  messageProfilePlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFE08C',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#ddd',
  },
  messageProfileText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    maxWidth: '100%',
  },
  myMessageBubble: {
    backgroundColor: '#FFE08C',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
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
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },
  imageMessageBubble: {
    padding: 4,
  },
  fileMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filePreviewContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filePreviewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  filePreviewFile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  filePreviewText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  filePreviewActions: {
    flexDirection: 'row',
    gap: 8,
  },
  filePreviewButton: {
    padding: 8,
  },
  filePreviewSendButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
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
  attachButton: {
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
  participantsList: {
    maxHeight: 250,
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
    borderWidth: 1,
    borderColor: '#ddd',
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
  // 대화상대 추가 모달 스타일
  addMemberModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMemberModalContainer: {
    backgroundColor: '#fff',
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  addMemberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  addMemberTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  memberList: {
    maxHeight: 400,
  },
  memberSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  memberSelectItemSelected: {
    backgroundColor: '#f0f9f4',
  },
  memberSelectAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE08C',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  memberSelectAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  memberSelectInfo: {
    flex: 1,
  },
  memberSelectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  memberSelectId: {
    fontSize: 13,
    color: '#666',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
  addMemberFooter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12,
  },
  addMemberCancelButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center',
  },
  addMemberCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  addMemberConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    alignItems: 'center',
  },
  addMemberConfirmButtonDisabled: {
    backgroundColor: '#ccc',
  },
  addMemberConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // 이미지 전체화면 뷰어
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
})
