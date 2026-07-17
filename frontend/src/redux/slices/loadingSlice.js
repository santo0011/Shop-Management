import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  globalLoading: false,
  loadingCount: 0,
  text: 'Loading...',
};

const loadingSlice = createSlice({
  name: 'loading',
  initialState,
  reducers: {
    showLoading: (state, action) => {
      state.loadingCount += 1;
      state.globalLoading = true;
      if (action.payload) {
        state.text = action.payload;
      }
    },
    hideLoading: (state) => {
      state.loadingCount = Math.max(0, state.loadingCount - 1);
      if (state.loadingCount === 0) {
        state.globalLoading = false;
        state.text = 'Loading...';
      }
    },
    resetLoading: (state) => {
      state.globalLoading = false;
      state.loadingCount = 0;
      state.text = 'Loading...';
    },
  },
});

export const { showLoading, hideLoading, resetLoading } = loadingSlice.actions;
export default loadingSlice.reducer;