import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../components/layout/PageLayout';
import { apiFetch } from '../../utils/api';

const PROMO_API = '/marketing/whatsapp-engine/audience';

// ── Style helpers ──────────────────────────────────────────────────────────────
const btn = (bg, color = '#fff', disabled = false) => ({
  background: disabled ? '#e5e7eb' : bg,
  color: disabled ? '#9ca3af' : color,
  border: 'none', borderRadius: 6, padding: '8px 16px',
  fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
  whiteSpace: 'nowrap',
});

// ── Camera Stage ───────────────────────────────────────────────────────────────
function CameraStage({ onCapture, onSwitchToUpload }) {
  const videoRef   = useRef(null);
  const streamRef  = useRef(null);
  const [ready,    setReady]    = useState(false);
  const [captured, setCaptured] = useState(null);
  const [camErr,   setCamErr]   = useState('');

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } } })
      .then(stream => {
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; }
        setReady(true);
      })
      .catch(e => {
        if (!cancelled) setCamErr(e?.message || 'Camera unavailable');
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width  = video.videoWidth  || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    stopStream();
    setCaptured(dataUrl);
  };

  const retake = () => {
    setCaptured(null);
    // Re-mount triggers useEffect which restarts the stream.
    // Simplest: navigate back and let parent remount.
    onSwitchToUpload(); // fallback — parent will let user pick again
  };

  if (camErr) {
    return (
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 28, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📷</div>
        <div style={{ fontWeight: 600, color: '#374151', marginBottom: 8 }}>Camera unavailable</div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 20 }}>{camErr}</div>
        <button style={btn('#0d6efd')} onClick={onSwitchToUpload}>Switch to Upload</button>
      </div>
    );
  }

  if (captured) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: '#111827' }}>Captured</div>
          <img src={captured} alt="Card" style={{ width: '100%', borderRadius: 8, marginBottom: 16, objectFit: 'contain', maxHeight: 280 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ ...btn('#f3f4f6', '#374151'), flex: 1 }} onClick={retake}>Retake</button>
            <button style={{ ...btn('#0d6efd'), flex: 2 }} onClick={() => onCapture(captured)}>Fill Details →</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <div style={{ background: '#000', borderRadius: 10, overflow: 'hidden', marginBottom: 16, position: 'relative', aspectRatio: '4/3' }}>
        <video
          ref={videoRef}
          autoPlay playsInline muted
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        {!ready && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13 }}>
            Starting camera…
          </div>
        )}
        {/* Card outline guide */}
        {ready && (
          <div style={{ position: 'absolute', inset: '15%', border: '2px dashed rgba(255,255,255,0.6)', borderRadius: 8, pointerEvents: 'none' }} />
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button style={btn('#f3f4f6', '#374151')} onClick={onSwitchToUpload}>Switch to Upload</button>
        <button style={btn('#dc3545', '#fff', !ready)} onClick={capture} disabled={!ready}>
          📷 Capture
        </button>
      </div>
      <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 10 }}>
        Position the card within the guide box.
      </div>
    </div>
  );
}

