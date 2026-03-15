import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        const { token, user } = res.data;
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        set({ user, token, isAuthenticated: true });
        return user;
      },

      register: async (name, email, password, goal) => {
        const res = await api.post('/auth/register', { name, email, password, goal });
        const { token, user } = res.data;
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        set({ user, token, isAuthenticated: true });
        return user;
      },

      logout: () => {
        delete api.defaults.headers.common['Authorization'];
        set({ user: null, token: null, isAuthenticated: false });
      },

      updateUser: (updates) => set(state => ({ user: { ...state.user, ...updates } })),

      updateSettings: async (settings) => {
        const res = await api.put('/profile', { settings: { ...get().user?.settings, ...settings } });
        set(state => ({ user: { ...state.user, ...res.data } }));
      },

      switchMode: async (mode) => {
        await api.put('/profile', { mode });
        set(state => ({ user: { ...state.user, mode } }));
      },

      hydrate: () => {
        const token = get().token;
        if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      },
    }),
    { name: 'tasktracker-auth', partialize: (s) => ({ token: s.token, user: s.user, isAuthenticated: s.isAuthenticated }) }
  )
);

export const useTaskStore = create((set, get) => ({
  tasks: [],
  loading: false,

  fetchTasks: async (filters = {}) => {
    set({ loading: true });
    try {
      const params = new URLSearchParams(filters).toString();
      const res = await api.get(`/tasks?${params}`);
      set({ tasks: res.data });
    } finally {
      set({ loading: false });
    }
  },

  createTask: async (task) => {
    const res = await api.post('/tasks', task);
    set(state => ({ tasks: [...state.tasks, res.data] }));
    return res.data;
  },

  bulkCreateTasks: async (tasks) => {
    const res = await api.post('/tasks/bulk', { tasks });
    await get().fetchTasks();
    return res.data;
  },

  updateTask: async (id, updates) => {
    const res = await api.put(`/tasks/${id}`, updates);
    set(state => ({ tasks: state.tasks.map(t => t._id === id ? res.data : t) }));
    return res.data;
  },

  completeTask: async (id) => {
    const res = await api.post(`/tasks/${id}/complete`);
    set(state => ({ tasks: state.tasks.map(t => t._id === id ? res.data.task : t) }));
    return res.data;
  },

  deleteTask: async (id) => {
    await api.delete(`/tasks/${id}`);
    set(state => ({ tasks: state.tasks.filter(t => t._id !== id) }));
  },

  bulkDeleteTasks: async (taskIds) => {
    try {
      console.log(`[Store] Bulk deleting tasks:`, taskIds);
      const res = await api.post('/tasks/bulk-delete', { taskIds });
      console.log(`[Store] Bulk delete success:`, res.data);
      set(state => ({ tasks: state.tasks.filter(t => !taskIds.includes(t._id)) }));
    } catch (err) {
      console.error(`[Store] Bulk delete failed:`, err.response?.data || err.message);
      throw err;
    }
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
    set(state => ({ lists: [res.data, ...state.lists] }));
    return res.data;
  },

  updateList: async (id, updates) => {
    const res = await api.put(`/shopping/${id}`, updates);
    set(state => ({ lists: state.lists.map(l => l._id === id ? res.data : l) }));
  },

  toggleItem: async (listId, itemId) => {
    const res = await api.patch(`/shopping/${listId}/items/${itemId}`);
    set(state => ({ lists: state.lists.map(l => l._id === listId ? res.data : l) }));
  },

  deleteList: async (id) => {
    await api.delete(`/shopping/${id}`);
    set(state => ({ lists: state.lists.filter(l => l._id !== id) }));
  },
}));
