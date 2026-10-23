import { request } from './client';

export interface NotificationDto {
  id: string;
  type: 'NEW_CHAPTER' | 'COMMENT_REPLY' | 'COMMENT_MILESTONE' | string;
  title: string;
  body: string;
  targetUrl: string | null;
  read: boolean;
  createdAt: string | null;
}

export interface NotificationPageDto {
  items: NotificationDto[];
  page: number;
  size: number;
  total: number;
  hasMore: boolean;
  unreadCount: number;
}

export const notificationApi = {
  list(page = 0, size = 20) {
    return request<NotificationPageDto>(`/notifications?page=${page}&size=${size}`, { method: 'GET' });
  },

  unreadCount() {
    return request<{ count: number }>('/notifications/unread-count', { method: 'GET' });
  },

  markRead(id: string) {
    return request<{ read: boolean }>(`/notifications/${encodeURIComponent(id)}/read`, {
      method: 'POST',
    });
  },

  markAllRead() {
    return request<{ updated: number }>('/notifications/read-all', { method: 'POST' });
  },

  clearRead() {
    return request<{ removed: number }>('/notifications/read', { method: 'DELETE' });
  },
};