// ── Upload Stage ───────────────────────────────────────────────────────────────
function UploadStage({ onCapture, onSwitchToCamera }) {
  const fileRef  = useRef(null);
  const [preview, setPreview] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 28 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 16 }}>Upload Card Image</div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />

        {preview ? (
          <>
            <img src={preview} alt="Card" style={{ width: '100%', borderRadius: 8, marginBottom: 16, objectFit: 'contain', maxHeight: 280 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...btn('#f3f4f6', '#374151'), flex: 1 }} onClick={() => { setPreview(null); fileRef.current.value = ''; }}>Change</button>
              <button style={{ ...btn('#0d6efd'), flex: 2 }} onClick={() => onCapture(preview)}>Fill Details →</button>
            </div>
          </>
        ) : (
          <>
            <div
              onClick={() => fileRef.current?.click()}
              style={{ border: '2px dashed #d1d5db', borderRadius: 10, padding: '40px 24px', textAlign: 'center', cursor: 'pointer', background: '#f9fafb', marginBottom: 16 }}
            >
              <div style={{ fontSize: 36, marginBottom: 10 }}>🖼</div>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#374151' }}>Click to choose image</div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>JPG, PNG, HEIC</div>
            </div>
            <button style={{ ...btn('#f3f4f6', '#374151'), width: '100%' }} onClick={onSwitchToCamera}>
              📷 Use Camera Instead
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Preview / Edit Stage ───────────────────────────────────────────────────────
function PreviewStage({ cardImage, onBack, onSaved }) {
  const [form, setForm] = useState({
    phone: '', mobile_2: '', email: '', customer_name: '', company: '',
    address: '', city: '', state: '', country: '', gst: '',
    business_type: '', source: 'visiting_card', notes: '',
  });
  const [busy,    setBusy]    = useState(false);
  const [err,     setErr]     = useState('');
  const [success, setSuccess] = useState('');

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const phone = form.phone.replace(/[^\d+]/g, '');
    const email = form.email.trim();
    if (!phone && !email) { setErr('Enter at least a phone number or email address'); return null; }
    return { ...form, phone: phone || null, email: email || null };
  };

  const saveToPromo = async () => {
    const data = validate(); if (!data) return;
    setBusy(true); setErr(''); setSuccess('');
    try {
      const r = await apiFetch(PROMO_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone:         data.phone,
          mobile_2:      data.mobile_2 || null,
          email:         data.email,
          name:          data.customer_name || null,
          customer_name: data.customer_name || null,
          company:       data.company || null,
          address:       data.address || null,
          city:          data.city || null,
          state:         data.state || null,
          country:       data.country || null,
          gst:           data.gst || null,
          business_type: data.business_type || null,
          source:        'visiting_card',
          notes:         data.notes || null,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.message || `Error ${r.status}`);
      setSuccess('Saved to Promotional DB');
      onSaved('/database/promotional');
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const saveToCustomer = async () => {
    const data = validate(); if (!data) return;
    setBusy(true); setErr(''); setSuccess('');
    try {
      const r = await apiFetch('/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName:  data.customer_name || 'Unknown',
          companyName:  data.company || data.customer_name || 'Unknown',
          mobile1:      data.phone || null,
          mobile2:      data.mobile_2 || null,
          email:        data.email || null,
          address:      data.address || null,
          city:         data.city || null,
          state:        data.state || null,
          country:      data.country || null,
          gstNumber:    data.gst || null,
          tag:          data.business_type || null,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.message || `Error ${r.status}`);
      setSuccess(`Saved to Customer DB: ${data.company || data.customer_name || data.phone}`);
      onSaved('/customers');
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const inp = (label, key, hint = '', type = 'text') => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, marginBottom: 3 }}>{label.toUpperCase()}</div>
      <input
        type={type} value={form[key]} onChange={set(key)} placeholder={hint}
        style={{ width: '100%', padding: '7px 9px', border: '1px solid #d1d5db', borderRadius: 5, fontSize: 12, boxSizing: 'border-box' }}
      />
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px,1fr) minmax(280px,1.4fr)', gap: 20, maxWidth: 760, margin: '0 auto' }}>

      {/* Card image */}
      <div>
        <div style={{ fontWeight: 600, fontSize: 13, color: '#374151', marginBottom: 10 }}>Card</div>
        <img src={cardImage} alt="Visiting card" style={{ width: '100%', borderRadius: 8, border: '1px solid #e2e8f0', objectFit: 'contain', maxHeight: 260, background: '#f8fafc' }} />
        <button style={{ ...btn('#f3f4f6', '#374151'), width: '100%', marginTop: 12 }} onClick={onBack}>← Retake / Re-upload</button>
      </div>

      {/* Form */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20, overflowY: 'auto', maxHeight: '75vh' }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 4 }}>Fill Details</div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 14 }}>Read the card. Nothing saves until you choose a destination.</div>

        <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact</div>
        {inp('Contact Name', 'customer_name', 'Full name')}
        {inp('Company', 'company', 'Company / firm')}
        {inp('Email', 'email', 'email@example.com', 'email')}

        <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', margin: '12px 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone</div>
        {inp('Mobile 1 (with country code)', 'phone', '919876543210', 'tel')}
        {inp('Mobile 2', 'mobile_2', '919876543211', 'tel')}

        <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', margin: '12px 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location</div>
        {inp('Address', 'address', 'Street / area')}
        {inp('City', 'city', 'City')}
        {inp('State', 'state', 'State')}
        {inp('Country', 'country', 'Country')}

        <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', margin: '12px 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Business</div>
        {inp('Business Type', 'business_type', 'Retailer, Wholesaler…')}
        {inp('GST Number', 'gst', 'GST123456789')}
        {inp('Notes', 'notes', 'Any notes')}

        {err     && <div style={{ fontSize: 12, color: '#dc3545', margin: '10px 0' }}>{err}</div>}
        {success && <div style={{ fontSize: 12, color: '#166534', background: '#dcfce7', padding: '7px 10px', borderRadius: 6, margin: '10px 0' }}>{success}</div>}

        {!success && (
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14, marginTop: 8 }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10, fontWeight: 600 }}>Choose where to save:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button style={btn('#0d6efd', '#fff', busy)} onClick={saveToPromo}    disabled={busy}>Save to Promotional DB</button>
              <button style={btn('#166534', '#fff', busy)} onClick={saveToCustomer} disabled={busy}>Save to Customer DB</button>
            </div>
            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 10, lineHeight: 1.5 }}>
              Phone or email required (not both).<br />
              Promotional DB → WhatsApp campaigns · Customer DB → full CRM record.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function VisitingCardReader() {
  const navigate = useNavigate();
  // 'pick' → mode selector; 'camera' | 'upload' → capture; 'preview' → edit+save
  const [stage,   setStage]   = useState('pick');
  const [cardImg, setCardImg] = useState(null);

  const handleCapture = useCallback((imgUrl) => {
    setCardImg(imgUrl);
    setStage('preview');
  }, []);

  const handleSaved = useCallback((dest) => {
    setTimeout(() => navigate(dest), 1200);
  }, [navigate]);

  return (
    <PageLayout
      title="Visiting Card Reader"
      subtitle="Scan or upload a card — review details — choose where to save"
    >
      <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 32 }}>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 12 }}>
          {[
            { key: 'pick',    label: '1. Choose Method' },
            { key: 'camera',  label: '2. Capture'       },
            { key: 'upload',  label: '2. Upload'        },
            { key: 'preview', label: '3. Review & Save' },
          ].filter(s => stage === 'pick'
              ? ['pick','camera','preview'].includes(s.key)
              : stage === 'camera' || stage === 'upload'
                ? s.key === 'pick' || s.key === stage || s.key === 'preview'
                : s.key !== 'camera' && s.key !== 'upload')
            .map(({ key, label }, i, arr) => (
            <React.Fragment key={key}>
              <span style={{ fontWeight: (stage === key || (stage === 'camera' && key === 'camera') || (stage === 'upload' && key === 'upload')) ? 700 : 400, color: stage === key ? '#0d6efd' : '#9ca3af' }}>
                {label}
              </span>
              {i < arr.length - 1 && <span style={{ color: '#d1d5db' }}>→</span>}
            </React.Fragment>
          ))}
        </div>

        {/* Mode picker */}
        {stage === 'pick' && (
          <div style={{ maxWidth: 400, margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { icon: '📷', label: 'Scan Card', sub: 'Use camera', action: () => setStage('camera') },
                { icon: '🖼',  label: 'Upload Image', sub: 'From gallery or files', action: () => setStage('upload') },
              ].map(({ icon, label, sub, action }) => (
                <button
                  key={label}
                  onClick={action}
                  style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '28px 16px', cursor: 'pointer', textAlign: 'center', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#0d6efd'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                >
                  <div style={{ fontSize: 36, marginBottom: 10 }}>{icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{label}</div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{sub}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {stage === 'camera' && (
          <CameraStage
            onCapture={handleCapture}
            onSwitchToUpload={() => setStage('upload')}
          />
        )}

        {stage === 'upload' && (
          <UploadStage
            onCapture={handleCapture}
            onSwitchToCamera={() => setStage('camera')}
          />
        )}

        {stage === 'preview' && cardImg && (
          <PreviewStage
            cardImage={cardImg}
            onBack={() => setStage('pick')}
            onSaved={handleSaved}
          />
        )}
      </div>
    </PageLayout>
  );
}
