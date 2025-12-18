import React, { useState, useEffect } from 'react';

const AdminModelSelector = () => {
  const [modelName, setModelName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  // Backend URL (Defaulting to port 8000 as per your ResultsStep configuration)
  const API_URL = "http://127.0.0.1:8000"; 

  useEffect(() => {
    if (isOpen) {
      fetch(`${API_URL}/admin/model-name`)
        .then(res => res.json())
        .then(data => setModelName(data.model_name))
        .catch(err => console.error("Failed to fetch model", err));
    }
  }, [isOpen]);

  const handleSave = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/admin/model-name`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_name: modelName })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setMessage('Saved!');
        setTimeout(() => setMessage(''), 2000);
      } else {
        setMessage('Error');
      }
    } catch (error) {
      setMessage('Network Error');
    }
    setLoading(false);
  };

  return (
    <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--input-border, #333)' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
            background: 'none', border: 'none', width: '100%', 
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            color: 'var(--text-secondary, #888)', cursor: 'pointer', fontSize: '0.9rem'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>⚙️</span> Admin Configuration
        </span>
        <span>{isOpen ? '▼' : '▶'}</span>
      </button>
      
      {isOpen && (
        <div style={{ marginTop: '1rem', animation: 'fadeIn 0.3s ease-in-out' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary, #888)', marginBottom: '0.5rem' }}>
              LLM Model Name
            </label>
            <input 
              type="text" 
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              style={{
                  width: '100%', padding: '12px', borderRadius: '8px',
                  border: '2px solid var(--input-border, #444)',
                  backgroundColor: 'var(--input-bg, #222)',
                  color: 'var(--input-text, #fff)',
                  fontSize: '1rem', outline: 'none'
              }}
              placeholder="e.g. openrouter/mistralai/devstral-2512:free"
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #666)', marginTop: '0.4rem' }}>
              Format: <code>openrouter/vendor/model-name</code>
            </div>
          </div>
          
          <button 
            onClick={handleSave}
            disabled={loading}
            style={{
                width: '100%', padding: '10px', borderRadius: '8px',
                border: 'none',
                backgroundColor: loading ? '#4a5568' : '#3182ce',
                color: 'white', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '1rem'
            }}
          >
            {loading ? 'Updating...' : 'Save Configuration'}
          </button>
          
          {message && (
            <p style={{ textAlign: 'center', fontSize: '0.9rem', marginTop: '0.5rem', color: message.includes('Error') ? '#fc8181' : '#68d391' }}>
              {message}
            </p>
          )}
          
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            Changes apply to the next request.
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminModelSelector;
