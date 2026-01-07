import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { UploadCloud, FileSpreadsheet, ArrowRight, Download, AlertCircle, CheckCircle2, User, Users, Tag } from 'lucide-react';
import { Button } from '../components/Button';
import { getStoredProducts, getStoredTemplates } from '../services/storageService';
import { InvoiceRow, MatchedOrder, Product, ColumnMapping } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// Common headers used for Product Name in Invoices
const PRODUCT_NAME_HEADERS = ['상품명', '품목명', '내용물', '물품명', 'Product Name', 'Item Name'];

export const InvoiceConverter: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<InvoiceRow[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Mapping State - Added 'option'
  const [mapping, setMapping] = useState<ColumnMapping>({ sku: '', orderer: '', receiver: '', option: '' });
  
  const [matchedData, setMatchedData] = useState<MatchedOrder[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

      if (data.length > 0) {
        setHeaders(data[0] as string[]);
        const jsonData = XLSX.utils.sheet_to_json(ws) as InvoiceRow[];
        setRawRows(jsonData);
        setStep(2);
      }
    };
    reader.readAsBinaryString(file);
  };

  const processMatching = () => {
    if (!mapping.sku || !mapping.orderer || !mapping.receiver) return;

    const products = getStoredProducts();
    const productMap = new Map<string, Product>();
    products.forEach(p => productMap.set(p.sku.toLowerCase(), p));

    const results: MatchedOrder[] = rawRows.map((row, index) => {
      const cellValue = String(row[mapping.sku] || '').trim().toLowerCase();
      const product = productMap.get(cellValue);
      
      return {
        id: `ROW-${index}`,
        originalData: row,
        product: product,
        status: product ? 'matched' : 'unmatched',
        templateId: product?.templateId
      };
    });

    setMatchedData(results);
    setStep(3);
  };

  const downloadExcel = async () => {
    setIsDownloading(true);
    try {
      const templates = getStoredTemplates();
      const templateMap = new Map(templates.map(t => [t.id, t]));
      const zip = new JSZip();

      // Grouping Logic
      const col1 = headers[0];
      const col2 = headers[1];

      interface GroupedFile {
        fileName: string;
        sheetName: string;
        templateId: string;
        orders: MatchedOrder[];
      }
      
      const fileGroups = new Map<string, GroupedFile>(); 
      const unmatchedOrders: MatchedOrder[] = [];

      matchedData.forEach(order => {
        if (order.status === 'matched' && order.product && order.product.templateId) {
           // Extract Values
           const val1 = String(order.originalData[col1] || 'Unknown');
           const val2 = String(order.originalData[col2] || 'Unknown');
           const supplier = order.product.supplierName || 'NoSupplier';
           
           // Filename Rule: "G_22_발주처.xlsx" (Col1_Col2_Supplier)
           const baseName = `${val1}_${val2}_${supplier}`;
           // Clean filename to remove invalid chars
           const safeBaseName = baseName.replace(/[\\/:*?"<>|]/g, '-');
           
           // For Sheet Name (Max 31 chars in Excel)
           let sheetName = safeBaseName;
           if (sheetName.length > 31) {
              sheetName = sheetName.substring(0, 31);
           }

           // Unique Key for this File group (Template must match too, to map headers)
           const uniqueKey = `${order.product.templateId}:::${safeBaseName}`;
           
           if (!fileGroups.has(uniqueKey)) {
             fileGroups.set(uniqueKey, {
               fileName: safeBaseName,
               sheetName: sheetName,
               templateId: order.product.templateId,
               orders: []
             });
           }
           fileGroups.get(uniqueKey)?.orders.push(order);

        } else {
          unmatchedOrders.push(order);
        }
      });

      // 1. Process Unmatched Orders (Separate File)
      if (unmatchedOrders.length > 0) {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(unmatchedOrders.map(o => o.originalData));
        XLSX.utils.book_append_sheet(wb, ws, "미확인_주문");
        const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        zip.file("미확인_주문_목록.xlsx", wbOut);
      }

      // 2. Process Groups (Matched Orders)
      const fileNameCounts = new Map<string, number>();

      fileGroups.forEach((group) => {
         const template = templateMap.get(group.templateId);
         if (!template) return;

         // Handle filename collisions (e.g. same name but different template structure)
         let finalFileName = group.fileName;
         if (fileNameCounts.has(finalFileName)) {
           const count = fileNameCounts.get(finalFileName)! + 1;
           fileNameCounts.set(finalFileName, count);
           finalFileName = `${finalFileName}_(${count})`;
         } else {
           fileNameCounts.set(finalFileName, 1);
         }

         // Build Rows
         const rows = group.orders.map(order => {
            const rowData: Record<string, any> = {};
            const product = order.product!;
            
            // Logic 1: Determine Base Product Name
            // If mapping.option is set AND the row has a value, use it.
            // Otherwise, fallback to configured product name (Original vs Additional)
            let finalProductName = '';
            
            const optionValue = mapping.option ? String(order.originalData[mapping.option] || '').trim() : '';

            if (optionValue) {
               finalProductName = optionValue;
            } else {
               finalProductName = (product.useAdditionalName && product.additionalName) 
                ? product.additionalName 
                : product.name;
            }

            // Logic 2: Check Orderer vs Receiver
            const ordererName = String(order.originalData[mapping.orderer] || '').trim();
            const receiverName = String(order.originalData[mapping.receiver] || '').trim();

            if (ordererName && receiverName && ordererName !== receiverName) {
              finalProductName = `${finalProductName} 보내는 사람_${ordererName}`;
            }

            template.headers.forEach(h => {
               const isProductNameCol = PRODUCT_NAME_HEADERS.some(ph => h.includes(ph));
               if (isProductNameCol) {
                 rowData[h] = finalProductName;
               } else {
                 rowData[h] = order.originalData[h] !== undefined ? order.originalData[h] : '';
               }
            });
            return rowData;
         });

         const wb = XLSX.utils.book_new();
         const ws = XLSX.utils.json_to_sheet(rows, { header: template.headers });
         XLSX.utils.book_append_sheet(wb, ws, group.sheetName); // Sheet name inside file
         
         const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
         zip.file(`${finalFileName}.xlsx`, wbOut);
      });

      // 3. Download Logic
      const filesCount = Object.keys(zip.files).length;

      if (filesCount === 0) {
        alert("다운로드할 데이터가 없습니다.");
      } else if (filesCount === 1) {
        // If only 1 file, download it directly (no zip)
        const firstFileName = Object.keys(zip.files)[0];
        const blob = await zip.file(firstFileName)!.async("blob");
        saveBlob(blob, firstFileName);
      } else {
        // Multiple files -> Zip
        const content = await zip.generateAsync({ type: "blob" });
        saveBlob(content, `송장변환결과_${new Date().toISOString().slice(0,10)}.zip`);
      }

    } catch (error) {
      console.error("Download failed", error);
      alert("파일 생성 중 오류가 발생했습니다.");
    } finally {
      setIsDownloading(false);
    }
  };

  const saveBlob = (blob: Blob, fileName: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Stats for chart
  const templates = getStoredTemplates();
  const templateMap = new Map(templates.map(t => [t.id, t]));
  
  const stats = matchedData.reduce((acc, curr) => {
    const name = curr.templateId ? templateMap.get(curr.templateId)?.name || '삭제된양식' : '미확인';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.keys(stats).map(key => ({ name: key, value: stats[key] }));
  const COLORS = ['#135bec', '#ef4444', '#f97316', '#8b5cf6', '#10b981', '#6366f1'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[calc(100vh-64px)]">
      
      {/* Step Indicators */}
      <div className="mb-8">
        <div className="flex items-center justify-center w-full">
          {[
            { num: 1, label: '파일 업로드' },
            { num: 2, label: '매칭 기준 선택' },
            { num: 3, label: '변환 완료' }
          ].map((s, idx) => (
            <React.Fragment key={s.num}>
              <div className="flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-colors ${step >= s.num ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {step > s.num ? <CheckCircle2 /> : s.num}
                </div>
                <span className={`text-sm font-medium ${step >= s.num ? 'text-primary' : 'text-slate-400'}`}>{s.label}</span>
              </div>
              {idx < 2 && (
                <div className={`h-1 w-24 mx-4 rounded ${step > s.num ? 'bg-primary' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px] flex flex-col">
        
        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 text-primary">
              <UploadCloud size={40} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">주문 리스트 엑셀 업로드</h2>
            <p className="text-slate-500 mb-8 max-w-md">
              다운로드 받은 주문서 파일을 그대로 업로드하세요.<br/>
              제품 ID를 인식하여 발주처별 엑셀 양식으로 자동 변환합니다.
            </p>
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <Button size="lg" onClick={() => fileInputRef.current?.click()}>
              파일 선택하기
            </Button>
            <p className="mt-4 text-xs text-slate-400">최대 10MB • 보안 연결 사용</p>
          </div>
        )}

        {/* Step 2: Mapping */}
        {step === 2 && (
          <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full p-8">
            <div className="flex items-center gap-4 mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <FileSpreadsheet className="text-green-600" />
              <div className="flex-1">
                <h4 className="font-bold text-slate-900">{fileName}</h4>
                <p className="text-xs text-slate-500">{rawRows.length}개의 행이 감지됨</p>
              </div>
              <button onClick={() => { setStep(1); setFileName(''); }} className="text-slate-400 hover:text-red-500">
                <AlertCircle size={20} />
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-6">
              <h4 className="font-bold text-blue-900 mb-1">변환 규칙 안내</h4>
              <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                <li>원본 엑셀과 송장 양식의 <strong>열 제목(Header)이 같으면</strong> 자동으로 내용이 복사됩니다.</li>
                <li><strong>'상품명', '품목명', '내용물'</strong> 컬럼은 설정된 규칙(추가 제품명 등)에 따라 자동 변경됩니다.</li>
                <li><strong>결과 파일:</strong> 발주처 및 배치(1,2열)별로 별도의 엑셀 파일이 생성됩니다.</li>
              </ul>
            </div>

            <div className="space-y-6">
                {/* 1. SKU Selection */}
                <div className="space-y-2">
                   <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
                      <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-xs flex items-center justify-center">1</span>
                      제품 식별 ID (SKU) 열
                   </div>
                   <select 
                      className="w-full rounded-lg border-slate-300 focus:ring-primary focus:border-primary"
                      value={mapping.sku} 
                      onChange={(e) => setMapping(prev => ({ ...prev, sku: e.target.value }))}
                   >
                     <option value="">선택하세요 (예: 상품코드, 옵션코드)</option>
                     {headers.map(h => <option key={h} value={h}>{h}</option>)}
                   </select>
                </div>

                {/* 2. Orderer & Receiver & Option Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                   <div className="space-y-2">
                     <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
                        <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">2</span>
                        <User size={16} /> 주문자명 열
                     </div>
                     <select 
                        className="w-full rounded-lg border-slate-300 focus:ring-primary focus:border-primary"
                        value={mapping.orderer} 
                        onChange={(e) => setMapping(prev => ({ ...prev, orderer: e.target.value }))}
                     >
                       <option value="">선택하세요 (예: 구매자명)</option>
                       {headers.map(h => <option key={h} value={h}>{h}</option>)}
                     </select>
                   </div>
                   
                   <div className="space-y-2">
                     <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center">3</span>
                        <Users size={16} /> 수취인명 열 (받는 사람)
                     </div>
                     <select 
                        className="w-full rounded-lg border-slate-300 focus:ring-primary focus:border-primary"
                        value={mapping.receiver} 
                        onChange={(e) => setMapping(prev => ({ ...prev, receiver: e.target.value }))}
                     >
                       <option value="">선택하세요 (예: 수령인명)</option>
                       {headers.map(h => <option key={h} value={h}>{h}</option>)}
                     </select>
                   </div>

                   <div className="space-y-2">
                     <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
                        <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center">4</span>
                        <Tag size={16} /> 옵션 정보 열 (선택)
                     </div>
                     <select 
                        className="w-full rounded-lg border-slate-300 focus:ring-primary focus:border-primary"
                        value={mapping.option} 
                        onChange={(e) => setMapping(prev => ({ ...prev, option: e.target.value }))}
                     >
                       <option value="">선택 안함 (기본 제품명 사용)</option>
                       {headers.map(h => <option key={h} value={h}>{h}</option>)}
                     </select>
                   </div>

                   <div className="md:col-span-2 text-xs text-slate-500 bg-white p-2 rounded border border-slate-100">
                     <p>• 주문자와 수취인이 다를 경우 제품명 뒤에 <strong>"보내는 사람_주문자"</strong>가 자동으로 추가됩니다.</p>
                     <p className="mt-1 text-purple-700">• <strong>옵션 정보 열</strong>을 선택하면, 해당 열에 값이 있을 경우 제품명 대신 옵션값을 송장에 출력합니다.</p>
                   </div>
                </div>
            </div>

            <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setStep(1)}>이전</Button>
              <Button disabled={!mapping.sku || !mapping.orderer || !mapping.receiver} onClick={processMatching} icon={<ArrowRight size={18} />}>
                변환 시작
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Result */}
        {step === 3 && (
          <div className="flex-1 flex flex-col p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-2 bg-slate-50 rounded-xl p-6 border border-slate-200">
                <h3 className="font-bold text-slate-900 mb-4">송장 양식별 분류 현황</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                      <Tooltip cursor={{fill: 'transparent'}} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-slate-200 flex flex-col justify-center gap-4 shadow-sm">
                <div className="text-center">
                  <p className="text-sm text-slate-500">총 처리된 주문</p>
                  <p className="text-4xl font-black text-slate-900">{matchedData.length}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-600 font-bold">성공</p>
                    <p className="text-xl font-bold text-green-700">
                      {matchedData.filter(d => d.status === 'matched').length}
                    </p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <p className="text-xs text-red-600 font-bold">실패(미등록)</p>
                    <p className="text-xl font-bold text-red-700">
                      {matchedData.filter(d => d.status === 'unmatched').length}
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={downloadExcel} 
                  className="w-full mt-2" 
                  icon={<Download size={18} />}
                  isLoading={isDownloading}
                >
                  {isDownloading ? '파일 생성 중...' : '결과 다운로드'}
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden border border-slate-200 rounded-xl flex flex-col">
              <div className="p-3 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                <span className="font-bold text-sm text-slate-700">미리보기 (상위 50건)</span>
                <span className="text-xs text-slate-500">열 제목이 일치하는 데이터가 자동 매핑되었습니다.</span>
              </div>
              <div className="flex-1 overflow-auto bg-white">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 border-b whitespace-nowrap">상태</th>
                      <th className="px-4 py-2 border-b whitespace-nowrap">발주처/양식</th>
                      <th className="px-4 py-2 border-b whitespace-nowrap">입력 SKU</th>
                      <th className="px-4 py-2 border-b whitespace-nowrap">최종 제품명</th>
                      <th className="px-4 py-2 border-b text-slate-400">나머지 데이터</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchedData.slice(0, 50).map((row) => {
                      // Preview Logic
                      let previewProductName = '-';
                      
                      // 1. Determine base product name (Option vs Product Setting)
                      const optionValue = mapping.option ? String(row.originalData[mapping.option] || '').trim() : '';

                      if (row.product) {
                        if (optionValue) {
                           previewProductName = optionValue;
                        } else {
                           previewProductName = (row.product.useAdditionalName && row.product.additionalName)
                            ? row.product.additionalName 
                            : row.product.name;
                        }
                        
                        // 2. Append Sender info if needed
                        const orderer = String(row.originalData[mapping.orderer] || '').trim();
                        const receiver = String(row.originalData[mapping.receiver] || '').trim();
                        if (orderer && receiver && orderer !== receiver) {
                          previewProductName += ` 보내는 사람_${orderer}`;
                        }
                      }

                      return (
                        <tr key={row.id} className="border-b hover:bg-slate-50">
                          <td className="px-4 py-2">
                            {row.status === 'matched' 
                              ? <span className="text-green-600 font-bold text-xs">성공</span>
                              : <span className="text-red-500 font-bold text-xs">실패</span>
                            }
                          </td>
                          <td className="px-4 py-2 font-medium text-xs">
                            {row.product ? `${row.product.supplierName} / ${templateMap.get(row.product.templateId)?.name || '?'}` : '-'}
                          </td>
                          <td className="px-4 py-2 text-slate-600 font-mono">{String(row.originalData[mapping.sku])}</td>
                          <td className="px-4 py-2 font-medium text-blue-700">{previewProductName}</td>
                          <td className="px-4 py-2 text-slate-400 italic">...</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="mt-4 flex justify-start">
               <Button variant="ghost" onClick={() => { setStep(1); setFileName(''); setRawRows([]); setMapping({sku: '', orderer: '', receiver: '', option: ''}); }}>
                  처음부터 다시하기
               </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};