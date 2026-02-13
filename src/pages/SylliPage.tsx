import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, AlertCircle, Bot, User, Check, X, Bell, BookOpen, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const SUPABASE_URL = 'https://olkriduceflppgxmeghr.supabase.co';

type Mode = 'ask' | 'action';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  requires_confirmation?: boolean;
  action_id?: string;
  action_summary?: string;
  confirmation_status?: 'pending' | 'confirmed' | 'cancelled';
  error?: boolean;
}

interface Notification {
  id: string;
  title: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

interface Course {
  id: string;
  name: string;
}

export default function SylliPage() {
  const { session } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [courseId, setCourseId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('ask');
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch courses
  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('courses').select('id, name').order('name');
      if (data) setCourses(data);
    };
    fetch();
  }, []);

  // Fetch unread notifications
  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('id, title, body, created_at, read_at')
        .is('read_at', null)
        .order('created_at', { ascending: false })
        .limit(10);
      if (data) setNotifications(data);
    };
    fetch();
  }, []);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const callEdgeFunction = useCallback(async (path: string, body: Record<string, unknown>) => {
    const token = session?.access_token;
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `Error ${res.status}`);
    }
    return res.json();
  }, [session]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const data = await callEdgeFunction('chat', {
        message: text,
        course_id: courseId,
        mode,
      });

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message || data.response || '',
        requires_confirmation: data.requires_confirmation,
        action_id: data.action_id,
        action_summary: data.action_summary,
        confirmation_status: data.requires_confirmation ? 'pending' : undefined,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Something went wrong';
      setMessages(prev => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: errorMsg, error: true },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleConfirm = async (msgId: string, actionId: string) => {
    setMessages(prev =>
      prev.map(m => (m.id === msgId ? { ...m, confirmation_status: 'confirmed' as const } : m))
    );
    try {
      await callEdgeFunction('chat-confirm', { action_id: actionId });
    } catch {
      setMessages(prev =>
        prev.map(m => (m.id === msgId ? { ...m, confirmation_status: 'pending' as const } : m))
      );
    }
  };

  const handleCancel = async (msgId: string, actionId: string) => {
    setMessages(prev =>
      prev.map(m => (m.id === msgId ? { ...m, confirmation_status: 'cancelled' as const } : m))
    );
    try {
      await callEdgeFunction('chat-cancel', { action_id: actionId });
    } catch {
      setMessages(prev =>
        prev.map(m => (m.id === msgId ? { ...m, confirmation_status: 'pending' as const } : m))
      );
    }
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const unreadCount = notifications.length;

  return (
    <div className="flex h-[calc(100vh-2rem)] gap-4 max-w-5xl mx-auto">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border mb-2">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">Sylli</h1>
            <span className="text-xs text-muted-foreground">AI Assistant</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setShowNotifs(prev => !prev)}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-medium">
                {unreadCount}
              </span>
            )}
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-4 py-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Bot className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm font-medium">Start a conversation with Sylli</p>
                <p className="text-xs mt-1">Ask questions about your courses or manage assignments</p>
              </div>
            )}

            {messages.map(msg => (
              <div
                key={msg.id}
                className={cn(
                  'flex gap-3 animate-fade-up',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {msg.role === 'assistant' && (
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}

                <div className={cn('max-w-[75%] space-y-2')}>
                  <div
                    className={cn(
                      'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : msg.error
                        ? 'bg-destructive/10 text-destructive border border-destructive/20 rounded-bl-md'
                        : 'bg-secondary text-secondary-foreground rounded-bl-md'
                    )}
                  >
                    {msg.error && <AlertCircle className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />}
                    {msg.content}
                  </div>

                  {/* Confirmation card */}
                  {msg.requires_confirmation && msg.action_id && (
                    <Card className="border-primary/20 bg-primary/5">
                      <CardContent className="p-3 space-y-2.5">
                        <p className="text-xs font-medium text-foreground">
                          {msg.action_summary || 'Action requires confirmation'}
                        </p>
                        {msg.confirmation_status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => handleConfirm(msg.id, msg.action_id!)}
                            >
                              <Check className="h-3 w-3" /> Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              onClick={() => handleCancel(msg.id, msg.action_id!)}
                            >
                              <X className="h-3 w-3" /> Cancel
                            </Button>
                          </div>
                        )}
                        {msg.confirmation_status === 'confirmed' && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Check className="h-3 w-3 text-primary" /> Confirmed
                          </p>
                        )}
                        {msg.confirmation_status === 'cancelled' && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <X className="h-3 w-3" /> Cancelled
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="h-3.5 w-3.5 text-secondary-foreground" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex gap-3 animate-fade-in">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}

            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Context selector + input */}
        <div className="border-t border-border pt-3 space-y-2.5">
          <div className="flex items-center gap-2">
            <Select value={courseId ?? 'all'} onValueChange={v => setCourseId(v === 'all' ? null : v)}>
              <SelectTrigger className="h-7 w-auto min-w-[120px] text-xs gap-1.5">
                <BookOpen className="h-3 w-3 text-muted-foreground" />
                <SelectValue placeholder="All courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All courses</SelectItem>
                {courses.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={mode} onValueChange={v => setMode(v as Mode)}>
              <SelectTrigger className="h-7 w-auto min-w-[90px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ask">Ask</SelectItem>
                <SelectItem value="action">Action</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <form
            className="flex gap-2"
            onSubmit={e => { e.preventDefault(); handleSend(); }}
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={mode === 'ask' ? 'Ask about your courses…' : 'Describe an action…'}
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!input.trim() || loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </div>

      {/* Notifications panel */}
      {showNotifs && (
        <div className="w-72 border-l border-border pl-4 flex flex-col animate-slide-in-right">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Bell className="h-4 w-4" /> Notifications
          </h2>
          <ScrollArea className="flex-1">
            {notifications.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">All caught up!</p>
            ) : (
              <div className="space-y-2">
                {notifications.map(n => (
                  <Card key={n.id} className="p-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0"
                        onClick={() => markAsRead(n.id)}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
