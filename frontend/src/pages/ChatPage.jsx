/**
 * pages/ChatPage.jsx
 * --------------------------------------------------
 * Real-time chat: chat list (left) + message window (right).
 * Purple/white theme, avatars, Create Group, online indicators.
 * Full width of dashboard area.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Plus,
  Users,
  Send,
  Loader2,
  Search,
  ImagePlus,
  User,
  Check,
  CheckCheck,
  Pencil,
  Trash2,
  Menu,
  X,
} from "lucide-react";
import useAuth from "../hooks/useAuth";
import { updateProfile } from "../services/authService";
import { useContext } from "react";
import { ChatUnreadContext } from "../context/ChatUnreadContext";
import {
  getMyChats,
  getMessages,
  createOneOnOneChat,
  createGroupChat,
  searchUsers,
  editMessage as editMessageApi,
  deleteMessage as deleteMessageApi,
  createChatSocket,
} from "../services/chatService";

function Avatar({ user, size = "md", showOnline, online }) {
  const s = size === "sm" ? "w-8 h-8" : size === "lg" ? "w-12 h-12" : "w-10 h-10";
  return (
    <div className={`relative shrink-0 ${s}`}>
      <div className={`${s} rounded-full overflow-hidden bg-primary/10 flex items-center justify-center ring-2 ring-white shadow`}>
        {user?.profileImage ? (
          <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
        ) : (
          <User className="w-1/2 h-1/2 text-primary" />
        )}
      </div>
      {showOnline && (
        <span
          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
            online ? "bg-emerald-500" : "bg-slate-300"
          }`}
        />
      )}
    </div>
  );
}

function ChatList({ chats, selectedChat, onSelect, currentUserId, onlineUserIds }) {
  const displayName = (chat) => {
    if (chat.isGroupChat) return chat.chatName || "Group";
    const other = chat.users?.find((u) => u._id !== currentUserId);
    return other?.name || "Unknown";
  };
  const displayAvatar = (chat) => {
    if (chat.isGroupChat) return null;
    const other = chat.users?.find((u) => u._id !== currentUserId);
    return other;
  };
  const lastPreview = (chat) => {
    const lm = chat.latestMessage;
    if (!lm) return "No messages yet";
    if (lm.deleted) return "Message deleted";
    const senderId = lm.sender?._id || lm.sender;
    if (senderId === currentUserId) return `You: ${lm.content?.slice(0, 30) || ""}`;
    return (lm.content || "").slice(0, 40);
  };

  return (
    <div className="flex flex-col h-full">
      {chats.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm p-4">
          No chats yet. Start one or create a group.
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto">
          {chats.map((chat) => {
            const active = selectedChat?._id === chat._id;
            const other = displayAvatar(chat);
            const online = other && onlineUserIds.includes(other._id);
            return (
              <li key={chat._id}>
                <button
                  type="button"
                  onClick={() => onSelect(chat)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors ${
                    active ? "bg-primary/10 border-l-2 border-primary" : "hover:bg-slate-50"
                  }`}
                >
                  <Avatar user={other || (chat.isGroupChat ? { name: chat.chatName } : null)} size="md" showOnline={!!other} online={online} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-800 truncate flex-1">{displayName(chat)}</p>
                      {(chat.unreadCount || 0) > 0 && (
                        <span className="shrink-0 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                          {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{lastPreview(chat)}</p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function MessageBubble({ msg, isOwn, showAvatar, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(msg.content || "");
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);

  const handleSaveEdit = () => {
    if (editText.trim() !== (msg.content || "") && onEdit) onEdit(msg._id, editText.trim());
    setEditing(false);
  };

  const displayContent = msg.deleted ? "[Message deleted]" : (msg.content || "");
  const isEdited = msg.editedAt && !msg.deleted;
  const readBy = Array.isArray(msg.readBy) ? msg.readBy : [];
  const isSeen = readBy.length > 0;

  return (
    <div className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""} group/bubble`}>
      {showAvatar ? (
        <Avatar user={msg.sender} size="sm" />
      ) : (
        <div className="w-8 shrink-0" />
      )}
      <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${isOwn ? "bg-primary text-white" : "bg-white border border-slate-200 text-slate-800"} relative`}>
        {msg.sender && !isOwn && (
          <p className="text-[10px] font-semibold text-primary mb-0.5">{msg.sender.name}</p>
        )}
        {editing ? (
          <div className="space-y-2">
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full rounded-lg px-2 py-1 text-sm text-slate-900 border border-slate-200"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSaveEdit())}
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleSaveEdit}
                className="inline-flex items-center px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90"
              >
                Update
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-end justify-end gap-1.5">
              <p className="text-sm whitespace-pre-wrap break-words flex-1 min-w-0">{displayContent}</p>
              {isOwn && !msg.deleted && (
                <span
                  className={`shrink-0 self-end ${isSeen ? "text-blue-500" : "text-white/70"}`}
                  title={isSeen ? "Seen" : "Delivered"}
                >
                  <CheckCheck className="w-4 h-4" strokeWidth={isSeen ? 2.5 : 2} />
                </span>
              )}
            </div>
            {isEdited && <span className="text-[10px] opacity-80">(edited)</span>}
            {isOwn && !msg.deleted && onEdit && onDelete && (
              <div className="absolute top-1 right-1 opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center gap-0.5 rounded-lg bg-black/10 p-0.5">
                <button type="button" onClick={() => setEditing(true)} className="p-1 rounded hover:bg-white/20" title="Edit">
                  <Pencil className="w-3.5 h-3.5 text-white" />
                </button>
                <div className="relative">
                  <button type="button" onClick={() => setShowDeleteMenu((v) => !v)} className="p-1 rounded hover:bg-white/20" title="Delete">
                    <Trash2 className="w-3.5 h-3.5 text-white" />
                  </button>
                  {showDeleteMenu && (
                    <div className="absolute right-0 top-full mt-1 py-1 bg-white rounded-lg shadow-lg border border-slate-200 z-10 min-w-[140px]">
                      <button type="button" onClick={() => { onDelete(msg._id, "everyone"); setShowDeleteMenu(false); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50">
                        Delete for Everyone
                      </button>
                      <button type="button" onClick={() => { onDelete(msg._id, "me"); setShowDeleteMenu(false); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50">
                        Delete for Me
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { user, token, updateUser, uploadProfileImage } = useAuth();
  const { refreshUnread } = useContext(ChatUnreadContext);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [socket, setSocket] = useState(null);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [typingUserId, setTypingUserId] = useState(null);
  const [input, setInput] = useState("");
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [groupSearchResults, setGroupSearchResults] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState("");
  const [newChatResults, setNewChatResults] = useState([]);
  const [startChatOpen, setStartChatOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const currentUserId = user?._id;

  const fetchChats = useCallback(async () => {
    if (!token) return;
    setLoadingChats(true);
    try {
      const data = await getMyChats(token);
      setChats(data.chats || []);
      refreshUnread?.();
    } catch {
      setChats([]);
    } finally {
      setLoadingChats(false);
    }
  }, [token, refreshUnread]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  useEffect(() => {
    if (!token) return;
    const s = createChatSocket(token);
    if (!s) return;
    s.on("connect", () => {});
    s.on("online_users", (ids) => setOnlineUserIds(ids || []));
    s.on("new_message", (msg) => {
      setMessages((prev) => (prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]));
      fetchChats();
      if (selectedChat && msg.chat === selectedChat._id) {
        setTimeout(() => s.emit("message-seen", { chatId: selectedChat._id }), 100);
      }
    });
    s.on("message-edited", (updated) => {
      setMessages((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
      fetchChats();
    });
    s.on("message-deleted", (payload) => {
      if (payload.scope === "everyone") {
        const updated = payload.message || { _id: payload.messageId, deleted: true, content: "" };
        setMessages((prev) => prev.map((m) => (m._id === payload.messageId ? { ...m, ...updated, deleted: true, content: "" } : m)));
      } else if (payload.scope === "me" && String(payload.userId) === String(currentUserId)) {
        setMessages((prev) => prev.filter((m) => m._id !== payload.messageId));
      }
      fetchChats();
    });
    s.on("messages-seen", (payload) => {
      const { messageIds, readByUserId } = payload || {};
      if (!messageIds?.length || !readByUserId) return;
      const idSet = new Set(messageIds.map((id) => String(id)));
      setMessages((prev) =>
        prev.map((m) => {
          const senderId = m.sender?._id ?? m.sender;
          if (idSet.has(String(m._id)) && senderId && String(senderId) === String(currentUserId)) {
            const readBy = m.readBy || [];
            if (readBy.some((id) => String(id) === readByUserId)) return m;
            return { ...m, readBy: [...readBy, readByUserId] };
          }
          return m;
        })
      );
    });
    s.on("user_typing", ({ userId }) => setTypingUserId(userId));
    s.on("user_stop_typing", () => setTypingUserId(null));
    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, [token, selectedChat?._id, fetchChats, currentUserId]);

  useEffect(() => {
    if (!selectedChat || !token) {
      setMessages([]);
      return;
    }
    setLoadingMessages(true);
    getMessages(token, selectedChat._id)
      .then((data) => setMessages(data || []))
      .catch(() => setMessages([]))
      .finally(() => setLoadingMessages(false));

    if (socket) {
      socket.emit("join_chat", selectedChat._id);
      socket.emit("message-seen", { chatId: selectedChat._id });
    }
    return () => {
      if (socket) socket.emit("leave_chat", selectedChat._id);
    };
  }, [selectedChat?._id, token, socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text || !socket || !selectedChat) return;
    socket.emit("send_message", { chatId: selectedChat._id, content: text });
    setInput("");
    setTypingUserId(null);
  };

  const handleTyping = () => {
    if (!socket || !selectedChat) return;
    socket.emit("typing", { chatId: selectedChat._id });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", { chatId: selectedChat._id });
      typingTimeoutRef.current = null;
    }, 2000);
  };

  const handleEditMessage = async (messageId, content) => {
    if (!token || !selectedChat) return;
    try {
      const updated = await editMessageApi(token, selectedChat._id, messageId, content);
      setMessages((prev) => prev.map((m) => (m._id === messageId ? updated : m)));
      fetchChats();
    } catch (e) {
      alert(e.message || "Failed to edit message");
    }
  };

  const handleDeleteMessage = async (messageId, scope) => {
    if (!token || !selectedChat) return;
    try {
      await deleteMessageApi(token, selectedChat._id, messageId, scope);
      if (scope === "me") {
        setMessages((prev) => prev.filter((m) => m._id !== messageId));
      }
      fetchChats();
    } catch (e) {
      alert(e.message || "Failed to delete message");
    }
  };

  const handleCreateGroup = async () => {
    if (!token || !groupName.trim() || selectedUserIds.length === 0 || creatingGroup) return;
    setCreatingGroup(true);
    try {
      const chat = await createGroupChat(token, groupName.trim(), selectedUserIds);
      setChats((prev) => [chat, ...prev]);
      setSelectedChat(chat);
      setCreateGroupOpen(false);
      setGroupName("");
      setSelectedUserIds([]);
      setGroupSearch("");
      setGroupSearchResults([]);
    } catch (e) {
      alert(e.message || "Failed to create group");
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleStartChat = async (targetUser) => {
    if (!token) return;
    try {
      const chat = await createOneOnOneChat(token, targetUser._id);
      const exists = chats.find((c) => c._id === chat._id);
      if (!exists) setChats((prev) => [chat, ...prev]);
      setSelectedChat(chat);
      setStartChatOpen(false);
      setNewChatSearch("");
      setNewChatResults([]);
    } catch (e) {
      alert(e.message || "Failed to start chat");
    }
  };

  useEffect(() => {
    if (!groupSearch.trim() || !token) {
      setGroupSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      searchUsers(token, groupSearch, 15).then(setGroupSearchResults).catch(() => setGroupSearchResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [groupSearch, token]);

  useEffect(() => {
    if (!newChatSearch.trim() || !token) {
      setNewChatResults([]);
      return;
    }
    const t = setTimeout(() => {
      searchUsers(token, newChatSearch, 15).then(setNewChatResults).catch(() => setNewChatResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [newChatSearch, token]);

  const toggleGroupUser = (id) => {
    setSelectedUserIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleAvatarUpload = (e) => {
    const file = e.target?.files?.[0];
    if (!file || !uploadProfileImage) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }
    setUploadingAvatar(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const url = await uploadProfileImage(reader.result);
        if (url) setProfileModalOpen(false);
      } catch (err) {
        alert(err.message || "Upload failed.");
      } finally {
        setUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const getChatDisplayName = (chat) => {
    if (!chat) return "";
    if (chat.isGroupChat) return chat.chatName || "Group";
    const other = chat.users?.find((u) => u._id !== currentUserId);
    return other?.name || "Chat";
  };

  return (
    <div className="h-screen min-h-[100dvh] w-full max-w-full flex flex-col bg-slate-100/80 overflow-hidden">
      {/* Header bar */}
      <div className="shrink-0 h-14 px-4 flex items-center justify-between bg-white border-b border-slate-200">
        <div className="flex items-center gap-3 min-w-0">
          {/* Hamburger: mobile only — toggles chat list drawer */}
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            className="md:hidden p-2 -ml-2 rounded-xl hover:bg-slate-100 transition-colors"
            aria-label={sidebarOpen ? "Close chat list" : "Open chat list"}
          >
            <Menu className="w-6 h-6 text-slate-600" />
          </button>
          <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <MessageCircle className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0 hidden sm:block">
            <h1 className="text-lg font-bold text-slate-800 truncate">Messages</h1>
            <p className="text-xs text-slate-500 truncate">Chat with cyclists and partners</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setProfileModalOpen(true)}
          className="p-2 rounded-xl hover:bg-slate-100 transition-colors shrink-0"
          aria-label="Profile settings"
        >
          <Avatar user={user} size="sm" />
        </button>
      </div>

      {/* Main: flex-col on mobile (chat window only in flow), md:flex-row (list + window) */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 w-full relative overflow-hidden">
        {/* Mobile: drawer overlay for chat list */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 z-40 md:hidden"
                onClick={() => setSidebarOpen(false)}
                aria-hidden
              />
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "tween", duration: 0.2 }}
                className="fixed left-0 top-0 bottom-0 w-[min(320px,85vw)] max-w-full flex flex-col bg-white border-r border-slate-200 shadow-xl z-50 md:hidden"
              >
                <div className="shrink-0 p-2 flex items-center justify-between border-b border-slate-100">
                  <span className="font-semibold text-slate-800">Chats</span>
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    className="p-2 rounded-lg hover:bg-slate-100"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5 text-slate-600" />
                  </button>
                </div>
                <div className="p-2 flex gap-2 border-b border-slate-100">
                  <button
                    type="button"
                    onClick={() => { setStartChatOpen(true); }}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 text-primary font-semibold text-sm hover:bg-primary/20 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    New Chat
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateGroupOpen(true)}
                    className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors"
                  >
                    <Users className="w-4 h-4" />
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  {loadingChats ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                  ) : (
                    <ChatList
                      chats={chats}
                      selectedChat={selectedChat}
                      onSelect={(chat) => {
                        setSelectedChat(chat);
                        setSidebarOpen(false);
                      }}
                      currentUserId={currentUserId}
                      onlineUserIds={onlineUserIds}
                    />
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Desktop: left sidebar (chat list) — visible md and up */}
        <div className="hidden md:flex md:w-96 shrink-0 flex-col bg-white border-r border-slate-200 min-h-0">
          <div className="p-2 flex gap-2 border-b border-slate-100 shrink-0">
            <button
              type="button"
              onClick={() => setStartChatOpen(true)}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 text-primary font-semibold text-sm hover:bg-primary/20 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              New Chat
            </button>
            <button
              type="button"
              onClick={() => setCreateGroupOpen(true)}
              className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              <Users className="w-4 h-4" />
              Group
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {loadingChats ? (
            <div className="flex-1 flex items-center justify-center min-h-0">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <ChatList
              chats={chats}
              selectedChat={selectedChat}
              onSelect={setSelectedChat}
              currentUserId={currentUserId}
              onlineUserIds={onlineUserIds}
            />
          )}
        </div>

        {/* Right: message area — 100% width on mobile, flex-1 on desktop */}
        <div className="flex-1 flex flex-col min-w-0 w-full md:min-w-0 bg-white min-h-0">
          {!selectedChat ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 min-h-0">
              <MessageCircle className="w-16 h-16 text-slate-300 mb-4" />
              <p className="text-sm font-medium">Select a chat or start a new one</p>
              <p className="text-xs mt-1">Tap the menu to open your chats</p>
            </div>
          ) : (
            <>
              <div className="shrink-0 h-14 px-3 md:px-4 flex items-center gap-3 border-b border-slate-200 bg-white">
                <Avatar
                  user={selectedChat.users?.find((u) => u._id !== currentUserId) || (selectedChat.isGroupChat ? {} : null)}
                  size="md"
                  showOnline={!selectedChat.isGroupChat}
                  online={onlineUserIds.includes(selectedChat.users?.find((u) => u._id !== currentUserId)?._id)}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 truncate">{getChatDisplayName(selectedChat)}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {typingUserId ? "typing..." : selectedChat.isGroupChat ? `${selectedChat.users?.length || 0} members` : (onlineUserIds.includes(selectedChat.users?.find((u) => u._id !== currentUserId)?._id) ? "Active" : "Offline")}
                  </p>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 space-y-3 bg-gradient-to-b from-slate-50/50 to-white">
                {loadingMessages ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const prev = messages[i - 1];
                    const sameSender = prev && prev.sender?._id === msg.sender?._id;
                    return (
                      <MessageBubble
                        key={msg._id}
                        msg={msg}
                        isOwn={msg.sender?._id === currentUserId}
                        showAvatar={!sameSender}
                        onEdit={handleEditMessage}
                        onDelete={handleDeleteMessage}
                      />
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              {typingUserId && (
                <div className="shrink-0 px-4 py-1.5 border-t border-slate-100 bg-slate-50/80">
                  <p className="text-xs font-medium text-primary animate-pulse">
                    {selectedChat?.users?.find((u) => String(u._id) === String(typingUserId))?.name || "Someone"} is typing...
                  </p>
                </div>
              )}
              <div className="shrink-0 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-slate-200 bg-white">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      handleTyping();
                    }}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
                    placeholder="Type a message..."
                    className="flex-1 min-w-0 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={sendMessage}
                    disabled={!input.trim()}
                    className="p-2.5 shrink-0 rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Group modal */}
      <AnimatePresence>
        {createGroupOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
            onClick={() => setCreateGroupOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200"
            >
              <div className="h-1 w-full bg-primary" />
              <div className="p-4">
                <h2 className="text-lg font-bold text-slate-800 mb-3">Create Group</h2>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Group name"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={groupSearch}
                    onChange={(e) => setGroupSearch(e.target.value)}
                    placeholder="Search users to add..."
                    className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <ul className="max-h-40 overflow-y-auto space-y-1 mb-4">
                  {groupSearchResults.map((u) => (
                    <li key={u._id}>
                      <button
                        type="button"
                        onClick={() => toggleGroupUser(u._id)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50"
                      >
                        <Avatar user={u} size="sm" />
                        <span className="flex-1 text-left text-sm font-medium text-slate-800">{u.name}</span>
                        {selectedUserIds.includes(u._id) && <Check className="w-4 h-4 text-primary" />}
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateGroupOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateGroup}
                    disabled={!groupName.trim() || selectedUserIds.length === 0 || creatingGroup}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {creatingGroup ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Create
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Chat (start 1-on-1) modal */}
      <AnimatePresence>
        {startChatOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
            onClick={() => setStartChatOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200"
            >
              <div className="h-1 w-full bg-primary" />
              <div className="p-4">
                <h2 className="text-lg font-bold text-slate-800 mb-3">New Chat</h2>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={newChatSearch}
                    onChange={(e) => setNewChatSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <ul className="max-h-60 overflow-y-auto space-y-1">
                  {newChatResults.map((u) => (
                    <li key={u._id}>
                      <button
                        type="button"
                        onClick={() => handleStartChat(u)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50"
                      >
                        <Avatar user={u} size="sm" />
                        <div className="text-left">
                          <p className="text-sm font-medium text-slate-800">{u.name}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setStartChatOpen(false)}
                  className="mt-3 w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile / Avatar modal */}
      <AnimatePresence>
        {profileModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
            onClick={() => setProfileModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-200"
            >
              <div className="h-1 w-full bg-primary" />
              <div className="p-6 text-center">
                <h2 className="text-lg font-bold text-slate-800 mb-3">Profile Photo</h2>
                <div className="relative inline-block mb-4">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center ring-4 ring-white shadow-lg mx-auto">
                    {user?.profileImage ? (
                      <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-12 h-12 text-primary" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 flex items-center justify-center w-9 h-9 rounded-full bg-primary text-white shadow-md cursor-pointer hover:bg-primary/90">
                    {uploadingAvatar ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ImagePlus className="w-4 h-4" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={uploadingAvatar}
                      onChange={handleAvatarUpload}
                    />
                  </label>
                </div>
                <p className="text-xs text-slate-500 mb-4">Click the + to upload or change your photo. It appears next to your messages.</p>
                <button
                  type="button"
                  onClick={async () => {
                    if (!token) return;
                    try {
                      await updateProfile(token, { profileImage: "" });
                      updateUser({ profileImage: "" });
                      setProfileModalOpen(false);
                    } catch (e) {
                      alert(e.message || "Failed to remove photo");
                    }
                  }}
                  className="text-sm text-slate-500 hover:text-red-600"
                >
                  Remove photo
                </button>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setProfileModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-primary text-white font-medium"
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
