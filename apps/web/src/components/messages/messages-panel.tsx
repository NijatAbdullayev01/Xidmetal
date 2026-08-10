'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  CheckCheck,
  Loader2,
  MessageSquare,
  Send,
  Trash2,
  User,
} from 'lucide-react';
import { UserRole } from '@xidmetal/shared';
import type {
  ConversationDetail,
  ConversationSummary,
  MessageSummary,
  PaginatedResponse,
} from '@xidmetal/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { api, ApiError } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { UNREAD_MESSAGES_QUERY_KEY } from '@/hooks/use-message-notifications';
import { useMessagesRealtime } from '@/hooks/use-messages-realtime';
import { playMessageNotificationSound } from '@/lib/notification-sound';
import { formatPeerStatus } from '@/lib/format-last-seen';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

const CONVERSATIONS_POLL_MS = 4_000;
const CONVERSATION_POLL_MS = 2_500;
const WS_FALLBACK_POLL_MS = 90_000;

interface MessagesPanelProps {
  role: UserRole.CUSTOMER | UserRole.PROVIDER;
}

function ParticipantAvatar({
  name,
  avatarUrl,
  className,
  online,
}: {
  name: string;
  avatarUrl?: string;
  className?: string;
  online?: boolean;
}) {
  return (
    <div className={cn('relative h-full w-full', className)}>
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={name}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-full bg-brand/20 text-xs font-semibold text-brand-foreground">
          {name
            .split(' ')
            .map((part) => part[0])
            .join('')
            .slice(0, 2) || <User className="h-4 w-4" />}
        </div>
      )}
      {online && (
        <span
          className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500"
          aria-hidden
        />
      )}
    </div>
  );
}

