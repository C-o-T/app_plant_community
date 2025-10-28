// 회원가입 유효성 검사 함수

export const handleErrorMsg = (name, value, joinData) => {
  //아이디-유효성검사
  //영어소문자, 숫자 조합만 가능 + 4~10자
  const memIdRegex = /^[a-z0-9]{4,10}$/;

  //비밀번호-유효성검사
  //영어 대소문자 + 숫자, 4~12자
  const memPwRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{4,12}$/;

  //이름
  //필수입력

  //전화번호-유효성검사
  //000-0000-0000 형식
  const memTellRegex = /^\d{3}-\d{4}-\d{4}$/;

  //사업자등록번호-유효성검사
  //000-00-00000 형식
  const memBusinessNumRegex = /^\d{3}-\d{2}-\d{5}$/;

  //상호명
  //사업자등록번호를 입력했다면, 입력하기

  //유효성검사
  let errorStr = '';
  switch(name){
    case 'memId' :
      if(!value){
        errorStr = '아이디를 입력하세요.'
      } else if (value.length < 4 || value.length > 11) {
        errorStr = '아이디는 4~10글자여야합니다.'
      } else if (!memIdRegex.test(value)) {
        errorStr = '아이디는 영어 소문자, 숫자만 사용할 수 있습니다.'
      } else {
        errorStr = ''
      }
      break;

    case 'memPw' :
      if (!value) {
        errorStr = '비밀번호를 입력하세요.'
      } else if (value.length < 4 || value.length > 13) {
        errorStr = '비밀번호는 4~12글자여야 합니다.'
      } else if (!memPwRegex.test(value)) {
        errorStr = '비밀번호는 영어와 숫자를 합께 사용해야합니다.'
      } else {
        errorStr = ''
      }
      break;

    case 'memPwConfirm' :
      if (joinData.memPw !== value) {
        errorStr = '비밀번호가 일치하지 않습니다.'
      } else {
        errorStr = ''
      }
      break;

    case 'memName' :
      if (!value) {
        errorStr = '이름을 입력하세요.'
      } else {
        errorStr = ''
      }
      break;

    case 'memTell' :
      if (!value) {
        errorStr = '연락처를 입력하세요.'
      } else if (!memTellRegex.test(value)) {
        errorStr = '000-0000-0000 형식으로 입력하세요.'
      } else {
        errorStr = ''
      }
      break;

    case 'memBusinessNum' :
      if (!value) {
        errorStr = '사업자번호를 입력하세요'
      } else if (!memBusinessNumRegex.test(value)) {
        errorStr = '000-00-00000 형식으로 입력하세요.'
      } else {
        errorStr = ''
      }
      if (joinData.memBusinessName !=='' && value === '') {
        errorStr = '사업자번호를 입력하세요.'
      }
      break;

    case 'memBusinessName' :
      if (!value) {
        errorStr = ''
      }
      if (joinData.memBusinessNum !== '' && value === '') {
        errorStr = '상호명을 입력하세요.'
      }
      break;

  }

  return errorStr;
}

/**
 * 전체 회원가입 데이터 유효성 검사
 * @param {object} joinData
 * @returns {object} { isValid: boolean, errors: object }
 */
export const validateJoinData = (joinData) => {
  const errors = {
    memId: handleErrorMsg('memId', joinData.memId, joinData),
    memPw: handleErrorMsg('memPw', joinData.memPw, joinData),
    memPwConfirm: handleErrorMsg('memPwConfirm', joinData.memPwConfirm, joinData),
    memName: handleErrorMsg('memName', joinData.memName, joinData),
    memTell: handleErrorMsg('memTell', joinData.memTell, joinData)
  };

  // 사업자회원인 경우 추가 검사
  if (joinData.memGrade === 'BUSINESS') {
    errors.memBusinessNum = handleErrorMsg('memBusinessNum', joinData.memBusinessNum, joinData);
    errors.memBusinessName = handleErrorMsg('memBusinessName', joinData.memBusinessName, joinData);
  }

  // 모든 에러 메시지가 비어있으면 유효함
  const isValid = Object.values(errors).every(error => error === '');

  return { isValid, errors };
};
