# Estrutura Completa do Aplicativo - Sistema de Análise de Combustível

## 📋 Visão Geral
Sistema completo de gestão e análise de consumo de combustível para frota de veículos, com integração Korth Guardian, importação de dados via Excel, visualização de gráficos avançados e análise de eficiência por placa e motorista.

---

## 🏗️ ARQUITETURA DO PROJETO

```
src/
├── App.jsx                          # Router principal (importa páginas de pages.config.js)
├── Layout.jsx                       # Layout wrapper com header, nav e footer
├── pages.config.js                  # Auto-generated: configuração de rotas
├── main.jsx                         # Entry point
├── index.css                        # Design tokens, variáveis CSS globais
├── index.html                       # HTML base
│
├── pages/                           # Páginas (componentes raiz)
│   ├── Graficos.jsx                # 📊 Visualização: gráficos de consumo, eficiência, ranking
│   ├── AnalisePorPlaca.jsx          # 📈 Análise por placa/mês, edição inline, export PDF
│   ├── Dados.jsx                    # 📑 Tabela de registros com filtros, edição inline
│   ├── MetrosCubicos.jsx            # 📦 Gestão de registros M³, import/delete
│   ├── Upload.jsx                   # 📤 Import Korth Guardian + Excel externo, delete
│   ├── Legendas.jsx                 # 🏷️ Cadastro de metadados (pontos, motoristas, etc)
│   └── RankingMotoristas.jsx        # 🏆 Ranking de eficiência (KM/L)
│
├── components/                      # Componentes reutilizáveis
│   ├── ui/                          # shadcn/ui components (pré-configurados)
│   │   ├── button.jsx
│   │   ├── card.jsx
│   │   ├── input.jsx
│   │   ├── label.jsx
│   │   ├── table.jsx
│   │   ├── select.jsx
│   │   ├── tabs.jsx
│   │   ├── alert.jsx
│   │   ├── [+40 outros]
│   │
│   ├── UserNotRegisteredError.jsx   # Erro quando usuário não está registrado
│   └── ValorCalculado.jsx           # Componente para calcular custos de combustível
│
├── functions/                       # Backend functions (Deno)
│   ├── importKorth.js               # 🔗 Import API Korth Guardian
│   ├── importExcel.js               # 📊 Import dados de Excel (integrações)
│   ├── importExternoExcel.js        # 📋 Import Excel externo (usuário)
│   ├── importCubicMetros.js         # 🔄 Import M³ de Excel
│   ├── deleteExternos.js            # 🗑️ Delete registros externos por mês
│   ├── deleteAllRecords.js          # ⚠️ Delete completo (admin)
│   ├── exportData.js                # 📤 Export data (API externa)
│   ├── exportAnalise.js             # 📊 Export análise agregada
│   ├── salvarValoresCombustivel.js  # 💰 Atualizar custos por preço/litro
│   ├── analisarInconsistencias.js   # ⚠️ Detectar inconsistências KM
│   └── [+10 funções auxiliares]
│
├── entities/                        # Schemas de dados (JSON)
│   ├── FuelRecord.json              # Registros de abastecimento
│   ├── CubicMetros.json             # Dados de produção (M³)
│   ├── Motorista.json               # Motoristas (código + nome)
│   ├── Frentista.json               # Frentistas (código + nome)
│   ├── Combustivel.json             # Tipos combustível (código + nome)
│   ├── Ponto.json                   # Pontos/usinas (código + nome)
│   ├── PlacaEquipamento.json        # Placas/equipamentos
│   └── PrecoCombustivel.json        # Preços por período
│
├── lib/                             # Utilitários e context
│   ├── AuthContext.jsx              # Context: autenticação, carregamento
│   ├── NavigationTracker.jsx        # Rastreamento de navegação
│   ├── PageNotFound.jsx             # Página 404 customizada
│   ├── query-client.js              # TanStack Query config
│   ├── utils.js                     # Funções utilitárias
│   └── app-params.js                # Parâmetros globais
│
├── api/
│   └── base44Client.js              # SDK pre-inicializado do Base44
│
├── hooks/
│   └── use-mobile.jsx               # Hook para detectar mobile
│
└── utils/
    └── index.ts                     # Funções auxiliares TypeScript

```

---

## 🗄️ ENTITIES (Estrutura de Dados)

