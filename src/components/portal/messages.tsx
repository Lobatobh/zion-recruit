"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  Send,
  Loader2,
  Bot,
  User,
  Briefcase,
} from "lucide-react";

interface PortalMessagesProps {
  token: string;
  candidateId: string;
  tenantId: string;
}

interface Message {
  id: string;
  content: string;
  senderType: 'CANDIDATE' | 'RECRUITER' | 'AI' | 'SYSTEM';
  senderName?: string;
  sentAt: string;
  isAiGenerated?: boolean;
  status?: string;
}

interface Conversation {
  id: string;
  channel: string;
  status: string;
  job?: {
    id: string;
    title: string;
  };
  lastMessageAt: string;
  lastMessagePreview?: string;
  messages: Message[];
}

export function PortalMessages({ token, candidateId, tenantId }: PortalMessagesProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [selectedConversation?.messages]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/portal/messages', {
        headers: {
          'x-portal-token': token,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setConversations(data.conversations);
        if (data.conversations.length > 0) {
          setSelectedConversation(data.conversations[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const response = await fetch('/api/portal/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-portal-token': token,
        },
        body: JSON.stringify({
          conversationId: selectedConversation?.id,
          message: newMessage.trim(),
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setNewMessage('');
        // Update conversation with new message
        if (selectedConversation) {
          setSelectedConversation({
            ...selectedConversation,
            messages: [...selectedConversation.messages, data.message],
          });
        }
        await fetchConversations();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const getSenderIcon = (senderType: string) => {
    switch (senderType) {
      case 'AI':
        return <Bot className="h-4 w-4" />;
      case 'RECRUITER':
        return <User className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getSenderColor = (senderType: string) => {
    switch (senderType) {
      case 'AI':
        return 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400';
      case 'RECRUITER':
        return 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* Conversations List */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-lg">Conversations</CardTitle>
          <CardDescription>
            Your conversations with the recruitment team
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No conversations yet</p>
              </div>
            ) : (
              <div className="divide-y">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                      selectedConversation?.id === conv.id ? 'bg-gray-50 dark:bg-gray-800' : ''
                    }`}
                    onClick={() => setSelectedConversation(conv)}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {conv.job?.title?.charAt(0) || 'M'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium truncate">
                            {conv.job?.title || 'General Inquiry'}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(conv.lastMessageAt)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {conv.lastMessagePreview || 'No messages'}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="lg:col-span-3">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <CardHeader className="border-b">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    {selectedConversation.job?.title?.charAt(0) || 'M'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">
                    {selectedConversation.job?.title || 'General Inquiry'}
                  </CardTitle>
                  <CardDescription>
                    <Badge variant="outline" className="text-xs">
                      {selectedConversation.channel}
                    </Badge>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            {/* Messages */}
            <CardContent className="p-0">
              <ScrollArea className="h-[400px] p-4" ref={scrollRef}>
                <div className="space-y-4">
                  {selectedConversation.messages.map((message, index) => {
                    const isCandidate = message.senderType === 'CANDIDATE';
                    const showDate = index === 0 || 
                      formatDate(message.sentAt) !== formatDate(selectedConversation.messages[index - 1].sentAt);

                    return (
                      <div key={message.id}>
                        {showDate && (
                          <div className="flex items-center justify-center my-4">
                            <span className="text-xs text-muted-foreground bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                              {formatDate(message.sentAt)}
                            </span>
                          </div>
                        )}
                        <div
                          className={`flex items-end gap-2 ${
                            isCandidate ? 'flex-row-reverse' : ''
                          }`}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarFallback
                              className={`text-xs ${getSenderColor(message.senderType)}`}
                            >
                              {getSenderIcon(message.senderType)}
                            </AvatarFallback>
                          </Avatar>
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              isCandidate
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-800'
                            }`}
                          >
                            {!isCandidate && message.senderName && (
                              <p className="text-xs font-medium mb-1 text-muted-foreground">
                                {message.senderName}
                                {message.isAiGenerated && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    AI
                                  </Badge>
                                )}
                              </p>
                            )}
                            <p className="text-sm">{message.content}</p>
                            <p
                              className={`text-xs mt-1 ${
                                isCandidate ? 'text-blue-200' : 'text-muted-foreground'
                              }`}
                            >
                              {formatTime(message.sentAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>

            {/* Message Input */}
            <div className="border-t p-4">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  disabled={sending}
                  className="flex-1"
                />
                <Button type="submit" disabled={!newMessage.trim() || sending}>
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <CardContent className="flex flex-col items-center justify-center min-h-[500px] text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
            <p>Select a conversation to start messaging</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setSelectedConversation({
                  id: '',
                  channel: 'CHAT',
                  status: 'ACTIVE',
                  lastMessageAt: new Date().toISOString(),
                  messages: [],
                });
              }}
            >
              Start New Conversation
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
