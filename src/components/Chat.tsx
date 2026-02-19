'use client';

import { useState, useEffect, useRef } from 'react';
import type { Application } from '@/lib/supabase';

interface Message {
    id: string;
    content: string;
    sender_application_id: string;
    receiver_application_id: string;
    is_read: boolean;
    created_at: string;
    sender: {
        id: string;
        first_name: string;
        last_name: string;
        photo_url: string;
    };
}

interface Conversation {
    matchId: string;
    otherApplication: Application;
    unreadCount: number;
    lastMessage: {
        content: string;
        created_at: string;
        sender_application_id: string;
    } | null;
}

interface ChatProps {
    characterId: number;
    myApplicationId: string;
}

export function Chat({ characterId, myApplicationId }: ChatProps) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageContent, setMessageContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Fetch conversations
    useEffect(() => {
        if (!characterId) return;
        setIsLoading(true);
        fetch(`/api/chat/conversations?characterId=${characterId}`)
            .then(res => res.json())
            .then(data => {
                setConversations(data.conversations || []);
                setIsLoading(false);
            })
            .catch(() => setIsLoading(false));
    }, [characterId]);

    // Fetch messages when a match is selected
    useEffect(() => {
        if (!selectedMatchId || !characterId) return;
        setIsLoading(true);
        fetch(`/api/chat/${selectedMatchId}/messages?characterId=${characterId}`)
            .then(res => res.json())
            .then(data => {
                setMessages(data.messages || []);
                setIsLoading(false);
                // Refresh conversations to update unread count
                fetch(`/api/chat/conversations?characterId=${characterId}`)
                    .then(res => res.json())
                    .then(data => setConversations(data.conversations || []));
            })
            .catch(() => setIsLoading(false));
    }, [selectedMatchId, characterId]);

    // Poll for new messages every 3 seconds
    useEffect(() => {
        if (!selectedMatchId || !characterId) return;
        const interval = setInterval(() => {
            fetch(`/api/chat/${selectedMatchId}/messages?characterId=${characterId}`)
                .then(res => res.json())
                .then(data => setMessages(data.messages || []));
        }, 3000);
        return () => clearInterval(interval);
    }, [selectedMatchId, characterId]);

    const handleSendMessage = async () => {
        if (!messageContent.trim() || !selectedMatchId || isSending) return;

        setIsSending(true);
        try {
            const res = await fetch(`/api/chat/${selectedMatchId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: messageContent.trim(),
                    characterId,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setMessages([...messages, data.message]);
                setMessageContent('');
                // Refresh conversations
                fetch(`/api/chat/conversations?characterId=${characterId}`)
                    .then(res => res.json())
                    .then(data => setConversations(data.conversations || []));
            }
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setIsSending(false);
        }
    };

    const selectedConversation = conversations.find(c => c.matchId === selectedMatchId);

    return (
        <div className="flex h-[calc(100vh-200px)] max-h-[800px] bg-[var(--matchup-bg-card)] rounded-2xl overflow-hidden">
            {/* Conversations List */}
            <div className="w-80 border-r border-white/10 flex flex-col">
                <div className="p-4 border-b border-white/10">
                    <h2 className="text-lg font-bold">Messages</h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {isLoading && conversations.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin w-6 h-6 border-2 border-[var(--matchup-primary)] border-t-transparent rounded-full" />
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="p-4 text-center text-[var(--matchup-text-muted)] text-sm">
                            No conversations yet
                        </div>
                    ) : (
                        conversations.map((conv) => (
                            <button
                                key={conv.matchId}
                                onClick={() => setSelectedMatchId(conv.matchId)}
                                className={`w-full p-4 text-left border-b border-white/5 hover:bg-white/5 transition-colors ${
                                    selectedMatchId === conv.matchId ? 'bg-white/10' : ''
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <img
                                            src={conv.otherApplication.photo_url || '/placeholder.png'}
                                            alt={`${conv.otherApplication.first_name} ${conv.otherApplication.last_name}`}
                                            className="w-12 h-12 rounded-full object-cover"
                                        />
                                        {conv.unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--matchup-primary)] rounded-full flex items-center justify-center text-xs font-bold">
                                                {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="font-semibold text-sm truncate">
                                                {conv.otherApplication.first_name} {conv.otherApplication.last_name}
                                            </p>
                                        </div>
                                        {conv.lastMessage && (
                                            <p className="text-xs text-[var(--matchup-text-muted)] truncate mt-1">
                                                {conv.lastMessage.sender_application_id === myApplicationId ? 'You: ' : ''}
                                                {conv.lastMessage.content}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Window */}
            <div className="flex-1 flex flex-col">
                {selectedMatchId ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b border-white/10 flex items-center gap-3">
                            {selectedConversation && (
                                <>
                                    <img
                                        src={selectedConversation.otherApplication.photo_url || '/placeholder.png'}
                                        alt={`${selectedConversation.otherApplication.first_name} ${selectedConversation.otherApplication.last_name}`}
                                        className="w-10 h-10 rounded-full object-cover"
                                    />
                                    <div>
                                        <p className="font-semibold">
                                            {selectedConversation.otherApplication.first_name} {selectedConversation.otherApplication.last_name}
                                        </p>
                                        <p className="text-xs text-[var(--matchup-text-muted)]">
                                            {selectedConversation.otherApplication.character_name}
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Messages */}
                        <div
                            ref={messagesContainerRef}
                            className="flex-1 overflow-y-auto p-4 space-y-4"
                        >
                            {isLoading && messages.length === 0 ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="animate-spin w-6 h-6 border-2 border-[var(--matchup-primary)] border-t-transparent rounded-full" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="text-center text-[var(--matchup-text-muted)] text-sm py-8">
                                    No messages yet. Start the conversation!
                                </div>
                            ) : (
                                messages.map((msg) => {
                                    const isMyMessage = msg.sender_application_id === myApplicationId;
                                    return (
                                        <div
                                            key={msg.id}
                                            className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                                                    isMyMessage
                                                        ? 'bg-[var(--matchup-primary)] text-white'
                                                        : 'bg-white/10 text-white'
                                                }`}
                                            >
                                                <p className="text-sm">{msg.content}</p>
                                                <p className={`text-xs mt-1 ${isMyMessage ? 'text-white/70' : 'text-white/50'}`}>
                                                    {new Date(msg.created_at).toLocaleTimeString('en-US', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input */}
                        <div className="p-4 border-t border-white/10">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={messageContent}
                                    onChange={(e) => setMessageContent(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    placeholder="Type a message..."
                                    className="flex-1 px-4 py-2 rounded-lg bg-[var(--matchup-bg-input)] border border-white/10 text-white placeholder:text-[var(--matchup-text-muted)] focus:outline-none focus:border-[var(--matchup-primary)]"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!messageContent.trim() || isSending}
                                    className="px-6 py-2 rounded-lg bg-[var(--matchup-primary)] text-white font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                                >
                                    {isSending ? (
                                        <i className="fa-solid fa-spinner fa-spin" />
                                    ) : (
                                        <i className="fa-solid fa-paper-plane" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-[var(--matchup-text-muted)]">
                        <div className="text-center">
                            <i className="fa-solid fa-comments text-4xl mb-2 opacity-50" />
                            <p>Select a conversation to start chatting</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

