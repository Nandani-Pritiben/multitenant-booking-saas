import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Layout from '../../components/layout/Layout';

interface Business {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  email: string;
  phone: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function Dashboard() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkBusiness();
  }, []);

  const checkBusiness = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/login');
      return;
    }

    const { data } = await supabase
      .from('business_members')
      .select('business_id')
      .eq('user_id', user.id)
      .single();

    if (!data) {
      navigate('/onboarding');
      return;
    }

    const { data: businessData } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', data.business_id)
      .single();

    setBusiness(businessData);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Business not found. Redirecting to onboarding...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {business.name}!
        </h1>
        <p className="text-gray-600 mt-1">
          Business: <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{business.slug}</span>
          <br />
          Timezone: <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{business.timezone}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Appointments</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 4h4m-4 4h4m-4 4h4M4 16v4m0 0h4m-4-4l4-4 4 4m8 4v4m0 0h4m-4-4l-4-4-4 4m8-4v4m0 0h4m-4-4l-4-4-4 4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Providers</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-1a4 4 0 00-3-3.87M9 20H4a1 1 0 01-1-1v-4a1 1 0 011-1h4a4 4 0 013 3.87M16 3.13a4 4 0 010 7.75M14 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Clients</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-1a4 4 0 00-3-3.87M9 20H4a1 1 0 01-1-1v-4a1 1 0 011-1h4a4 4 0 013 3.87M16 3.13a4 4 0 010 7.75M14 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
            <h4 className="font-medium text-gray-900">Services</h4>
            <p className="text-sm text-gray-500">Manage your services</p>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
            <h4 className="font-medium text-gray-900">Providers</h4>
            <p className="text-sm text-gray-500">Manage your providers</p>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
            <h4 className="font-medium text-gray-900">Bookings</h4>
            <p className="text-sm text-gray-500">View and manage bookings</p>
          </button>
        </div>
      </div>
    </Layout>
  );
}

