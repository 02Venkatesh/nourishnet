import { createContext, useContext, useState } from 'react';

const RemoveCartContext = createContext();

export const RemoveCartProvider = ({ children }) => {
  const [removeCart, setRemoveCart] = useState({});
  return (
    <RemoveCartContext.Provider value={{ removeCart, setRemoveCart }}>
      {children}
    </RemoveCartContext.Provider>
  );
};

export const useRemoveCart = () => useContext(RemoveCartContext);