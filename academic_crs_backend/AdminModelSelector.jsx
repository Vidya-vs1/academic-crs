import React, { useState, useEffect } from 'react';

const AdminModelSelector = () => {
  const [modelName, setModelName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  // Adjust this URL if your backend runs on a different port (e.g. 5000)
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
    <div className="mt-6 pt-6 border-t border-gray-700">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-xs font-medium text-gray-400 hover:text-white transition-colors"
      >
        <span className="flex items-center gap-2">
          <span>⚙️</span> Admin Configuration
        </span>
        <span>{isOpen ? '▼' : '▶'}</span>
      </button>
      
      {isOpen && (
        <div className="mt-3 space-y-3 animate-fadeIn">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">
              LLM Model Name
            </label>
            <input 
              type="text" 
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="w-full bg-gray-900/50 text-gray-200 text-xs p-2 rounded border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              placeholder="e.g. openrouter/mistralai/..."
            />
          </div>
          
          <button 
            onClick={handleSave}
            disabled={loading}
            className={`w-full py-1.5 px-3 rounded text-xs font-medium transition-all ${
              loading 
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
            }`}
          >
            {loading ? 'Updating...' : 'Save Configuration'}
          </button>
          
          {message && (
            <p className={`text-xs text-center ${message.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>
              {message}
            </p>
          )}
          
          <div className="text-[10px] text-gray-600 leading-relaxed">
            Changes apply to next request.
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminModelSelector;
