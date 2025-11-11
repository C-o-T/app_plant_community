import { useEffect, useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, Alert, Modal, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import Input from '@/components/common/Input';
import Select from '@/components/common/Select';
import Button from '@/components/common/Button';
import { colors } from '@/constants/colorConstant';
import { getMemberDetail, updateMember, withdrawMember, checkTell, checkBusinessNum } from '@/services/memberService';
import { Picker } from '@react-native-picker/picker';
import { handleErrorMsg } from '@/utils/joinValidate';

// 에러 메시지 컴포넌트
const ErrorText = ({ message }) => {
  return message ? <Text style={styles.errorText}>{message}</Text> : null;
};

// 라벨 컴포넌트 (필수 표시 포함)
const FormLabel = ({ text, required = false }) => {
  return (
    <Text style={styles.label}>
      {text}
      {required && <Text style={styles.requiredMark}> *</Text>}
    </Text>
  );
};

const EditInfo = () => {
  const router = useRouter();
  const [memberData, setMemberData] = useState({
    memId: '',
    memPw: '',
    memPwConfirm: '',
    memName: '',
    memAddr: '',
    memDetailAddr: '',
    memTell: '',
    memEmail: '',
    memBusinessNum: '',
    memBusinessName: '',
    firstEmail: '',
    secondEmail: '',
  });

  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // 에러 메시지 상태
  const [errorMsg, setErrorMsg] = useState({
    memPw: '',
    memPwConfirm: '',
    memTell: '',
    memBusinessNum: '',
    memBusinessName: '',
  });

  // 중복 확인 상태 (원본 데이터와 비교용)
  const [originalData, setOriginalData] = useState({
    memTell: '',
    memBusinessNum: '',
  });

  useEffect(() => {
    loadMemberData();
  }, []);

  const loadMemberData = async () => {
    try {
      const loginInfo = await SecureStore.getItemAsync('loginInfo');
      if (!loginInfo) {
        Alert.alert('알림', '로그인이 필요합니다.');
        router.replace('/auth/login');
        return;
      }

      const parsedInfo = JSON.parse(loginInfo);
      const memId = parsedInfo.memId;

      // 회원 정보 조회
      const data = await getMemberDetail(memId);

      // 이메일 분리
      let firstEmail = '';
      let secondEmail = '';
      if (data.memEmail) {
        const atIndex = data.memEmail.indexOf('@');
        if (atIndex !== -1) {
          firstEmail = data.memEmail.substring(0, atIndex);
          secondEmail = data.memEmail.substring(atIndex);
        }
      }

      setMemberData({
        ...data,
        memPw: '',
        memPwConfirm: '',
        firstEmail,
        secondEmail,
      });

      // 원본 데이터 저장 (중복 확인용)
      setOriginalData({
        memTell: data.memTell || '',
        memBusinessNum: data.memBusinessNum || '',
      });
    } catch (error) {
      console.error('회원 정보 로드 실패:', error);
      Alert.alert('오류', '회원 정보를 불러오는데 실패했습니다.');
    }
  };

  const handleUpdateData = (name, value) => {
    // 새로운 데이터 객체
    const newData = { ...memberData, [name]: value };

    if (name === 'firstEmail' || name === 'secondEmail') {
      newData.memEmail =
        name === 'firstEmail'
          ? value + memberData.secondEmail
          : memberData.firstEmail + value;
    }

    setMemberData(newData);

    // 유효성 검사 (에러 메시지가 있는 필드만)
    if (errorMsg.hasOwnProperty(name)) {
      const error = handleErrorMsg(name, value, newData);
      setErrorMsg({
        ...errorMsg,
        [name]: error,
      });
    }
  };

  // 중복 확인 함수
  const handleCheckDuplicate = async (type) => {
    if (type === 'memTell') {
      // 연락처가 비어있는지 확인
      if (!memberData.memTell) {
        Alert.alert('알림', '연락처를 입력하세요.');
        return;
      }

      // 유효성 검사
      const error = handleErrorMsg('memTell', memberData.memTell, memberData);
      if (error) {
        Alert.alert('알림', error);
        return;
      }

      // 원본과 같으면 중복 확인 불필요
      if (memberData.memTell === originalData.memTell) {
        Alert.alert('알림', '현재 사용 중인 연락처입니다.');
        return;
      }

      try {
        const result = await checkTell(memberData.memTell);
        if (result === 0) {
          Alert.alert('알림', '사용 가능한 연락처입니다.');
        } else {
          Alert.alert('알림', '이미 사용 중인 연락처입니다.');
        }
      } catch (error) {
        Alert.alert('오류', '중복 확인 중 오류가 발생했습니다.');
      }
    } else if (type === 'memBusinessNum') {
      // 사업자등록번호가 비어있는지 확인
      if (!memberData.memBusinessNum) {
        Alert.alert('알림', '사업자등록번호를 입력하세요.');
        return;
      }

      // 유효성 검사
      const error = handleErrorMsg('memBusinessNum', memberData.memBusinessNum, memberData);
      if (error) {
        Alert.alert('알림', error);
        return;
      }

      // 원본과 같으면 중복 확인 불필요
      if (memberData.memBusinessNum === originalData.memBusinessNum) {
        Alert.alert('알림', '현재 사용 중인 사업자등록번호입니다.');
        return;
      }

      try {
        const result = await checkBusinessNum(memberData.memBusinessNum);
        if (result === 0) {
          Alert.alert('알림', '사용 가능한 사업자등록번호입니다.');
        } else {
          Alert.alert('알림', '이미 사용 중인 사업자등록번호입니다.');
        }
      } catch (error) {
        Alert.alert('오류', '중복 확인 중 오류가 발생했습니다.');
      }
    }
  };

  const handleUpdate = async () => {
    try {
      // 유효성 검사
      const errors = {
        memPw: memberData.memPw ? handleErrorMsg('memPw', memberData.memPw, memberData) : '',
        memPwConfirm: memberData.memPw ? handleErrorMsg('memPwConfirm', memberData.memPwConfirm, memberData) : '',
        memTell: handleErrorMsg('memTell', memberData.memTell, memberData),
      };

      // 사업자회원인 경우 추가 검사
      if (memberData.memGrade === 'BUSINESS') {
        errors.memBusinessNum = handleErrorMsg('memBusinessNum', memberData.memBusinessNum, memberData);
        errors.memBusinessName = handleErrorMsg('memBusinessName', memberData.memBusinessName, memberData);
      }

      // 에러가 있는지 확인
      const firstError = Object.values(errors).find(error => error !== '');
      if (firstError) {
        Alert.alert('알림', firstError);
        setErrorMsg(errors);
        return;
      }

      // 업데이트할 데이터 준비 (백엔드가 받는 필드만 전송)
      const updateData = {
        memId: memberData.memId,
        memName: memberData.memName,
        memAddr: memberData.memAddr,
        memDetailAddr: memberData.memDetailAddr,
        memTell: memberData.memTell,
        memEmail: memberData.memEmail,
        memGrade: memberData.memGrade,
        memBusinessNum: memberData.memBusinessNum,
        memBusinessName: memberData.memBusinessName,
      };

      // 비밀번호를 입력했다면 추가
      if (memberData.memPw) {
        updateData.memPw = memberData.memPw;
      }

      const updatedMember = await updateMember(memberData.memId, updateData);

      // SecureStore 업데이트
      const loginInfo = await SecureStore.getItemAsync('loginInfo');
      const parsedInfo = JSON.parse(loginInfo);
      const newLoginInfo = {
        ...parsedInfo,
        memAddr: updatedMember.memAddr,
        memName: updatedMember.memName,
      };
      await SecureStore.setItemAsync('loginInfo', JSON.stringify(newLoginInfo));

      setShowUpdateModal(false);
      Alert.alert('성공', '회원정보가 수정되었습니다.', [
        { text: '확인', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('회원정보 수정 실패:', error);
      Alert.alert('오류', '회원정보 수정에 실패했습니다.');
      setShowUpdateModal(false);
    }
  };

  const handleWithdraw = async () => {
    try {
      const result = await withdrawMember(memberData.memId);

      if (result.success) {
        Alert.alert(
          '탈퇴 완료',
          '회원 탈퇴가 완료되었습니다. 그동안 이용해주셔서 감사합니다.',
          [
            {
              text: '확인',
              onPress: async () => {
                await SecureStore.deleteItemAsync('loginInfo');
                router.replace('/auth/login');
              },
            },
          ]
        );
      } else {
        Alert.alert('오류', result.message || '회원 탈퇴에 실패했습니다.');
      }
    } catch (error) {
      console.error('회원 탈퇴 실패:', error);
      Alert.alert('오류', '회원 탈퇴 중 오류가 발생했습니다.');
    } finally {
      setShowWithdrawModal(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>개인정보수정</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>아이디</Text>
            <Text style={styles.readOnlyText}>{memberData.memId}</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>비밀번호</Text>
            <Input
              isPw={true}
              value={memberData.memPw}
              onChangeText={(value) => handleUpdateData('memPw', value)}
              placeholder="변경할 비밀번호를 입력하세요"
            />
            <ErrorText message={errorMsg.memPw} />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>비밀번호 확인</Text>
            <Input
              isPw={true}
              value={memberData.memPwConfirm}
              onChangeText={(value) => handleUpdateData('memPwConfirm', value)}
              placeholder="비밀번호를 다시 입력하세요"
            />
            <ErrorText message={errorMsg.memPwConfirm} />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>이름</Text>
            <Text style={styles.readOnlyText}>{memberData.memName}</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>주소</Text>
            <Input
              value={memberData.memAddr || ''}
              onChangeText={(value) => handleUpdateData('memAddr', value)}
              placeholder="주소를 입력하세요"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>상세주소</Text>
            <Input
              value={memberData.memDetailAddr || ''}
              onChangeText={(value) => handleUpdateData('memDetailAddr', value)}
              placeholder="상세주소를 입력하세요"
            />
          </View>

          <View style={styles.formGroup}>
            <FormLabel text="연락처" required={true} />
            <View style={styles.rowInput}>
              <View style={styles.flexInput}>
                <Input
                  value={memberData.memTell || ''}
                  onChangeText={(value) => handleUpdateData('memTell', value)}
                  placeholder="000-0000-0000"
                  keyboardType="phone-pad"
                />
              </View>
              <Button
                title="중복확인"
                size="extraSmall"
                onPress={() => handleCheckDuplicate('memTell')}
                backgroundColor={colors.SUB1}
                textColor={colors.BLACK}
              />
            </View>
            <ErrorText message={errorMsg.memTell} />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>이메일</Text>
            <View style={styles.emailRow}>
              <View style={styles.emailInput}>
                <Input
                  value={memberData.firstEmail || ''}
                  onChangeText={(value) => handleUpdateData('firstEmail', value)}
                  placeholder="이메일"
                  keyboardType="email-address"
                />
              </View>
              <View style={styles.emailSelect}>
                <Select
                  value={memberData.secondEmail || ''}
                  onValueChange={(value) => handleUpdateData('secondEmail', value)}
                >
                  <Picker.Item label="선택" value="" />
                  <Picker.Item label="@gmail.com" value="@gmail.com" />
                  <Picker.Item label="@naver.com" value="@naver.com" />
                  <Picker.Item label="@kakao.com" value="@kakao.com" />
                  <Picker.Item label="@nate.com" value="@nate.com" />
                </Select>
              </View>
            </View>
          </View>

          <View style={styles.formGroup}>
            <FormLabel text="사업자등록번호" required={memberData.memGrade === 'BUSINESS'} />
            <View style={styles.rowInput}>
              <View style={styles.flexInput}>
                <Input
                  value={memberData.memBusinessNum || ''}
                  onChangeText={(value) => handleUpdateData('memBusinessNum', value)}
                  placeholder="000-00-00000"
                  keyboardType="number-pad"
                />
              </View>
              <Button
                title="중복확인"
                size="extraSmall"
                onPress={() => handleCheckDuplicate('memBusinessNum')}
                backgroundColor={colors.SUB1}
                textColor={colors.BLACK}
              />
            </View>
            <ErrorText message={errorMsg.memBusinessNum} />
          </View>

          <View style={styles.formGroup}>
            <FormLabel text="상호명" required={memberData.memGrade === 'BUSINESS'} />
            <Input
              value={memberData.memBusinessName || ''}
              onChangeText={(value) => handleUpdateData('memBusinessName', value)}
              placeholder="상호명을 입력하세요"
            />
            <ErrorText message={errorMsg.memBusinessName} />
          </View>

          <View style={styles.buttonGroup}>
            <Button
              title="수정"
              onPress={() => setShowUpdateModal(true)}
              backgroundColor={colors.MAIN}
            />
            <Button
              title="회원 탈퇴"
              onPress={() => setShowWithdrawModal(true)}
              backgroundColor={colors.SUB2}
              textColor={colors.BLACK}
            />
          </View>
        </View>
      </ScrollView>

      {/* 회원정보 수정 확인 모달 */}
      <Modal
        visible={showUpdateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUpdateModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowUpdateModal(false)}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalIcon}>✅</Text>
            <Text style={styles.modalTitle}>회원정보 수정</Text>
            <Text style={styles.modalText}>회원정보를 수정하시겠습니까?</Text>
            <View style={styles.modalButtons}>
              <Button
                title="취소"
                onPress={() => setShowUpdateModal(false)}
                backgroundColor={colors.SUB2}
                textColor={colors.BLACK}
                size="small"
              />
              <Button
                title="수정하기"
                onPress={handleUpdate}
                backgroundColor={colors.MAIN}
                size="small"
              />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 회원 탈퇴 확인 모달 */}
      <Modal
        visible={showWithdrawModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowWithdrawModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowWithdrawModal(false)}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalIcon}>⚠️</Text>
            <Text style={styles.modalTitle}>회원 탈퇴</Text>
            <Text style={styles.modalText}>
              정말로 탈퇴하시겠습니까?{"\n"}탈퇴 시 모든 정보가 삭제되며 복구할 수 없습니다.
            </Text>
            <View style={styles.modalButtons}>
              <Button
                title="취소"
                onPress={() => setShowWithdrawModal(false)}
                backgroundColor={colors.SUB1}
                textColor={colors.BLACK}
              />
              <Button
                title="탈퇴하기"
                onPress={handleWithdraw}
                backgroundColor="#ff4444"
                textColor={colors.WHITE}
              />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

export default EditInfo;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.WHITE,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 6,
    color: colors.BLACK,
  },
  readOnlyText: {
    fontSize: 16,
    padding: 10,
    marginHorizontal: 6,
    color: colors.BLACK,
    opacity: 0.7,
  },
  rowInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  flexInput: {
    flex: 1,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emailInput: {
    flex: 2,
  },
  emailSelect: {
    flex: 2,
  },
  buttonGroup: {
    marginTop: 30,
    gap: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.WHITE,
    borderRadius: 20,
    padding: 30,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalIcon: {
    fontSize: 50,
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 25,
    color: colors.BLACK,
    opacity: 0.7,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 8,
  },
  requiredMark: {
    color: 'red',
    fontSize: 16,
    fontWeight: '600',
  },
});
