import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  hydrated: false,

  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token, user } = res.data;
    await SecureStore.setItemAsync('auth_token', token);
    await SecureStore.setItemAsync('auth_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
    return user;
  },

  registerPushToken: async (expoPushToken) => {
    if (!expoPushToken || get().user?.expoPushToken === expoPushToken) return;
    try {
      await api.put('/profile', { expoPushToken });
      set((state) => ({ user: { ...state.user, expoPushToken } }));
      await SecureStore.setItemAsync('auth_user', JSON.stringify(get().user));
    } catch (e) {
      console.error('Push registration failed:', e);
    }
  },

  register: async (name, email, password, goal) => {
    const res = await api.post('/auth/register', { name, email, password, goal });
    const { token, user } = res.data;
    await SecureStore.setItemAsync('auth_token', token);
    await SecureStore.setItemAsync('auth_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
    return user;
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('auth_user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  updateUser: (updates) => set((state) => ({ user: { ...state.user, ...updates } })),

  updateSettings: async (settings) => {
    const res = await api.put('/profile', { settings: { ...get().user?.settings, ...settings } });
    const updatedUser = res.data;
    set((state) => ({ user: { ...state.user, ...updatedUser } }));
    await SecureStore.setItemAsync('auth_user', JSON.stringify({ ...get().user }));
  },

  switchMode: async (mode) => {
    await api.put('/profile', { mode });
    set((state) => ({ user: { ...state.user, mode } }));
    await SecureStore.setItemAsync('auth_user', JSON.stringify({ ...get().user }));
  },

  hydrate: async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const userStr = await SecureStore.getItemAsync('auth_user');
      if (token && userStr) {
        const user = JSON.parse(userStr);
        set({ user, token, isAuthenticated: true, hydrated: true });
      } else {
        set({ hydrated: true });
      }
    } catch {
      set({ hydrated: true });
    }
  },
}));

export const useTaskStore = create((set, get) => ({
  tasks: [],
  loading: false,

  fetchTasks: async (filters = {}) => {
    set({ loading: true });
    try {
      // 1. Try to load from cache if store is empty
      if (get().tasks.length === 0) {
        const cached = await SecureStore.getItemAsync('cached_tasks');
        if (cached) {
          set({ tasks: JSON.parse(cached) });
        }
      }

      const params = new URLSearchParams(filters).toString();
      const res = await api.get(`/tasks?${params}`);
      
      set({ tasks: res.data });
      // 2. Persist for next session
      await SecureStore.setItemAsync('cached_tasks', JSON.stringify(res.data));
    } catch (e) {
      console.warn('Sync failed, using cache', e.message);
    } finally {
      set({ loading: false });
    }
  },

  createTask: async (task) => {
    const res = await api.post('/tasks', task);
    const newTasks = [...get().tasks, res.data];
    set({ tasks: newTasks });
    await SecureStore.setItemAsync('cached_tasks', JSON.stringify(newTasks));
    return res.data;
  },

  bulkCreateTasks: async (tasks) => {
    const res = await api.post('/tasks/bulk', { tasks });
    // Optimize: Don't refetch everything, merge or just fetch once
    await get().fetchTasks(); 
    return res.data;
  },

  updateTask: async (id, updates) => {
    const res = await api.put(`/tasks/${id}`, updates);
    const updated = get().tasks.map((t) => (t._id === id ? res.data : t));
    set({ tasks: updated });
    await SecureStore.setItemAsync('cached_tasks', JSON.stringify(updated));
    return res.data;
  },

  completeTask: async (id) => {
    const res = await api.post(`/tasks/${id}/complete`);
    const updated = get().tasks.map((t) => (t._id === id ? res.data.task : t));
    set({ tasks: updated });
    await SecureStore.setItemAsync('cached_tasks', JSON.stringify(updated));
    return res.data;
  },

  deleteTask: async (id) => {
    await api.delete(`/tasks/${id}`);
    const filtered = get().tasks.filter((t) => t._id !== id);
    set({ tasks: filtered });
    await SecureStore.setItemAsync('cached_tasks', JSON.stringify(filtered));
  },
  
  bulkDeleteTasks: async (taskIds) => {
    await api.post('/tasks/bulk-delete', { taskIds });
    const filtered = get().tasks.filter((t) => !taskIds.includes(t._id));
    set({ tasks: filtered });
    await SecureStore.setItemAsync('cached_tasks', JSON.stringify(filtered));
  },
}));

export const useShoppingStore = create((set) => ({
  lists: [],
  loading: false,

  fetchLists: async () => {
    set({ loading: true });
    try {
      const res = await api.get('/shopping');
      set({ lists: res.data });
    } finally {
      set({ loading: false });
    }
  },

  createList: async (list) => {
    const res = await api.post('/shopping', list);
    set((state) => ({ lists: [res.data, ...state.lists] }));
    return res.data;
  },

  updateList: async (id, updates) => {
    const res = await api.put(`/shopping/${id}`, updates);
    set((state) => ({ lists: state.lists.map((l) => (l._id === id ? res.data : l)) }));
  },

  toggleItem: async (listId, itemId) => {
    const res = await api.patch(`/shopping/${listId}/items/${itemId}`);
    set((state) => ({ lists: state.lists.map((l) => (l._id === listId ? res.data : l)) }));
  },

  deleteList: async (id) => {
    await api.delete(`/shopping/${id}`);
    set((state) => ({ lists: state.lists.filter((l) => l._id !== id) }));
  },
}));

export const useUIStore = create((set) => ({
  showTopBar: true,
  setShowTopBar: (show) => set({ showTopBar: show }),
}));
