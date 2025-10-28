import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native'
import React, { useState } from 'react'
import Entypo from '@expo/vector-icons/Entypo';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Button from '../common/Button';
import { useRouter } from 'expo-router';
const Community = ({item}) => {
   const router = useRouter();
   const [likeState, setLikeState] = useState(false);
   //데이터 확인
   console.log(item);
   return (
      
      <View>
         <Button title='글쓰기' onPress={() => {router.push('/write')}}/>
         <Pressable>
            <Image 
               style = {{
                  width : 200,
                  height : 100
               }}
               source = {{
                  uri : item.imgList.imgUrl
               }}
            />
            <Text>
               {item.title}
            </Text>
         </Pressable>
         <Pressable onPress = {() => {
            likeState ? setLikeState(false) : setLikeState(true)
         }}>
            <Text>
               {
                  likeState ? <Entypo name="heart" size={20} color="red" /> : <Entypo name="heart-outlined" size={20} color="red" />
               }               
               {item.likeCnt}
            </Text>
         </Pressable>
         <Text>
            <FontAwesome name="commenting-o" size={20} color="black" />
            {item.commentCnt}
         </Text>
      </View>
   )
}

export default Community

const styles = StyleSheet.create({})