import { useState } from 'react';
import axios from 'axios';
import api from '../api';

export default function AdminSync() {
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState('');

  const startSync = async () => {
    if (!window.confirm("আপনি কি নিশ্চিত যে আপনি ডাটাবেস সিঙ্ক শুরু করতে চান? এটি কয়েক মিনিট সময় নিতে পারে।")) {
      return;
    }

    setSyncing(true);
    setProgress(0);
    setError('');
    setStatusText('শুরু হচ্ছে...');

    try {
      for (let i = 1; i <= 114; i++) {
        setStatusText(`সূরা ${i}/114 ডাউনলোড হচ্ছে...`);
        // We use raw axios with the API base URL just to bypass auth if not needed for admin route,
        // or we can use our `api` instance if we want. We'll use `api` since it handles base URL properly.
        await api.post(`/admin/seed-chapter/${i}`);
        
        setProgress(Math.round((i / 114) * 100));
      }
      
      setStatusText('✅ সিঙ্ক সম্পূর্ণ হয়েছে! সমস্ত ১১৩ টি সূরা ডাটাবেসে সেভ করা হয়েছে।');
    } catch (err) {
      console.error(err);
      setError(`ত্রুটি: সূরা লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 p-8 text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">ডাটাবেস সিঙ্ক (Database Sync)</h2>
        <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
          যেহেতু সাইটটি Vercel-এ হোস্ট করা আছে, তাই ডাটাবেসে সূরার আয়াতগুলো সিঙ্ক করতে এই বাটনটি ব্যবহার করুন। 
          এটি ১ থেকে ১১৪ নম্বর সূরা পর্যন্ত একে একে ডাউনলোড করে মঙ্গোডিবি-তে (MongoDB) সেভ করবে।
        </p>

        {error && (
          <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl border border-red-100">
            {error}
          </div>
        )}

        <div className="mb-8">
          <button
            onClick={startSync}
            disabled={syncing}
            className={`px-8 py-4 rounded-xl font-bold text-lg text-white shadow-lg transition-all transform hover:scale-105 active:scale-95 ${
              syncing 
                ? 'bg-gray-400 cursor-not-allowed shadow-none hover:scale-100' 
                : 'bg-gradient-to-r from-primary-600 to-primary-500 hover:shadow-primary-500/30'
            }`}
          >
            {syncing ? 'সিঙ্কিং চলছে...' : 'আয়াত সিঙ্ক শুরু করুন'}
          </button>
        </div>

        {(syncing || progress > 0) && (
          <div className="max-w-xl mx-auto mt-8">
            <div className="flex justify-between text-sm font-semibold text-gray-700 mb-2">
              <span>{statusText}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
              <div 
                className="bg-gradient-to-r from-primary-500 to-emerald-400 h-4 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
