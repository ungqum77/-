import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Plus, Trash2, Search, Save, X, FileSpreadsheet, Upload, Settings2, Building2, Tag, CheckSquare } from 'lucide-react';
import { Product, InvoiceTemplate } from '../types';
import { getStoredProducts, addProduct, deleteProduct, getStoredTemplates, addTemplate, deleteTemplate } from '../services/storageService';
import { Button } from '../components/Button';

export const ProductManagement: React.FC = () => {
  // Default tab changed to 'templates'
  const [activeTab, setActiveTab] = useState<'templates' | 'products'>('templates');
  
  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  
  // UI State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // New Product Form
  const [newSku, setNewSku] = useState('');
  const [newName, setNewName] = useState('');
  const [newAdditionalName, setNewAdditionalName] = useState('');
  const [useAdditionalName, setUseAdditionalName] = useState(false);
  const [newSupplier, setNewSupplier] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // New Template Form
  const [tempName, setTempName] = useState('');
  const [tempHeaders, setTempHeaders] = useState<string[]>([]);
  const templateFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load data from LocalStorage on mount (simulating login load)
    setProducts(getStoredProducts());
    setTemplates(getStoredTemplates());
  }, []);

  // --- Product Handlers ---
  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSku || !newName || !newSupplier || !selectedTemplateId) return;

    const newProduct: Product = {
      id: Date.now().toString(),
      sku: newSku,
      name: newName,
      additionalName: newAdditionalName,
      useAdditionalName: useAdditionalName,
      supplierName: newSupplier,
      templateId: selectedTemplateId,
    };

    setProducts(addProduct(newProduct)); // Saves to localStorage automatically
    setIsProductModalOpen(false);
    
    // Reset form
    setNewSku('');
    setNewName('');
    setNewAdditionalName('');
    setUseAdditionalName(false);
    setNewSupplier('');
    setSelectedTemplateId('');
  };

  const handleProductDelete = (id: string) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      setProducts(deleteProduct(id)); // Saves to localStorage automatically
    }
  };

  // --- Template Handlers ---
  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

      if (data.length > 0) {
        // Assume first row is header
        const headers = data[0].map(h => String(h));
        setTempHeaders(headers);
        setTempName(file.name.replace(/\.[^/.]+$/, "")); // Remove extension
        
        setIsTemplateModalOpen(true);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // Reset input
  };

  const handleSaveTemplate = () => {
    if (!tempName || tempHeaders.length === 0) return;

    const newTemplate: InvoiceTemplate = {
      id: `tpl-${Date.now()}`,
      name: tempName,
      headers: tempHeaders,
    };

    setTemplates(addTemplate(newTemplate)); // Saves to localStorage automatically
    setIsTemplateModalOpen(false);
    setTempName('');
    setTempHeaders([]);
  };

  const handleTemplateDelete = (id: string) => {
    // Check if used
    const isUsed = products.some(p => p.templateId === id);
    if (isUsed) {
      alert('이 양식은 현재 등록된 제품에서 사용 중이므로 삭제할 수 없습니다.');
      return;
    }

    if (window.confirm('양식을 삭제하시겠습니까?')) {
      setTemplates(deleteTemplate(id));
    }
  };

  const filteredProducts = products.filter(p => 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTemplateName = (id: string) => templates.find(t => t.id === id)?.name || '삭제된 양식';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">제품 및 송장 관리</h1>
          <p className="text-slate-500 mt-1">
            등록된 데이터는 브라우저에 <strong>자동 저장</strong>되어 다음 방문 시에도 유지됩니다.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('templates')}
            className={`${activeTab === 'templates' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <FileSpreadsheet size={16} /> 송장 양식 관리
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`${activeTab === 'products' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Search size={16} /> 제품 목록
          </button>
        </nav>
      </div>

      {/* --- TEMPLATES TAB --- */}
      {activeTab === 'templates' && (
        <>
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-6 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-indigo-900 font-bold text-lg mb-1">새로운 송장 양식 등록</h3>
              <p className="text-indigo-700 text-sm">
                사용하고 계신 엑셀 파일을 업로드하면 <strong>헤더(열 제목)</strong>를 자동으로 인식하여 저장합니다.
              </p>
            </div>
            <div>
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                ref={templateFileRef} 
                className="hidden" 
                onChange={handleTemplateUpload}
              />
              <Button onClick={() => templateFileRef.current?.click()} icon={<Upload size={18} />}>
                엑셀 양식 업로드
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map(tpl => (
              <div key={tpl.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
                      <FileSpreadsheet size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{tpl.name}</h4>
                      <p className="text-xs text-slate-500">{tpl.headers.length}개 열 포함</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleTemplateDelete(tpl.id)}
                    className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 h-32 overflow-y-auto custom-scrollbar">
                  <p className="text-xs font-semibold text-slate-500 mb-2">포함된 헤더 목록:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tpl.headers.map(h => (
                      <span key={h} className="inline-block px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-600">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* --- PRODUCTS TAB --- */}
      {activeTab === 'products' && (
        <>
          <div className="flex justify-end mb-4">
            <Button onClick={() => setIsProductModalOpen(true)} icon={<Plus size={18} />}>
              제품 등록
            </Button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center gap-3">
              <Search className="text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="제품명, 발주처, ID(SKU) 검색..." 
                className="bg-transparent border-none focus:ring-0 w-full text-sm outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                  <tr>
                    <th className="px-6 py-4">식별 ID (SKU)</th>
                    <th className="px-6 py-4">제품명 설정</th>
                    <th className="px-6 py-4">발주처</th>
                    <th className="px-6 py-4">적용 양식</th>
                    <th className="px-6 py-4 text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                        등록된 제품이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-mono text-sm text-slate-600">{product.sku}</td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{product.name}</div>
                          {product.useAdditionalName && product.additionalName ? (
                            <div className="text-xs text-primary mt-1 flex items-center gap-1">
                              <Tag size={12} className="fill-blue-100" />
                              <span className="font-semibold">대체 출력:</span> {product.additionalName}
                            </div>
                          ) : (
                            <div className="text-xs text-slate-400 mt-1">
                              (기본 이름 사용)
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          <span className="flex items-center gap-1.5 text-sm">
                            <Building2 size={14} className="text-slate-400" />
                            {product.supplierName}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            <Settings2 size={12} />
                            {getTemplateName(product.templateId)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleProductDelete(product.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* --- ADD PRODUCT MODAL --- */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 sticky top-0">
              <h3 className="font-bold text-lg">새 제품 등록</h3>
              <button onClick={() => setIsProductModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddProduct} className="p-6 space-y-5">
              
              {/* SKU & Supplier */}
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">식별 ID (SKU) <span className="text-red-500">*</span></label>
                    <input 
                      required
                      type="text" 
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      placeholder="예: PROD-001"
                      value={newSku}
                      onChange={(e) => setNewSku(e.target.value)}
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">발주처 <span className="text-red-500">*</span></label>
                    <input 
                      required
                      type="text" 
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      placeholder="예: (주)공급사"
                      value={newSupplier}
                      onChange={(e) => setNewSupplier(e.target.value)}
                    />
                 </div>
              </div>

              {/* Product Name Configuration Box */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">기본 제품명 <span className="text-red-500">*</span></label>
                  <input 
                    required
                    type="text" 
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
                    placeholder="예: 프리미엄 샴푸 세트"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                
                <div className="pt-3 border-t border-slate-200">
                    <div className="flex items-start gap-3 mb-2">
                        <div className="flex h-6 items-center">
                            <input 
                                id="useAddName"
                                type="checkbox" 
                                className="w-5 h-5 rounded text-primary focus:ring-primary border-gray-300 cursor-pointer"
                                checked={useAdditionalName}
                                onChange={(e) => setUseAdditionalName(e.target.checked)}
                            />
                        </div>
                        <div className="flex-1">
                            <label htmlFor="useAddName" className="text-sm font-bold text-slate-800 cursor-pointer select-none flex items-center gap-1">
                                <Tag size={14} /> 송장 출력용 대체 제품명 사용
                            </label>
                            <p className="text-xs text-slate-500 mt-0.5">
                                체크 시, 엑셀 송장 변환 시 위 '기본 제품명' 대신 아래 이름을 출력합니다.
                            </p>
                        </div>
                    </div>
                    
                    {/* Always visible input, but visually disabled when unchecked */}
                    <div className={`transition-all duration-200 ${useAdditionalName ? 'opacity-100' : 'opacity-60'}`}>
                        <input 
                          type="text" 
                          disabled={!useAdditionalName}
                          className={`w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all
                            ${useAdditionalName ? 'bg-white border-slate-300' : 'bg-slate-100 border-slate-200 cursor-not-allowed'}`}
                          placeholder={useAdditionalName ? "예: 샴푸 3종 선물세트 (쇼핑백 포함)" : "체크박스를 선택하면 입력할 수 있습니다."}
                          value={newAdditionalName}
                          onChange={(e) => setNewAdditionalName(e.target.value)}
                        />
                    </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">적용할 송장 양식 <span className="text-red-500">*</span></label>
                <select 
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                >
                  <option value="">선택하세요</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">이 제품의 주문은 선택한 엑셀 양식으로 변환됩니다.</p>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-2">
                <Button type="button" variant="secondary" onClick={() => setIsProductModalOpen(false)}>취소</Button>
                <Button type="submit" icon={<Save size={16} />}>제품 저장</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD TEMPLATE MAPPING MODAL --- */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg">송장 양식 저장</h3>
              <button onClick={() => setIsTemplateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">양식 이름</label>
                <input 
                  type="text" 
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-100">
                <p className="text-sm text-blue-800 font-bold mb-1">인식된 헤더 ({tempHeaders.length}개)</p>
                <p className="text-xs text-blue-600 mb-2">
                  주문서 업로드 시 아래와 동일한 이름의 열(Column)이 있으면 내용이 자동으로 복사됩니다.
                </p>
                <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
                   {tempHeaders.map(h => (
                      <span key={h} className="text-[10px] bg-white px-2 py-0.5 rounded border border-blue-200 text-blue-700">{h}</span>
                   ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setIsTemplateModalOpen(false)}>취소</Button>
              <Button onClick={handleSaveTemplate} icon={<Save size={16} />}>양식 저장</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};