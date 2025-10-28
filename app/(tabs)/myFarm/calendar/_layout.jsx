import { Stack } from 'expo-router';

export default function CalendarLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: '농사 캘린더',
          headerShown: false 
        }} 
      />
    </Stack>
  );
}
