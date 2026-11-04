import { useCallback, useEffect, useRef, useState } from 'react';
import api, { errorMessage } from '../utils/api';

/**
 * Loads the user's tasks and exposes optimistic mutations.
 * - rollbacks touch only the affected task (never a stale snapshot of the whole list)
 * - stale responses are ignored via a request counter
 * - `enabled: false` skips the network entirely (e.g. gated pages)
 */
export default function useTasks({ enabled = true } = {}) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');
  const mounted = useRef(true);
  const requestId = useRef(0);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const all = [];
      let page = 1;
      for (;;) {
        const { data } = await api.get('/tasks/', { params: { page, page_size: 200 } });
        all.push(...data.results);
        if (!data.next || page >= 25) break; // hard cap: 5,000 tasks
        page += 1;
      }
      if (mounted.current && id === requestId.current) { setTasks(all); setError(''); }
    } catch (e) {
      if (mounted.current && id === requestId.current) setError(errorMessage(e, 'Could not load tasks.'));
    } finally {
      if (mounted.current && id === requestId.current) setLoading(false);
    }
  }, []);
  useEffect(() => { if (enabled) load(); }, [enabled, load]);

  const create = async (payload) => {
    const { data } = await api.post('/tasks/', payload);
    setTasks((t) => [data, ...t]);
    return data;
  };

  const update = async (id, patch) => {
    let before;
    setTasks((t) => t.map((x) => { if (x.id === id) { before = x; return { ...x, ...patch }; } return x; }));
    try {
      const { data } = await api.patch(`/tasks/${id}/`, patch);
      setTasks((t) => t.map((x) => (x.id === id ? data : x)));
    } catch (e) {
      setTasks((t) => t.map((x) => (x.id === id && before ? before : x)));
      throw e;
    }
  };

  const remove = async (id) => {
    let removed; let index = 0;
    setTasks((t) => { index = t.findIndex((x) => x.id === id); removed = t[index]; return t.filter((x) => x.id !== id); });
    try { await api.delete(`/tasks/${id}/`); } catch (e) {
      setTasks((t) => { if (!removed || t.some((x) => x.id === id)) return t; const n = [...t]; n.splice(Math.min(index, n.length), 0, removed); return n; });
      throw e;
    }
  };

  return { tasks, loading, error, reload: load, create, update, remove };
}