### 1️⃣ **FuelRecord** - Registro Principal de Abastecimento
```json
{
  "date": "2026-01-15",
  "time": "14:30",
  "vehicle_plate": "APS9D92",
  "vehicle_type": "CAMINHÃO BETONEIRA",
  "unit": "CONCRETAR USINA 1",
  "attendant": "JOÃO",
  "driver": "CARLOS SILVA",
  "fuel_type": "DIESEL",
  "liters": 150.5,
  "km_driven": 45000,
  "cost": 1257.50,
  "cubic_meters": 50,
  "korth_id": "KTH-2026-01-001"
}
```
**Campos Built-in**: id, created_date, updated_date, created_by

---

### 2️⃣ **CubicMetros** - Dados de Produção
```json
{
  "mes": "2026-01",
  "placa": "APS9D92",
  "equipamento": "BOMBA LANÇA",
  "metros_cubicos": 1500.5
}
```

---

### 3️⃣ **Motorista** - Cadastro Motoristas
```json
{
  "codigo": "MOT001",
  "nome": "CARLOS SILVA"
}
```

---

### 4️⃣ **Frentista** - Cadastro Frentistas
```json
{
  "codigo": "FRT001",
  "nome": "JOÃO SANTOS"
}
```

---

### 5️⃣ **Combustivel** - Tipos de Combustível
```json
{
  "codigo": "COMB001",
  "nome": "DIESEL"
}
```

---

### 6️⃣ **Ponto** - Usinas/Pontos de Abastecimento
```json
{
  "codigo": "PT001",
  "codigo2": "ALT001",
  "nome": "CONCRETAR USINA 1"
}
```

---

### 7️⃣ **PlacaEquipamento** - Mapeamento Placa → Tipo
```json
{
  "placa": "APS9D92",
  "tipo": "BOMBA LANÇA"
}
```

---

### 8️⃣ **PrecoCombustivel** - Histórico Preços
```json
{
  "mes": 0,
  "ano": 2026,
  "ponto": "PT001",
  "preco_litro": 8.35
}
```

---

## 📄 PÁGINAS (Componentes Raiz)

### 🏠 **Layout.jsx** - Wrapper Global
- Header sticky com logo + navegação
- Sidebar/nav com 7 abas principais
- Footer com copyright
- Usa design tokens (cores, fontes) de `index.css`
- Responsivo (mobile → desktop)

### 📊 **Graficos.jsx** - Dashboard Principal
**Funcionalidades:**
- 11 gráficos agregados (Recharts)
- Filtros: ano, mês, usina, equipamento, placa, motorista
- Gráficos: consumo mensal, por usina, por equipamento, KM/L, M³, custos
- KPIs: total litros, KM, custo, M³
- Export via `exportAnalise.js`

**Dados Agregados:**
```
analysisData = [
  {
    month, year, monthKey,
    plate, unit, equipment, driver,
    totalLiters, kmDelta, m3, cost,
    efficiency (KM/L)
  }
]
```

---

### 📈 **AnalisePorPlaca.jsx** - Eficiência por Veículo
**Funcionalidades:**
- Tabela: placa + mês + unit + motorista + eficiência
- Edição inline de unit/equipment para registros M³-only
- Sorting by column
- PDF export (jsPDF)
- Filtros: ano, mês, placa, usina, equipamento, motorista

---

### 📑 **Dados.jsx** - Auditoria de Registros
**Funcionalidades:**
- Tabela completa de FuelRecords com 12 colunas
- Detecção de inconsistências KM (via `analisarInconsistencias.js`)
- Edição inline: timestamp, placa, motorista
- Tooltip com warnings de inconsistências
- Delete registros
- Filtros avançados

---

### 📤 **Upload.jsx** - Importação de Dados
**3 seções:**
1. **Korth Guardian Import**
   - Busca API Korth (com datas)
   - Chama `importKorth.js`

2. **Excel Externo**
   - Upload arquivo Excel (.xlsx)
   - Chama `importExternoExcel.js`
   - Colunas: DATA | HORA | PLACA | USINA | EQUIPAMENTOS | FRENTISTA | MOTORISTA | COMBUSTIVEL | LITROS | Hodômetro | Valor total

3. **Delete Externos**
   - Remove registros sem `korth_id` de um mês
   - Chama `deleteExternos.js`

---

### 📦 **MetrosCubicos.jsx** - Gestão M³
**Funcionalidades:**
- Upload Excel: MÊS | PLACA | EQUIPAMENTO | M³
- Tabela com sorting
- Delete por mês
- Chama `importCubicMetros.js`

---

