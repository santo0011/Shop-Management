import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import shopReducer from './slices/shopSlice';
import themeReducer from './slices/themeSlice';
import loadingReducer from './slices/loadingSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    shop: shopReducer,
    theme: themeReducer,
    loading: loadingReducer,
  },
});
