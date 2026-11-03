import React, { useState } from 'react';
import { 
  Plus, Image as ImageIcon, X, Car, Bike, 
  MapPin, DollarSign, Calendar, Gauge, Fuel, 
  Settings2, Info, AlertCircle, CheckCircle2, FileText, Upload
} from 'lucide-react';
import { apiClient } from '../utils/apiClient';
import { ListingStatus, VehicleType } from '../types';

interface VehicleListingFormProps {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

const VehicleListingForm: React.FC<VehicleListingFormProps> = ({ initialData, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState(initialData || {
    title: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    price: 0,
    mileage: 0,
    fuelType: 'Petrol',
    transmission: 'Automatic',
    engineSize: 1500,
    bodyType: 'Sedan',
    color: '',
    description: '',
    vehicleType: 'CAR' as 'CAR' | 'MOTORCYCLE',
    location: 'Nairobi',
    vin: '',
    images: [] as string[],
    scanReportUrl: '',
    auctionSheetUrl: '',
    isImported: false
  });

  const [imageUrl, setImageUrl] = useState('');
  const [isResizing, setIsResizing] = useState(false);
  const [uploadingReport, setUploadingReport] = useState(false);
  const [uploadingAuctionSheet, setUploadingAuctionSheet] = useState(false);

  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [years, setYears] = useState<number[]>([]);

  React.useEffect(() => {
    const fetchMakes = async () => {
      try {
        const res = await apiClient.get('/import-calculator/crsp/makes');
        setMakes(res.data);
      } catch (e) {
        console.error('Error fetching makes', e);
      }
    };
    fetchMakes();
  }, []);

  React.useEffect(() => {
    if (formData.make) {
      const fetchModels = async () => {
        try {
          const res = await apiClient.get(`/import-calculator/crsp/models?make=${formData.make}`);
          setModels(res.data);
        } catch (e) {
          console.error('Error fetching models', e);
        }
      };
      fetchModels();
    }
  }, [formData.make]);

  React.useEffect(() => {
    if (formData.make && formData.model) {
      const fetchYears = async () => {
        try {
          const res = await apiClient.get(`/import-calculator/crsp/years?make=${formData.make}&model=${formData.model}`);
          setYears(res.data);
        } catch (e) {
          console.error('Error fetching years', e);
        }
      };
      fetchYears();
    }
  }, [formData.make, formData.model]);

  const resizeImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas to Blob failed'));
          }, 'image/jpeg', 0.8);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remainingSlots = 10 - formData.images.length;
    if (remainingSlots <= 0) {
      setError('Maximum 10 images allowed.');
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    setIsResizing(true);
    setError(null);

    try {
      const uploadedUrls: string[] = [];
      for (const file of filesToProcess) {
        const resizedBlob = await resizeImage(file);
        const uploadFormData = new FormData();
        uploadFormData.append('file', resizedBlob, 'vehicle_image.jpg');

        const res = await apiClient.post('/upload', uploadFormData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        uploadedUrls.push(res.data.url);
      }

      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls]
      }));
      
      if (files.length > remainingSlots) {
        setError(`Only ${remainingSlots} images were added. Maximum 10 images allowed.`);
      }
    } catch (err: any) {
      setError('Failed to upload images. Please try again.');
      console.error(err);
    } finally {
      setIsResizing(false);
    }
  };

  const handleAddImage = () => {
    if (imageUrl && !formData.images.includes(imageUrl)) {
      setFormData({ ...formData, images: [...formData.images, imageUrl] });
      setImageUrl('');
    }
  };

  const removeImage = (url: string) => {
    setFormData({ ...formData, images: formData.images.filter(img => img !== url) });
  };

  const handleReportUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file for the scan report.');
      return;
    }

    setUploadingReport(true);
    setError(null);

    const uploadFormData = new FormData();
    uploadFormData.append('report', file);

    try {
      const res = await apiClient.post('/upload/report', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFormData({ ...formData, scanReportUrl: res.data.url });
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to upload report');
    } finally {
      setUploadingReport(false);
    }
  };

  const handleAuctionSheetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file for the auction sheet.');
      return;
    }

    setUploadingAuctionSheet(true);
    setError(null);

    const uploadFormData = new FormData();
    uploadFormData.append('report', file); // Reusing the same backend field name if it's generic enough, or I should check upload routes

    try {
      const res = await apiClient.post('/upload/report', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFormData({ ...formData, auctionSheetUrl: res.data.url });
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to upload auction sheet');
    } finally {
      setUploadingAuctionSheet(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (initialData?.id) {
        await apiClient.patch(`/marketplace/${initialData.id}`, formData);
      } else {
        await apiClient.post('/marketplace', formData);
      }
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to save listing');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Listing Submitted!</h2>
        <p className="text-gray-500">Your vehicle listing has been submitted for review. It will be live shortly.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden max-w-4xl mx-auto border border-gray-100">
      <div className="bg-masuma-dark p-8 text-white flex justify-between items-center relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black font-display uppercase tracking-wider">List Your Vehicle</h2>
          <p className="text-gray-400 text-sm font-medium">Reach thousands of verified buyers in Kenya.</p>
        </div>
        <button onClick={onCancel} className="relative z-10 p-2 hover:bg-white/10 rounded-full transition-colors">
          <X className="w-8 h-8" />
        </button>
        <Car className="absolute -bottom-6 -right-6 w-32 h-32 text-white/5 rotate-12" />
      </div>

      <form onSubmit={handleSubmit} className="p-10">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 p-5 rounded-2xl mb-8 flex items-center animate-shake">
            <AlertCircle className="w-6 h-6 mr-3 shrink-0" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Basic Info */}
          <div className="space-y-8">
            <h3 className="text-sm font-black text-masuma-dark uppercase tracking-[0.2em] border-b border-gray-100 pb-3 flex items-center">
              <Info className="w-5 h-5 mr-3 text-masuma-orange" />
              Basic Information
            </h3>
            
            <div className="flex gap-4">
              <button 
                type="button"
                onClick={() => setFormData({ ...formData, vehicleType: 'CAR' })}
                className={`flex-1 py-4 rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-300 ${formData.vehicleType === 'CAR' ? 'border-masuma-orange bg-masuma-orange/5 text-masuma-orange shadow-lg shadow-masuma-orange/10' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}
              >
                <Car className="w-6 h-6 mb-1" />
                <span className="text-xs font-black uppercase tracking-widest">Car</span>
              </button>
              <button 
                type="button"
                onClick={() => setFormData({ ...formData, vehicleType: 'MOTORCYCLE' })}
                className={`flex-1 py-4 rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-300 ${formData.vehicleType === 'MOTORCYCLE' ? 'border-masuma-orange bg-masuma-orange/5 text-masuma-orange shadow-lg shadow-masuma-orange/10' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}
              >
                <Bike className="w-6 h-6 mb-1" />
                <span className="text-xs font-black uppercase tracking-widest">Motorcycle</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Listing Title</label>
                <input 
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. 2018 Toyota Land Cruiser Prado"
                  className="w-full rounded-2xl border-gray-100 bg-gray-50/50 p-4 text-sm font-bold focus:ring-2 focus:ring-masuma-orange focus:border-masuma-orange transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Make</label>
                  <input 
                    type="text"
                    required
                    list="makes-list"
                    value={formData.make}
                    onChange={(e) => setFormData({ ...formData, make: e.target.value, model: '' })}
                    placeholder="Toyota"
                    className="w-full rounded-2xl border-gray-100 bg-gray-50/50 p-4 text-sm font-bold focus:ring-2 focus:ring-masuma-orange focus:border-masuma-orange transition-all"
                  />
                  <datalist id="makes-list">
                    {makes.map(m => <option key={m} value={m} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Model</label>
                  <input 
                    type="text"
                    required
                    list="models-list"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="Prado"
                    disabled={!formData.make}
                    className="w-full rounded-2xl border-gray-100 bg-gray-50/50 p-4 text-sm font-bold focus:ring-2 focus:ring-masuma-orange focus:border-masuma-orange transition-all disabled:opacity-50"
                  />
                  <datalist id="models-list">
                    {models.map(m => <option key={m} value={m} />)}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Year</label>
                  <input 
                    type="number"
                    required
                    list="years-list"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                    disabled={!formData.model}
                    className="w-full rounded-2xl border-gray-100 bg-gray-50/50 p-4 text-sm font-bold focus:ring-2 focus:ring-masuma-orange focus:border-masuma-orange transition-all disabled:opacity-50"
                  />
                  <datalist id="years-list">
                    {years.map(y => <option key={y} value={y} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Price (KES)</label>
                  <input 
                    type="number"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full rounded-2xl border-gray-100 bg-gray-50/50 p-4 text-sm font-bold focus:ring-2 focus:ring-masuma-orange focus:border-masuma-orange transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-masuma-orange w-4 h-4" />
                  <input 
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full pl-12 rounded-2xl border-gray-100 bg-gray-50/50 p-4 text-sm font-bold focus:ring-2 focus:ring-masuma-orange focus:border-masuma-orange transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <label className="flex items-center gap-4 cursor-pointer group bg-gray-50 p-4 rounded-2xl border border-gray-100 hover:border-masuma-orange/30 transition-all">
                <div className="relative">
                  <input 
                    type="checkbox"
                    checked={formData.isImported}
                    onChange={(e) => setFormData({ ...formData, isImported: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-masuma-orange"></div>
                </div>
                <div>
                  <span className="block text-xs font-black text-masuma-dark uppercase tracking-widest group-hover:text-masuma-orange transition-colors">Imported Unit</span>
                  <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Ex-Japan / UK / etc</span>
                </div>
              </label>
            </div>
          </div>

          {/* Technical Specs */}
          <div className="space-y-8">
            <h3 className="text-sm font-black text-masuma-dark uppercase tracking-[0.2em] border-b border-gray-100 pb-3 flex items-center">
              <Settings2 className="w-5 h-5 mr-3 text-masuma-orange" />
              Technical Specs
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Mileage (KM)</label>
                  <input 
                    type="number"
                    value={formData.mileage}
                    onChange={(e) => setFormData({ ...formData, mileage: Number(e.target.value) })}
                    className="w-full rounded-2xl border-gray-100 bg-gray-50/50 p-4 text-sm font-bold focus:ring-2 focus:ring-masuma-orange focus:border-masuma-orange transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Engine CC</label>
                  <input 
                    type="number"
                    value={formData.engineSize}
                    onChange={(e) => setFormData({ ...formData, engineSize: Number(e.target.value) })}
                    className="w-full rounded-2xl border-gray-100 bg-gray-50/50 p-4 text-sm font-bold focus:ring-2 focus:ring-masuma-orange focus:border-masuma-orange transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Fuel Type</label>
                  <select 
                    value={formData.fuelType}
                    onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                    className="w-full rounded-2xl border-gray-100 bg-gray-50/50 p-4 text-sm font-bold focus:ring-2 focus:ring-masuma-orange focus:border-masuma-orange transition-all appearance-none"
                  >
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Electric">Electric</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Transmission</label>
                  <select 
                    value={formData.transmission}
                    onChange={(e) => setFormData({ ...formData, transmission: e.target.value })}
                    className="w-full rounded-2xl border-gray-100 bg-gray-50/50 p-4 text-sm font-bold focus:ring-2 focus:ring-masuma-orange focus:border-masuma-orange transition-all appearance-none"
                  >
                    <option value="Automatic">Automatic</option>
                    <option value="Manual">Manual</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">VIN Number</label>
                <input 
                  type="text"
                  value={formData.vin}
                  onChange={(e) => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
                  placeholder="17-character VIN"
                  className="w-full rounded-2xl border-gray-100 bg-gray-50/50 p-4 text-sm font-bold focus:ring-2 focus:ring-masuma-orange focus:border-masuma-orange transition-all"
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Verification Documents</label>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="relative">
                      <input 
                        type="file"
                        accept=".pdf"
                        onChange={handleReportUpload}
                        className="hidden"
                        id="report-upload"
                      />
                      <label 
                        htmlFor="report-upload"
                        className={`w-full flex items-center justify-between py-3 px-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${formData.scanReportUrl ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-100 hover:border-masuma-orange/30 text-gray-400'}`}
                      >
                        <div className="flex items-center gap-3">
                          <FileText className={`w-5 h-5 ${formData.scanReportUrl ? 'text-green-600' : 'text-gray-300'}`} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Scan Report (PDF)</span>
                        </div>
                        {uploadingReport ? (
                          <div className="w-4 h-4 border-2 border-masuma-orange border-t-transparent rounded-full animate-spin" />
                        ) : formData.scanReportUrl ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                      </label>
                    </div>

                    {formData.isImported && (
                      <div className="relative">
                        <input 
                          type="file"
                          accept=".pdf"
                          onChange={handleAuctionSheetUpload}
                          className="hidden"
                          id="auction-sheet-upload"
                        />
                        <label 
                          htmlFor="auction-sheet-upload"
                          className={`w-full flex items-center justify-between py-3 px-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${formData.auctionSheetUrl ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-100 hover:border-masuma-orange/30 text-gray-400'}`}
                        >
                          <div className="flex items-center gap-3">
                            <FileText className={`w-5 h-5 ${formData.auctionSheetUrl ? 'text-purple-600' : 'text-gray-300'}`} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Auction Sheet (PDF)</span>
                          </div>
                          {uploadingAuctionSheet ? (
                            <div className="w-4 h-4 border-2 border-masuma-orange border-t-transparent rounded-full animate-spin" />
                          ) : formData.auctionSheetUrl ? (
                            <CheckCircle2 className="w-5 h-5 text-purple-500" />
                          ) : (
                            <Upload className="w-4 h-4" />
                          )}
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Vehicle Images (Max 10)
                </label>
                <div className="grid grid-cols-1 gap-4 mb-6">
                  <div className="relative">
                    <input 
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                      disabled={isResizing || formData.images.length >= 10}
                    />
                    <label 
                      htmlFor="image-upload"
                      className={`w-full flex flex-col items-center justify-center py-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${formData.images.length >= 10 ? 'bg-gray-50 border-gray-200 cursor-not-allowed' : 'border-gray-100 hover:border-masuma-orange/30 bg-gray-50/50'}`}
                    >
                      {isResizing ? (
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 border-4 border-masuma-orange border-t-transparent rounded-full animate-spin mb-2" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-masuma-orange">Processing & Resizing...</span>
                        </div>
                      ) : (
                        <>
                          <ImageIcon className={`w-10 h-10 mb-2 ${formData.images.length >= 10 ? 'text-gray-300' : 'text-masuma-orange'}`} />
                          <span className="text-xs font-black uppercase tracking-widest text-gray-900">
                            {formData.images.length >= 10 ? 'Limit Reached' : 'Click to Upload Images'}
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold mt-1">
                            {formData.images.length}/10 Images • Auto-resized for speed
                          </span>
                        </>
                      )}
                    </label>
                  </div>

                  <div className="relative flex items-center gap-2">
                    <div className="flex-grow h-px bg-gray-100"></div>
                    <span className="text-[8px] font-black text-gray-300 uppercase tracking-[0.3em]">OR PASTE URL</span>
                    <div className="flex-grow h-px bg-gray-100"></div>
                  </div>

                  <div className="flex gap-3">
                    <input 
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="Paste image URL"
                      className="flex-grow rounded-2xl border-gray-100 bg-gray-50/50 p-4 text-sm font-bold focus:ring-2 focus:ring-masuma-orange focus:border-masuma-orange transition-all"
                    />
                    <button 
                      type="button"
                      onClick={handleAddImage}
                      disabled={formData.images.length >= 10}
                      className="bg-masuma-dark text-white p-4 rounded-2xl hover:bg-black transition-all shadow-lg disabled:bg-gray-300"
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-3">
                  {formData.images.map((img, index) => (
                    <div key={index} className="relative aspect-square rounded-2xl overflow-hidden border border-gray-100 group shadow-sm">
                      <img src={img} alt={`Vehicle ${index + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button 
                          type="button"
                          onClick={() => removeImage(img)}
                          className="bg-red-500 text-white rounded-full p-2 shadow-xl transform scale-75 group-hover:scale-100 transition-transform"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase">
                        {index === 0 ? 'Main' : `#${index + 1}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Description</label>
          <textarea 
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe the condition, history, and features..."
            className="w-full rounded-2xl border-gray-100 bg-gray-50/50 p-5 text-sm font-bold focus:ring-2 focus:ring-masuma-orange focus:border-masuma-orange transition-all"
          />
        </div>

        <div className="mt-12 flex gap-6">
          <button 
            type="button"
            onClick={onCancel}
            className="flex-1 py-5 border border-gray-100 text-gray-400 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button 
            type="submit"
            disabled={loading}
            className="flex-[2] py-5 bg-masuma-orange text-white rounded-2xl font-black uppercase tracking-widest hover:bg-masuma-orange-dark transition-all disabled:bg-gray-200 shadow-xl shadow-masuma-orange/20"
          >
            {loading ? 'Submitting...' : 'Post Vehicle Listing'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default VehicleListingForm;
