import React, { useEffect, useState } from "react";
import { Bell, X, Check, CheckCheck, Trash2 } from "lucide-react";
import { useAppSelector } from "../store/hooks";
import * as NotificationsApi from "../api/notificationsApi";
import { Notification } from "../generated-types";

const NotificationsPanel: React.FC = () => {
  const { token } = useAppSelector((state) => state.auth);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadNotifications = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [notifs, count] = await Promise.all([
        NotificationsApi.getNotifications(token, false),
        NotificationsApi.getUnreadCount(token),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const handleMarkAsRead = async (id: number) => {
    if (!token) return;
    try {
      await NotificationsApi.markAsRead(token, id);
      await loadNotifications();
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!token) return;
    try {
      await NotificationsApi.markAllAsRead(token);
      await loadNotifications();
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    try {
      await NotificationsApi.deleteNotification(token, id);
      await loadNotifications();
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "spot_approved":
        return "✅";
      case "event_approved":
        return "🎉";
      case "report_flagged":
        return "⚠️";
      case "event_pending_approval":
        return "📅";
      case "report_added_to_spot":
        return "📍";
      case "report_added_to_event":
        return "📝";
      default:
        return "📢";
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    if (diffMins < 10080) return `${Math.floor(diffMins / 1440)}d ago`;
    return date.toLocaleDateString();
  };

  if (!token) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center gap-2 bg-white text-gray-700 border-2 border-gray-300 px-5 py-2.5 rounded-lg hover:border-gray-400 hover:shadow-md transition-all font-medium text-sm"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 max-h-96 flex flex-col">
            <div className="p-4 border-b flex items-center justify-between bg-gray-50 rounded-t-lg">
              <div className="flex items-center gap-2">
                <Bell size={20} className="text-gray-700" />
                <h3 className="font-semibold text-gray-800">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    title="Mark all as read"
                  >
                    <CheckCheck size={14} />
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Bell size={48} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition-colors ${
                        !notification.is_read ? "bg-blue-50" : ""
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="text-2xl flex-shrink-0">
                          {getNotificationIcon(notification.notification_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-gray-800 text-sm">
                              {notification.title}
                            </h4>
                            {!notification.is_read && (
                              <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1"></span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1 break-words">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-400">
                              {formatTime(notification.created_at)}
                            </span>
                            <div className="flex gap-2">
                              {!notification.is_read && (
                                <button
                                  onClick={() => handleMarkAsRead(notification.id)}
                                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                  title="Mark as read"
                                >
                                  <Check size={12} />
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(notification.id)}
                                className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                                title="Delete"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationsPanel;