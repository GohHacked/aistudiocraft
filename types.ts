export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isStreaming?: boolean;
}

export interface Project {
  id: string;
  title: string;
  lastModified: number;
  snippet: string;
}

export enum ViewState {
  HOME = 'HOME',
  CHAT = 'CHAT'
}

export interface ChatSession {
  id: string;
  title: string;
  model: string;
  messages: Message[];
  createdAt: number;
}