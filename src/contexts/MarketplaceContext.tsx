import React, { createContext, useContext, useState, useCallback } from 'react';
import { Listing, Transaction, VerificationRequest, Report } from '@/types';
import { mockListings, mockTransactions, mockVerificationRequests, mockReports } from '@/data/mockData';

interface MarketplaceContextType {
  listings: Listing[];
  transactions: Transaction[];
  verificationRequests: VerificationRequest[];
  reports: Report[];
  addListing: (listing: Omit<Listing, 'id' | 'createdAt' | 'status'>) => void;
  createTransaction: (tx: Omit<Transaction, 'id' | 'createdAt' | 'status'>) => void;
  updateTransactionStatus: (txId: string, status: Transaction['status']) => void;
  submitVerification: (req: Omit<VerificationRequest, 'id' | 'submittedAt' | 'status'>) => void;
  updateVerificationRequest: (id: string, status: VerificationRequest['status']) => void;
  submitReport: (report: Omit<Report, 'id' | 'createdAt' | 'status'>) => void;
  updateReportStatus: (id: string, status: Report['status']) => void;
}

const MarketplaceContext = createContext<MarketplaceContextType | null>(null);

export const useMarketplace = () => {
  const ctx = useContext(MarketplaceContext);
  if (!ctx) throw new Error('useMarketplace must be used within MarketplaceProvider');
  return ctx;
};

export const MarketplaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [listings, setListings] = useState<Listing[]>(mockListings);
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>(mockVerificationRequests);
  const [reports, setReports] = useState<Report[]>(mockReports);

  const addListing = useCallback((listing: Omit<Listing, 'id' | 'createdAt' | 'status'>) => {
    setListings(prev => [...prev, {
      ...listing,
      id: `listing-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'active',
    }]);
  }, []);

  const createTransaction = useCallback((tx: Omit<Transaction, 'id' | 'createdAt' | 'status'>) => {
    setTransactions(prev => [...prev, {
      ...tx,
      id: `tx-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'pending',
    }]);
  }, []);

  const updateTransactionStatus = useCallback((txId: string, status: Transaction['status']) => {
    setTransactions(prev => prev.map(t => t.id === txId ? { ...t, status } : t));
  }, []);

  const submitVerification = useCallback((req: Omit<VerificationRequest, 'id' | 'submittedAt' | 'status'>) => {
    setVerificationRequests(prev => [...prev, {
      ...req,
      id: `vr-${Date.now()}`,
      submittedAt: new Date().toISOString().split('T')[0],
      status: 'pending',
    }]);
  }, []);

  const updateVerificationRequest = useCallback((id: string, status: VerificationRequest['status']) => {
    setVerificationRequests(prev => prev.map(v => v.id === id ? { ...v, status, reviewedAt: new Date().toISOString().split('T')[0] } : v));
  }, []);

  const submitReport = useCallback((report: Omit<Report, 'id' | 'createdAt' | 'status'>) => {
    setReports(prev => [...prev, {
      ...report,
      id: `report-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'pending',
    }]);
  }, []);

  const updateReportStatus = useCallback((id: string, status: Report['status']) => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  }, []);

  return (
    <MarketplaceContext.Provider value={{
      listings, transactions, verificationRequests, reports,
      addListing, createTransaction, updateTransactionStatus,
      submitVerification, updateVerificationRequest,
      submitReport, updateReportStatus,
    }}>
      {children}
    </MarketplaceContext.Provider>
  );
};
