import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  myShop: null,
  shops: [],
  total: 0,
  stats: null,
  loading: false,
  error: null,
};

const shopSlice = createSlice({
  name: 'shop',
  initialState,
  reducers: {
    setMyShop: (state, action) => {
      state.myShop = action.payload;
    },
    setShops: (state, action) => {
      state.shops = action.payload.shops;
      state.total = action.payload.total;
    },
    setShopStats: (state, action) => {
      state.stats = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const { setMyShop, setShops, setShopStats, setLoading, setError } = shopSlice.actions;
export default shopSlice.reducer;