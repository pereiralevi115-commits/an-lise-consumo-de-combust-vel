import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { BarChart3, Table2, Upload, BookOpen, Box, LogOut, Fuel } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

const navItems = [
  { name: 'Gráficos', page: 'Graficos', icon: BarChart3 },
  { name: 'Análise', page: 'AnalisePorPlaca', icon: Box },
  { name: 'Dados', page: 'Dados', icon: Table2 },
  { name: 'M³', page: 'MetrosCubicos', icon: Box },
  { name: 'Upload', page: 'Upload', icon: Upload },
  { name: 'Legendas', page: 'Legendas', icon: BookOpen },
  { name: 'Abastecimento', page: 'AbastecimentoDois', icon: Fuel }
];

export default function Layout({ children, currentPageName }) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-slate-200 shadow-sm">
        <div className="max-w-full mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo + Nome */}
            <Link to="/" className="flex items-center gap-3">
              <span className="font-bold text-lg text-slate-800 hidden sm:block leading-tight">
                Concretar Concreto Usinado LTDA
              </span>
              <span className="text-xs text-slate-500 hidden md:block">Sistema de Análise de Combustível</span>
            </Link>

            {/* Nav + Sair */}
            <div className="flex items-center gap-2">
              <nav className="flex items-center gap-1">
                {navItems.map(item => {
                  const Icon = item.icon;
                  const isActive = currentPageName === item.page;
                  return (
                    <Link
                      key={item.page}
                      to={createPageUrl(item.page)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-[#FDB913] text-slate-900'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden lg:block">{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              <Button
                variant="outline"
                size="sm"
                onClick={() => base44.auth.logout('/')}
                className="flex items-center gap-2 text-slate-600 hover:text-red-600 hover:border-red-300 ml-1"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:block">Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* CONTEÚDO */}
      <main className="w-full mx-auto px-4 md:px-6 py-8">
        {children}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 mt-12">
        <div className="max-w-full mx-auto px-6 py-4 text-center text-slate-400 text-sm">
          © 2026 Concretar Concreto Usinado - Sistema de Análise de Combustível
        </div>
      </footer>
    </div>
  );
}