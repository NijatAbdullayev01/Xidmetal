'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, MessageSquare, Send, User } from 'lucide-react';
import { UserRole } from '@xidmetal/shared';
import type { ConversationSummary } from '@xidmetal/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, ApiError } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

interface MessagesPanelProps {
  role: UserRole.CUSTOMER | UserRole.PROVIDER;
}

function ParticipantAvatar({
  name,
  avatarUrl,
  className,
}: {
  name: string;
  avatarUrl?: string;
  className?: string;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        className={cn('h-full w-full rounded-full object-cover', className)}
      />
    );
  }

  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2);

  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center rounded-full bg-brand/20 text-xs font-semibold text-brand-foreground',
        className,
      )}
    >
      {initials || <User className="h-4 w-4" />}
    </div>
  );
}

export function MessagesPanel({ role }: MessagesPanelProps) {
  const token = useAuthToken();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.messages.conversations(token!, { limit: '50' }),
    enabled: !!token,
  });

  const { data: activeConversation, isLoading: conversationLoading } = useQuery({
    queryKey: ['conversation', selectedId],
    queryFn: () => api.messages.conversation(token!, selectedId!),
    enabled: !!token && !!selectedId,
  });

  useEffect(() => {
    const first = conversations?.items[0];
    if (first && !selectedId) {
      setSelectedId(first.id);
    }
  }, [conversations, selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages]);

  const sendMutation = useMutation({
    mutationFn: (content: string) => {
      if (!token || !selectedId) throw new Error('Autentifikasiya tələb olunur');
      return api.messages.sendMessage(token, selectedId, { content });
    },
    onSuccess: () => {
      setMessageText('');
      setSendError(null);
      queryClient.invalidateQueries({ queryKey: ['conversation', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setSendError(error.message);
      } else {
        setSendError('Mesaj göndərilərkən xəta baş verdi');
      }
    },
  });

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

  return (
    <div className="flex h-[calc(100dvh-8rem)] min-h-[480px] flex-col overflow-hidden rounded-xl border border-border bg-card lg:h-[calc(100dvh-6rem)] lg:flex-row">
      <div
        className={cn(
          'flex w-full flex-col border-b border-border lg:w-80 lg:shrink-0 lg:border-b-0 lg:border-r',
          selectedId && 'hidden lg:flex',
        )}
      >
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-medium">Söhbətlər</p>
        </div>
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
              <button
                key={conv.id}
                type="button"
                onClick={() => setSelectedId(conv.id)}
                className={cn(
                  'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50',
                  active && 'bg-brand/10',
                )}
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
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
                className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted lg:hidden"
                onClick={() => setSelectedId(null)}
              >
                ← Geri
              </button>
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full">
                <ParticipantAvatar
                  name={getParticipantName(activeConversation)}
                  avatarUrl={getParticipantAvatar(activeConversation)}
                />
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">{getParticipantName(activeConversation)}</p>
                {activeConversation.serviceTitle && (
                  <p className="truncate text-xs text-muted-foreground">
                    {activeConversation.serviceTitle}
                  </p>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {conversationLoading && (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-brand" />
                </div>
              )}
              <div className="space-y-3">
                {activeConversation.messages.map((message) => {
                  const isOwn = message.senderId === user?.id;
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
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        <p
                          className={cn(
                            'mt-1 text-[10px]',
                            isOwn ? 'text-brand-foreground/70' : 'text-muted-foreground',
                          )}
                        >
                          {new Date(message.createdAt).toLocaleTimeString('az-AZ', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <form
              onSubmit={handleSend}
              className="border-t border-border p-4 safe-bottom"
            >
              {sendError && (
                <p className="mb-2 text-sm text-destructive">{sendError}</p>
              )}
              <div className="flex gap-2">
                <Input
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
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
    </div>
  );
}
