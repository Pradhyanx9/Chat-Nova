
import { User, ChatSession } from "../types.ts";

const DB_KEYS = {
  USERS: 'chatnova_db_users',
  SESSIONS: 'chatnova_db_sessions',
};

const SEED_USERS: User[] = [
  {
    id: 'user-001',
    name: 'Guest User',
    email: 'guest@chatnova.ai',
    password: 'password123',
    avatar: 'GU',
    platform: 'guest',
    cartoonCharacter: 'A Helpful Companion',
    isPremium: true,
    powerfulModelUsage: 0
  }
];

class DatabaseService {
  private users: User[] = [];

  constructor() {
    this.init();
  }

  private init() {
    const savedUsers = localStorage.getItem(DB_KEYS.USERS);
    if (!savedUsers) {
      this.users = [...SEED_USERS];
      this.saveUsers();
    } else {
      this.users = JSON.parse(savedUsers);
      // Critical Fix: Ensure guest user exists even if loaded from old local storage
      const guestExists = this.users.some(u => u.email === 'guest@chatnova.ai');
      if (!guestExists) {
        this.users.push(SEED_USERS[0]);
        this.saveUsers();
      }
    }
  }

  private saveUsers() {
    localStorage.setItem(DB_KEYS.USERS, JSON.stringify(this.users));
  }

  async authenticate(email: string, password?: string): Promise<User | null> {
    // Simulate network delay
    await new Promise(r => setTimeout(r, 400));
    
    // Refresh users from storage to ensure we have the latest (in case of multi-tab usage)
    this.init();
    
    const user = this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return null;
    if (password && user.password !== password) return null;
    return user;
  }

  async register(details: Partial<User>): Promise<User> {
    await new Promise(r => setTimeout(r, 500));
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      name: details.name || 'Anonymous',
      email: details.email || '',
      password: details.password,
      platform: details.platform || 'email',
      avatar: details.name ? details.name.substring(0, 2).toUpperCase() : '??',
      cartoonCharacter: details.cartoonCharacter,
      isPremium: false,
      powerfulModelUsage: 0,
      createdAt: Date.now()
    };
    this.users.push(newUser);
    this.saveUsers();
    return newUser;
  }

  updateUser(updatedUser: User) {
    this.users = this.users.map(u => u.id === updatedUser.id ? updatedUser : u);
    this.saveUsers();
  }

  getUsers(): User[] {
    return this.users;
  }

  getUserById(id: string): User | undefined {
    return this.users.find(u => u.id === id);
  }

  getSessions(userId: string): ChatSession[] {
    const key = `${DB_KEYS.SESSIONS}_${userId}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  }

  saveSessions(userId: string, sessions: ChatSession[]) {
    const key = `${DB_KEYS.SESSIONS}_${userId}`;
    localStorage.setItem(key, JSON.stringify(sessions));
  }
}

export const db = new DatabaseService();