export function MessagesPanel({ role }: MessagesPanelProps) {
  const token = useAuthToken();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationFromUrl = searchParams.get('conversationId');

  const [selectedId, setSelectedId] = useState<string | null>(conversationFromUrl);
  const [messageText, setMessageText] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastSeenMessageIdRef = useRef<string | null>(null);
  const markedReadForRef = useRef<string | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef(0);

  const basePath =
    role === UserRole.CUSTOMER ? '/dashboard/customer' : '/dashboard/provider';

  const { connected: messagesWsConnected } = useMessagesRealtime(!!token);

  const selectConversation = (id: string | null) => {
    setSelectedId(id);
    const next = id ? `${basePath}/messages?conversationId=${id}` : `${basePath}/messages`;
    router.replace(next, { scroll: false });
  };

  useEffect(() => {
    if (conversationFromUrl && conversationFromUrl !== selectedId) {
      setSelectedId(conversationFromUrl);
    }
  }, [conversationFromUrl, selectedId]);

  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.messages.conversations(token!, { limit: '50' }),
    enabled: !!token,
    refetchInterval: messagesWsConnected
      ? WS_FALLBACK_POLL_MS
      : CONVERSATIONS_POLL_MS,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  const {
    data: activeConversation,
    isLoading: conversationLoading,
    error: conversationError,
  } = useQuery({
    queryKey: ['conversation', selectedId],
    queryFn: () => api.messages.conversation(token!, selectedId!),
    enabled: !!token && !!selectedId,
    refetchInterval: messagesWsConnected
      ? WS_FALLBACK_POLL_MS
      : CONVERSATION_POLL_MS,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) return false;
      return failureCount < 2;
    },
  });

  useEffect(() => {
    const first = conversations?.items[0];
    if (first && !selectedId && !conversationFromUrl) {
      selectConversation(first.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only auto-select once when list arrives
  }, [conversations, selectedId, conversationFromUrl]);

  // Silinmiş və ya əlçatmaz söhbəti URL-dən təmizlə
  useEffect(() => {
    if (!selectedId) return;
    if (!(conversationError instanceof ApiError) || conversationError.status !== 404) return;
    selectConversation(null);
    void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- navigate away once on 404
  }, [conversationError, selectedId]);

  const messageCount = activeConversation?.messages.length ?? 0;
  const lastMessageId = activeConversation?.messages.at(-1)?.id;
  const peerTyping = activeConversation?.peerTyping ?? false;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messageCount, lastMessageId, peerTyping]);

  useEffect(() => {
    lastSeenMessageIdRef.current = null;
    markedReadForRef.current = null;
  }, [selectedId]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  // Aktiv söhbətdə qarşı tərəfdən yeni mesaj gələndə səs çal
  useEffect(() => {
    const messages = activeConversation?.messages;
    if (!messages?.length || !user) return;

    const last = messages.at(-1);
    if (!last) return;

    if (lastSeenMessageIdRef.current === null) {
      lastSeenMessageIdRef.current = last.id;
      return;
    }

    if (last.id === lastSeenMessageIdRef.current) return;

    const previousId = lastSeenMessageIdRef.current;
    lastSeenMessageIdRef.current = last.id;

    const previousIndex = messages.findIndex((message) => message.id === previousId);
    const newerMessages = previousIndex >= 0 ? messages.slice(previousIndex + 1) : [last];
    const incoming = newerMessages.some((message) => message.senderId !== user.id);

    if (incoming) {
      void playMessageNotificationSound();
    }
  }, [activeConversation?.messages, user]);

  // Thread açılarkən / yenilənəndə mark-read + bildirişləri bağla
  useEffect(() => {
    if (!token || !selectedId || !activeConversation) return;
    if (activeConversation.unreadCount <= 0 && markedReadForRef.current === selectedId) {
      return;
    }
    if (markedReadForRef.current === selectedId && activeConversation.unreadCount <= 0) {
      return;
    }

    const shouldMark =
      activeConversation.unreadCount > 0 || markedReadForRef.current !== selectedId;
    if (!shouldMark) return;

    markedReadForRef.current = selectedId;
    void api.messages
      .markRead(token, selectedId)
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: UNREAD_MESSAGES_QUERY_KEY });
        void queryClient.invalidateQueries({ queryKey: ['conversations'] });
        queryClient.setQueryData<ConversationDetail>(['conversation', selectedId], (prev) => {
          if (!prev) return prev;
          const now = new Date().toISOString();
          return {
            ...prev,
            unreadCount: 0,
            messages: prev.messages.map((message) =>
              message.senderId !== user?.id && !message.isRead
                ? { ...message, isRead: true, readAt: message.readAt ?? now }
                : message,
            ),
          };
        });
      })
      .catch(() => {
        markedReadForRef.current = null;
      });
  }, [token, selectedId, activeConversation, queryClient, user?.id]);

  const notifyTyping = () => {
    if (!token || !selectedId) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < 2_000) return;
    lastTypingSentRef.current = now;
    void api.messages.setTyping(token, selectedId).catch(() => {
      /* ignore */
    });
  };

  const handleMessageChange = (value: string) => {
    setMessageText(value);
    if (!value.trim()) return;
    notifyTyping();
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      notifyTyping();
    }, 2_000);
  };

  const deleteMutation = useMutation({
    mutationFn: (conversationId: string) => {
      if (!token) throw new Error('Autentifikasiya tələb olunur');
      return api.messages.deleteConversation(token, conversationId);
    },
    onMutate: async (conversationId) => {
      await queryClient.cancelQueries({ queryKey: ['conversations'] });
      const previous = queryClient.getQueryData<PaginatedResponse<ConversationSummary>>([
        'conversations',
      ]);

      queryClient.setQueryData<PaginatedResponse<ConversationSummary>>(
        ['conversations'],
        (prev) => {
          if (!prev) return prev;
          const items = prev.items.filter((item) => item.id !== conversationId);
          return {
            ...prev,
            items,
            total: Math.max(0, prev.total - 1),
          };
        },
      );

      queryClient.removeQueries({ queryKey: ['conversation', conversationId] });

      if (selectedId === conversationId) {
        const nextId =
          previous?.items.find((item) => item.id !== conversationId)?.id ?? null;
        selectConversation(nextId);
      }

      setPendingDelete(null);
      setDeleteError(null);
      return { previous };
    },
    onError: (error, _conversationId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['conversations'], context.previous);
      }
      if (error instanceof ApiError) {
        setDeleteError(error.message);
      } else {
        setDeleteError('Söhbət silinərkən xəta baş verdi');
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      void queryClient.invalidateQueries({ queryKey: UNREAD_MESSAGES_QUERY_KEY });
    },
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) => {
      if (!token || !selectedId) throw new Error('Autentifikasiya tələb olunur');
      return api.messages.sendMessage(token, selectedId, { content });
    },
    onMutate: async (content) => {
      if (!selectedId || !user) return { previous: undefined };

      await queryClient.cancelQueries({ queryKey: ['conversation', selectedId] });
      const previous = queryClient.getQueryData<ConversationDetail>([
        'conversation',
        selectedId,
      ]);

      const optimistic: MessageSummary = {
        id: `optimistic-${Date.now()}`,
        conversationId: selectedId,
        senderId: user.id,
        senderName: `${user.firstName} ${user.lastName}`,
        content,
        isRead: false,
        readAt: null,
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<ConversationDetail>(['conversation', selectedId], (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          lastMessage: content,
          lastMessageAt: optimistic.createdAt,
          peerTyping: false,
          messages: [...prev.messages, optimistic],
        };
      });

      setMessageText('');
      setSendError(null);
      return { previous, content };
    },
    onError: (error, _content, context) => {
      if (selectedId && context?.previous) {
        queryClient.setQueryData(['conversation', selectedId], context.previous);
      }
      if (context?.content) {
        setMessageText(context.content);
      }
      if (error instanceof ApiError) {
        setSendError(error.message);
      } else {
        setSendError('Mesaj göndərilərkən xəta baş verdi');
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['conversation', selectedId] });
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      void queryClient.invalidateQueries({ queryKey: UNREAD_MESSAGES_QUERY_KEY });
    },
  });

  const loadOlderMessages = async () => {
    if (!token || !selectedId || !activeConversation?.nextCursor || loadingOlder) return;

    const container = messagesContainerRef.current;
    const previousHeight = container?.scrollHeight ?? 0;
    setLoadingOlder(true);

    try {
      const page = await api.messages.messages(token, selectedId, {
        before: activeConversation.nextCursor,
        limit: '50',
      });

      queryClient.setQueryData<ConversationDetail>(['conversation', selectedId], (prev) => {
        if (!prev) return prev;
        const existingIds = new Set(prev.messages.map((m) => m.id));
        const older = page.items.filter((m) => !existingIds.has(m.id));
        return {
          ...prev,
          messages: [...older, ...prev.messages],
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
        };
      });

      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - previousHeight;
        }
      });
    } finally {
      setLoadingOlder(false);
    }
  };

  const getParticipantName = (conv: ConversationSummary) =>
    role === UserRole.CUSTOMER ? conv.providerName : conv.customerName;

  const getParticipantAvatar = (conv: ConversationSummary) =>
    role === UserRole.CUSTOMER ? conv.providerAvatarUrl : conv.customerAvatarUrl;

  const handleSend = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = messageText.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
  };

  const requestDeleteConversation = (conv: ConversationSummary) => {
    if (deleteMutation.isPending) return;
    setDeleteError(null);
    setPendingDelete({ id: conv.id, name: getParticipantName(conv) });
  };

  const bookingsHref = `${basePath}/bookings`;
  const peerStatusText = formatPeerStatus(activeConversation?.peerPresence);
  const peerOnline = activeConversation?.peerPresence?.isOnline ?? false;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card lg:flex-row">
      <div
        className={cn(
          'flex min-h-0 w-full flex-1 flex-col border-b border-border lg:w-80 lg:flex-none lg:shrink-0 lg:border-b-0 lg:border-r',
          selectedId && 'hidden lg:flex',
        )}
      >
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-medium">Söhbətlər</p>
        </div>
        {deleteError && (
          <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {deleteError}
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {conversationsLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-brand" />
            </div>
          )}
          {!conversationsLoading && conversations?.items.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Hələ söhbət yoxdur</p>
            </div>
          )}
          {conversations?.items.map((conv) => {
            const name = getParticipantName(conv);
            const active = selectedId === conv.id;
            return (
              <div
                key={conv.id}
                className={cn(
                  'group flex w-full items-start gap-1 transition-colors hover:bg-muted/50',
                  active && 'bg-brand/10',
                )}
              >
                <button
                  type="button"
                  onClick={() => selectConversation(conv.id)}
                  className="flex min-w-0 flex-1 items-start gap-3 px-4 py-3 text-left"
                >
                  <div className="h-10 w-10 shrink-0 overflow-visible">
                    <ParticipantAvatar name={name} avatarUrl={getParticipantAvatar(conv)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{name}</p>
                      {conv.unreadCount > 0 && (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-medium text-brand-foreground">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    {conv.serviceTitle && (
                      <p className="truncate text-xs text-muted-foreground">{conv.serviceTitle}</p>
                    )}
                    <p className="truncate text-xs text-muted-foreground">
                      {conv.lastMessage ?? 'Yeni söhbət'}
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => requestDeleteConversation(conv)}
                  disabled={deleteMutation.isPending}
                  className={cn(
                    'mr-2 mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground',
                    'opacity-100 transition-colors hover:bg-destructive/10 hover:text-destructive',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                    'lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100',
                    active && 'lg:opacity-100',
                  )}
                  aria-label={`${name} ilə söhbəti sil`}
                  title="Söhbəti sil"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className={cn('flex min-h-0 flex-1 flex-col', !selectedId && 'hidden lg:flex')}>
        {!selectedId && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground" />
            <p className="font-medium">Söhbət seçin</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Soldakı siyahıdan söhbət seçin və ya sifariş səhifəsindən yeni söhbət başladın.
            </p>
          </div>
        )}

        {selectedId && activeConversation && (
          <>
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <button
                type="button"
                className="min-h-[44px] rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted lg:hidden"
                onClick={() => selectConversation(null)}
              >
                ← Geri
              </button>
              <div className="h-9 w-9 shrink-0 overflow-visible">
                <ParticipantAvatar
                  name={getParticipantName(activeConversation)}
                  avatarUrl={getParticipantAvatar(activeConversation)}
                  online={peerOnline}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {getParticipantName(activeConversation)}
                </p>
                {peerTyping ? (
                  <p className="truncate text-xs text-brand-dark">yazır...</p>
                ) : peerStatusText ? (
                  <p
                    className={cn(
                      'truncate text-xs',
                      peerOnline ? 'text-emerald-600' : 'text-muted-foreground',
                    )}
                  >
                    {peerStatusText}
                  </p>
                ) : null}
                {(activeConversation.serviceTitle || activeConversation.bookingId) && (
                  <p className="truncate text-xs text-muted-foreground">
                    {activeConversation.bookingId ? (
                      <Link
                        href={bookingsHref}
                        className="hover:text-foreground hover:underline"
                      >
                        {activeConversation.serviceTitle ?? 'Əlaqəli sifariş'}
                      </Link>
                    ) : (
                      activeConversation.serviceTitle
                    )}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => requestDeleteConversation(activeConversation)}
                disabled={deleteMutation.isPending}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                aria-label="Söhbəti sil"
                title="Söhbəti sil"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </div>

            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4">
              {conversationLoading && (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-brand" />
                </div>
              )}
              {activeConversation.hasMore && (
                <div className="mb-4 flex justify-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={loadingOlder}
                    onClick={() => void loadOlderMessages()}
                  >
                    {loadingOlder ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Əvvəlki mesajlar'
                    )}
                  </Button>
                </div>
              )}
              <div className="space-y-3">
                {activeConversation.messages.map((message) => {
                  const isOwn = message.senderId === user?.id;
                  const isOptimistic = message.id.startsWith('optimistic-');
                  return (
                    <div
                      key={message.id}
                      className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm sm:max-w-[70%]',
                          isOwn
                            ? 'bg-brand text-brand-foreground'
                            : 'bg-muted text-foreground',
                          isOptimistic && 'opacity-70',
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        <div
                          className={cn(
                            'mt-1 flex items-center justify-end gap-1 text-[10px]',
                            isOwn ? 'text-brand-foreground/70' : 'text-muted-foreground',
                          )}
                        >
                          <span>
                            {new Date(message.createdAt).toLocaleTimeString('az-AZ', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isOwn && !isOptimistic && (
                            <span
                              className="inline-flex"
                              title={message.isRead ? 'Oxundu' : 'Göndərildi'}
                              aria-label={message.isRead ? 'Oxundu' : 'Göndərildi'}
                            >
                              {message.isRead ? (
                                <CheckCheck className="h-3.5 w-3.5" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {peerTyping && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                      <span className="inline-flex gap-1">
                        <span className="animate-bounce [animation-delay:0ms]">·</span>
                        <span className="animate-bounce [animation-delay:150ms]">·</span>
                        <span className="animate-bounce [animation-delay:300ms]">·</span>
                      </span>
                      <span className="sr-only">yazır...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <form
              onSubmit={handleSend}
              className="shrink-0 border-t border-border p-4"
            >
              {sendError && (
                <p className="mb-2 text-sm text-destructive">{sendError}</p>
              )}
              <div className="flex items-center gap-2">
                <Input
                  value={messageText}
                  onChange={(event) => handleMessageChange(event.target.value)}
                  placeholder="Mesajınızı yazın..."
                  maxLength={2000}
                  className="min-h-[44px] flex-1"
                  disabled={sendMutation.isPending}
                />
                <Button
                  type="submit"
                  className="min-h-[44px] min-w-[44px] shrink-0 px-3"
                  disabled={!messageText.trim() || sendMutation.isPending}
                  aria-label="Mesaj göndər"
                >
                  {sendMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>

      <Modal
        open={pendingDelete !== null}
        onClose={() => {
          if (deleteMutation.isPending) return;
          setPendingDelete(null);
        }}
        title="Söhbəti sil"
        description="Bu söhbət sizin siyahınızdan silinəcək"
      >
        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-semibold">Söhbəti silmək istəyirsiniz?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {pendingDelete
                ? `"${pendingDelete.name}" ilə yazışma sizin mesajlar siyahınızdan silinəcək. Qarşı tərəfin söhbəti toxunulmaz qalır. Yeni mesaj gələndə söhbət yenidən görünə bilər.`
                : null}
            </p>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px]"
              disabled={deleteMutation.isPending}
              onClick={() => setPendingDelete(null)}
            >
              Ləğv et
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="min-h-[44px]"
              disabled={!pendingDelete || deleteMutation.isPending}
              onClick={() => {
                if (!pendingDelete) return;
                deleteMutation.mutate(pendingDelete.id);
              }}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Söhbəti sil'
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
