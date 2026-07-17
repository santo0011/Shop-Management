import { createSlice } from '@reduxjs/toolkit';

const loadThemeFromStorage = () => {
  try {
    const theme = localStorage.getItem('theme');
    return theme || 'light';
  } catch (error) {
    console.error('Failed to get theme from localStorage:', error);
    return 'light';
  }
};

const saveThemeToStorage = (mode) => {
  try {
    localStorage.setItem('theme', mode);
  } catch (error) {
    console.error('Failed to save theme to localStorage:', error);
  }
};

const initialState = {
  mode: loadThemeFromStorage(),
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.mode = state.mode === 'light' ? 'dark' : 'light';
      saveThemeToStorage(state.mode);
    },
    setTheme: (state, action) => {
      state.mode = action.payload;
      saveThemeToStorage(state.mode);
    },
  },
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
