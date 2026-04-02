import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, ArrowLeft, ShieldCheck, Package } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Conversation {
  id: string;
  product_id: string | null;
  buyer_id: string;
  seller_id: string;
  last_message_at: string;
  product?: { title: string; image_url: string | null } | null;
  other_user?: { first_name: string; last_name: string; status: string } | null;
  last_message?: string;
  unread_count?: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

const Messages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(searchParams.get('conv'));
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  useEffect(() => {
    if (!user) return;
    const fetchConversations = async () => {
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (data && data.length > 0) {
        const otherIds = data.map(c => c.buyer_id === user.id ? c.seller_id : c.buyer_id);
        const productIds = data.filter(c => c.product_id).map(c => c.product_id!);

        const [profilesRes, productsRes] = await Promise.all([
          supabase.from('profiles').select('id, first_name, last_name, status').in('id', otherIds),
          productIds.length > 0 ? supabase.from('products').select('id, title, image_url').in('id', productIds) : { data: [] },
        ]);

        const profileMap = new Map((profilesRes.data || []).map(p => [p.id, p] as const));
        const productMap = new Map((productsRes.data || []).map(p => [p.id, p] as const));

        // Get last message and unread count for each conv
        const enriched = await Promise.all(data.map(async (c) => {
          const otherId = c.buyer_id === user.id ? c.seller_id : c.buyer_id;
          const { data: lastMsgs } = await supabase.from('messages').select('content').eq('conversation_id', c.id).order('created_at', { ascending: false }).limit(1);
          const { count } = await supabase.from('messages').select('id', { count: 'exact', head: true }).eq('conversation_id', c.id).eq('read', false).neq('sender_id', user.id);
          return {
            ...c,
            other_user: profileMap.get(otherId) || null,
            product: c.product_id ? productMap.get(c.product_id) || null : null,
            last_message: lastMsgs?.[0]?.content || '',
            unread_count: count || 0,
          } as Conversation;
        }));
        setConversations(enriched);
      }
      setLoading(false);
    };
    fetchConversations();
  }, [user]);

  // Fetch messages for active conversation
  useEffect(() => {
    if (!activeConv || !user) return;
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', activeConv)
        .order('created_at', { ascending: true });
      if (data) setMessages(data as Message[]);

      // Mark as read
      await supabase.from('messages').update({ read: true }).eq('conversation_id', activeConv).neq('sender_id', user.id).eq('read', false);
    };
    fetchMessages();

    // Realtime subscription
    const channel = supabase
      .channel(`messages-${activeConv}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConv}` }, (payload) => {
        const msg = payload.new as Message;
        setMessages(prev => [...prev, msg]);
        if (msg.sender_id !== user.id) {
          supabase.from('messages').update({ read: true }).eq('id', msg.id).then(() => {});
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConv, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMsg.trim() || !activeConv || !user) return;
    setSending(true);
    const content = newMsg.trim();
    setNewMsg('');

    await supabase.from('messages').insert({
      conversation_id: activeConv,
      sender_id: user.id,
      content,
    });

    await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', activeConv);

    // Send notification to other user
    const conv = conversations.find(c => c.id === activeConv);
    if (conv) {
      const otherId = conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id;
      await supabase.from('notifications').insert({
        user_id: otherId,
        type: 'message',
        title: 'New message',
        body: content.substring(0, 80),
        link: `/messages?conv=${activeConv}`,
      });
    }

    setSending(false);
  };

  if (!user) {
    return <div className="container py-20 text-center"><p className="text-muted-foreground">Please log in.</p></div>;
  }

  const activeConversation = conversations.find(c => c.id === activeConv);

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Conversation List */}
      <div className={cn(
        "w-full md:w-80 border-r flex flex-col bg-card",
        activeConv && "hidden md:flex"
      )}>
        <div className="p-4 border-b">
          <h2 className="font-bold text-lg">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No conversations yet</p>
            </div>
          ) : conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => setActiveConv(conv.id)}
              className={cn(
                "w-full p-4 flex items-start gap-3 hover:bg-muted/50 transition-colors text-left border-b",
                activeConv === conv.id && "bg-muted"
              )}
            >
              <div className="h-10 w-10 rounded-full bg-foreground/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold">
                  {conv.other_user?.first_name?.[0]}{conv.other_user?.last_name?.[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm truncate">
                    {conv.other_user?.first_name} {conv.other_user?.last_name}
                    {conv.other_user?.status === 'verified' && <ShieldCheck className="inline h-3 w-3 ml-1 text-foreground/60" />}
                  </p>
                  {(conv.unread_count ?? 0) > 0 && (
                    <Badge variant="default" className="text-[10px] h-5 min-w-[20px] justify-center">{conv.unread_count}</Badge>
                  )}
                </div>
                {conv.product && <p className="text-[11px] text-muted-foreground truncate">Re: {conv.product.title}</p>}
                <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.last_message}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col",
        !activeConv && "hidden md:flex"
      )}>
        {activeConv && activeConversation ? (
          <>
            <div className="p-4 border-b flex items-center gap-3 bg-card">
              <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setActiveConv(null)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="h-9 w-9 rounded-full bg-foreground/10 flex items-center justify-center">
                <span className="text-xs font-bold">
                  {activeConversation.other_user?.first_name?.[0]}{activeConversation.other_user?.last_name?.[0]}
                </span>
              </div>
              <div>
                <p className="font-medium text-sm">
                  {activeConversation.other_user?.first_name} {activeConversation.other_user?.last_name}
                </p>
                {activeConversation.product && (
                  <p className="text-[11px] text-muted-foreground">
                    <Package className="inline h-3 w-3 mr-1" />{activeConversation.product.title}
                  </p>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
              {messages.map(msg => (
                <div key={msg.id} className={cn("flex", msg.sender_id === user.id ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[70%] px-4 py-2 rounded-2xl text-sm",
                    msg.sender_id === user.id
                      ? "bg-foreground text-background rounded-br-md"
                      : "bg-card border rounded-bl-md"
                  )}>
                    <p>{msg.content}</p>
                    <p className={cn(
                      "text-[10px] mt-1",
                      msg.sender_id === user.id ? "text-background/60" : "text-muted-foreground"
                    )}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t bg-card">
              <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={sending || !newMsg.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a conversation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
