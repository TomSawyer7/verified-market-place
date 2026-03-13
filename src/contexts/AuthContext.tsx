import React, { createContext, useContext, useState, useCallback } from 'react';
import { User, UserRole, VerificationStatus } from '@/types';
import { mockUsers } from '@/data/mockData';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => boolean;
  register: (email: string, password: string, name: string) => boolean;
  logout: () => void;
  updateTrustScore: (userId: string, delta: number) => void;
  updateVerificationStatus: (userId: string, status: VerificationStatus) => void;
  allUsers: User[];
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const login = useCallback((email: string, _password: string) => {
    const found = users.find(u => u.email === email);
    if (found) {
      setCurrentUser(found);
      return true;
    }
    return false;
  }, [users]);

  const register = useCallback((email: string, _password: string, name: string) => {
    if (users.find(u => u.email === email)) return false;
    const newUser: User = {
      id: `user-${Date.now()}`,
      email,
      name,
      role: 'user',
      trustScore: 10,
      verificationStatus: 'unverified',
      createdAt: new Date().toISOString().split('T')[0],
    };
    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
    return true;
  }, [users]);

  const logout = useCallback(() => setCurrentUser(null), []);

  const updateTrustScore = useCallback((userId: string, delta: number) => {
    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, trustScore: Math.max(0, Math.min(100, u.trustScore + delta)) } : u
    ));
    if (currentUser?.id === userId) {
      setCurrentUser(prev => prev ? { ...prev, trustScore: Math.max(0, Math.min(100, prev.trustScore + delta)) } : null);
    }
  }, [currentUser]);

  const updateVerificationStatus = useCallback((userId: string, status: VerificationStatus) => {
    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, verificationStatus: status } : u
    ));
    if (currentUser?.id === userId) {
      setCurrentUser(prev => prev ? { ...prev, verificationStatus: status } : null);
    }
  }, [currentUser]);

  return (
    <AuthContext.Provider value={{
      user: currentUser,
      isAuthenticated: !!currentUser,
      isAdmin: currentUser?.role === 'admin',
      login,
      register,
      logout,
      updateTrustScore,
      updateVerificationStatus,
      allUsers: users,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
