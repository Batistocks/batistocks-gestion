import React, { useState, useEffect, useRef, useMemo } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import {
  LayoutDashboard, Package, ShoppingCart, Truck, Users, Wallet,
  FileText, UserCog, Plus, Minus, Trash2, X, Search, AlertTriangle,
  TrendingUp, Printer, Share2, Menu, Banknote, ChevronRight, Check
} from "lucide-react";

/* ============ Design tokens ============ */
const C = {
  ink: "#1C1B18",
  inkSoft: "#2A2822",
  bg: "#F1EDE4",
  card: "#FBF9F5",
  line: "#DAD4C4",
  orange: "#E4571E",
  orangeDark: "#C4441A",
  steel: "#33505E",
  yellow: "#E8B41A",
  green: "#2F7D4F",
  red: "#B23A2E",
  textSoft: "#6B6759",
};

const CATEGORIES = [
  "Outillage à main", "Électroportatif", "Plomberie", "Électricité",
  "Peinture & finition", "Fixations & quincaillerie",
  "Matériaux de construction", "Sécurité (EPI)", "Jardin & extérieur", "Autre"
];

/* ============ Helpers ============ */
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const fmt = (n) => Math.round(n || 0).toLocaleString("fr-FR").replace(/,/g, " ");
const todayISO = () => new Date().toISOString();
const isSameDay = (a, b) => a.toDateString() === b.toDateString();
const startOfWeek = (d) => { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(0,0,0,0); return x; };
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);

function defaultData() {
  const products = [
    { id: uid(), sku: "MC-001", name: "Ciment CPJ 35 (sac 50kg)", cat: "Matériaux de construction", unit: "sac", costPrice: 4400, sellPrice: 5200, qty: 60, alert: 15 },
    { id: uid(), sku: "PL-001", name: "Tube PVC Ø110 (2m)", cat: "Plomberie", unit: "barre", costPrice: 2500, sellPrice: 3200, qty: 40, alert: 10 },
    { id: uid(), sku: "PE-001", name: "Peinture acrylique blanche 20L", cat: "Peinture & finition", unit: "bidon", costPrice: 26000, sellPrice: 32000, qty: 8, alert: 5 },
    { id: uid(), sku: "FX-001", name: "Vis à bois 4x40 (boîte 200)", cat: "Fixations & quincaillerie", unit: "boîte", costPrice: 2000, sellPrice: 2800, qty: 25, alert: 10 },
    { id: uid(), sku: "OM-001", name: "Marteau menuisier 500g", cat: "Outillage à main", unit: "pièce", costPrice: 2600, sellPrice: 3500, qty: 4, alert: 5 },
  ];
  const employees = [
    { id: uid(), name: "Propriétaire", role: "Gérant" },
    { id: uid(), name: "Vendeur 1", role: "Vendeur" },
  ];
  return {
    products, employees,
    sales: [], purchases: [], customers: [], suppliers: [],
    stockMoves: [], expenses: [],
    sessionEmployeeId: employees[0].id,
  };
}

/* ============ Store partagé en temps réel (Firebase) ============ */
const DOC_ID = "data"; // un seul document partagé par toute la boutique
const COLLECTION = "batistocks";

function useStore() {
  const [data, setDataState] = useState(null);
  const latestRef = useRef(null);
  const writeTimer = useRef(null);

  useEffect(() => {
    const ref = doc(db, COLLECTION, DOC_ID);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists() && snap.data().payload) {
          const parsed = JSON.parse(snap.data().payload);
          latestRef.current = parsed;
          setDataState(parsed);
        } else {
          // Premier lancement : personne n'a encore écrit de données
          const seed = defaultData();
          latestRef.current = seed;
          setDoc(ref, { payload: JSON.stringify(seed) }).catch(() => {});
          setDataState(seed);
        }
      },
      () => {
        // En cas d'erreur réseau, on démarre quand même avec des données par défaut
        if (!latestRef.current) {
          const seed = defaultData();
          latestRef.current = seed;
          setDataState(seed);
        }
      }
    );
    return () => unsub();
  }, []);

  // Même signature que useState : setData(valeur) ou setData(prev => nouvelleValeur)
  const setData = (updater) => {
    setDataState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      latestRef.current = next;
      if (writeTimer.current) clearTimeout(writeTimer.current);
      writeTimer.current = setTimeout(() => {
        const ref = doc(db, COLLECTION, DOC_ID);
        setDoc(ref, { payload: JSON.stringify(latestRef.current) }).catch(() => {});
      }, 400);
      return next;
    });
  };

  return [data, setData];
}

/* ============ Small UI atoms ============ */
function StatCard({ label, value, sub, tone = "ink", icon: Icon }) {
  const bg = tone === "orange" ? C.orange : tone === "green" ? C.green : C.ink;
  return (
    <div className="rounded-md p-4 flex-1 min-w-[150px]" style={{ background: bg, color: "#fff" }}>
      <div className="flex items-center justify-between opacity-80 mb-2">
        <span className="text-xs uppercase tracking-wide font-mono">{label}</span>
        {Icon && <Icon size={16} />}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs opacity-70 mt-1">{sub}</div>}
    </div>
  );
}

function Modal({ title, onClose, children, width = "480px" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }}>
      <div className="rounded-md w-full max-h-[88vh] overflow-y-auto" style={{ background: C.card, maxWidth: width }}>
        <div className="flex items-center justify-between px-5 py-4 sticky top-0" style={{ background: C.ink, color: "#fff" }}>
          <h3 className="font-bold text-sm uppercase tracking-wide">{title}</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-xs font-mono uppercase tracking-wide mb-1" style={{ color: C.textSoft }}>{label}</span>
      {children}
    </label>
  );
}

