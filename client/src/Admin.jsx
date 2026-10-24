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
  visible: true,
  enquiryMode: false,
  size: '',
  fill: '', signature: false, offerFeatured: false, sizes: []
};
const imageLimit = 10;
const defaultFaq = [
  { question: 'What makes the Nooha pillow different?', answer: 'It is filled with natural silk cotton and covered in cotton cloth, designed to offer a soft feel with gentle everyday support.' },
  { question: 'Is it suitable for different sleeping positions?', answer: 'The pillow is designed for back, side and stomach sleepers. Comfort is personal, so choose what feels right for you.' },
  { question: 'How do I care for my pillow?', answer: 'Use a pillow protector or cover, spot-clean when needed, and avoid machine-washing the filling to help preserve its shape.' },
  { question: 'How long does delivery take?', answer: 'Delivery estimates depend on the destination and courier service. Our team can help confirm the latest estimate for your PIN code.' },
  { question: 'Can I buy a Nooha mattress online?', answer: 'Mattresses are currently offered for product information and enquiries. Contact our team for sizes, availability and a personalised quote.' }
];

export function Admin() {
  const [token, setToken] = useState(() => sessionStorage.getItem('nooha-admin-token') || '');
  const [login, setLogin] = useState({ username: 'admin', password: '' });
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState('Products');
  const [categories, setCategories] = useState(['Pillows','Mattresses','Accessories']);
  const [newCategory, setNewCategory] = useState('');
  const [settings, setSettings] = useState({offer:{enabled:false,wishText:'',title:'',banner:'',productIds:[]}});
  const [qa, setQa] = useState(defaultFaq); const [orders, setOrders] = useState([]);

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
    const extra = await fetch(`${API}/api/admin/settings`, {headers:headers()}).then(r=>r.json()).catch(()=>({}));
    if(extra.settings) setSettings(extra.settings); setQa(Array.isArray(extra.qa) && extra.qa.length ? extra.qa : defaultFaq); if(extra.orders) setOrders(extra.orders);
    const cat = await fetch(`${API}/api/admin/categories`,{headers:headers()}).then(r=>r.json()).catch(()=>({})); if(cat.categories?.length) setCategories(cat.categories);
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

  async function saveSettings(nextSettings=settings,nextQa=qa,nextCategories=categories) { const response=await fetch(`${API}/api/admin/settings`,{method:'PUT',headers:headers(),body:JSON.stringify({settings:{...nextSettings,categories:nextCategories},qa:nextQa})}); if(!response.ok) throw new Error('Could not save settings'); const cr=await fetch(`${API}/api/admin/categories`,{method:'PUT',headers:headers(),body:JSON.stringify({categories:nextCategories})}); if(!cr.ok) throw new Error('Could not save categories'); setSettings(nextSettings);setQa(nextQa);setCategories(nextCategories); }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const images = [...new Set([form.image, ...(form.images || [])].filter(Boolean))].slice(0, imageLimit);
      if (!form.enquiryMode && (form.price === '' || form.price == null || !Number.isFinite(Number(form.price)) || Number(form.price) <= 0)) {
        setError('Online shopping requires a price greater than ₹0. Switch to Enquiry mode if the product does not have a fixed price.');
        setBusy(false);
        return;
      }
      if (form.was != null && String(form.was).trim() !== '' && (!Number.isFinite(Number(form.was)) || Number(form.was) <= 0)) {
        setError('Compare-at price must be greater than ₹0 when provided, or leave it blank.');
        setBusy(false);
        return;
      }
      const payload = {
        ...form,
        images,
        price: form.price == null || String(form.price).trim() === '' ? null : Number(form.price),
        was: form.was == null || String(form.was).trim() === '' ? null : Number(form.was),
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
      visible: product.visible !== false,
      enquiryMode: typeof product.enquiryMode === 'boolean' ? product.enquiryMode : (product.onlinePurchase === false || product.price == null),
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
        <div className="admin-side-nav">{['Products','Categories','Customers & Orders','Offers','Q & A'].map(name=><button key={name} className={tab===name?'admin-side-active':''} onClick={()=>setTab(name)}><Package size={17}/>{name}</button>)}</div>
        <a href="/" className="admin-back"><ArrowLeft size={15} /> View storefront</a>
        <button className="admin-logout" onClick={() => { sessionStorage.removeItem('nooha-admin-token'); setToken(''); }}><LogOut size={16} /> Sign out</button>
      </aside>
      <section className="admin-main">
        <header className="admin-top">
          <div><p className="eyebrow">NOOHA SLEEP / ADMIN</p><h1>{tab}</h1><p>Manage your catalogue, storefront content, orders and customer experience.</p></div>
          <button className="btn btn-outline" onClick={() => load().catch(e => setError(e.message))}><RefreshCw size={16} /> Refresh</button>
        </header>
        {error && <div className="admin-error banner-error">{error}</div>}
        {tab==='Categories' && <section className="admin-editor"><h2>Product categories</h2><p>Add categories here. They become available in the product editor and storefront navigation.</p><form onSubmit={async e=>{e.preventDefault();if(!newCategory.trim())return;const next=[...new Set([...categories,newCategory.trim()])];try{await saveSettings(settings,qa,next);setNewCategory('');}catch(err){setError(err.message)}}}><label>New category<input value={newCategory} onChange={e=>setNewCategory(e.target.value)} placeholder="e.g. Bed linen" required/></label><button className="btn btn-dark"><Plus size={16}/> Add category</button></form><div className="admin-category-grid">{categories.map((c,i)=><div className="admin-category-card" key={c}><span className="admin-category-index">{String(i+1).padStart(2,'0')}</span><strong>{c}</strong><small>{items.filter(p=>p.category===c).length} products</small><button type="button" onClick={async()=>{const next=categories.filter(x=>x!==c);try{await saveSettings(settings,qa,next)}catch(err){setError(err.message)}}}>Remove category</button></div>)}</div></section>}
        {tab==='Customers & Orders' && <section className="admin-editor"><h2>Customer orders & delivery tracking</h2>{orders.length===0?<p>No orders have been recorded yet. Customer checkout requests will appear here when the checkout flow sends them to the API.</p>:orders.map(o=><article className="admin-product-row" key={o.id}><div className="admin-product-info"><strong>{o.name||'Customer'} · {o.id}</strong><small>{o.phone||''} · {o.email||''}</small><small>{o.address||''}</small><small>{o.items?.map(i=>i.name||i.product?.name).join(', ')||'Order details'}</small></div><select value={o.status||'Pending'} onChange={async e=>{const res=await fetch(`${API}/api/admin/orders/${o.id}`,{method:'PUT',headers:headers(),body:JSON.stringify({status:e.target.value,deliveryStatus:e.target.value})});if(res.ok){const updated=await res.json();setOrders(orders.map(x=>x.id===o.id?updated.order:x))}}}>{['Pending','Confirmed','Packed','Out for Delivery','Delivered','Returned','Cancelled'].map(x=><option key={x}>{x}</option>)}</select></article>)}</section>}
        {tab==='Offers' && <section className="admin-editor"><h2>Homepage offer section</h2><p>Choose up to four products in Product edit using “Feature in offer”. The preview updates below.</p><label><input type="checkbox" checked={!!settings.offer?.enabled} onChange={e=>setSettings({...settings,offer:{...settings.offer,enabled:e.target.checked}})}/> Show offer section on homepage</label><label>Festival wish / greeting<input value={settings.offer?.wishText||''} onChange={e=>setSettings({...settings,offer:{...settings.offer,wishText:e.target.value}})} placeholder="A little more comfort this festive season"/></label><label>Offer heading<input value={settings.offer?.title||''} onChange={e=>setSettings({...settings,offer:{...settings.offer,title:e.target.value}})} placeholder="Discover a softer kind of celebration"/></label><label>Banner image URL<input value={settings.offer?.banner||''} onChange={e=>setSettings({...settings,offer:{...settings.offer,banner:e.target.value}})} placeholder="https://… or upload below"/></label><label className="upload-box"><ImagePlus size={18}/> Upload banner<input type="file" accept="image/*" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;const body=new FormData();body.append('image',f);const r=await fetch(`${API}/api/admin/upload`,{method:'POST',headers:{Authorization:`Bearer ${token}`},body});const d=await r.json();if(r.ok)setSettings({...settings,offer:{...settings.offer,banner:d.url.startsWith('http')?d.url:`${API}${d.url}`}});else setError(d.error||'Upload failed')}}/></label><div className="offer-preview" style={{backgroundImage:settings.offer?.banner?`linear-gradient(#0004,#0004),url(${settings.offer.banner})`:'none'}}><small>{settings.offer?.wishText||'Festival greeting appears here'}</small><h3>{settings.offer?.title||'Offer heading preview'}</h3><div className="offer-preview-products">{items.filter(p=>p.offerFeatured).slice(0,4).map(p=><span key={p.id}><img src={p.image} alt=""/><strong>{p.name}</strong>{p.price!=null&&<small>₹{Number(p.price).toLocaleString('en-IN')}</small>}</span>)}</div></div><button className="btn btn-dark" onClick={async()=>{try{await saveSettings({...settings,offer:{...settings.offer,productIds:items.filter(p=>p.offerFeatured).slice(0,4).map(p=>p.id)}},qa,categories);setError('');}catch(e){setError(e.message)}}}><Save size={16}/> Save offer settings</button></section>}
        {tab==='Q & A' && <section className="admin-editor"><h2>A Few Good Answers</h2>{qa.map((item,i)=><div className="admin-qa-item" key={i}><label>Question<input value={item.question||''} onChange={e=>setQa(qa.map((x,j)=>j===i?{...x,question:e.target.value}:x))}/></label><label>Answer<textarea rows="3" value={item.answer||''} onChange={e=>setQa(qa.map((x,j)=>j===i?{...x,answer:e.target.value}:x))}/></label><button type="button" onClick={()=>setQa(qa.filter((_,j)=>j!==i))}>Remove</button></div>)}<button className="btn btn-outline" onClick={()=>setQa([...qa,{question:'',answer:''}])}><Plus size={16}/> Add Q & A</button> <button className="btn btn-dark" onClick={async()=>{try{await saveSettings(settings,qa,categories)}catch(e){setError(e.message)}}}><Save size={16}/> Save Q & A</button></section>}
        {tab==='Products' && <><div className="admin-stat"><Package /><div><strong>{items.length}</strong><span>Products in catalogue</span></div><div><strong>{items.filter(product => product.available).length}</strong><span>Marked available</span></div></div>
        <div className="admin-content-grid">
          <form className="admin-editor" onSubmit={save}>
            <div className="admin-editor-heading-row"><h2>{editing ? 'Edit product' : 'Add a product'}</h2><button type="submit" disabled={busy || uploading} className="btn btn-dark admin-top-save"><Save size={16}/>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add product'}</button></div>
            <div className="product-toggle-panel" aria-label="Product visibility and availability settings">
              <label className="switch-control"><span><strong>Available</strong><small>Turn off to mark out of stock</small></span><input type="checkbox" checked={!!form.available} onChange={event => setForm({ ...form, available: event.target.checked })} /><i aria-hidden="true" /></label>
              <label className="switch-control"><span><strong>Visible on website</strong><small>Hidden products are removed from public pages</small></span><input type="checkbox" checked={form.visible !== false} onChange={event => setForm({ ...form, visible: event.target.checked })} /><i aria-hidden="true" /></label>
              <label className="switch-control"><span><strong>The Nooha Signature</strong><small>Feature in the signature section</small></span><input type="checkbox" checked={!!form.signature} onChange={event=>setForm({...form,signature:event.target.checked})}/><i aria-hidden="true" /></label>
              <label className="switch-control"><span><strong>Homepage offer</strong><small>Feature in offer section (maximum 4)</small></span><input type="checkbox" checked={!!form.offerFeatured} onChange={event=>setForm({...form,offerFeatured:event.target.checked})} disabled={!form.offerFeatured && items.filter(p=>p.offerFeatured).length>=4}/><i aria-hidden="true" /></label>
            </div>
            <label>Product name<input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
            <div className="admin-two">
              <label>Category<select value={form.category} onChange={event => setForm(current => ({ ...current, category: event.target.value }))}><option>Pillows</option><option>Mattresses</option>{categories.filter(c=>!['Pillows','Mattresses'].includes(c)).map(c=><option key={c}>{c}</option>)}</select></label>
              <label>Tag / badge<input value={form.tag} onChange={event => setForm({ ...form, tag: event.target.value })} placeholder="BEST SELLER" /></label>
            </div>
            <div className="admin-two">
              <label>Price (₹)<input type="number" min="0.01" step="any" required={!form.enquiryMode} value={form.price ?? ''} onChange={event => setForm({ ...form, price: event.target.value })} placeholder={form.enquiryMode ? 'Optional in enquiry mode' : 'Required for online shopping'} /></label>
              <label>Compare-at price (₹)<input type="number" min="0.01" step="any" value={form.was ?? ''} onChange={event => setForm({ ...form, was: event.target.value })} /></label>
            </div>
            <label className="mode-toggle-row"><span><strong>Online shopping</strong><small>Fixed price, cart and checkout</small></span><span className="mode-switch"><input aria-label="Switch between online shopping and enquiry mode" type="checkbox" checked={!!form.enquiryMode} onChange={event => setForm({ ...form, enquiryMode: event.target.checked })}/><i aria-hidden="true" /></span><span><strong>Enquiry mode</strong><small>Customers contact your team</small></span></label>
            <p className="admin-field-hint">{form.enquiryMode ? 'Price and compare-at price are optional. Any entered price will be shown; online purchase is disabled.' : 'Price is required. Compare-at price is optional.'}</p>
            <div className="admin-size-editor">
              <div className="admin-size-heading"><div><strong>Available sizes</strong><small>Add one row per size. Custom pricing is optional for each size.</small></div><button type="button" className="btn btn-outline btn-small" onClick={() => setForm(current => ({ ...current, sizes: [...(current.sizes || []), { label: '', custom: false, price: '' }] }))}><Plus size={15}/> Add size</button></div>
              {(form.sizes || []).map((size, index) => <div className="admin-size-row" key={`size-${index}`}>
                <label className="admin-size-name">Size name<input value={size.label || ''} onChange={event => setForm(current => ({ ...current, sizes: current.sizes.map((item, i) => i === index ? { ...item, label: event.target.value } : item) }))} placeholder="e.g. Queen" /></label>
                <label className="admin-toggle admin-size-custom"><span>Custom price</span><input type="checkbox" checked={!!size.custom} onChange={event => setForm(current => ({ ...current, sizes: current.sizes.map((item, i) => i === index ? { ...item, custom: event.target.checked, price: event.target.checked ? (item.price || '') : '' } : item) }))}/></label>
                <label className="admin-size-price">Price (₹)<input type="number" min="0" value={size.price ?? ''} disabled={!size.custom} onChange={event => setForm(current => ({ ...current, sizes: current.sizes.map((item, i) => i === index ? { ...item, price: event.target.value } : item) }))} placeholder="Regular price" /></label>
                <button type="button" className="admin-size-remove" aria-label={`Remove size ${index + 1}`} onClick={() => setForm(current => ({ ...current, sizes: current.sizes.filter((_, i) => i !== index) }))}><Trash2 size={16}/></button>
              </div>)}
              {!(form.sizes || []).length && <p className="admin-size-empty">No size options added. Select “Add size” to create one.</p>}
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
                <div className="admin-image-urls">{galleryImages.map((image,index)=><div className="admin-image-url-row" key={image}><span>{String(index+1).padStart(2,'0')}</span><div><strong>{image.split(/[\/]/).pop() || `Product image ${index+1}`}</strong><a href={image} target="_blank" rel="noreferrer">{image}</a></div><button type="button" onClick={() => navigator.clipboard?.writeText(image)}>Copy URL</button></div>)}</div>
              </div>
            )}
            <button disabled={busy || uploading} className="btn btn-dark full-btn"><Save size={17} />{busy ? 'Saving…' : editing ? 'Save changes' : 'Add product'}</button>
            {editing && <button type="button" className="btn btn-outline full-btn" onClick={startNew}>Cancel editing</button>}
          </form>
          <div className="admin-product-list">
            <div className="admin-list-heading"><h2>Catalogue</h2><button className="btn btn-outline" onClick={startNew}><Plus size={16} /> New</button></div>
            <label className="admin-product-search"><span>Search products</span><input type="search" value={productSearch} onChange={e=>setProductSearch(e.target.value)} placeholder="Search by name, category, tag…"/></label>
            {items.filter(product => `${product.name} ${product.category} ${product.tag||''} ${product.short||''}`.toLowerCase().includes(productSearch.trim().toLowerCase())).map(product => (
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
        </div></>}
      </section>
    </main>
  );
}