### 🏷️ **Legendas.jsx** - Metadados
**Gerencia:**
- Motoristas (código + nome)
- Frentistas (código + nome)
- Combustíveis (código + nome)
- Pontos/Usinas (código + nome + código alt)
- Placa/Equipamento (mapeamento com bulk import)

**Funcionalidades:**
- CRUD completo
- Bulk import (tab-separated)
- Busca em banco (base44 SDK)

---

### 🏆 **RankingMotoristas.jsx** - Leaderboard KM/L
**Funcionalidades:**
- Ranking motoristas por KM/L
- Medalhas (🥇🥈🥉)
- Barras de progresso
- Métricas: total KM, litros, custo, R$/km
- Filtros: ano, mês, usina, equipamento, placa

---

## ⚙️ BACKEND FUNCTIONS (Deno)

### 📥 **importKorth.js**
```
POST /api/functions/importKorth
Body: { dataIni?: string, dataFim?: string }
Response: { success, recordsInserted, records[] }
```
- Busca API Korth Guardian
- Filtra por datas
- Normaliza dados (datas, valores)
- Cria FuelRecords com `korth_id`

---

### 📊 **importExcel.js**
```
POST /api/functions/importExcel
Body: { file_url: string }
Response: { success, recordsInserted, failed[] }
```
- Parse XLSX (exceljs)
- Mapeamento dinâmico de colunas
- Normaliza dados
- Bulk insert

---

### 📋 **importExternoExcel.js**
```
POST /api/functions/importExternoExcel
Body: { file_url: string }
Response: { success, recordsInserted, stats }
```
- Parse Excel externo
- SEM `korth_id` (marca como externo)
- Validação de colunas
- Tratamento de erros por linha

---

### 🔄 **importCubicMetros.js**
```
POST /api/functions/importCubicMetros
Body: { file_url: string }
Response: { success, recordsInserted }
```
- Parse Excel: MÊS | PLACA | EQUIPAMENTO | M³
- Cria CubicMetros records

---

### 🗑️ **deleteExternos.js**
```
POST /api/functions/deleteExternos
Body: { month: string, year: string }
Response: { success, deletedCount }
```
- Filtra: data.match(month/year) && !korth_id
- Delete batch com rate limiting (350ms)
- Try/catch para registros já deletados

---

### 💰 **salvarValoresCombustivel.js**
```
POST /api/functions/salvarValoresCombustivel
Body: { 
  preco_litro: number,
  month: number,
  year: number,
  unit: string,
  page?: number
}
Response: { success, updated, total, hasMore }
```
- Update cost = liters × preco_litro
- Filtra por period + unit
- Paginado

---

### 📤 **exportAnalise.js**
```
POST /api/functions/exportAnalise
Body: { 
  filters?: { month, year, plate, unit, equipment }
}
Response: JSON array com análise agregada
```
- Agregação: placa + mês
- Cálculos: eficiência, custo/km
- Filtragem opcional

---

### ⚠️ **analisarInconsistencias.js**
```
POST /api/functions/analisarInconsistencias
Body: { }
Response: { inconsistencies[] }
```
- Detecta KM descrescente por placa
- Duplicatas
- Registros faltando
- Retorna warnings estruturados

---

## 🎨 DESIGN SYSTEM

### **index.css** - Tokens Globais
```css
:root {
  --background: 0 0% 100%;           /* Branco */
  --foreground: 0 0% 3.9%;            /* Preto */
  --primary: 0 0% 9%;                 /* Escuro */
  --secondary: 0 0% 96.1%;            /* Cinza claro */
  --accent: 0 0% 96.1%;               /* Cinza muito claro */
  --destructive: 0 84.2% 60.2%;       /* Vermelho */
  --radius: 0.5rem;                   /* Border radius */
  
  /* Chart colors */
  --chart-1: 12 76% 61%;              /* Amarelo (#FCD34D) */
  --chart-2: 173 58% 39%;
  --chart-3: 197 37% 24%;
  --chart-4: 43 74% 66%;
  --chart-5: 27 87% 67%;
}

@tailwind base;
@tailwind components;
@tailwind utilities;
```

### **tailwind.config.js** - Configuração Tailwind
- Colors: background, card, primary, secondary, muted, accent, destructive
- Border radius: lg, md, sm
- Animations: accordion-down, accordion-up
- Chart colors

### **Cores Principais**
- Background: `bg-slate-50` (light mode)
- Cards: `bg-white` com `shadow-lg`
- Header: `bg-white/90 backdrop-blur-lg`
- Text: `text-slate-800` (normal), `text-slate-600` (secondary), `text-slate-500` (muted)
- Primary Action: `bg-[#FDB913]` (amarelo) com hover `hover:bg-amber-400`
- Icons: `text-[#FDB913]` para destaque

