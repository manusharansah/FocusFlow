import { useCallback, useEffect, useRef, useState } from 'react';
import api, { errorMessage } from '../utils/api';

/** Loads all of the user's tasks (follows pagination) and exposes optimistic mutations. */
export default function useTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const load = useCallback(async () => {
    try {
      let url = '/tasks/';
      const all = [];
      while (url) {
        const { data } = await api.get(url);
        all.push(...data.results);
        url = data.next ? data.next.replace(/^https?:\/\/[^/]+/, '').replace(/^\/api/, '') : null;
      }
      if (mounted.current) { setTasks(all); setError(''); }
    } catch (e) {
      if (mounted.current) setError(errorMessage(e, 'Could not load tasks.'));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async (payload) => {
    const { data } = await api.post('/tasks/', payload);
    setTasks((t) => [data, ...t]);
    return data;
  };

  const update = async (id, patch) => {
    const previous = tasks;
    setTasks((t) => t.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    try {
      const { data } = await api.patch(`/tasks/${id}/`, patch);
      setTasks((t) => t.map((x) => (x.id === id ? data : x)));
    } catch (e) {
      setTasks(previous);
      throw e;
    }
  };

  const remove = async (id) => {
    const previous = tasks;
    setTasks((t) => t.filter((x) => x.id !== id));
    try { await api.delete(`/tasks/${id}/`); } catch (e) { setTasks(previous); throw e; }
  };

  return { tasks, loading, error, reload: load, create, update, remove };
}
