export const COLORS = {
  primary: '#4CAF50',
  secondary: '#8BC34A',
  background: '#F5F5F5',
  white: '#FFFFFF',
  text: '#333333',
  textLight: '#666666',
  border: '#E0E0E0',
  error: '#F44336',
  warning: '#FF9800',
  info: '#2196F3',
  success: '#4CAF50',
  
  // 센서 색상
  temperature: '#FF6B6B',
  humidity: '#4ECDC4',
  light: '#FFD93D',
  soil: '#8B4513',
  
  // 액추에이터 색상
  pump: '#2196F3',
  fan: '#00BCD4',
  led: '#FFC107',
};

export const MENU_ITEMS = [
  {
    id: 'farm',
    title: '내 농장',
    icon: '🌱',
    description: '센서 데이터 및 제어',
    route: '/myFarm/farm',
  },
  {
    id: 'boards',
    title: '내가 쓴 글',
    icon: '📝',
    description: '작성한 게시글 관리',
    route: '/myFarm/boards',
  },
  {
    id: 'calendar',
    title: '농사 캘린더',
    icon: '📅',
    description: '농사 일정 관리',
    route: '/myFarm/calendar',
  },
];
