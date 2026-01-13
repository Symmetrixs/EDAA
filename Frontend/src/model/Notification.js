import { useState, useEffect } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export function useNotificationViewModel() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (user?.uuid || user?.id) {
            fetchNotifications();
            // Optional: Poll every 10 seconds
            const interval = setInterval(fetchNotifications, 10000);
            return () => clearInterval(interval);
        }
    }, [user?.uuid, user?.id]);

    const fetchNotifications = async () => {
        try {
            const target = user?.uuid || user?.id;
            if (!target) return;

            const response = await api.get(`/notification/${target}`);
            const data = response.data;
            setNotifications(data);

            // Calculate unread
            const count = data.filter(n => !n.IsRead).length;
            setUnreadCount(count);

        } catch (err) {
            console.error("Fetch Notifications Error:", err);
            setError("Failed to load notifications");
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (notificationId) => {
        try {
            // Optimistic Update
            setNotifications(prev => prev.map(n =>
                n.NotificationID === notificationId ? { ...n, IsRead: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));

            // API Call
            await api.put(`/notification/${notificationId}/read`);
        } catch (err) {
            console.error("Mark Read Error:", err);
            // Revert on error if critical, but for read status usually acceptable to ignore
        }
    };

    const markAllAsRead = async () => {
        // Not implemented in backend bulk yet
    };

    const deleteNotification = async (notificationId) => {
        try {
            setNotifications(prev => prev.filter(n => n.NotificationID !== notificationId));
            await api.delete(`/notification/${notificationId}`);
        } catch (err) {
            console.error("Delete Notification Error:", err);
        }
    };

    return {
        notifications,
        loading,
        error,
        unreadCount,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification
    };
}
