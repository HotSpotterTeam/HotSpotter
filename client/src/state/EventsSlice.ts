import { createSlice } from '@reduxjs/toolkit'

export const eventsSlice = createSlice({
    name: 'events',
    initialState: {
        events: [],
    },
    reducers: {
        setEvents: (state, action) => {
            state.events = action.payload
        },
        addEvent: (state, action) => {
            state.events.push(action.payload)
        },
        updateEvent: (state, action) => {
            const { id, ...event } = action.payload
            state.events = state.events.map(event => event.id === id ? event : event)
        },
        deleteEvent: (state, action) => {
            state.events = state.events.filter(event => event.id !== action.payload)
        },
    },
})

export const { setEvents, addEvent, updateEvent, deleteEvent } = eventsSlice.actions

export default eventsSlice.reducer