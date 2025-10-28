import { StyleSheet, Text, TouchableWithoutFeedback, View, ScrollView, Keyboard, Alert, Pressable } from 'react-native'
import { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Picker } from '@react-native-picker/picker'
import axios from 'axios'
import Input from '@/components/common/Input'
import Button from '@/components/common/Button'
import Select from '@/components/common/Select'
import { colors } from '@/constants/colorConstant'
import { validateJoinData, handleErrorMsg } from '@/utils/joinValidate'

// 에러 메시지 컴포넌트
const ErrorText = ({ message }) => {
  return message ? <Text style={styles.errorText}>{message}</Text> : null;
};

const Join = () => {
  const router = useRouter();

  // 회원가입 입력 데이터
  const [joinData, setJoinData] = useState({
    memGrade: 'USER',
    memId: '',
    memPw: '',
    memPwConfirm: '',
    memName: '',
    memAddr: '',
    memDetailAddr: '',
    memTell: '',
    memEmail: '',
    firstEmail: '',
    secondEmail: '',
    memBusinessNum: '',
    memBusinessName: ''
  });

  // 중복 확인 상태
  const [isDuplicated, setIsDuplicated] = useState({
    memId: false,
    memTell: false,
    memBusinessNum: false
  });

  // 에러 메시지 상태
  const [errorMsg, setErrorMsg] = useState({
    memId: '',
    memPw: '',
    memPwConfirm: '',
    memName: '',
    memTell: '',
    memBusinessNum: '',
    memBusinessName: ''
  });

  // 입력값 변경 처리
  const handleChange = (name, value) => {
    // 이메일 처리
    if (name === 'firstEmail' || name === 'secondEmail') {
      setJoinData({
        ...joinData,
        [name]: value,
        memEmail: name === 'firstEmail'
          ? value + joinData.secondEmail
          : joinData.firstEmail + value
      });
    } else {
      setJoinData({
        ...joinData,
        [name]: value
      });

      // 유효성 검사 에러 메시지 업데이트
      const error = handleErrorMsg(name, value, { ...joinData, [name]: value });
      setErrorMsg({
        ...errorMsg,
        [name]: error
      });
    }

    // 입력값이 변경되면 중복확인 초기화
    if (name === 'memId' || name === 'memTell' || name === 'memBusinessNum') {
      setIsDuplicated({ ...isDuplicated, [name]: false });
    }
  };

  // 통합 중복확인 함수
  const checkDuplicate = async (type) => {
    const config = {
      memId: {
        value: joinData.memId,
        url: `http://192.168.30.97:8080/members/checkId/${joinData.memId}`,
        emptyMsg: '아이디를 입력하세요.',
        successMsg: '사용 가능한 아이디입니다.',
        failMsg: '이 아이디는 사용할 수 없습니다.'
      },
      memTell: {
        value: joinData.memTell,
        url: `http://192.168.30.97:8080/members/checkTell/${joinData.memTell}`,
        emptyMsg: '연락처를 입력하세요.',
        successMsg: '사용 가능한 연락처입니다.',
        failMsg: '이 연락처는 사용할 수 없습니다.'
      },
      memBusinessNum: {
        value: joinData.memBusinessNum,
        url: `http://192.168.30.97:8080/members/checkBusinessNum/${joinData.memBusinessNum}`,
        emptyMsg: '사업자등록번호를 입력하세요.',
        successMsg: '회원 가입 가능한 사업자번호입니다.',
        failMsg: '중복된 사업자 번호입니다.'
      }
    };

    const checkConfig = config[type];

    if (!checkConfig.value) {
      Alert.alert('알림', checkConfig.emptyMsg);
      return;
    }

    try {
      const res = await axios.get(checkConfig.url);
      if (res.data === 0) {
        Alert.alert('알림', checkConfig.successMsg);
        setIsDuplicated({ ...isDuplicated, [type]: true });
      } else {
        Alert.alert('알림', checkConfig.failMsg);
      }
    } catch (e) {
      console.log(`${type} 중복확인 에러:`, e);
      Alert.alert('오류', '중복확인 중 오류가 발생했습니다.');
    }
  };

  // 회원가입 처리
  const handleJoin = async () => {
    // 유효성 검사
    const { isValid, errors } = validateJoinData(joinData);

    if (!isValid) {
      // 첫 번째 에러 메시지 찾기
      const firstError = Object.values(errors).find(error => error !== '');
      Alert.alert('알림', firstError);
      return;
    }

    // 중복 확인 검사
    if (!isDuplicated.memId) {
      Alert.alert('알림', 'ID 중복확인을 해주세요.');
      return;
    }

    if (!isDuplicated.memTell) {
      Alert.alert('알림', '연락처 중복확인을 해주세요.');
      return;
    }

    // 사업자회원인 경우 사업자등록번호 중복 확인
    if (joinData.memGrade === 'BUSINESS' && !isDuplicated.memBusinessNum) {
      Alert.alert('알림', '사업자등록번호 중복확인을 해주세요.');
      return;
    }

    try {
      await axios.post('http://192.168.30.97:8080/members', joinData);
      Alert.alert('환영합니다', '회원가입이 완료되었습니다.', [
        { text: '확인', onPress: () => router.replace('/auth/login') }
      ]);
    } catch (e) {
      console.log('회원가입 에러:', e);
      Alert.alert('오류', '회원가입 중 오류가 발생했습니다.');
    }
  };

  const isBusinessMember = joinData.memGrade === 'BUSINESS';

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.title}>회원가입</Text>

          {/* 회원 구분 */}
          <View style={styles.radioGroup}>
            <Pressable
              style={styles.radioButton}
              onPress={() => handleChange('memGrade', 'USER')}
            >
              <View style={[styles.radioCircle, joinData.memGrade === 'USER' && styles.radioCircleSelected]}>
                {joinData.memGrade === 'USER' && <View style={styles.radioDot} />}
              </View>
              <Text style={styles.radioText}>일반회원</Text>
            </Pressable>

            <Pressable
              style={styles.radioButton}
              onPress={() => handleChange('memGrade', 'BUSINESS')}
            >
              <View style={[styles.radioCircle, joinData.memGrade === 'BUSINESS' && styles.radioCircleSelected]}>
                {joinData.memGrade === 'BUSINESS' && <View style={styles.radioDot} />}
              </View>
              <Text style={styles.radioText}>사업자회원</Text>
            </Pressable>
          </View>

          {/* 아이디 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>아이디 *</Text>
            <View style={styles.rowInput}>
              <View style={styles.flexInput}>
                <Input
                  placeholder="아이디"
                  value={joinData.memId}
                  onChangeText={(text) => handleChange('memId', text)}
                />
              </View>
              <Button
                title="중복확인"
                size="extraSmall"
                onPress={() => checkDuplicate('memId')}
                backgroundColor={colors.SUB1}
              />
            </View>
            <ErrorText message={errorMsg.memId} />
          </View>

          {/* 비밀번호 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>비밀번호 *</Text>
            <Input
              placeholder="비밀번호"
              value={joinData.memPw}
              onChangeText={(text) => handleChange('memPw', text)}
              isPw={true}
            />
            <ErrorText message={errorMsg.memPw} />
          </View>

          {/* 비밀번호 확인 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>비밀번호 확인 *</Text>
            <Input
              placeholder="비밀번호 확인"
              value={joinData.memPwConfirm}
              onChangeText={(text) => handleChange('memPwConfirm', text)}
              isPw={true}
            />
            <ErrorText message={errorMsg.memPwConfirm} />
          </View>

          {/* 이름 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>이름 *</Text>
            <Input
              placeholder="이름"
              value={joinData.memName}
              onChangeText={(text) => handleChange('memName', text)}
            />
            <ErrorText message={errorMsg.memName} />
          </View>

          {/* 주소 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>주소</Text>
            <Input
              placeholder="주소"
              value={joinData.memAddr}
              onChangeText={(text) => handleChange('memAddr', text)}
            />
          </View>

          {/* 상세주소 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>상세주소</Text>
            <Input
              placeholder="상세주소"
              value={joinData.memDetailAddr}
              onChangeText={(text) => handleChange('memDetailAddr', text)}
            />
          </View>

          {/* 연락처 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>연락처 *</Text>
            <View style={styles.rowInput}>
              <View style={styles.flexInput}>
                <Input
                  placeholder="연락처"
                  value={joinData.memTell}
                  onChangeText={(text) => handleChange('memTell', text)}
                  keyboardType="phone-pad"
                />
              </View>
              <Button
                title="중복확인"
                size="extraSmall"
                onPress={() => checkDuplicate('memTell')}
                backgroundColor={colors.SUB1}
              />
            </View>
            <ErrorText message={errorMsg.memTell} />
          </View>

          {/* 이메일 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>이메일</Text>
            <View style={styles.emailRow}>
              <View style={styles.emailInput}>
                <Input
                  placeholder="이메일"
                  value={joinData.firstEmail}
                  onChangeText={(text) => handleChange('firstEmail', text)}
                  keyboardType="email-address"
                />
              </View>
              <View style={styles.emailSelect}>
                <Select
                  value={joinData.secondEmail}
                  onValueChange={(value) => handleChange('secondEmail', value)}
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

          {/* 사업자등록번호 - 사업자회원만 */}
          {isBusinessMember && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>사업자등록번호 *</Text>
              <View style={styles.rowInput}>
                <View style={styles.flexInput}>
                  <Input
                    placeholder="사업자등록번호"
                    value={joinData.memBusinessNum}
                    onChangeText={(text) => handleChange('memBusinessNum', text)}
                    keyboardType="number-pad"
                  />
                </View>
                <Button
                  title="중복확인"
                  size="extraSmall"
                  onPress={() => checkDuplicate('memBusinessNum')}
                  backgroundColor={colors.SUB1}
                />
              </View>
              <ErrorText message={errorMsg.memBusinessNum} />
            </View>
          )}

          {/* 상호명 - 사업자회원만 */}
          {isBusinessMember && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>상호명 *</Text>
              <Input
                placeholder="상호명"
                value={joinData.memBusinessName}
                onChangeText={(text) => handleChange('memBusinessName', text)}
              />
              <ErrorText message={errorMsg.memBusinessName} />
            </View>
          )}

          {/* 회원가입 버튼 */}
          <Button
            title="회원가입"
            onPress={handleJoin}
            backgroundColor={colors.MAIN}
          />

          {/* 취소 버튼 */}
          <Button
            title="취소"
            onPress={() => router.back()}
            backgroundColor={colors.SUB1}
            textColor={colors.WHITE}
          />
        </ScrollView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

export default Join;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.WHITE
  },
  scrollView: {
    padding: 20
  },
  scrollContent: {
    paddingBottom: 50
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 30,
    marginBottom: 20,
    paddingVertical: 10
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.SUB1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  radioCircleSelected: {
    borderColor: colors.MAIN
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.MAIN
  },
  radioText: {
    fontSize: 16,
    fontWeight: '500'
  },
  inputGroup: {
    marginBottom: 15
  },
  label: {
    fontSize: 14,
    marginBottom: 5,
    fontWeight: '500'
  },
  rowInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  flexInput: {
    flex: 1
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  emailInput: {
    flex: 2
  },
  emailSelect: {
    flex: 2
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 8
  }
});