---

## 🔐 AUTENTICAÇÃO & AUTORIZAÇÃO

### **AuthContext.jsx**
```javascript
- isAuthenticated(): boolean
- isLoadingAuth: boolean
- authError: { type, message }
- navigateToLogin()
- logout()
```

### **User Entity (Built-in)**
- id
- email
- full_name
- role: "admin" | "user"
- created_date

---

## 📦 DEPENDENCIES

### Frontend
```json
{
  "react": "^18.2.0",
  "react-router-dom": "^6.26.0",
  "@tanstack/react-query": "^5.84.1",
  "recharts": "^2.15.4",
  "tailwindcss": "latest",
  "framer-motion": "^11.16.4",
  "lucide-react": "^0.475.0",
  "date-fns": "^3.6.0",
  "jspdf": "^2.5.2",
  "exceljs": "^4.4.0",
  "@base44/sdk": "^0.8.26"
}
```

### Backend
- Deno (runtime)
- `npm:@base44/sdk@0.8.25`
- `npm:exceljs@4.4.0`
- `npm:xlsx`

---

## 🚀 FLUXOS PRINCIPAIS

### 1️⃣ **Import de Dados Korth**
```
Upload.jsx → importKorth() → 
  API Korth Guardian → 
  normaliza → 
  FuelRecord.bulkCreate()
```

### 2️⃣ **Import de Dados Externo**
```
Upload.jsx → importExternoExcel() → 
  Parse XLSX → 
  normaliza → 
  FuelRecord.bulkCreate(sem korth_id)
```

### 3️⃣ **Análise & Visualização**
```
Graficos.jsx → 
  FuelRecord.list() + 
  CubicMetros.list() + 
  Motorista.list() + 
  Ponto.list() →
  aggregateByPlateMonth() →
  calculateEfficiency() →
  renderCharts()
```

### 4️⃣ **Edição de Registros**
```
Dados.jsx → [edit inline] → 
  FuelRecord.update(id, data) →
  refresh table
```

### 5️⃣ **Cálculo de Custos**
```
ValorCalculado.jsx → 
  salvarValoresCombustivel() →
  batch update costs by price/liter
```

---

## 📊 CÁLCULOS PRINCIPAIS

### **Eficiência (KM/L)**
```javascript
efficiency = kmDelta / totalLiters
```
- `kmDelta`: hodômetro_max - hodômetro_min por placa/mês
- Agrupado por mês + placa

### **Custo por KM**
```javascript
costPerKm = totalCost / kmDelta
```

### **Custo por M³**
```javascript
costPerM3 = totalCost / totalM3
```

### **Litros por M³**
```javascript
litersPerM3 = totalLiters / totalM3
```

---

## 🔄 SECRETS (Environment Variables)

```env
KORTH_LOGIN=user@korth.com          # Login API Korth
KORTH_SENHA=senha123                # Senha API Korth
EXPORT_API_KEY=chave-export-123     # API key para export externo
levijanuario@gmail.com=email-user   # Email do usuário
```

---

## 📱 RESPONSIVIDADE

- **Mobile**: grid-cols-1, collapses nav
- **Tablet**: grid-cols-2 md:grid-cols-4
- **Desktop**: grid-cols-4 lg:grid-cols-6, nav horizontal

---

## ✅ CHECKLIST COMPLETO

- ✅ 7 Páginas funcionais
- ✅ 8 Entities com schemas
- ✅ 15+ Backend functions
- ✅ 40+ shadcn/ui components
- ✅ Gráficos com Recharts (11 tipos)
- ✅ Tabelas com sorting + edição inline
- ✅ Filtros avançados
- ✅ PDF export
- ✅ Excel import/export
- ✅ Integração Korth Guardian
- ✅ Detecção de inconsistências
- ✅ Design system completo
- ✅ Dark → Light mode refactoring
- ✅ Autenticação + autorização
- ✅ TanStack Query (cache + sync)
- ✅ Mobile responsive

---

## 🎯 PRÓXIMOS PASSOS (Sugestões)

1. **Dashboard**: KPI cards com sparklines
2. **Alertas**: Notificações de anomalias
3. **Relatórios**: Exportar em PDF/Excel customizado
4. **Mobile App**: React Native com mesma lógica
5. **Webhooks**: Integração com ERP

---

**Versão**: 1.0 | **Data**: 2026-04-14 | **Timezone**: America/Sao_Paulo