import React, { useEffect, useState } from 'react';
import { ArrowLeft, ImagePlus, LogIn, LogOut, Package, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const blank = {
  name: '',
  category: 'Pillows',
  price: '',
  was: '',
  tag: '',
  image: '',
  images: [],
  short: '',
  description: '',
  features: '',
  available: true,
  onlinePurchase: false,
  size: '',
  fill: ''
};
const imageLimit = 10;

export function Admin() {
  const [token, setToken] = useState(() => sessionStorage.getItem('nooha-admin-token') || '');
  const [login, setLogin] = useState({ username: 'admin', password: '' });
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const headers = () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });

  async function load() {
    const response = await fetch(`${API}/api/admin/products`, { headers: headers() });
    if (response.status === 401) {
      setToken('');
      sessionStorage.removeItem('nooha-admin-token');
      throw new Error('Session expired. Please sign in again.');
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load products.');
    setItems(data.products || []);
  }

  useEffect(() => {
    if (token) load().catch(e => setError(e.message));
  }, [token]);

  async function signIn(event) {
    event.preventDefault();
    setError('');
    try {
      const response = await fetch(`${API}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(login)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed.');
      sessionStorage.setItem('nooha-admin-token', data.token);
      setToken(data.token);
    } catch (e) {
      setError(e.message);
    }
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const images = [...new Set([form.image, ...(form.images || [])].filter(Boolean))].slice(0, imageLimit);
      const payload = {
        ...form,
        images,
        price: form.price === '' ? null : Number(form.price),
        was: form.was === '' ? null : Number(form.was),
        features: Array.isArray(form.features) ? form.features : form.features.split('\n').filter(Boolean)
      };
      const response = await fetch(`${API}/api/admin/products${editing ? `/${editing}` : ''}`, {
        method: editing ? 'PUT' : 'POST',
        headers: headers(),
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Save failed.');
      await load();
      setForm(blank);
      setEditing('');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function upload(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;

    const currentImages = [...new Set([form.image, ...(form.images || [])].filter(Boolean))];
    if (currentImages.length + files.length > imageLimit) {
      setError(`A product can have up to ${imageLimit} photos.`);
      return;
    }

    setUploading(true);
    setError('');
    const body = new FormData();
    files.forEach(file => body.append('images', file));
    try {
      const response = await fetch(`${API}/api/admin/uploads`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Photo upload failed.');
      const urls = data.images.map(image => image.url.startsWith('http') ? image.url : `${API}${image.url}`);
      setForm(current => {
        const images = [...new Set([...(current.images || []), ...urls])].slice(0, imageLimit);
        return { ...current, images, image: current.image || images[0] || '' };
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  function setMainImage(image) {
    setForm(current => ({ ...current, image }));
  }

  function removeImage(image) {
    setForm(current => {
      const images = (current.images || []).filter(photo => photo !== image);
      return { ...current, images, image: current.image === image ? (images[0] || '') : current.image };
    });
  }

  async function remove(id) {
    if (!confirm('Delete this product?')) return;
    try {
      const response = await fetch(`${API}/api/admin/products/${id}`, { method: 'DELETE', headers: headers() });
      if (!response.ok) throw new Error('Could not delete product.');
      await load();
      if (editing === id) {
        setEditing('');
        setForm(blank);
      }
    } catch (e) {
      setError(e.message);
    }
  }

  function edit(product) {
    setEditing(product.id);
    setForm({
      ...product,
      images: Array.isArray(product.images) ? product.images : [],
      features: Array.isArray(product.features) ? product.features.join('\n') : product.features || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startNew() {
    setEditing('');
    setForm(blank);
  }

  if (!token) {
    return (
      <main className="admin-login-wrap">
        <form className="admin-login" onSubmit={signIn}>
          <div className="admin-mark">nooha<span>sleep</span></div>
          <p className="eyebrow">STORE MANAGEMENT</p>
          <h1>Welcome back.</h1>
          <p>Sign in to manage products, photos and availability.</p>
          <label>Username<input autoComplete="username" value={login.username} onChange={event => setLogin({ ...login, username: event.target.value })} required /></label>
          <label>Password<input type="password" autoComplete="current-password" value={login.password} onChange={event => setLogin({ ...login, password: event.target.value })} required /></label>
          {error && <p className="admin-error">{error}</p>}
          <button className="btn btn-dark full-btn"><LogIn size={17} /> Sign in</button>
          <a href="/" className="admin-back"><ArrowLeft size={15} /> Back to store</a>
        </form>
      </main>
    );
  }

  const galleryImages = [...new Set([form.image, ...(form.images || [])].filter(Boolean))];

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-mark">nooha<span>sleep</span></div>
        <small>STORE MANAGEMENT</small>
        <div className="admin-side-active"><Package size={18} /> Products</div>
        <a href="/" className="admin-back"><ArrowLeft size={15} /> View storefront</a>
        <button className="admin-logout" onClick={() => { sessionStorage.removeItem('nooha-admin-token'); setToken(''); }}><LogOut size={16} /> Sign out</button>
      </aside>
      <section className="admin-main">
        <header className="admin-top">
          <div><p className="eyebrow">NOOHA SLEEP / ADMIN</p><h1>Product management</h1><p>Changes save to the catalogue and appear on the storefront.</p></div>
          <button className="btn btn-outline" onClick={() => load().catch(e => setError(e.message))}><RefreshCw size={16} /> Refresh</button>
        </header>
        {error && <div className="admin-error banner-error">{error}</div>}
        <div className="admin-stat"><Package /><div><strong>{items.length}</strong><span>Products in catalogue</span></div><div><strong>{items.filter(product => product.available).length}</strong><span>Marked available</span></div></div>
        <div className="admin-content-grid">
          <form className="admin-editor" onSubmit={save}>
            <h2>{editing ? 'Edit product' : 'Add a product'}</h2>
            <label>Product name<input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
            <div className="admin-two">
              <label>Category<select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })}><option>Pillows</option><option>Mattresses</option><option>Accessories</option></select></label>
              <label>Tag / badge<input value={form.tag} onChange={event => setForm({ ...form, tag: event.target.value })} placeholder="BEST SELLER" /></label>
            </div>
            <div className="admin-two">
              <label>Price (₹)<input type="number" min="0" value={form.price ?? ''} onChange={event => setForm({ ...form, price: event.target.value })} placeholder="Leave blank for enquiry" /></label>
              <label>Compare-at price (₹)<input type="number" min="0" value={form.was ?? ''} onChange={event => setForm({ ...form, was: event.target.value })} /></label>
            </div>
            <label>Short description<input value={form.short} onChange={event => setForm({ ...form, short: event.target.value })} /></label>
            <label>Full description<textarea rows="3" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></label>
            <label>Features (one per line)<textarea rows="3" value={Array.isArray(form.features) ? form.features.join('\n') : form.features} onChange={event => setForm({ ...form, features: event.target.value })} /></label>
            <div className="admin-two">
              <label>Size/specification<input value={form.size || ''} onChange={event => setForm({ ...form, size: event.target.value })} /></label>
              <label>Filling/material<input value={form.fill || ''} onChange={event => setForm({ ...form, fill: event.target.value })} /></label>
            </div>
            <label>Main image URL<input value={form.image} onChange={event => setForm({ ...form, image: event.target.value })} placeholder="https://… or choose a photo below" /></label>
            <label className="upload-box"><ImagePlus size={18} /> Add photos (JPG, PNG, WEBP · up to {imageLimit}, 5 MB each)<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={upload} /></label>
            {uploading && <p className="admin-upload-status" role="status">Uploading photos…</p>}
            {galleryImages.length > 0 && (
              <div className="admin-gallery">
                <strong>Product photos <span>Choose the main photo customers see first.</span></strong>
                <div className="admin-gallery-grid">
                  {galleryImages.map((image, index) => (
                    <div className={`admin-gallery-item${form.image === image ? ' is-main' : ''}`} key={image}>
                      <img src={image} alt={`Product photo ${index + 1}`} />
                      {form.image === image ? <span className="admin-main-badge">MAIN PHOTO</span> : <button type="button" onClick={() => setMainImage(image)}>Set as main</button>}
                      <button type="button" className="admin-photo-remove" aria-label={`Remove photo ${index + 1}`} onClick={() => removeImage(image)}><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="admin-checks">
              <label><input type="checkbox" checked={!!form.available} onChange={event => setForm({ ...form, available: event.target.checked })} /> Available</label>
              <label><input type="checkbox" checked={!!form.onlinePurchase} onChange={event => setForm({ ...form, onlinePurchase: event.target.checked })} /> Can buy online</label>
            </div>
            <button disabled={busy || uploading} className="btn btn-dark full-btn"><Save size={17} />{busy ? 'Saving…' : editing ? 'Save changes' : 'Add product'}</button>
            {editing && <button type="button" className="btn btn-outline full-btn" onClick={startNew}>Cancel editing</button>}
          </form>
          <div className="admin-product-list">
            <div className="admin-list-heading"><h2>Catalogue</h2><button className="btn btn-outline" onClick={startNew}><Plus size={16} /> New</button></div>
            {items.map(product => (
              <article className="admin-product-row" key={product.id}>
                <img src={product.image} alt="" />
                <div className="admin-product-info">
                  <strong>{product.name}</strong>
                  <small>{product.category} · {product.price == null ? 'Price on enquiry' : `₹${Number(product.price).toLocaleString('en-IN')}`}</small>
                  <span className={product.available ? 'status-available' : 'status-out'}>{product.available ? 'Available' : 'Out of stock'}</span>
                </div>
                <div className="admin-row-actions"><button title="Edit" onClick={() => edit(product)}>Edit</button><button title="Delete" onClick={() => remove(product.id)}><Trash2 size={16} /></button></div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
