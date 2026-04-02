/**
 * context/ChatUnreadContext.jsx
 * --------------------------------------------------
 * Provides totalUnread (for Sidebar badge) and refreshUnread for Chat page.
 */

import { createContext, useState, useCallback, useEffect } from "react";
import useAuth from "../hooks/useAuth";
import { getMyChats } from "../services/chatService";

export const ChatUnreadContext = createContext({ totalUnread: 0, refreshUnread: () => {} });

export default function ChatUnreadProvider({ children }) {
  const { token } = useAuth();
  const [totalUnread, setTotalUnread] = useState(0);

  const refreshUnread = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getMyChats(token);
      setTotalUnread(data.totalUnread ?? 0);
    } catch {
      setTotalUnread(0);
    }
  }, [token]);

  useEffect(() => {
    if (token) refreshUnread();
    else setTotalUnread(0);
  }, [token, refreshUnread]);

  return (
    <ChatUnreadContext.Provider value={{ totalUnread, refreshUnread }}>
      {children}
    </ChatUnreadContext.Provider>
  );
}
