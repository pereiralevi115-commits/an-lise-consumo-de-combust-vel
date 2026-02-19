import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { BarChart3, Table2, Upload, BookOpen } from 'lucide-react';

export default function Layout({ children, currentPageName }) {
  const navItems = [
    { name: 'Gráficos', page: 'Graficos', icon: BarChart3 },
    { name: 'Dados', page: 'Dados', icon: Table2 },
    { name: 'Upload', page: 'Upload', icon: Upload },
    { name: 'Legendas', page: 'Legendas', icon: BookOpen }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Concretar Concreto Usinado LTDA</h1>
                <p className="text-sm text-slate-400">Sistema de Análise sobre Consumo de Combustível</p>
            </div>
            
            <nav className="flex gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPageName === item.page;
                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                      isActive
                        ? 'bg-yellow-400 text-slate-900'
                          : 'text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-[1600px] mx-auto px-6 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-slate-800/50 border-t border-slate-700 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-4 text-center text-slate-400 text-sm">
          © 2026 Concretar Concreto Usinado - Sistema de Análise de Combustível
        </div>
      </footer>
    </div>
  );
}