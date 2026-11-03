
import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Save, Shield, Activity, MapPin, Loader2 } from 'lucide-react';
import { apiClient } from '../../utils/apiClient';

const Profile: React.FC = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
      const u = localStorage.getItem('masuma_user');
      if (u) {
          const parsed = JSON.parse(u);
          setUser(parsed);
          const names = parsed.name?.split(' ') || ['User'];
          setFormData(prev => ({ ...prev, firstName: names[0], lastName: names.slice(1).join(' ') }));
      }
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
        alert("New passwords do not match");
        return;
    }
    
    setIsSaving(true);
    try {
        await apiClient.put('/auth/profile', {
            firstName: formData.firstName,
            lastName: formData.lastName,
            currentPassword: formData.currentPassword,
            newPassword: formData.newPassword
        });
        alert('Profile updated successfully');
        setFormData(prev => ({...prev, currentPassword: '', newPassword: '', confirmPassword: ''}));
    } catch (error: any) {
        alert(error.response?.data?.error || 'Failed to update profile');
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-masuma-dark font-display uppercase">My Profile</h2>
          <p className="text-sm text-gray-500">Manage your account settings and preferences.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden text-center">
            <div className="h-32 bg-masuma-dark"></div>
            <div className="px-6 pb-6">
              <div className="w-24 h-24 rounded-full bg-gray-200 border-4 border-white mx-auto -mt-12 flex items-center justify-center text-2xl font-bold text-gray-500 mb-4 uppercase">
                {user?.name?.charAt(0) || 'A'}
              </div>
              <h3 className="text-xl font-bold text-masuma-dark">{user?.name || 'Admin User'}</h3>
              <p className="text-sm text-gray-500 mb-4 uppercase">{user?.role || 'Staff'}</p>
              
              <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase text-green-600 bg-green-50 py-2 rounded mb-6">
                <Shield size={14} /> Active Account
              </div>

              <div className="text-left space-y-3 border-t border-gray-100 pt-4">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Mail size={16} className="text-masuma-orange" /> {user?.email || 'admin@masuma.africa'}
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <MapPin size={16} className="text-masuma-orange" /> {user?.branch?.name || 'Nairobi HQ'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h3 className="font-bold text-masuma-dark uppercase border-b border-gray-100 pb-2 mb-6 flex items-center gap-2">
              <User size={18} /> Account Details
            </h3>
            
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-500">First Name</label>
                  <input 
                    type="text" 
                    value={formData.firstName}
                    onChange={e => setFormData({...formData, firstName: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded focus:border-masuma-orange outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-500">Last Name</label>
                  <input 
                    type="text" 
                    value={formData.lastName}
                    onChange={e => setFormData({...formData, lastName: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded focus:border-masuma-orange outline-none" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-gray-500">Email Address</label>
                <input type="email" value={user?.email || ''} className="w-full p-3 border border-gray-300 rounded focus:border-masuma-orange outline-none bg-gray-50 cursor-not-allowed" disabled />
              </div>

              <div className="pt-6">
                <h3 className="font-bold text-masuma-dark uppercase border-b border-gray-100 pb-2 mb-6 flex items-center gap-2">
                  <Lock size={18} /> Security
                </h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-gray-500">Current Password</label>
                    <input 
                        type="password" 
                        value={formData.currentPassword}
                        onChange={e => setFormData({...formData, currentPassword: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded focus:border-masuma-orange outline-none" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-gray-500">New Password</label>
                    <input 
                        type="password" 
                        value={formData.newPassword}
                        onChange={e => setFormData({...formData, newPassword: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded focus:border-masuma-orange outline-none" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-gray-500">Confirm New Password</label>
                    <input 
                        type="password" 
                        value={formData.confirmPassword}
                        onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded focus:border-masuma-orange outline-none" 
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 flex justify-end">
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="bg-masuma-dark text-white px-8 py-3 rounded font-bold uppercase tracking-widest text-sm hover:bg-masuma-orange transition shadow-lg flex items-center gap-2 disabled:opacity-70"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} 
                  {isSaving ? 'Saving...' : 'Update Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