const inputCls = "w-full border-2 rounded px-3 py-2 text-sm";
const inputStyle = { borderColor: C.line, background: "#fff" };

function Btn({ children, onClick, tone = "ink", full, icon: Icon, type = "button", disabled }) {
  const bg = tone === "orange" ? C.orange : tone === "green" ? C.green : tone === "ghost" ? "transparent" : C.ink;
  const color = tone === "ghost" ? C.ink : "#fff";
  const border = tone === "ghost" ? `2px solid ${C.ink}` : "none";
  return (
    <button type={type} disabled={disabled} onClick={onClick}
      className={`px-4 py-2 rounded text-sm font-bold flex items-center justify-center gap-2 ${full ? "w-full" : ""}`}
      style={{ background: bg, color, border, opacity: disabled ? 0.5 : 1 }}>
      {Icon && <Icon size={15} />}{children}
    </button>
  );
}

/* ============ App ============ */
export default function App() {
  const [data, setData] = useStore();
  const [tab, setTab] = useState("dashboard");
  const [navOpen, setNavOpen] = useState(false);

  if (data === null) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
      <span className="font-mono text-sm" style={{ color: C.textSoft }}>Chargement de BâtiStocks Gestion…</span>
    </div>;
  }

  const employee = data.employees.find(e => e.id === data.sessionEmployeeId) || data.employees[0];
  const isGerant = employee?.role === "Gérant";

  const TABS = [
    { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard, roles: ["Gérant", "Vendeur"] },
    { id: "ventes", label: "Ventes", icon: ShoppingCart, roles: ["Gérant", "Vendeur"] },
    { id: "stock", label: "Stock", icon: Package, roles: ["Gérant", "Vendeur"] },
    { id: "achats", label: "Achats", icon: Truck, roles: ["Gérant"] },
    { id: "clients", label: "Clients à crédit", icon: Users, roles: ["Gérant", "Vendeur"] },
    { id: "fournisseurs", label: "Fournisseurs", icon: Wallet, roles: ["Gérant"] },
    { id: "rapports", label: "Rapports", icon: FileText, roles: ["Gérant"] },
    { id: "employes", label: "Employés", icon: UserCog, roles: ["Gérant"] },
  ];
  const visibleTabs = TABS.filter(t => t.roles.includes(employee?.role));
  const activeTab = visibleTabs.some(t => t.id === tab) ? tab : "dashboard";

  /* ---------- mutation helpers ---------- */
  const patch = (fn) => setData(prev => ({ ...prev, ...fn(prev) }));

  const addProduct = (p) => patch(d => ({ products: [...d.products, { id: uid(), ...p }] }));
  const updateProduct = (id, changes) => patch(d => ({ products: d.products.map(p => p.id === id ? { ...p, ...changes } : p) }));
  const recordStockMove = (productId, delta, type, reason) => patch(d => ({
    products: d.products.map(p => p.id === productId ? { ...p, qty: Math.max(0, p.qty + delta) } : p),
    stockMoves: [{ id: uid(), date: todayISO(), productId, delta, type, reason }, ...d.stockMoves],
  }));

  const addCustomer = (c) => { const id = uid(); patch(d => ({ customers: [...d.customers, { id, balance: 0, history: [], ...c }] })); return id; };
  const addSupplier = (s) => { const id = uid(); patch(d => ({ suppliers: [...d.suppliers, { id, balance: 0, history: [], ...s }] })); return id; };

  const recordCustomerPayment = (customerId, amount) => patch(d => ({
    customers: d.customers.map(c => c.id === customerId ? {
      ...c, balance: Math.max(0, c.balance - amount),
      history: [{ id: uid(), date: todayISO(), type: "Remboursement", amount, balanceAfter: Math.max(0, c.balance - amount) }, ...c.history]
    } : c)
  }));

  const recordSupplierPayment = (supplierId, amount) => patch(d => ({
    suppliers: d.suppliers.map(s => s.id === supplierId ? {
      ...s, balance: Math.max(0, s.balance - amount),
      history: [{ id: uid(), date: todayISO(), type: "Paiement", amount, balanceAfter: Math.max(0, s.balance - amount) }, ...s.history]
    } : s)
  }));

  const addEmployee = (e) => patch(d => ({ employees: [...d.employees, { id: uid(), ...e }] }));
  const removeEmployee = (id) => patch(d => ({ employees: d.employees.filter(e => e.id !== id) }));
  const setSession = (id) => patch(() => ({ sessionEmployeeId: id }));

  const addExpense = (label, amount) => patch(d => ({ expenses: [{ id: uid(), date: todayISO(), label, amount }, ...d.expenses] }));

  function recordSale({ items, paymentMethod, customerId, amountPaid }) {
    const total = items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
    const cost = items.reduce((s, it) => s + it.qty * it.unitCost, 0);
    const sale = {
      id: uid(), date: todayISO(), items, total, cost, profit: total - cost,
      paymentMethod, customerId: customerId || null, amountPaid, employeeName: employee?.name || "—",
    };
    patch(d => {
      const products = d.products.map(p => {
        const line = items.find(it => it.productId === p.id);
        return line ? { ...p, qty: Math.max(0, p.qty - line.qty) } : p;
      });
      let customers = d.customers;
      if (paymentMethod === "Crédit" && customerId) {
        const owed = total - amountPaid;
        customers = d.customers.map(c => c.id === customerId ? {
          ...c, balance: c.balance + owed,
          history: [{ id: uid(), date: todayISO(), type: "Achat à crédit", amount: owed, balanceAfter: c.balance + owed }, ...c.history]
        } : c);
      }
      return { products, customers, sales: [sale, ...d.sales] };
    });
    return sale;
  }

  function recordPurchase({ supplierId, supplierName, items, amountPaid }) {
    const total = items.reduce((s, it) => s + it.qty * it.unitCost, 0);
    const balance = Math.max(0, total - amountPaid);
    const purchase = { id: uid(), date: todayISO(), supplierId: supplierId || null, supplierName, items, total, amountPaid, balance, employeeName: employee?.name || "—" };
    patch(d => {
      const products = d.products.map(p => {
        const line = items.find(it => it.productId === p.id);
        return line ? { ...p, qty: p.qty + line.qty, costPrice: line.unitCost } : p;
      });
      let suppliers = d.suppliers;
      if (supplierId && balance > 0) {
        suppliers = d.suppliers.map(s => s.id === supplierId ? {
          ...s, balance: s.balance + balance,
          history: [{ id: uid(), date: todayISO(), type: "Achat", amount: balance, balanceAfter: s.balance + balance }, ...s.history]
        } : s);
      }
      return { products, suppliers, purchases: [purchase, ...d.purchases] };
    });
    return purchase;
  }

  const actions = {
    addProduct, updateProduct, recordStockMove, addCustomer, addSupplier,
    recordCustomerPayment, recordSupplierPayment, addEmployee, removeEmployee,
    setSession, addExpense, recordSale, recordPurchase,
  };

  return (
    <div className="min-h-screen flex" style={{ background: C.bg, color: C.ink, fontFamily: "'Work Sans', ui-sans-serif, sans-serif" }}>
      {/* Sidebar */}
      <aside className={`fixed md:static z-40 top-0 left-0 h-full w-64 flex-shrink-0 flex flex-col transition-transform ${navOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
        style={{ background: C.ink, color: "#fff" }}>
        <div className="px-5 py-5 flex items-center gap-3 border-b" style={{ borderColor: "#3a382f" }}>
          <div className="w-9 h-9 rounded flex items-center justify-center font-black" style={{ background: C.orange, transform: "rotate(-6deg)" }}>B</div>
          <div>
            <div className="font-black uppercase text-sm tracking-wide">BâtiStocks</div>
            <div className="font-mono text-[10px] tracking-widest" style={{ color: C.yellow }}>GESTION INTERNE</div>
          </div>
        </div>
        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          {visibleTabs.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setNavOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium"
              style={{ background: activeTab === t.id ? C.orange : "transparent", color: "#fff" }}>
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t" style={{ borderColor: "#3a382f" }}>
          <div className="text-[10px] font-mono uppercase tracking-widest mb-1 opacity-60">Connecté en tant que</div>
          <select value={employee?.id} onChange={e => setSession(e.target.value)}
            className="w-full text-sm rounded px-2 py-2 font-medium" style={{ background: "#2A2822", color: "#fff" }}>
            {data.employees.map(e => <option key={e.id} value={e.id}>{e.name} — {e.role}</option>)}
          </select>
        </div>
      </aside>
      {navOpen && <div className="fixed inset-0 z-30 md:hidden" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setNavOpen(false)} />}

      {/* Main */}
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between px-5 py-3" style={{ background: C.card, borderBottom: `2px solid ${C.line}` }}>
          <button className="md:hidden" onClick={() => setNavOpen(true)}><Menu size={22} /></button>
          <h2 className="font-black uppercase text-sm tracking-wide">{TABS.find(t => t.id === activeTab)?.label}</h2>
          <span className="font-mono text-xs" style={{ color: C.textSoft }}>{new Date().toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" })}</span>
        </header>
        <main className="p-5 max-w-6xl mx-auto">
          {activeTab === "dashboard" && <Dashboard data={data} actions={actions} />}
          {activeTab === "ventes" && <Ventes data={data} actions={actions} />}
          {activeTab === "stock" && <Stock data={data} actions={actions} isGerant={isGerant} />}
          {activeTab === "achats" && <Achats data={data} actions={actions} />}
          {activeTab === "clients" && <Clients data={data} actions={actions} />}
          {activeTab === "fournisseurs" && <Fournisseurs data={data} actions={actions} />}
          {activeTab === "rapports" && <Rapports data={data} actions={actions} />}
          {activeTab === "employes" && <Employes data={data} actions={actions} />}
        </main>
      </div>
    </div>
  );
}

/* ============ Dashboard ============ */
function Dashboard({ data, actions }) {
  const now = new Date();
  const wkStart = startOfWeek(now);
  const moStart = startOfMonth(now);

  const salesToday = data.sales.filter(s => isSameDay(new Date(s.date), now));
  const salesWeek = data.sales.filter(s => new Date(s.date) >= wkStart);
  const salesMonth = data.sales.filter(s => new Date(s.date) >= moStart);
  const expensesToday = data.expenses.filter(e => isSameDay(new Date(e.date), now)).reduce((s, e) => s + e.amount, 0);

  const sum = (arr, k) => arr.reduce((s, x) => s + x[k], 0);
  const lowStock = data.products.filter(p => p.qty <= p.alert);

  const topMap = {};
  salesWeek.forEach(s => s.items.forEach(it => { topMap[it.name] = (topMap[it.name] || 0) + it.qty; }));
  const top = Object.entries(topMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const [expLabel, setExpLabel] = useState("");
  const [expAmount, setExpAmount] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <StatCard label="CA aujourd'hui" value={`${fmt(sum(salesToday, "total"))} F`} sub={`${salesToday.length} vente(s)`} tone="orange" icon={TrendingUp} />
        <StatCard label="CA cette semaine" value={`${fmt(sum(salesWeek, "total"))} F`} tone="ink" />
        <StatCard label="CA ce mois" value={`${fmt(sum(salesMonth, "total"))} F`} tone="ink" />
        <StatCard label="Bénéfice du jour" value={`${fmt(sum(salesToday, "profit") - expensesToday)} F`} sub="ventes − dépenses" tone="green" icon={Banknote} />
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="rounded-md p-4" style={{ background: C.card, border: `1px solid ${C.line}` }}>
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: C.red }}><AlertTriangle size={16} /> Alertes de stock ({lowStock.length})</h3>
          {lowStock.length === 0 && <p className="text-sm" style={{ color: C.textSoft }}>Aucun article en dessous du seuil d'alerte.</p>}
          <div className="space-y-2">
            {lowStock.map(p => (
              <div key={p.id} className="flex justify-between text-sm border-b pb-1" style={{ borderColor: C.line }}>
                <span>{p.name}</span>
                <span className="font-mono font-bold" style={{ color: C.red }}>{p.qty} {p.unit}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md p-4" style={{ background: C.card, border: `1px solid ${C.line}` }}>
          <h3 className="font-bold text-sm mb-3">Meilleures ventes (7 derniers jours)</h3>
          {top.length === 0 && <p className="text-sm" style={{ color: C.textSoft }}>Pas encore de ventes cette semaine.</p>}
          <div className="space-y-2">
            {top.map(([name, qty], i) => (
              <div key={name} className="flex justify-between text-sm border-b pb-1" style={{ borderColor: C.line }}>
                <span>{i + 1}. {name}</span>
                <span className="font-mono font-bold">{qty} vendu(s)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-md p-4" style={{ background: C.card, border: `1px solid ${C.line}` }}>
        <h3 className="font-bold text-sm mb-3">Ajouter une dépense du jour</h3>
        <div className="flex flex-wrap gap-2 items-end">
          <input placeholder="Ex : transport, carburant…" value={expLabel} onChange={e => setExpLabel(e.target.value)} className={inputCls} style={{ ...inputStyle, maxWidth: 260 }} />
          <input type="number" placeholder="Montant" value={expAmount} onChange={e => setExpAmount(e.target.value)} className={inputCls} style={{ ...inputStyle, maxWidth: 140 }} />
          <Btn tone="orange" icon={Plus} onClick={() => { if (!expLabel || !expAmount) return; actions.addExpense(expLabel, Number(expAmount)); setExpLabel(""); setExpAmount(""); }}>Ajouter</Btn>
        </div>
        <p className="text-xs mt-2 font-mono" style={{ color: C.textSoft }}>Dépenses aujourd'hui : {fmt(expensesToday)} FCFA</p>
      </div>
    </div>
  );
}

/* ============ Stock ============ */
function Stock({ data, actions }) {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null); // product or "new"
  const [moveFor, setMoveFor] = useState(null);

  const list = data.products.filter(p => (p.name + p.sku + p.cat).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.textSoft }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un article…" className={inputCls} style={{ ...inputStyle, paddingLeft: 34 }} />
        </div>
        <Btn tone="orange" icon={Plus} onClick={() => setEditing("new")}>Nouvel article</Btn>
      </div>

      <div className="overflow-x-auto rounded-md" style={{ border: `1px solid ${C.line}` }}>
        <table className="w-full text-sm" style={{ background: C.card }}>
          <thead style={{ background: C.ink, color: "#fff" }}>
            <tr>
              {["Réf", "Article", "Catégorie", "Qté", "Achat", "Vente", "", ""].map(h => <th key={h} className="text-left px-3 py-2 font-mono text-xs">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {list.map(p => (
              <tr key={p.id} className="border-t" style={{ borderColor: C.line }}>
                <td className="px-3 py-2 font-mono text-xs" style={{ color: C.textSoft }}>{p.sku}</td>
                <td className="px-3 py-2 font-medium">{p.name}</td>
                <td className="px-3 py-2 text-xs" style={{ color: C.steel }}>{p.cat}</td>
                <td className="px-3 py-2 font-mono font-bold" style={{ color: p.qty <= p.alert ? C.red : C.ink }}>{p.qty} {p.unit}</td>
                <td className="px-3 py-2 font-mono">{fmt(p.costPrice)}</td>
                <td className="px-3 py-2 font-mono">{fmt(p.sellPrice)}</td>
                <td className="px-3 py-2"><button onClick={() => setMoveFor(p)} className="text-xs font-bold underline" style={{ color: C.steel }}>Mouvement</button></td>
                <td className="px-3 py-2"><button onClick={() => setEditing(p)} className="text-xs font-bold underline" style={{ color: C.orangeDark }}>Modifier</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && <ProductModal product={editing === "new" ? null : editing} onClose={() => setEditing(null)}
        onSave={(vals) => { editing === "new" ? actions.addProduct(vals) : actions.updateProduct(editing.id, vals); setEditing(null); }} />}

      {moveFor && <StockMoveModal product={moveFor} onClose={() => setMoveFor(null)}
        onSave={(delta, type, reason) => { actions.recordStockMove(moveFor.id, delta, type, reason); setMoveFor(null); }} />}
    </div>
  );
}

function ProductModal({ product, onClose, onSave }) {
  const [v, setV] = useState(product || { sku: "", name: "", cat: CATEGORIES[0], unit: "pièce", costPrice: 0, sellPrice: 0, qty: 0, alert: 5 });
  return (
    <Modal title={product ? "Modifier l'article" : "Nouvel article"} onClose={onClose}>
      <Field label="Référence (SKU)"><input className={inputCls} style={inputStyle} value={v.sku} onChange={e => setV({ ...v, sku: e.target.value })} /></Field>
      <Field label="Nom de l'article"><input className={inputCls} style={inputStyle} value={v.name} onChange={e => setV({ ...v, name: e.target.value })} /></Field>
      <Field label="Catégorie">
        <select className={inputCls} style={inputStyle} value={v.cat} onChange={e => setV({ ...v, cat: e.target.value })}>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Unité"><input className={inputCls} style={inputStyle} value={v.unit} onChange={e => setV({ ...v, unit: e.target.value })} /></Field>
        <Field label="Quantité en stock"><input type="number" className={inputCls} style={inputStyle} value={v.qty} onChange={e => setV({ ...v, qty: Number(e.target.value) })} /></Field>
        <Field label="Prix d'achat"><input type="number" className={inputCls} style={inputStyle} value={v.costPrice} onChange={e => setV({ ...v, costPrice: Number(e.target.value) })} /></Field>
        <Field label="Prix de vente"><input type="number" className={inputCls} style={inputStyle} value={v.sellPrice} onChange={e => setV({ ...v, sellPrice: Number(e.target.value) })} /></Field>
        <Field label="Seuil d'alerte"><input type="number" className={inputCls} style={inputStyle} value={v.alert} onChange={e => setV({ ...v, alert: Number(e.target.value) })} /></Field>
      </div>
      <Btn tone="orange" full icon={Check} onClick={() => onSave(v)}>Enregistrer</Btn>
    </Modal>
  );
}

function StockMoveModal({ product, onClose, onSave }) {
  const [type, setType] = useState("Entrée");
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState("");
  return (
    <Modal title={`Mouvement de stock — ${product.name}`} onClose={onClose}>
      <p className="text-sm mb-3" style={{ color: C.textSoft }}>Stock actuel : <b>{product.qty} {product.unit}</b></p>
      <Field label="Type de mouvement">
        <div className="flex gap-2">
          <Btn tone={type === "Entrée" ? "green" : "ghost"} onClick={() => setType("Entrée")}>Entrée</Btn>
          <Btn tone={type === "Sortie" ? "orange" : "ghost"} onClick={() => setType("Sortie")}>Sortie</Btn>
        </div>
      </Field>
      <Field label="Quantité"><input type="number" min="1" className={inputCls} style={inputStyle} value={qty} onChange={e => setQty(Number(e.target.value))} /></Field>
      <Field label="Motif (casse, inventaire, réception...)"><input className={inputCls} style={inputStyle} value={reason} onChange={e => setReason(e.target.value)} /></Field>
      <Btn tone="orange" full icon={Check} onClick={() => onSave(type === "Entrée" ? qty : -qty, type, reason)}>Valider le mouvement</Btn>
    </Modal>
  );
}

/* ============ Ventes (POS) ============ */
function Ventes({ data, actions }) {
  const [q, setQ] = useState("");
  const [cart, setCart] = useState({}); // productId: qty
  const [paymentMethod, setPaymentMethod] = useState("Comptant");
  const [customerId, setCustomerId] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [receipt, setReceipt] = useState(null);

  const list = data.products.filter(p => p.qty > 0 && (p.name + p.sku).toLowerCase().includes(q.toLowerCase()));
  const items = Object.entries(cart).map(([id, qty]) => {
    const p = data.products.find(pp => pp.id === id);
    return p ? { productId: id, name: p.name, unit: p.unit, qty, unitPrice: p.sellPrice, unitCost: p.costPrice, maxQty: p.qty } : null;
  }).filter(Boolean);
  const total = items.reduce((s, it) => s + it.qty * it.unitPrice, 0);

  const setQty = (id, delta) => setCart(prev => {
    const p = data.products.find(pp => pp.id === id);
    const next = Math.max(0, Math.min(p.qty, (prev[id] || 0) + delta));
    const copy = { ...prev };
    if (next === 0) delete copy[id]; else copy[id] = next;
    return copy;
  });

  function validerVente() {
    if (items.length === 0) return;
    let custId = customerId;
    if (paymentMethod === "Crédit" && !custId && newCustomerName) {
      custId = actions.addCustomer({ name: newCustomerName, phone: newCustomerPhone });
    }
    const paid = paymentMethod === "Crédit" ? Number(amountPaid || 0) : total;
    const sale = actions.recordSale({ items, paymentMethod, customerId: paymentMethod === "Crédit" ? custId : null, amountPaid: paid });
    setReceipt(sale);
    setCart({}); setAmountPaid(""); setCustomerId(""); setNewCustomerName(""); setNewCustomerPhone("");
  }

  return (
    <div className="grid lg:grid-cols-[1.3fr_1fr] gap-5">
      <div>
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.textSoft }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un article à vendre…" className={inputCls} style={{ ...inputStyle, paddingLeft: 34 }} />
        </div>
        <div className="grid sm:grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto pr-1">
          {list.map(p => (
            <button key={p.id} onClick={() => setQty(p.id, 1)} className="text-left rounded p-3 border-2 hover:border-orange-500" style={{ borderColor: C.line, background: C.card }}>
              <div className="font-medium text-sm">{p.name}</div>
              <div className="flex justify-between mt-1">
                <span className="font-mono text-xs" style={{ color: C.textSoft }}>{p.qty} {p.unit} dispo</span>
                <span className="font-mono font-bold text-sm">{fmt(p.sellPrice)} F</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-md p-4 h-fit" style={{ background: C.card, border: `1px solid ${C.line}` }}>
        <h3 className="font-bold text-sm mb-3">Panier de vente</h3>
        {items.length === 0 && <p className="text-sm" style={{ color: C.textSoft }}>Aucun article sélectionné.</p>}
        <div className="space-y-2 mb-3">
          {items.map(it => (
            <div key={it.productId} className="flex items-center justify-between text-sm">
              <span className="flex-1">{it.name}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setQty(it.productId, -1)} className="w-6 h-6 rounded border-2 font-bold" style={{ borderColor: C.ink }}><Minus size={12} className="mx-auto" /></button>
                <span className="font-mono w-5 text-center">{it.qty}</span>
                <button onClick={() => setQty(it.productId, 1)} className="w-6 h-6 rounded border-2 font-bold" style={{ borderColor: C.ink }}><Plus size={12} className="mx-auto" /></button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-3 mb-3 font-mono font-bold flex justify-between text-lg" style={{ borderColor: C.line }}>
          <span>Total</span><span>{fmt(total)} F</span>
        </div>

        <Field label="Mode de paiement">
          <div className="grid grid-cols-3 gap-2">
            {["Comptant", "Mobile Money", "Crédit"].map(m => (
              <button key={m} onClick={() => setPaymentMethod(m)} className="text-xs font-bold py-2 rounded border-2"
                style={{ borderColor: paymentMethod === m ? C.orange : C.line, background: paymentMethod === m ? C.orange : "transparent", color: paymentMethod === m ? "#fff" : C.ink }}>
                {m}
              </button>
            ))}
          </div>
        </Field>

        {paymentMethod === "Crédit" && (
          <>
            <Field label="Client existant">
              <select className={inputCls} style={inputStyle} value={customerId} onChange={e => setCustomerId(e.target.value)}>
                <option value="">— Nouveau client —</option>
                {data.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            {!customerId && (
              <div className="grid grid-cols-2 gap-2">
                <Field label="Nom"><input className={inputCls} style={inputStyle} value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} /></Field>
                <Field label="Téléphone"><input className={inputCls} style={inputStyle} value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)} /></Field>
              </div>
            )}
            <Field label={`Montant payé maintenant (sur ${fmt(total)} F)`}>
              <input type="number" className={inputCls} style={inputStyle} value={amountPaid} onChange={e => setAmountPaid(e.target.value)} />
            </Field>
          </>
        )}

        <Btn tone="green" full icon={Check} disabled={items.length === 0} onClick={validerVente}>Valider la vente</Btn>
      </div>

      {receipt && <ReceiptModal sale={receipt} customers={data.customers} onClose={() => setReceipt(null)} />}
    </div>
  );
}

function ReceiptModal({ sale, customers, onClose }) {
  const customer = customers.find(c => c.id === sale.customerId);
  const lines = sale.items.map(it => `${it.name} x${it.qty} — ${fmt(it.qty * it.unitPrice)} F`).join("\n");
  const text = `BâtiStocks — Reçu de vente\n${new Date(sale.date).toLocaleString("fr-FR")}\n\n${lines}\n\nTotal : ${fmt(sale.total)} FCFA\nMode de paiement : ${sale.paymentMethod}${customer ? `\nClient : ${customer.name}` : ""}\n\nMerci de votre confiance !`;
  return (
    <Modal title="Reçu de vente" onClose={onClose}>
      <div className="font-mono text-sm whitespace-pre-wrap p-3 rounded mb-4" style={{ background: "#fff", border: `1px dashed ${C.line}` }}>{text}</div>
      <div className="flex gap-2">
        <Btn tone="ghost" icon={Printer} onClick={() => window.print()}>Imprimer</Btn>
        <Btn tone="green" icon={Share2} onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank")}>Partager WhatsApp</Btn>
      </div>
    </Modal>
  );
}

/* ============ Achats ============ */
function Achats({ data, actions }) {
  const [supplierId, setSupplierId] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");
  const [lines, setLines] = useState([{ productId: "", qty: 1, unitCost: 0 }]);
  const [amountPaid, setAmountPaid] = useState("");

  const total = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unitCost) || 0), 0);

  const updateLine = (i, patchObj) => setLines(prev => prev.map((l, idx) => idx === i ? { ...l, ...patchObj } : l));

  function valider() {
    const supplierName = supplierId ? data.suppliers.find(s => s.id === supplierId)?.name : newSupplierName;
    let sId = supplierId;
    if (!sId && newSupplierName) sId = actions.addSupplier({ name: newSupplierName, phone: newSupplierPhone });
    const items = lines.filter(l => l.productId && l.qty > 0).map(l => {
      const p = data.products.find(pp => pp.id === l.productId);
      return { productId: l.productId, name: p?.name || "", qty: Number(l.qty), unitCost: Number(l.unitCost) };
    });
    if (items.length === 0) return;
    actions.recordPurchase({ supplierId: sId || null, supplierName: supplierName || "Fournisseur ponctuel", items, amountPaid: Number(amountPaid || 0) });
    setLines([{ productId: "", qty: 1, unitCost: 0 }]); setAmountPaid(""); setSupplierId(""); setNewSupplierName(""); setNewSupplierPhone("");
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="rounded-md p-4" style={{ background: C.card, border: `1px solid ${C.line}` }}>
        <h3 className="font-bold text-sm mb-3">Fournisseur</h3>
        <Field label="Fournisseur existant">
          <select className={inputCls} style={inputStyle} value={supplierId} onChange={e => setSupplierId(e.target.value)}>
            <option value="">— Nouveau fournisseur —</option>
            {data.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        {!supplierId && (
          <div className="grid grid-cols-2 gap-2">
            <Field label="Nom"><input className={inputCls} style={inputStyle} value={newSupplierName} onChange={e => setNewSupplierName(e.target.value)} /></Field>
            <Field label="Téléphone"><input className={inputCls} style={inputStyle} value={newSupplierPhone} onChange={e => setNewSupplierPhone(e.target.value)} /></Field>
          </div>
        )}
      </div>

      <div className="rounded-md p-4" style={{ background: C.card, border: `1px solid ${C.line}` }}>
        <h3 className="font-bold text-sm mb-3">Articles achetés</h3>
        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-[1.6fr_0.6fr_0.8fr_auto] gap-2 mb-2 items-center">
            <select className={inputCls} style={inputStyle} value={l.productId} onChange={e => updateLine(i, { productId: e.target.value })}>
              <option value="">Choisir un article…</option>
              {data.products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="number" placeholder="Qté" className={inputCls} style={inputStyle} value={l.qty} onChange={e => updateLine(i, { qty: e.target.value })} />
            <input type="number" placeholder="Coût unit." className={inputCls} style={inputStyle} value={l.unitCost} onChange={e => updateLine(i, { unitCost: e.target.value })} />
            <button onClick={() => setLines(prev => prev.filter((_, idx) => idx !== i))}><Trash2 size={16} style={{ color: C.red }} /></button>
          </div>
        ))}
        <Btn tone="ghost" icon={Plus} onClick={() => setLines(prev => [...prev, { productId: "", qty: 1, unitCost: 0 }])}>Ajouter une ligne</Btn>
      </div>

      <div className="rounded-md p-4" style={{ background: C.card, border: `1px solid ${C.line}` }}>
        <div className="flex justify-between font-mono font-bold text-lg mb-3"><span>Total</span><span>{fmt(total)} F</span></div>
        <Field label="Montant payé maintenant"><input type="number" className={inputCls} style={inputStyle} value={amountPaid} onChange={e => setAmountPaid(e.target.value)} /></Field>
        <p className="text-xs font-mono mb-3" style={{ color: C.textSoft }}>Solde restant dû au fournisseur : {fmt(Math.max(0, total - Number(amountPaid || 0)))} F</p>
        <Btn tone="orange" full icon={Check} onClick={valider}>Enregistrer l'achat</Btn>
      </div>
    </div>
  );
}

/* ============ Clients à crédit ============ */
function Clients({ data, actions }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  const [payFor, setPayFor] = useState(null);
  const [payAmount, setPayAmount] = useState("");

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm" style={{ color: C.textSoft }}>Total dû par les clients : <b style={{ color: C.red }}>{fmt(data.customers.reduce((s, c) => s + c.balance, 0))} F</b></p>
        <Btn tone="orange" icon={Plus} onClick={() => setAdding(true)}>Nouveau client</Btn>
      </div>
      <div className="space-y-2">
        {data.customers.map(c => (
          <div key={c.id} className="rounded-md p-3" style={{ background: C.card, border: `1px solid ${C.line}` }}>
            <div className="flex justify-between items-center">
              <div>
                <div className="font-bold text-sm">{c.name}</div>
                <div className="font-mono text-xs" style={{ color: C.textSoft }}>{c.phone}</div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold" style={{ color: c.balance > 0 ? C.red : C.green }}>{fmt(c.balance)} F</div>
                {c.balance > 0 && <button onClick={() => setPayFor(c)} className="text-xs underline font-bold" style={{ color: C.steel }}>Enregistrer un remboursement</button>}
              </div>
            </div>
          </div>
        ))}
        {data.customers.length === 0 && <p className="text-sm" style={{ color: C.textSoft }}>Aucun client à crédit enregistré.</p>}
      </div>

      {adding && (
        <Modal title="Nouveau client" onClose={() => setAdding(false)}>
          <Field label="Nom"><input className={inputCls} style={inputStyle} value={name} onChange={e => setName(e.target.value)} /></Field>
          <Field label="Téléphone"><input className={inputCls} style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} /></Field>
          <Btn tone="orange" full icon={Check} onClick={() => { if (!name) return; actions.addCustomer({ name, phone }); setAdding(false); setName(""); setPhone(""); }}>Ajouter</Btn>
        </Modal>
      )}
      {payFor && (
        <Modal title={`Remboursement — ${payFor.name}`} onClose={() => setPayFor(null)}>
          <p className="text-sm mb-3">Solde actuel : <b>{fmt(payFor.balance)} F</b></p>
          <Field label="Montant remboursé"><input type="number" className={inputCls} style={inputStyle} value={payAmount} onChange={e => setPayAmount(e.target.value)} /></Field>
          <Btn tone="green" full icon={Check} onClick={() => { actions.recordCustomerPayment(payFor.id, Number(payAmount || 0)); setPayFor(null); setPayAmount(""); }}>Enregistrer</Btn>
        </Modal>
      )}
    </div>
  );
}

/* ============ Fournisseurs ============ */
function Fournisseurs({ data, actions }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  const [payFor, setPayFor] = useState(null);
  const [payAmount, setPayAmount] = useState("");

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm" style={{ color: C.textSoft }}>Total dû aux fournisseurs : <b style={{ color: C.red }}>{fmt(data.suppliers.reduce((s, x) => s + x.balance, 0))} F</b></p>
        <Btn tone="orange" icon={Plus} onClick={() => setAdding(true)}>Nouveau fournisseur</Btn>
      </div>
      <div className="space-y-2">
        {data.suppliers.map(s => (
          <div key={s.id} className="rounded-md p-3" style={{ background: C.card, border: `1px solid ${C.line}` }}>
            <div className="flex justify-between items-center">
              <div>
                <div className="font-bold text-sm">{s.name}</div>
                <div className="font-mono text-xs" style={{ color: C.textSoft }}>{s.phone}</div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold" style={{ color: s.balance > 0 ? C.red : C.green }}>{fmt(s.balance)} F</div>
                {s.balance > 0 && <button onClick={() => setPayFor(s)} className="text-xs underline font-bold" style={{ color: C.steel }}>Enregistrer un paiement</button>}
              </div>
            </div>
          </div>
        ))}
        {data.suppliers.length === 0 && <p className="text-sm" style={{ color: C.textSoft }}>Aucun fournisseur enregistré.</p>}
      </div>

      {adding && (
        <Modal title="Nouveau fournisseur" onClose={() => setAdding(false)}>
          <Field label="Nom"><input className={inputCls} style={inputStyle} value={name} onChange={e => setName(e.target.value)} /></Field>
          <Field label="Téléphone"><input className={inputCls} style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} /></Field>
          <Btn tone="orange" full icon={Check} onClick={() => { if (!name) return; actions.addSupplier({ name, phone }); setAdding(false); setName(""); setPhone(""); }}>Ajouter</Btn>
        </Modal>
      )}
      {payFor && (
        <Modal title={`Paiement — ${payFor.name}`} onClose={() => setPayFor(null)}>
          <p className="text-sm mb-3">Solde dû : <b>{fmt(payFor.balance)} F</b></p>
          <Field label="Montant payé"><input type="number" className={inputCls} style={inputStyle} value={payAmount} onChange={e => setPayAmount(e.target.value)} /></Field>
          <Btn tone="green" full icon={Check} onClick={() => { actions.recordSupplierPayment(payFor.id, Number(payAmount || 0)); setPayFor(null); setPayAmount(""); }}>Enregistrer</Btn>
        </Modal>
      )}
    </div>
  );
}

/* ============ Rapports ============ */
function Rapports({ data }) {
  const [range, setRange] = useState("today");
  const now = new Date();
  const start = range === "today" ? new Date(now.toDateString()) : range === "week" ? startOfWeek(now) : startOfMonth(now);

  const sales = data.sales.filter(s => new Date(s.date) >= start);
  const purchases = data.purchases.filter(p => new Date(p.date) >= start);
  const expenses = data.expenses.filter(e => new Date(e.date) >= start);

  const revenue = sales.reduce((s, x) => s + x.total, 0);
  const cost = sales.reduce((s, x) => s + x.cost, 0);
  const expTotal = expenses.reduce((s, x) => s + x.amount, 0);
  const netProfit = revenue - cost - expTotal;

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {[["today", "Aujourd'hui"], ["week", "Cette semaine"], ["month", "Ce mois"]].map(([id, label]) => (
          <button key={id} onClick={() => setRange(id)} className="px-4 py-2 rounded text-sm font-bold border-2"
            style={{ borderColor: range === id ? C.orange : C.line, background: range === id ? C.orange : "transparent", color: range === id ? "#fff" : C.ink }}>{label}</button>
        ))}
        <div className="flex-1" />
        <Btn tone="ghost" icon={Printer} onClick={() => window.print()}>Imprimer</Btn>
      </div>

      <div className="flex flex-wrap gap-3">
        <StatCard label="Chiffre d'affaires" value={`${fmt(revenue)} F`} tone="ink" />
        <StatCard label="Coût des marchandises" value={`${fmt(cost)} F`} tone="steel" />
        <StatCard label="Dépenses" value={`${fmt(expTotal)} F`} tone="ink" />
        <StatCard label="Bénéfice net" value={`${fmt(netProfit)} F`} tone="green" icon={Banknote} />
      </div>

      <div className="rounded-md overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
        <div className="px-4 py-2 font-bold text-sm" style={{ background: C.ink, color: "#fff" }}>Ventes ({sales.length})</div>
        <div className="max-h-64 overflow-y-auto">
          {sales.map(s => (
            <div key={s.id} className="flex justify-between px-4 py-2 text-sm border-t" style={{ borderColor: C.line, background: C.card }}>
              <span>{new Date(s.date).toLocaleString("fr-FR")} — {s.paymentMethod} — {s.employeeName}</span>
              <span className="font-mono font-bold">{fmt(s.total)} F</span>
            </div>
          ))}
          {sales.length === 0 && <div className="px-4 py-3 text-sm" style={{ color: C.textSoft }}>Aucune vente sur la période.</div>}
        </div>
      </div>

      <div className="rounded-md overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
        <div className="px-4 py-2 font-bold text-sm" style={{ background: C.ink, color: "#fff" }}>Achats fournisseurs ({purchases.length})</div>
        <div className="max-h-64 overflow-y-auto">
          {purchases.map(p => (
            <div key={p.id} className="flex justify-between px-4 py-2 text-sm border-t" style={{ borderColor: C.line, background: C.card }}>
              <span>{new Date(p.date).toLocaleString("fr-FR")} — {p.supplierName}</span>
              <span className="font-mono font-bold">{fmt(p.total)} F</span>
            </div>
          ))}
          {purchases.length === 0 && <div className="px-4 py-3 text-sm" style={{ color: C.textSoft }}>Aucun achat sur la période.</div>}
        </div>
      </div>
    </div>
  );
}

/* ============ Employés ============ */
function Employes({ data, actions }) {
  const [name, setName] = useState(""); const [role, setRole] = useState("Vendeur");
  return (
    <div className="max-w-lg space-y-4">
      <div className="rounded-md p-4" style={{ background: C.card, border: `1px solid ${C.line}` }}>
        <h3 className="font-bold text-sm mb-3">Ajouter un employé</h3>
        <Field label="Nom"><input className={inputCls} style={inputStyle} value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field label="Niveau d'accès">
          <select className={inputCls} style={inputStyle} value={role} onChange={e => setRole(e.target.value)}>
            <option value="Vendeur">Vendeur (ventes, stock, clients)</option>
            <option value="Gérant">Gérant (accès complet)</option>
          </select>
        </Field>
        <Btn tone="orange" full icon={Plus} onClick={() => { if (!name) return; actions.addEmployee({ name, role }); setName(""); }}>Ajouter</Btn>
      </div>
      <div className="space-y-2">
        {data.employees.map(e => (
          <div key={e.id} className="flex justify-between items-center rounded-md p-3" style={{ background: C.card, border: `1px solid ${C.line}` }}>
            <div><div className="font-bold text-sm">{e.name}</div><div className="text-xs font-mono" style={{ color: C.textSoft }}>{e.role}</div></div>
            {data.employees.length > 1 && <button onClick={() => actions.removeEmployee(e.id)}><Trash2 size={16} style={{ color: C.red }} /></button>}
          </div>
        ))}
      </div>
    </div>
  );
}
