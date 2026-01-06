import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { ProductManagement } from './pages/ProductManagement';
import { InvoiceConverter } from './pages/InvoiceConverter';

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="min-h-screen bg-background-light">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<ProductManagement />} />
          <Route path="/convert" element={<InvoiceConverter />} />
        </Routes>
      </div>
    </HashRouter>
  );
};

export default App;