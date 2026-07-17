import { createSlice } from '@reduxjs/toolkit';

const loadUserFromStorage = () => {
  try {
    const userData = localStorage.getItem('user');
    if (!userData || userData === 'undefined' || userData === 'null') {
      return null;
    }
    return JSON.parse(userData);
  } catch (error) {
    console.error('Failed to parse user from localStorage:', error);
    localStorage.removeItem('user');
    return null;
  }
};

const loadTokenFromStorage = () => {
  try {
    const token = localStorage.getItem('token');
    return token || null;
  } catch (error) {
    console.error('Failed to get token from localStorage:', error);
    return null;
  }
};

const initialState = {
  user: loadUserFromStorage(),
  token: loadTokenFromStorage(),
  isAuthenticated: !!loadTokenFromStorage(),
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload;
      state.token = action.payload.token;
      state.error = null;
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    },
    updateProfile: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      try {
        localStorage.setItem('user', JSON.stringify(state.user));
      } catch (error) {
        console.error('Failed to save user to localStorage:', error);
      }
    },
    updateLanguage: (state, action) => {
      if (!state.user) {
        state.user = {};
      }
      state.user.language = action.payload;
      try {
        localStorage.setItem('user', JSON.stringify(state.user));
      } catch (error) {
        console.error('Failed to save user to localStorage:', error);
      }
    },
    updateTheme: (state, action) => {
      if (!state.user) {
        state.user = {};
      }
      state.user.theme = action.payload;
      try {
        localStorage.setItem('user', JSON.stringify(state.user));
      } catch (error) {
        console.error('Failed to save user to localStorage:', error);
      }
    },
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  updateProfile,
  updateLanguage,
  updateTheme,
} = authSlice.actions;

export default authSlice.reducer;
