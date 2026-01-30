import type { User } from '../types';

// Mock authentication service
class AuthService {
  private currentUser: User | null = null;

  async signInWithGoogle(): Promise<User> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock user data
    const mockUser: User = {
      id: 'user_123',
      email: 'user@example.com',
      name: 'John Doe',
      picture: 'https://via.placeholder.com/150',
    };

    this.currentUser = mockUser;
    localStorage.setItem('user', JSON.stringify(mockUser));
    return mockUser;
  }

  async signOut(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
    this.currentUser = null;
    localStorage.removeItem('user');
  }

  getCurrentUser(): User | null {
    if (this.currentUser) {
      return this.currentUser;
    }

    const stored = localStorage.getItem('user');
    if (stored) {
      this.currentUser = JSON.parse(stored);
      return this.currentUser;
    }

    return null;
  }

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }
}

export const authService = new AuthService();
