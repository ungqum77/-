export interface Product {
  id: string;
  sku: string;
  name: string;
  additionalName?: string; // 추가 제품명
  useAdditionalName?: boolean; // 추가 제품명 사용 여부
  supplierName: string; // 발주처명 (Company Name)
  templateId: string; // Links to an InvoiceTemplate
}

export interface InvoiceTemplate {
  id: string;
  name: string;
  headers: string[]; // The headers extracted from the uploaded excel
}

// Removed complicated mapping types as we strictly follow header name matching now
export interface InvoiceRow {
  [key: string]: string | number | undefined;
}

export interface MatchedOrder {
  id: string;
  originalData: InvoiceRow;
  product?: Product;
  status: 'matched' | 'unmatched';
  templateId?: string;
}

export interface ColumnMapping {
  sku: string;
  orderer: string; // 주문자명 열
  receiver: string; // 수취인명 열
  option: string; // (New) 옵션 정보 열 - 제품명 대체용
}