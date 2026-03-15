import { useEffect, useState, useRef } from 'react';
import { useShoppingStore, useAuthStore } from '../store';
import toast from 'react-hot-toast';
import api from '../services/api';
import { getTranslation } from '../services/i18n';

// Professional Icons
import { FiPlus, FiUpload, FiCamera, FiTrash2, FiMaximize2, FiCheckCircle, FiInfo } from 'react-icons/fi';
import { GiShoppingBag, GiDeliveryDrone } from 'react-icons/gi';

export default function ShoppingPage() {
  const user = useAuthStore(s => s.user);
  const lang = user?.settings?.language || 'en';
  const t = (key) => getTranslation(key, lang);

  const { lists, fetchLists, createList, updateList, toggleItem, deleteList } = useShoppingStore();
  const [showModal, setShowModal] = useState(false);
  const [newList, setNewList] = useState({ title: t('new_task'), items: [] });
  const [newItem, setNewItem] = useState({ name: '', quantity: 1, unit: '', cost: 0, notes: '' });
  const [ocrLoading, setOcrLoading] = useState(false);
  const fileRef = useRef();
  const ocrRef = useRef();

  useEffect(() => { fetchLists(); }, []);

  const handleAddItem = () => {
    if (!newItem.name) return toast.error('Item name required');
    setNewList(l => ({ ...l, items: [...l.items, { ...newItem }] }));
    setNewItem({ name: '', quantity: 1, unit: '', cost: 0, notes: '' });
  };

  const handleCreateList = async () => {
    if (!newList.items.length) return toast.error('Add at least one item');
    const totalCost = newList.items.reduce((s, i) => s + (i.cost * i.quantity), 0);
    await createList({ ...newList, totalCost });
    setNewList({ title: 'New Supply List', items: [] });
    setShowModal(false);
    toast.success('Inventory list synchronized');
  };

  const handleExcelImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await api.post('/upload/excel/shopping', fd);
      setNewList(l => ({ ...l, items: [...l.items, ...res.data.items] }));
      setShowModal(true);
      toast.success(`${res.data.count} items extracted from data stream`);
    } catch { toast.error('Data import failed'); }
    fileRef.current.value = '';
  };

  const handleOCR = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setOcrLoading(true);
    const fd = new FormData();
    fd.append('image', file);
    try {
      const res = await api.post('/upload/ocr', fd);
      setNewList(l => ({ ...l, items: [...l.items, ...res.data.items] }));
      setShowModal(true);
      toast.success('Visual extraction complete');
    } catch { toast.error('Vision core error'); }
    finally { setOcrLoading(false); ocrRef.current.value = ''; }
  };

  const totalCost = (list) => list.items.reduce((s, i) => s + (i.cost * i.quantity), 0);

  return (
    <div className="slide-up">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <GiShoppingBag style={{ color: 'var(--accent2)', fontSize: '28px' }} />
              Procurement Inventory
            </h1>
            <p className="page-subtitle">{lists.length} active supply chains in operation</p>
          </div>
          <div className="flex gap-12">
            <input type="file" ref={fileRef} accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleExcelImport} />
            <input type="file" ref={ocrRef} accept="image/*" style={{ display: 'none' }} onChange={handleOCR} />
            <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current.click()}><FiUpload /> DATA IMPORT</button>
            <button className="btn btn-ghost btn-sm" onClick={() => ocrRef.current.click()} disabled={ocrLoading}>
              {ocrLoading ? <><div className="spinner" style={{ width: 14, height: 14 }} /> SCANNING</> : <><FiCamera /> VISION SCAN</>}
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ INITIATE LIST</button>
          </div>
        </div>
      </div>

      {lists.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '100px', borderStyle: 'dashed', background: 'transparent' }}>
          <GiDeliveryDrone style={{ fontSize: '64px', marginBottom: '24px', opacity: 0.2 }} />
          <div style={{ color: 'var(--text3)', fontWeight: 800, fontSize: '18px' }}>NO ACTIVE PROCUREMENT REQUESTS.</div>
          <p style={{ color: 'var(--text3)', marginTop: '8px' }}>Global supply chain is currently idle.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {lists.map((list, i) => (
            <div key={list._id} className={`card slide-up stagger-${(i % 4) + 1}`} style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontWeight: 800, fontSize: '20px', color: 'var(--text-bright)', letterSpacing: '-0.5px' }}>{list.title.toUpperCase()}</h3>
                  <div className="mono" style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '6px', display: 'flex', gap: '16px' }}>
                    <span>{list.items.length} ENTITIES</span>
                    <span>EST. COST: ₹{totalCost(list).toFixed(2)}</span>
                    {list.source && <span>ORIGIN: {list.source.toUpperCase()}</span>}
                  </div>
                </div>
                <button className="btn btn-danger btn-icon btn-xs" onClick={() => deleteList(list._id)}><FiTrash2 /></button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {list.items.map(item => (
                  <div key={item._id} className="shopping-item" style={{ padding: '14px 0' }}>
                    <div className={`shopping-check ${item.checked ? 'checked' : ''}`} onClick={() => toggleItem(list._id, item._id)} style={{ width: '22px', height: '22px' }}>
                      {item.checked && <FiCheckCircle />}
                    </div>
                    <span style={{ 
                      flex: 1, 
                      textDecoration: item.checked ? 'line-through' : 'none', 
                      color: item.checked ? 'var(--text3)' : 'var(--text)',
                      fontWeight: 700,
                      fontSize: '15px'
                    }}>
                      {item.name}
                    </span>
                    <span className="mono" style={{ fontSize: '12px', color: 'var(--text3)', background: 'var(--glass)', padding: '2px 8px', borderRadius: '4px' }}>{item.quantity} {item.unit}</span>
                    {item.cost > 0 && <span className="mono" style={{ fontSize: '13px', color: 'var(--cyan)', fontWeight: 800, minWidth: '80px', textAlign: 'right' }}>₹{(item.cost * item.quantity).toFixed(2)}</span>}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '3px' }}>
                  {Array.from({ length: 15 }).map((_, i) => (
                    <div key={i} style={{ 
                      width: '10px', height: '5px', borderRadius: '1px',
                      background: i < (list.items.filter(it => it.checked).length / list.items.length * 15) ? 'var(--low)' : 'var(--glass)'
                    }} />
                  ))}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="mono" style={{ fontSize: '10px', color: 'var(--text3)', fontWeight: 700, marginBottom: '2px' }}>TOTAL PROCUREMENT VALUE</div>
                  <span className="mono" style={{ fontWeight: 900, color: 'var(--low)', fontSize: '18px' }}>₹{totalCost(list).toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">INVENTORY DEFINITION</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            
            <div className="form-group">
              <label className="label">List Designation</label>
              <input className="input" value={newList.title} onChange={e => setNewList(l => ({ ...l, title: e.target.value }))} placeholder="e.g. Server Hardware" />
            </div>

            <div style={{ background: 'var(--glass)', borderRadius: 'var(--radius)', padding: '24px', marginBottom: '24px', border: '1px solid var(--glass-border)' }}>
              <div className="grid-2">
                <div className="form-group"><label className="label">Entity Name</label><input className="input" value={newItem.name} onChange={e => setNewItem(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Lithium Cells" /></div>
                <div className="form-group"><label className="label">Quantity</label><input className="input" type="number" value={newItem.quantity} onChange={e => setNewItem(f => ({ ...f, quantity: parseFloat(e.target.value) || 1 }))} /></div>
                <div className="form-group"><label className="label">Unit</label><input className="input" value={newItem.unit} onChange={e => setNewItem(f => ({ ...f, unit: e.target.value }))} placeholder="kg, pcs, units..." /></div>
                <div className="form-group"><label className="label">Unit Cost (₹)</label><input className="input" type="number" value={newItem.cost} onChange={e => setNewItem(f => ({ ...f, cost: parseFloat(e.target.value) || 0 }))} /></div>
              </div>
              <button className="btn btn-ghost btn-sm w-full" onClick={handleAddItem} style={{ marginTop: '16px' }}><FiPlus /> ADD ENTITY TO BUFFER</button>
            </div>

            {newList.items.length > 0 && (
              <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '28px', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {newList.items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--glass)', borderRadius: 'var(--radius-sm)', fontSize: '13px', border: '1px solid var(--glass-border)' }}>
                    <span style={{ fontWeight: 700 }}>{item.name} <span style={{ color: 'var(--text3)', fontWeight: 500 }}>× {item.quantity}</span></span>
                    <span className="mono" style={{ color: 'var(--cyan)', fontWeight: 800 }}>₹{(item.cost * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-12 justify-end">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>ABORT</button>
              <button className="btn btn-primary" onClick={handleCreateList} style={{ padding: '12px 32px' }}>COMMIT LIST</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
