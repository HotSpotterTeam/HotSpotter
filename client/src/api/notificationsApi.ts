import { Notification } from "../generated-types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const getNotifications = async (
  token: string,
  unreadOnly: boolean = false
): Promise<Notification[]> => {
  const params = new URLSearchParams();
  if (unreadOnly) params.append("unread_only", "true");

  const response = await fetch(`${API_URL}/api/notifications/?${params.toString()}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch notifications");
  }

  const json = await response.json();
  return json.data as Notification[];
};

export const getUnreadCount = async (token: string): Promise<number> => {
  const response = await fetch(`${API_URL}/api/notifications/unread-count`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch unread count");
  }

  const json = await response.json();
  return json.count;
};

export const markAsRead = async (
  token: string,
  notificationId: number
): Promise<void> => {
  const response = await fetch(`${API_URL}/api/notifications/${notificationId}/read`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to mark notification as read");
  }
};

export const markAllAsRead = async (token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/api/notifications/read-all`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to mark all notifications as read");
  }
};

export const deleteNotification = async (
  token: string,
  notificationId: number
): Promise<void> => {
  const response = await fetch(`${API_URL}/api/notifications/${notificationId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to delete notification");
  }
};
