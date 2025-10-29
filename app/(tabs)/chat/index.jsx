import { FlatList, StyleSheet, Text, TouchableOpacity, View, Modal, TextInput, Image } from 'react-native'
import React, { useState, useEffect } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { chatAPI, memberAPI } from '../../../utils/api'
import * as SecureStore from 'expo-secure-store'
import webSocketService from '../../../utils/websocket'

const ChatScreen = () => {
  const [chatRooms, setChatRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState([])
  const [groupName, setGroupName] = useState('')
  const [refreshKey, setRefreshKey] = useState(0) // 강제 리렌더링용

  // 로그인한 사용자 정보
  const [currentUserId, setCurrentUserId] = useState('')

  // 회원 목록 (실제 API에서 가져옴)
  const [members, setMembers] = useState([])
  const [loadingMembers, setLoadingMembers] = useState(false)

  // 로그인 정보 불러오기
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const userInfoString = await SecureStore.getItemAsync('loginInfo')
        if (userInfoString) {
          const userInfo = JSON.parse(userInfoString)
          setCurrentUserId(userInfo.memId)
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

  // 화면 포커스 시 채팅방 목록 새로고침 및 WebSocket 연결
  useFocusEffect(
    React.useCallback(() => {
      if (!currentUserId) return

      console.log('📱 채팅 화면 포커스')

      // 채팅방 목록 로드
      fetchChatRooms()

      // WebSocket 연결 (중복 방지 로직은 websocket.js에 있음)
      connectWebSocket()

      // 화면에서 벗어날 때 구독만 해제 (연결은 유지)
      return () => {
        console.log('📱 채팅 화면 포커스 해제 - 구독 해제')
        webSocketService.unsubscribeFromAllMessages()
      }
    }, [currentUserId])
  )

  // WebSocket 연결 및 전체 메시지 구독
  const connectWebSocket = () => {
    webSocketService.connect(
      () => {
        // 이미 구독 중이면 다시 구독하지 않음
        if (webSocketService.subscriptions.has('all-messages')) {
          console.log('이미 전체 메시지 구독 중')
          return
        }

        console.log('📡 전체 메시지 구독 시작')
        // 전체 메시지 구독
        webSocketService.subscribeToAllMessages((message) => {
          console.log('💬 새 메시지 수신:', message)

          // 해당 채팅방의 마지막 메시지 업데이트 및 맨 위로 이동
          setChatRooms((prevRooms) => {
            const roomExists = prevRooms.find(room => room.roomId === message.roomId)

            // 새로운 채팅방이면 목록 전체를 다시 불러오기
            if (!roomExists) {
              console.log('🆕 새로운 채팅방 감지 - 목록 새로고침')
              fetchChatRooms()
              return prevRooms
            }

            const updatedRooms = prevRooms.map((room) => {
              if (room.roomId === message.roomId) {
                // 내가 보낸 메시지가 아니면 unreadCount 증가
                const isMyMessage = message.senderId === currentUserId
                const newUnreadCount = isMyMessage ? room.unreadCount || 0 : (room.unreadCount || 0) + 1

                return {
                  ...room,
                  lastMessage: message.content,
                  lastMessageAt: message.sentAt || new Date().toISOString(),
                  unreadCount: newUnreadCount,
                }
              }
              return room
            })

            // lastMessageAt 기준으로 내림차순 정렬 (최신 메시지가 위로)
            const sorted = updatedRooms.sort((a, b) => {
              if (!a.lastMessageAt) return 1
              if (!b.lastMessageAt) return -1
              return new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
            })

            // 강제 리렌더링 트리거
            setRefreshKey(prev => prev + 1)
            return sorted
          })
        })
      },
      () => {
        console.log('WebSocket 연결 실패')
      }
    )
  }

  const fetchChatRooms = async () => {
    try {
      console.log(`📋 채팅방 목록 조회 시작 (사용자: ${currentUserId})`)
      // 백엔드 API 호출
      const data = await chatAPI.getMyChatRooms(currentUserId)
      console.log(`📋 조회된 채팅방 수: ${data.length}`, data)

      // 회원 정보 조회 (이름 및 프로필 이미지)
      let memberMap = new Map()
      try {
        const members = await memberAPI.getAllMembers()
        members.forEach(member => {
          memberMap.set(member.memId, {
            name: member.memName,
            profileImageUrl: member.profileImageUrl
          })
        })
      } catch (error) {
        console.warn('회원 정보 로드 실패 - ID로 표시됩니다')
      }

      // 채팅방 이름 및 프로필 이미지 설정
      const roomsWithNames = data.map((room) => {
        console.log(`🔍 채팅방 ${room.roomId} 처리:`, {
          roomType: room.roomType,
          roomName: room.roomName,
          participantIds: room.participantIds
        })

        if (!room.participantIds) {
          console.warn(`⚠️ 채팅방 ${room.roomId}에 participantIds가 없습니다`)
          return room
        }

        const participantArray = room.participantIds.split(',').map(id => id.trim())
        const otherUserIds = participantArray.filter(id => id !== currentUserId)

        // 실제로는 DIRECT지만 3명 이상이면 단체방으로 처리 (백엔드 동기화 문제 대응)
        const isActuallyGroup = otherUserIds.length >= 2

        // 1:1 채팅방 (상대방 1명)
        if (!isActuallyGroup && otherUserIds.length === 1) {
          const otherUserId = otherUserIds[0]
          const memberInfo = memberMap.get(otherUserId)
          room.roomName = memberInfo?.name || otherUserId
          room.profileImageUrl = memberInfo?.profileImageUrl
          room.otherUserId = otherUserId
        }
        // 단체 채팅방 (상대방 2명 이상 또는 roomType이 GROUP)
        else if (isActuallyGroup || room.roomType === 'GROUP') {
          // roomName이 없거나 "단체 채팅방"이면 참여자 이름으로 동적 생성
          if (!room.roomName || room.roomName === '단체 채팅방') {
            const participantNames = otherUserIds
              .map(id => {
                const memberInfo = memberMap.get(id)
                return memberInfo?.name || id
              })
              .filter(name => name)

            console.log(`🏷️ 채팅방 ${room.roomId} 이름 생성:`, {
              otherUserIds,
              participantNames,
              memberMapSize: memberMap.size
            })

            if (participantNames.length === 0) {
              room.roomName = '단체 채팅방'
            } else if (participantNames.length <= 4) {
              // 4명 이하: 모든 이름 표시
              room.roomName = participantNames.join(', ')
            } else {
              // 5명 이상: "이름1, 이름2 외 n명"
              room.roomName = `${participantNames.slice(0, 1).join(', ')} 외 ${participantNames.length - 1}명`
            }
          }

          // 단체방 프로필 이미지 (최대 4명까지)
          room.groupProfileImages = otherUserIds
            .slice(0, 4)
            .map(id => {
              const memberInfo = memberMap.get(id)
              return {
                memId: id,
                name: memberInfo?.name || id,
                profileImageUrl: memberInfo?.profileImageUrl
              }
            })
        }

        return room
      })

      // lastMessageAt 기준으로 내림차순 정렬 (최신 메시지가 위로)
      const sortedRooms = roomsWithNames.sort((a, b) => {
        if (!a.lastMessageAt) return 1
        if (!b.lastMessageAt) return -1
        return new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
      })

      console.log(`✅ 채팅방 목록 업데이트 완료: ${sortedRooms.length}개`)
      // 배열을 완전히 새로 만들어서 리렌더링 강제
      setChatRooms([...sortedRooms])
      setRefreshKey(prev => prev + 1) // 강제 리렌더링
    } catch (error) {
      console.error('❌ 채팅방 목록 조회 실패:', error)
      setChatRooms([])
    } finally {
      setLoading(false)
    }
  }

  // 회원 목록 불러오기
  const fetchMembers = async () => {
    setLoadingMembers(true)
    try {
      const data = await memberAPI.getAllMembers()
      const filteredMembers = data.filter(member => member.memId !== currentUserId)
      setMembers(filteredMembers)
    } catch (error) {
      console.error('회원 목록 조회 실패:', error)
      setMembers([])
    } finally {
      setLoadingMembers(false)
    }
  }

  const toggleUserSelection = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    )
  }

  const createChatRoom = async () => {
    if (selectedUsers.length === 0) {
      alert('사용자를 선택해주세요')
      return
    }

    try {
      let newRoomId

      if (selectedUsers.length === 1) {
        // 1:1 채팅방 생성
        const result = await chatAPI.createDirectChat(currentUserId, selectedUsers[0])
        newRoomId = result.roomId
      } else {
        // 단체 채팅방 생성
        const roomName = groupName.trim() || '단체 채팅방'
        const memberIds = [currentUserId, ...selectedUsers]
        const result = await chatAPI.createGroupChat(roomName, memberIds)
        newRoomId = result.roomId
      }

      // 모달 닫기 및 초기화
      setShowCreateModal(false)
      setSelectedUsers([])
      setGroupName('')

      // 채팅방 목록 새로고침 (약간의 딜레이 후)
      setTimeout(async () => {
        await fetchChatRooms()
      }, 300)

      // 새로 만든 채팅방으로 이동
      const selectedUserName = members.find(u => u.memId === selectedUsers[0])?.memName || '채팅방'
      router.push({
        pathname: '/chat/room',
        params: {
          roomId: newRoomId,
          roomName: selectedUsers.length === 1 ? selectedUserName : (groupName || '단체 채팅방')
        }
      })
    } catch (error) {
      console.error('채팅방 생성 실패:', error)
      alert('채팅방 생성에 실패했습니다')
    }
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date

    // 오늘
    if (diff < 86400000) {
      return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    }
    // 어제
    if (diff < 172800000) {
      return '어제'
    }
    // 그 외
    return date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
  }

  const renderChatRoom = ({ item }) => {
    // roomName이 null이거나 undefined인 경우 기본값 설정
    const displayName = item.roomName || '알 수 없는 채팅방'
    const isGroupChat = item.roomType === 'GROUP'
    const hasGroupImages = isGroupChat && item.groupProfileImages && item.groupProfileImages.length > 0

    return (
      <TouchableOpacity
        style={styles.chatRoomItem}
        onPress={() => {
          // 채팅방 입장 시 unreadCount를 0으로 초기화
          setChatRooms((prevRooms) =>
            prevRooms.map((room) =>
              room.roomId === item.roomId
                ? { ...room, unreadCount: 0 }
                : room
            )
          )

          router.push({
            pathname: '/chat/room',
            params: {
              roomId: item.roomId,
              roomName: displayName
            }
          })
        }}
      >
        {/* 프로필 이미지 영역 */}
        <View style={styles.profileImageContainer}>
          {hasGroupImages ? (
            // 단체방: 여러 프로필 이미지 표시 (2x2 그리드)
            <View style={styles.groupProfileContainer}>
              {item.groupProfileImages.slice(0, 4).map((member) => {
                const imageUrl = member.profileImageUrl
                  ? `http://192.168.30.97:8080${member.profileImageUrl}?t=${Date.now()}`
                  : null

                return (
                  <View key={member.memId} style={styles.groupProfileItem}>
                    {imageUrl ? (
                      <Image
                        source={{ uri: imageUrl }}
                        style={styles.groupProfileImage}
                      />
                    ) : (
                      <View style={styles.groupProfileImage}>
                        <Text style={styles.groupProfileText}>
                          {member.name.charAt(0)}
                        </Text>
                      </View>
                    )}
                  </View>
                )
              })}
            </View>
          ) : item.profileImageUrl ? (
            // 1:1 채팅: 단일 프로필 이미지
            <Image
              source={{ uri: `http://192.168.30.97:8080${item.profileImageUrl}?t=${Date.now()}` }}
              style={styles.profileImage}
            />
          ) : (
            // 기본 이미지
            <View style={styles.profileImage}>
              <Text style={styles.profileText}>
                {displayName.charAt(0)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.chatRoomContent}>
          <View style={styles.chatRoomHeader}>
            <Text style={styles.roomName}>
              {displayName}
              {item.roomType === 'GROUP' && item.participantCount && (
                <Text style={styles.participantCount}> {item.participantCount}</Text>
              )}
            </Text>
            <Text style={styles.lastMessageTime}>
              {item.lastMessageAt ? formatTime(item.lastMessageAt) : ''}
            </Text>
          </View>

          <View style={styles.chatRoomFooter}>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.lastMessage || '메시지가 없습니다'}
            </Text>
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>채팅</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setShowCreateModal(true)
            fetchMembers() // 모달 열 때 회원 목록 불러오기
          }}
        >
          <Ionicons name="add-outline" size={28} color="#000" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <Text>로딩 중...</Text>
        </View>
      ) : chatRooms.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>채팅방이 없습니다</Text>
        </View>
      ) : (
        <FlatList
          key={refreshKey}
          data={chatRooms}
          renderItem={renderChatRoom}
          keyExtractor={(item, index) => `${item.roomId}-${refreshKey}-${index}`}
          contentContainerStyle={styles.listContent}
          extraData={refreshKey}
          removeClippedSubviews={false}
        />
      )}

      {/* 채팅방 생성 모달 */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>새 채팅</Text>
            <TouchableOpacity
              onPress={createChatRoom}
              disabled={selectedUsers.length === 0}
            >
              <Text
                style={[
                  styles.confirmButton,
                  selectedUsers.length === 0 && styles.confirmButtonDisabled,
                ]}
              >
                확인
              </Text>
            </TouchableOpacity>
          </View>

          {selectedUsers.length > 1 && (
            <View style={styles.groupNameContainer}>
              <TextInput
                style={styles.groupNameInput}
                placeholder="단체 채팅방 이름 (선택사항)"
                value={groupName}
                onChangeText={setGroupName}
              />
            </View>
          )}

          <View style={styles.selectedUsersContainer}>
            {selectedUsers.length > 0 && (
              <Text style={styles.selectedCount}>
                선택됨: {selectedUsers.length}명
              </Text>
            )}
          </View>

          {loadingMembers ? (
            <View style={styles.centerContainer}>
              <Text>회원 목록 불러오는 중...</Text>
            </View>
          ) : (
            <FlatList
              data={members}
              keyExtractor={(item) => item.memId}
              renderItem={({ item }) => {
                const isSelected = selectedUsers.includes(item.memId)
                const userProfileUrl = item.profileImageUrl
                  ? `http://192.168.30.97:8080${item.profileImageUrl}`
                  : null

                return (
                  <TouchableOpacity
                    style={styles.userItem}
                    onPress={() => toggleUserSelection(item.memId)}
                  >
                    <View style={styles.userInfo}>
                      {userProfileUrl ? (
                        <Image
                          source={{ uri: userProfileUrl }}
                          style={styles.userAvatar}
                        />
                      ) : (
                        <View style={styles.userAvatar}>
                          <Text style={styles.userAvatarText}>
                            {item.memName.charAt(0)}
                          </Text>
                        </View>
                      )}
                      <View>
                        <Text style={styles.userName}>{item.memName}</Text>
                        {item.memEmail && (
                          <Text style={styles.userEmail}>{item.memEmail}</Text>
                        )}
                      </View>
                    </View>
                    <View
                      style={[
                        styles.checkbox,
                        isSelected && styles.checkboxSelected,
                      ]}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={18} color="#fff" />
                      )}
                    </View>
                  </TouchableOpacity>
                )
              }}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

export default ChatScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    padding: 4,
  },
  listContent: {
    paddingVertical: 8,
  },
  chatRoomItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profileImageContainer: {
    marginRight: 12,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFE08C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  // 단체방 프로필 이미지 (2x2 그리드)
  groupProfileContainer: {
    width: 50,
    height: 50,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
  },
  groupProfileItem: {
    width: 24,
    height: 24,
  },
  groupProfileImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFE08C',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#fff',
  },
  groupProfileText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
  },
  chatRoomContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatRoomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  participantCount: {
    fontSize: 14,
    color: '#999',
    fontWeight: 'normal',
  },
  lastMessageTime: {
    fontSize: 12,
    color: '#999',
  },
  chatRoomFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  unreadBadge: {
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  // 모달 스타일
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  confirmButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFE08C',
  },
  confirmButtonDisabled: {
    color: '#ccc',
  },
  groupNameContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  groupNameInput: {
    fontSize: 16,
    paddingVertical: 8,
  },
  selectedUsersContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#f9f9f9',
  },
  selectedCount: {
    fontSize: 14,
    color: '#666',
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFE08C',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: '#999',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#FFE08C',
    borderColor: '#FFE08C',
  },
})