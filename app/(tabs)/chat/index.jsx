import { FlatList, StyleSheet, Text, TouchableOpacity, View, Modal, TextInput } from 'react-native'
import React, { useState, useEffect } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { chatAPI, memberAPI } from '../../../utils/api'
import * as SecureStore from 'expo-secure-store'

const ChatScreen = () => {
  const [chatRooms, setChatRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState([])
  const [groupName, setGroupName] = useState('')

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

  useEffect(() => {
    if (currentUserId) {
      fetchChatRooms()
    }
  }, [currentUserId])

  const fetchChatRooms = async () => {
    try {
      // 백엔드 API 호출
      const data = await chatAPI.getMyChatRooms(currentUserId)
      console.log('✅ 채팅방 목록 조회 성공:', data)

      // 1:1 채팅방의 경우 참여자 정보에서 상대방 이름 가져오기
      const roomsWithNames = data.map((room) => {
        if (room.roomType === 'DIRECT' && !room.roomName && room.participantIds) {
          // participantIds는 쉼표로 구분된 문자열 ("kimfarm,parkfarm")
          const participantArray = room.participantIds.split(',')
          // 상대방 ID 찾기 (본인 제외)
          const otherUserId = participantArray.find(id => id !== currentUserId)
          if (otherUserId) {
            // 상대방 ID를 roomName으로 설정 (임시)
            room.roomName = otherUserId
          }
        }
        return room
      })

      console.log('📋 처리된 채팅방 목록:', roomsWithNames)
      setChatRooms(roomsWithNames)
    } catch (error) {
      console.error('채팅방 목록 조회 실패:', error)
      // API 실패 시 더미 데이터 표시
      const dummyData = [
        {
          roomId: 1,
          roomName: '홍길동',
          roomType: 'DIRECT',
          lastMessage: '안녕하세요!',
          lastMessageAt: new Date().toISOString(),
          unreadCount: 2,
          participantCount: 2
        },
        {
          roomId: 2,
          roomName: '식물 애호가 모임',
          roomType: 'GROUP',
          lastMessage: '오늘 날씨가 좋네요',
          lastMessageAt: new Date(Date.now() - 3600000).toISOString(),
          unreadCount: 0,
          participantCount: 5
        }
      ]
      setChatRooms(dummyData)
    } finally {
      setLoading(false)
    }
  }

  // 회원 목록 불러오기
  const fetchMembers = async () => {
    console.log('🔄 회원 목록 불러오기 시작...')
    setLoadingMembers(true)
    try {
      const data = await memberAPI.getAllMembers()
      console.log('✅ 회원 목록 조회 성공:', data)
      // 본인은 제외
      const filteredMembers = data.filter(member => member.memId !== currentUserId)
      setMembers(filteredMembers)
    } catch (error) {
      console.error('❌ 회원 목록 조회 실패:', error)
      // API 실패 시 더미 데이터 표시
      console.log('📋 더미 회원 데이터 표시')
      const dummyMembers = [
        { memId: 'user456', memName: '홍길동', memEmail: 'hong@test.com' },
        { memId: 'user789', memName: '김철수', memEmail: 'kim@test.com' },
        { memId: 'user101', memName: '이영희', memEmail: 'lee@test.com' },
        { memId: 'user202', memName: '박민수', memEmail: 'park@test.com' },
      ]
      setMembers(dummyMembers)
      console.log('✅ 더미 회원 설정 완료:', dummyMembers.length, '명')
    } finally {
      console.log('🏁 로딩 종료 - setLoadingMembers(false)')
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

      // 채팅방 목록 새로고침
      await fetchChatRooms()

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

    return (
      <TouchableOpacity
        style={styles.chatRoomItem}
        onPress={() => router.push({
          pathname: '/chat/room',
          params: { roomId: item.roomId, roomName: displayName }
        })}
      >
        <View style={styles.profileImageContainer}>
          <View style={styles.profileImage}>
            <Text style={styles.profileText}>
              {displayName.charAt(0)}
            </Text>
          </View>
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
          data={chatRooms}
          renderItem={renderChatRoom}
          keyExtractor={(item) => item.roomId.toString()}
          contentContainerStyle={styles.listContent}
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
                return (
                  <TouchableOpacity
                    style={styles.userItem}
                    onPress={() => toggleUserSelection(item.memId)}
                  >
                    <View style={styles.userInfo}>
                      <View style={styles.userAvatar}>
                        <Text style={styles.userAvatarText}>
                          {item.memName.charAt(0)}
                        </Text>
                      </View>
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