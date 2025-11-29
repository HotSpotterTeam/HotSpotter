import { configureStore } from "@reduxjs/toolkit";
import eventsReducer from "./EventsSlice";
import appReducer from "./AppSlice";

export const store = configureStore({
  reducer: {
    events: eventsReducer,
    app: appReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
