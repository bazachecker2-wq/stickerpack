
export type View =
  | 'dashboard'
  | 'plugins'
  | 'creator-studio'
  | 'sticker-creator'
  | 'agent-council'
  | 'ssh-terminal'
  | 'commands'
  | 'chats'
  | 'logs'
  | 'settings'
  | 'terminal';

// User has access to everything
export type UserView = View | 'chat';

export type VRView =
  | 'login'
  | 'main-menu'
  | 'user-login'
  | View;

export interface BotStats {
  status: 'online' | 'offline';
  uptime: string;
  messagesProcessed: number;
  activeUsers: number;
  memoryUsage: string;
}

export interface ChartData {
  name: string;
  messages: number;
}

export interface PluginStats {
  id: string;
  name: string;
  messagesHandled: number;
  errors: number;
  enabled: boolean;
}

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export interface LogEntry {
  id: number;
  timestamp: string;
  level: LogLevel;
  message: string;
}

export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  enabled: boolean;
  hasConfig: boolean;
  code: string;
}

export interface BotCommand {
  command: string;
  description: string;
}

export interface MenuButton {
  text: string;
}

export interface BotSettings {
  botToken: string;
  botName: string;
  commandPrefix: string;
  adminIds: string[];
  apiRateLimit: number;
  commands: BotCommand[];
  menuButtons: MenuButton[];
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: string;
}

export interface ChatState {
  [username: string]: Message[];
}

export interface Session {
  type: 'guest' | 'admin' | 'user';
  username?: string;
}

export interface AILogEntry {
    timestamp: string;
    message: string;
}

export interface CouncilMessage {
    id: string;
    agentName: string;
    role: 'Architect' | 'Coder' | 'Critic' | 'Researcher' | 'Lead';
    content: string;
    codeSnippet?: string; // If the agent is writing code
    isFinal?: boolean;
}

export interface SSHLog {
    type: 'input' | 'output' | 'system';
    text: string;
}

// Global JSX declaration to fix IntrinsicElements errors
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}
