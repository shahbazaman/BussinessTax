import React, { createContext, useState, useEffect } from 'react';
import api from '../utils/api';

export const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrency] = useState('USD');
  const CURRENCY_MAP = { USD: '$', INR: '₹', EUR: '€', GBP: '£' };

  const refreshCurrency = async () => {
    try {
      const { data } = await api.get('/auth/profile');
      setCurrency(data.currency || 'USD');
    } catch (err) {
      console.error("Failed to load currency");
    }
  };

  useEffect(() => { refreshCurrency(); }, []);

  return (
    <CurrencyContext.Provider value={{ 
      currency, 
      symbol: CURRENCY_MAP[currency] || '$', 
      refreshCurrency 
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};