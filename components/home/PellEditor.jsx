import { Platform, StyleSheet, Text, View } from 'react-native';
import React, { useRef, useState } from 'react';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { Alert } from 'react-native';
const PellEditor = () => {
   const richText = useRef();
   const [content, setContent] = useState('');
   const handleImagePick = async () => {
      console.log('이미지 버튼 클릭!'); // 이게 출력되나요?
      console.log('ImagePicker:', ImagePicker); // undefined인가요?
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
       if (status !== 'granted') {
         Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
      return;
      }
   try {
      // 1. 갤러리에서 이미지 선택
      const result = await ImagePicker.launchImageLibraryAsync({
         mediaTypes: ['images'],
         allowsEditing: false,
         quality: 0.8,
      });

      if (!result.canceled) {
         // 2. FormData 생성
         const formData = new FormData();
         formData.append('img', {
            uri: result.assets[0].uri,           // 파일 경로
            type: 'image/jpeg',                  // MIME 타입
            name: 'photo.jpg',                   // 파일명
         });

         // 3. 서버로 전송
         const response = await axios.post(
            'http://192.168.30.97:8080/boards/upload/img',  // 업로드 엔드포인트
            formData, 
            {
               headers: { 
                  'Content-Type': 'multipart/form-data' 
               }
            }
         );

         // 4. 서버에서 받은 이미지 URL로 에디터에 삽입
         const imageUrl = response.data[0];
         console.log(response.data)
         richText.current?.insertImage(imageUrl);
      }
   } catch (error) {
      console.error('이미지 업로드 실패:', error);
      Alert.alert('오류', '이미지 업로드에 실패했습니다');
   }
};

   return (
      <View style={styles.container}>

         {/* 에디터 */}
         <RichEditor
            ref={richText}
            onChange={(html) => {
               setContent(html);
               console.log('HTML:', html);  // 디버깅용
            }}
            placeholder="내용을 입력하세요..."
            androidHardwareAccelerationDisabled={true}
            style={styles.editor}
            initialHeight={300}
            useContainer={true}
            
            // ⭐ 에디터 내부 CSS 스타일 설정
            editorStyle={{
               backgroundColor: '#fff',
               color: '#000',
               placeholderColor: '#999',
               contentCSSText: 'font-size: 16px; min-height: 300px; padding: 10px;',
            }}
            
            // ⭐ 초기 HTML 설정 (스타일 적용을 위해)
            initialContentHTML={''}
         />

         {/* 툴바 */}
         <RichToolbar
            editor={richText}
            actions={[
               actions.setBold,
               actions.setItalic,
               actions.setUnderline,
               actions.setStrikethrough,
               actions.insertBulletsList,
               actions.insertOrderedList,
               actions.insertImage
            ]}
             onPressAddImage={()=> handleImagePick()}  // 이미지 버튼 누르면 바로 갤러리!
            style={styles.toolbar}
         />
      </View>
   )
}

export default PellEditor

const styles = StyleSheet.create({
   container: {
      height: 450,
      marginTop: 10,
   },
   toolbar: {
      backgroundColor: '#f5f5f5',
      borderTopWidth: 1,
      borderTopColor: '#ddd',
      borderBottomWidth: 1,
      borderBottomColor: '#ddd',
      minHeight: 40,
   },
   editor: {
      flex: 1,
      borderColor: '#ddd',
      borderWidth: 1,
      borderRadius: 5,
      backgroundColor: '#fff',
   },
   preview: {
      marginTop: 10,
      padding: 10,
      backgroundColor: '#f0f0f0',
      borderRadius: 5,
   },
   previewTitle: {
      fontWeight: 'bold',
      marginBottom: 5,
   }
})
