import { configureStore } from "@reduxjs/toolkit";
import eventsReducer from "./EventsSlice";
import authReducer from './AuthSlice';
import appReducer from "./AppSlice";

export const store = configureStore({
  reducer: {
    events: eventsReducer,
    auth: authReducer,
    app: appReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
