import { createSlice } from '@reduxjs/toolkit';

/**
 * Global loading state.
 *
 * The `api.js` interceptor is the **sole** dispatcher of these actions.
 * It uses its own `pendingRequests` counter to decide when to show/hide.
 * This slice simply reflects that state — no duplicate counter here.
 */
const initialState = {
  globalLoading: false,
  text: 'Please wait...',
};

const loadingSlice = createSlice({
  name: 'loading',
  initialState,
  reducers: {
    showLoading: (state, action) => {
      state.globalLoading = true;
      state.text = action.payload || 'Please wait...';
    },
    hideLoading: (state) => {
      state.globalLoading = false;
      state.text = 'Please wait...';
    },
    resetLoading: (state) => {
      state.globalLoading = false;
      state.text = 'Please wait...';
    },
  },
});

export const { showLoading, hideLoading, resetLoading } = loadingSlice.actions;
export default loadingSlice.reducer;