'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface RosieChatContextType {
  isOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
}

const RosieChatContext = createContext<RosieChatContextType | undefined>(undefined);

export function RosieChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <RosieChatContext.Provider
      value={{
        isOpen,
        openChat: () => setIsOpen(true),
        closeChat: () => setIsOpen(false),
      }}
    >
      {children}
    </RosieChatContext.Provider>
  );
}

export function useRosieChat() {
  const context = useContext(RosieChatContext);
  if (!context) {
    throw new Error('useRosieChat must be used within RosieChatProvider');
  }
  return context;
}
