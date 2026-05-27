import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Loader2, MessageCircle, User, Bot, Clock } from "lucide-react";

interface MessageHistoryProps {
  pageId: number;
}

export default function MessageHistory({ pageId }: MessageHistoryProps) {
  const { user } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);

  const { data: messages, isLoading } = trpc.messages.list.useQuery({ pageId });
  const { data: replies } = trpc.messages.getReplies.useQuery(
    { pageId, messageId: selectedConversation || 0 },
    { enabled: selectedConversation !== null }
  );

  // Group messages by sender
  const conversations = messages?.reduce(
    (acc, msg) => {
      const key = msg.senderName || msg.senderId;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(msg);
      return acc;
    },
    {} as Record<string, typeof messages>
  ) || {};

  const selectedMessages = selectedConversation !== null ? messages?.filter((m) => m.id === selectedConversation) : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-foreground" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-4xl font-black tracking-tighter mb-4">MESSAGE HISTORY</h2>
        <p className="text-muted-foreground">View incoming messages and AI-generated replies</p>
      </div>

      <div className="divider-red"></div>

      {/* Statistics */}
      {messages && messages.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card-industrial text-center">
            <div className="text-2xl font-black text-accent">{messages.length}</div>
            <div className="text-xs text-muted-foreground mt-2">Total Messages</div>
          </div>
          <div className="card-industrial text-center">
            <div className="text-2xl font-black text-accent">
              {replies?.length || 0}
            </div>
            <div className="text-xs text-muted-foreground mt-2">Answered</div>
          </div>
          <div className="card-industrial text-center">
            <div className="text-2xl font-black text-accent">
              {Object.keys(conversations).length}
            </div>
            <div className="text-xs text-muted-foreground mt-2">Conversations</div>
          </div>
        </div>
      )}

      <div className="divider-red"></div>

      {/* Two-column layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Conversations List */}
        <div className="col-span-1">
          <h3 className="text-xl font-black mb-4">CONVERSATIONS</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {Object.entries(conversations).map(([senderName, msgs]) => {
              const lastMsg = msgs[msgs.length - 1];
              const isSelected = selectedConversation === msgs[0]?.id;

              return (
                <button
                  key={senderName}
                  onClick={() => setSelectedConversation(msgs[0]?.id || null)}
                  className={`w-full text-left p-3 transition-colors ${
                    isSelected
                      ? "bg-accent text-background"
                      : "bg-muted hover:bg-input text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <User size={14} />
                    <span className="font-black truncate">{senderName}</span>
                  </div>
                  <div className="text-xs opacity-75 line-clamp-1">
                    {lastMsg?.messageContent}
                  </div>
                  <div className="text-xs opacity-50 mt-1">
                    {msgs.length} message{msgs.length !== 1 ? "s" : ""}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Message Thread */}
        <div className="col-span-2">
          {selectedConversation !== null && selectedMessages && selectedMessages.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-xl font-black mb-4">CONVERSATION THREAD</h3>
              <div className="card-industrial space-y-4 max-h-96 overflow-y-auto p-4">
                {selectedMessages.map((msg) => (
                  <div key={msg.id} className="space-y-3">
                    {/* Incoming Message */}
                    <div className="flex gap-3">
                      <User size={16} className="text-muted-foreground mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="bg-muted p-3 rounded">
                          <p className="text-sm">{msg.messageContent}</p>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(msg.receivedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* AI Reply */}
                    {replies && replies.length > 0 && replies.find((r) => r.incomingMessageId === msg.id) && (
                      <div className="flex gap-3">
                        <Bot size={16} className="text-accent mt-1 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="bg-accent/10 border border-accent p-3 rounded">
                            <p className="text-sm">
                              {replies.find((r) => r.incomingMessageId === msg.id)?.replyContent}
                            </p>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            AI Generated
                          </div>
                        </div>
                      </div>
                    )}

                    {!replies?.find((r) => r.incomingMessageId === msg.id) && (
                      <div className="flex gap-3">
                        <MessageCircle size={16} className="text-yellow-500 mt-1 flex-shrink-0" />
                        <div className="text-sm text-muted-foreground italic">
                          Awaiting AI response...
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card-industrial text-center py-12">
              <MessageCircle size={32} className="mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Select a conversation to view messages</p>
            </div>
          )}
        </div>
      </div>

      {/* Empty State */}
      {messages && messages.length === 0 && (
        <div className="card-industrial text-center py-12">
          <MessageCircle size={48} className="mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground text-lg">No messages yet. Messages will appear here when people contact your page.</p>
        </div>
      )}
    </div>
  );
}
