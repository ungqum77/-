import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export const Home: React.FC = () => {
  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)]">
      <main className="flex-1">
        <div className="relative isolate pt-14 dark:bg-gray-900">
          <div className="py-24 sm:py-32 lg:pb-40">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="mx-auto max-w-2xl text-center">
                <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
                  엑셀 주문서를<br/>
                  <span className="text-primary">3초 만에 송장으로.</span>
                </h1>
                <p className="mt-6 text-lg leading-8 text-slate-600">
                  복잡한 주문 리스트를 제품 ID 기반으로 자동 분류하고, 
                  각 택배사 양식에 맞춰 엑셀 파일을 생성해 드립니다.
                </p>
                <div className="mt-10 flex items-center justify-center gap-x-6">
                  <Link
                    to="/convert"
                    className="rounded-lg bg-primary px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all flex items-center gap-2"
                  >
                    무료로 시작하기 <ArrowRight size={16} />
                  </Link>
                  <Link to="/products" className="text-sm font-semibold leading-6 text-slate-900 hover:text-primary transition-colors">
                    제품 ID 등록하기 <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
              
              <div className="mt-16 flow-root sm:mt-24">
                <div className="-m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:-m-4 lg:rounded-2xl lg:p-4">
                  <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                     <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="font-bold text-lg mb-2 text-blue-900">1. 파일 업로드</div>
                        <p className="text-sm text-slate-600">스마트스토어, 쿠팡 등에서 다운로드 받은 엑셀 주문서를 그대로 업로드하세요.</p>
                     </div>
                     <div className="p-4 bg-indigo-50 rounded-lg">
                        <div className="font-bold text-lg mb-2 text-indigo-900">2. 자동 매핑</div>
                        <p className="text-sm text-slate-600">미리 등록해둔 SKU(제품ID)를 기반으로 CJ, 롯데, 한진 등 택배사를 자동 배정합니다.</p>
                     </div>
                     <div className="p-4 bg-green-50 rounded-lg">
                        <div className="font-bold text-lg mb-2 text-green-900">3. 결과 다운로드</div>
                        <p className="text-sm text-slate-600">택배사별로 시트가 나누어진 깔끔한 엑셀 파일을 즉시 다운로드하세요.</p>
                     </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};