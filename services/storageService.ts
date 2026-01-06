import { Product, InvoiceTemplate } from '../types';

const PRODUCTS_KEY = 'ic_products';
const TEMPLATES_KEY = 'ic_templates';

// Default Templates
const DEFAULT_TEMPLATES: InvoiceTemplate[] = [
  {
    id: 't1',
    name: 'CJ대한통운_표준',
    headers: ['받는분성명', '받는분전화번호', '받는분주소', '품목명', '배송메시지', '운임구분'],
  },
  {
    id: 't2',
    name: '우체국_소포',
    headers: ['수취인', '연락처', '도착지주소', '내용물', '개수'],
  }
];

const DEFAULT_PRODUCTS: Product[] = [
  { 
    id: '1', 
    sku: 'PROD-001', 
    name: '프리미엄 샴푸', 
    additionalName: '샴푸 선물세트(쇼핑백포함)',
    useAdditionalName: true,
    supplierName: 'LG생활건강', 
    templateId: 't1' 
  },
  { 
    id: '2', 
    sku: 'PROD-002', 
    name: '치약 3개입', 
    supplierName: '아모레퍼시픽', 
    templateId: 't2' 
  },
];

// --- Template Functions ---
export const getStoredTemplates = (): InvoiceTemplate[] => {
  const stored = localStorage.getItem(TEMPLATES_KEY);
  if (!stored) {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(DEFAULT_TEMPLATES));
    return DEFAULT_TEMPLATES;
  }
  return JSON.parse(stored);
};

export const saveTemplates = (templates: InvoiceTemplate[]): void => {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
};

export const addTemplate = (template: InvoiceTemplate): InvoiceTemplate[] => {
  const current = getStoredTemplates();
  const updated = [...current, template];
  saveTemplates(updated);
  return updated;
};

export const deleteTemplate = (id: string): InvoiceTemplate[] => {
  const current = getStoredTemplates();
  const updated = current.filter(t => t.id !== id);
  saveTemplates(updated);
  return updated;
};

// --- Product Functions ---
export const getStoredProducts = (): Product[] => {
  const stored = localStorage.getItem(PRODUCTS_KEY);
  if (!stored) {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(DEFAULT_PRODUCTS));
    return DEFAULT_PRODUCTS;
  }
  return JSON.parse(stored);
};

export const saveProducts = (products: Product[]): void => {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
};

export const addProduct = (product: Product): Product[] => {
  const current = getStoredProducts();
  const updated = [...current, product];
  saveProducts(updated);
  return updated;
};

export const deleteProduct = (id: string): Product[] => {
  const current = getStoredProducts();
  const updated = current.filter(p => p.id !== id);
  saveProducts(updated);
  return updated;
};