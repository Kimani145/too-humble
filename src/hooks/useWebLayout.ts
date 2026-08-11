import { useWindowDimensions } from 'react-native';
import { Platform } from 'react-native';
import { WEB_BREAKPOINTS } from '../constants/webLayout';

export interface WebLayoutState {
  isWeb:    boolean;  // Platform.OS === 'web'
  isMedium: boolean;  // width >= MEDIUM (sidebar shows)
  isWide:   boolean;  // width >= WIDE   (context panel shows)
}

export function useWebLayout(): WebLayoutState {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  return {
    isWeb,
    isMedium: isWeb && width >= WEB_BREAKPOINTS.MEDIUM,
    isWide:   isWeb && width >= WEB_BREAKPOINTS.WIDE,
  };
}
