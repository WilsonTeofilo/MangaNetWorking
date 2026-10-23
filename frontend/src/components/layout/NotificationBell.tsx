import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { notificationApi, NotificationDto } from '../../api/notificationApi';
import { useAuth } from '../../context/AuthContext';

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function openTarget(targetUrl: string | null) {
  if (!targetUrl) return;
  // O app não usa rotas: o App escuta este evento e abre a obra pelo slug.
  const match = targetUrl.match(/^\/obra\/([^/?#]+)/);
  if (match) {
    window.dispatchEvent(new CustomEvent('mn:open-work', { detail: { slug: decodeURIComponent(match[1]) } }));
    return;
  }
  window.location.assign(targetUrl);
}

/** Sino da central interna. Push real continua fora de escopo (VAPID/HTTPS). */
export function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnread(0);
      setItems([]);
      return;
    }
    let active = true;
    const loadCount = () => {
      notificationApi
        .unreadCount()
        .then((result) => {
          if (active) setUnread(result.count);
        })
        .catch(() => {});
    };
    loadCount();
    const timer = window.setInterval(loadCount, 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  const load = (nextPage: number, append: boolean) => {
    setLoading(true);
    setError(null);
    notificationApi
      .list(nextPage, 10)
      .then((result) => {
        setItems((current) => (append ? [...current, ...result.items] : result.items));
        setPage(result.page);
        setHasMore(result.hasMore);
        setUnread(result.unreadCount);
      })
      .catch(() => setError('Não foi possível carregar as notificações.'))
      .finally(() => setLoading(false));
  };

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) load(0, false);
  };

  const markAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setItems((current) => current.map((item) => ({ ...item, read: true })));
      setUnread(0);
    } catch {
      setError('Não foi possível marcar como lidas.');
    }
  };

  const clearRead = async () => {
    if (!window.confirm('Limpar todas as notificações já lidas? As não lidas permanecem.')) return;
    try {
      await notificationApi.clearRead();
      setItems((current) => current.filter((item) => !item.read));
    } catch {
      setError('Não foi possível limpar as notificações lidas.');
    }
  };

  const select = async (item: NotificationDto) => {
    if (!item.read) {
      try {
        await notificationApi.markRead(item.id);
        setItems((current) =>
          current.map((entry) => (entry.id === item.id ? { ...entry, read: true } : entry)),
        );
        setUnread((value) => Math.max(0, value - 1));
      } catch {
        // Não bloqueia a navegação por uma falha de leitura.
      }
    }
    setOpen(false);
    openTarget(item.targetUrl);
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={toggleOpen}
        aria-label={`Notificações${unread > 0 ? ` (${unread} não lidas)` : ''}`}
        aria-expanded={open}
        className="relative p-2 rounded-full border-2 border-[#34343A] bg-[#151517] text-[#F4EFE3] hover:border-[#FFD400] transition-colors"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#E8402F] text-[#F4EFE3] font-pixel text-[10px] flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(92vw,380px)] max-h-[70vh] overflow-y-auto bg-[#101114] border-2 border-[#34343A] shadow-[4px_4px_0_#0B0B0C] z-50">
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b-2 border-[#23252C]">
            <span className="font-pixel text-[11px] uppercase text-[#FFD400] tracking-wider">
              NOTIFICAÇÕES
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={markAllRead}
                title="Marcar todas como lidas"
                className="p-1 text-[#A9A59A] hover:text-[#FFD400]"
              >
                <CheckCheck size={14} />
              </button>
              <button
                type="button"
                onClick={clearRead}
                title="Limpar lidas"
                className="p-1 text-[#A9A59A] hover:text-[#E8402F]"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {error && <p className="px-3 py-2 font-body text-xs text-[#E8402F]">{error}</p>}
          {loading && items.length === 0 && (
            <p className="px-3 py-4 font-pixel text-[10px] uppercase text-[#A9A59A]">Carregando...</p>
          )}
          {!loading && items.length === 0 && !error && (
            <p className="px-3 py-4 font-pixel text-[10px] uppercase text-[#A9A59A]">
              Nenhuma notificação.
            </p>
          )}

          <ul>
            {items.map((item) => (
              <li key={item.id} className="border-b border-[#23252C] last:border-b-0">
                <button
                  type="button"
                  onClick={() => select(item)}
                  className={`w-full text-left px-3 py-3 hover:bg-[#1F2833] transition-colors ${
                    item.read ? 'opacity-70' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span
                      aria-hidden="true"
                      className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                        item.read ? 'bg-transparent' : 'bg-[#FFD400]'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="font-display text-sm text-[#F4EFE3] uppercase break-words">
                        {item.title}
                      </p>
                      <p className="font-body text-xs text-[#A9A59A] break-words">{item.body}</p>
                      <p className="font-pixel text-[10px] text-[#6B6B6B] uppercase mt-1">
                        {formatDate(item.createdAt)}
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {hasMore && (
            <button
              type="button"
              onClick={() => load(page + 1, true)}
              disabled={loading}
              className="w-full px-3 py-2 font-pixel text-[10px] uppercase text-[#A9A59A] hover:text-[#FFD400] disabled:opacity-50"
            >
              {loading ? 'CARREGANDO...' : 'CARREGAR MAIS'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
