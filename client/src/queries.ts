import { useQuery } from '@tanstack/react-query';

const API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000';

export function useEvents() {
    const { isPending, error, data } = useQuery({
        queryKey: ['events'],
        queryFn: () =>
          fetch(`${API_URL}/api/events`).then((res) =>
            res.json(),
          ),
          staleTime: 1000 * 60 * 5,
    })
    return { isPending, error, data }
}