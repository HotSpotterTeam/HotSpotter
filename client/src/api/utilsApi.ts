const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const getCategories = async (): Promise<string[]> => {
  const res = await fetch(`${API_URL}/api/categories`);
  if (!res.ok) {
    throw new Error(`Failed to fetch categories: ${res.statusText}`);
  }
  return res.json();
};