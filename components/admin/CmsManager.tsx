
import React, { useState, useEffect, useRef } from 'react';
import { Save, Layout, Megaphone, Image as ImageIcon, Check, Loader2, FileText, Phone, MapPin, Mail, Columns, Plus, Trash2, ArrowUp, ArrowDown, UploadCloud, Video, Youtube } from 'lucide-react';
import { apiClient } from '../../utils/apiClient';
import { HeroSlide, ViewState } from '../../types';

const CmsManager: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'hero' | 'announcement' | 'layout'>('hero');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Default Slide State
    const [slides, setSlides] = useState<HeroSlide[]>([]);
    const [editingSlideId, setEditingSlideId] = useState<string | null>(null);

    const [config, setConfig] = useState({
        CMS_ANNOUNCEMENT_TEXT: 'Free delivery in Nairobi CBD for orders over KES 5,000',
        CMS_ANNOUNCEMENT_ENABLED: 'true',
        CMS_ANNOUNCEMENT_COLOR: '#E0621B',
        CMS_HEADER_PHONE: '+254 792 506 590',
        CMS_FOOTER_ABOUT: 'Masuma Autoparts East Africa Limited. The official distributor of certified Masuma components. Engineering you can trust for the African road.',
        CMS_CONTACT_ADDRESS: 'Ruby Mall, Shop FF25 First Floor Behind NCBA Bank Accra Road',
        CMS_CONTACT_EMAIL: 'sales@masuma.africa',
        CMS_CONTACT_PHONE: '+254 792 506 590'
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await apiClient.get('/settings');
                const s = res.data;
                
                if (s) {
                    setConfig(prev => ({ ...prev, ...s }));
                    
                    // Handle Slides: Check for new JSON format, otherwise fallback to legacy single fields
                    if (s.CMS_HERO_SLIDES) {
                        try {
                            setSlides(JSON.parse(s.CMS_HERO_SLIDES));
                        } catch (e) {
                            console.error("Error parsing slides JSON", e);
                        }
                    } else if (s.CMS_HERO_TITLE) {
                        // Migration: Convert legacy static hero to first slide
                        setSlides([{
                            id: 'legacy-1',
                            title: s.CMS_HERO_TITLE,
                            subtitle: s.CMS_HERO_SUBTITLE || '',
                            image: s.CMS_HERO_IMAGE || '',
                            mediaType: 'image',
                            ctaText: 'Browse Catalog',
                            ctaLink: 'CATALOG'
                        }]);
                    } else {
                        // Default
                        setSlides([{
                            id: 'default-1',
                            title: 'JAPANESE\nPRECISION.\nKENYAN GRIT.',
                            subtitle: 'Upgrade your ride with parts engineered to survive Nairobi\'s toughest roads.',
                            image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80',
                            mediaType: 'image',
                            ctaText: 'Browse Catalog',
                            ctaLink: 'CATALOG'
                        }]);
                    }
                }
            } catch (error) {
                console.error('Failed to load CMS settings', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleChange = (key: string, value: string) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    // Slide Operations
    const addSlide = () => {
        const newSlide: HeroSlide = {
            id: Date.now().toString(),
            title: 'New Promotion Headline',
            subtitle: 'Description of the offer or product highlight.',
            image: 'https://via.placeholder.com/1200x600',
            mediaType: 'image',
            ctaText: 'Shop Now',
            ctaLink: 'CATALOG'
        };
        setSlides([...slides, newSlide]);
        setEditingSlideId(newSlide.id);
    };

    const removeSlide = (id: string) => {
        if (slides.length <= 1) {
            alert("You must have at least one slide.");
            return;
        }
        if (confirm("Delete this slide?")) {
            setSlides(slides.filter(s => s.id !== id));
            if (editingSlideId === id) setEditingSlideId(null);
        }
    };

    const moveSlide = (index: number, direction: 'up' | 'down') => {
        const newSlides = [...slides];
        if (direction === 'up' && index > 0) {
            [newSlides[index], newSlides[index - 1]] = [newSlides[index - 1], newSlides[index]];
        } else if (direction === 'down' && index < newSlides.length - 1) {
            [newSlides[index], newSlides[index + 1]] = [newSlides[index + 1], newSlides[index]];
        }
        setSlides(newSlides);
    };

    const updateSlide = (id: string, field: keyof HeroSlide, value: string) => {
        setSlides(slides.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, slideId: string, field: 'image' | 'videoUrl') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const uploadData = new FormData();
        uploadData.append('file', file);
        uploadData.append('image', file);

        try {
            // Simplified call (no manual headers)
            const res = await apiClient.post('/upload', uploadData);
            if (res.data && res.data.url) {
                updateSlide(slideId, field, res.data.url);
            } else {
                throw new Error("Invalid response");
            }
        } catch (error: any) {
            const errMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown Error';
            alert('Upload failed: ' + errMsg);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const payload = {
                ...config,
                CMS_HERO_SLIDES: JSON.stringify(slides)
            };
            await apiClient.post('/settings', payload);
        } catch (error) {
            alert('Failed to save changes');
        } finally {
            setTimeout(() => setIsSaving(false), 1000);
        }
    };

    if (isLoading) return <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-masuma-orange" /></div>;

    return (
        <div className="max-w-5xl mx-auto h-full flex flex-col">
             <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-masuma-dark font-display uppercase">Frontend Editor</h2>
                    <p className="text-sm text-gray-500">Manage Hero Carousel, Announcements, and Contact Info.</p>
                </div>
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-masuma-dark text-white px-6 py-3 rounded font-bold uppercase tracking-widest text-sm hover:bg-masuma-orange transition shadow-lg flex items-center gap-2 disabled:opacity-70"
                >
                    {isSaving ? <Check size={18} /> : <Save size={18} />}
                    {isSaving ? 'Saved!' : 'Publish Changes'}
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row flex-1 min-h-[600px]">
                {/* Sidebar Tabs */}
                <div className="w-full md:w-64 bg-gray-50 border-r border-gray-200 flex md:flex-col overflow-x-auto md:overflow-visible flex-shrink-0">
                    <button 
                        onClick={() => setActiveTab('hero')}
                        className={`w-full text-left px-6 py-4 font-bold text-sm flex items-center gap-3 whitespace-nowrap ${activeTab === 'hero' ? 'bg-white text-masuma-orange border-l-4 border-masuma-orange' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        <Layout size={18} /> Hero Carousel
                    </button>
                    <button 
                        onClick={() => setActiveTab('announcement')}
                        className={`w-full text-left px-6 py-4 font-bold text-sm flex items-center gap-3 whitespace-nowrap ${activeTab === 'announcement' ? 'bg-white text-masuma-orange border-l-4 border-masuma-orange' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        <Megaphone size={18} /> Announcement Bar
                    </button>
                    <button 
                        onClick={() => setActiveTab('layout')}
                        className={`w-full text-left px-6 py-4 font-bold text-sm flex items-center gap-3 whitespace-nowrap ${activeTab === 'layout' ? 'bg-white text-masuma-orange border-l-4 border-masuma-orange' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        <Columns size={18} /> Header & Footer
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 p-8 overflow-y-auto bg-gray-50/50">
                    {activeTab === 'hero' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center border-b border-gray-200 pb-4">
                                <h3 className="font-bold text-lg uppercase text-masuma-dark">Carousel Slides ({slides.length})</h3>
                                <button onClick={addSlide} className="text-xs font-bold uppercase flex items-center gap-1 bg-masuma-orange text-white px-3 py-2 rounded hover:bg-orange-600 transition">
                                    <Plus size={14} /> Add Slide
                                </button>
                            </div>

                            <div className="space-y-4">
                                {slides.map((slide, index) => (
                                    <div key={slide.id} className={`bg-white border rounded-lg overflow-hidden transition-all duration-200 ${editingSlideId === slide.id ? 'border-masuma-orange shadow-md ring-1 ring-masuma-orange' : 'border-gray-200 hover:border-gray-300'}`}>
                                        {/* Slide Header */}
                                        <div className="p-4 flex justify-between items-center bg-gray-50 border-b border-gray-100">
                                            <div className="flex items-center gap-3">
                                                <span className="bg-gray-200 text-gray-600 text-[10px] font-bold px-2 py-1 rounded">#{index + 1}</span>
                                                <span className="font-bold text-sm text-gray-700 line-clamp-1">{slide.title.replace(/\n/g, ' ')}</span>
                                                {slide.mediaType === 'video' && <Video size={14} className="text-blue-500" />}
                                                {slide.mediaType === 'youtube' && <Youtube size={14} className="text-red-500" />}
                                                {(!slide.mediaType || slide.mediaType === 'image') && <ImageIcon size={14} className="text-green-500" />}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => moveSlide(index, 'up')} disabled={index === 0} className="p-1 text-gray-400 hover:text-masuma-dark disabled:opacity-30"><ArrowUp size={14} /></button>
                                                <button onClick={() => moveSlide(index, 'down')} disabled={index === slides.length - 1} className="p-1 text-gray-400 hover:text-masuma-dark disabled:opacity-30"><ArrowDown size={14} /></button>
                                                <button onClick={() => setEditingSlideId(editingSlideId === slide.id ? null : slide.id)} className="text-xs font-bold text-masuma-orange hover:underline px-2">
                                                    {editingSlideId === slide.id ? 'Close' : 'Edit'}
                                                </button>
                                                <button onClick={() => removeSlide(slide.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                                            </div>
                                        </div>

                                        {/* Slide Editor */}
                                        {editingSlideId === slide.id && (
                                            <div className="p-6 space-y-6 animate-fade-in">
                                                {/* Media Type Selection */}
                                                <div className="bg-gray-50 p-4 rounded border border-gray-200">
                                                    <label className="text-xs font-bold uppercase text-gray-500 block mb-2">Background Media Type</label>
                                                    <div className="flex gap-4">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input 
                                                                type="radio" 
                                                                checked={!slide.mediaType || slide.mediaType === 'image'} 
                                                                onChange={() => updateSlide(slide.id, 'mediaType', 'image')}
                                                            />
                                                            <span className="text-sm font-bold text-gray-700 flex items-center gap-1"><ImageIcon size={14}/> Image</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input 
                                                                type="radio" 
                                                                checked={slide.mediaType === 'video'} 
                                                                onChange={() => updateSlide(slide.id, 'mediaType', 'video')}
                                                            />
                                                            <span className="text-sm font-bold text-gray-700 flex items-center gap-1"><Video size={14}/> Upload Video</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input 
                                                                type="radio" 
                                                                checked={slide.mediaType === 'youtube'} 
                                                                onChange={() => updateSlide(slide.id, 'mediaType', 'youtube')}
                                                            />
                                                            <span className="text-sm font-bold text-gray-700 flex items-center gap-1"><Youtube size={14}/> YouTube Link</span>
                                                        </label>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {/* Content Fields */}
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="text-xs font-bold uppercase text-gray-500 block mb-1">Headline (Use \n for break)</label>
                                                            <textarea 
                                                                value={slide.title} 
                                                                onChange={e => updateSlide(slide.id, 'title', e.target.value)}
                                                                className="w-full p-2 border border-gray-300 rounded focus:border-masuma-orange outline-none text-sm font-display font-bold"
                                                                rows={2}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold uppercase text-gray-500 block mb-1">Subtitle</label>
                                                            <textarea 
                                                                value={slide.subtitle} 
                                                                onChange={e => updateSlide(slide.id, 'subtitle', e.target.value)}
                                                                className="w-full p-2 border border-gray-300 rounded focus:border-masuma-orange outline-none text-sm"
                                                                rows={3}
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="text-xs font-bold uppercase text-gray-500 block mb-1">Button Text</label>
                                                                <input 
                                                                    type="text"
                                                                    value={slide.ctaText}
                                                                    onChange={e => updateSlide(slide.id, 'ctaText', e.target.value)}
                                                                    className="w-full p-2 border border-gray-300 rounded focus:border-masuma-orange outline-none text-sm"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-xs font-bold uppercase text-gray-500 block mb-1">Button Link (View)</label>
                                                                <select 
                                                                    value={slide.ctaLink}
                                                                    onChange={e => updateSlide(slide.id, 'ctaLink', e.target.value)}
                                                                    className="w-full p-2 border border-gray-300 rounded focus:border-masuma-orange outline-none text-sm bg-white"
                                                                >
                                                                    <option value="CATALOG">Catalog</option>
                                                                    <option value="CONTACT">Contact</option>
                                                                    <option value="BLOG">Blog</option>
                                                                    <option value="ABOUT">About</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Media Handling */}
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-bold uppercase text-gray-500 block mb-1">
                                                            {slide.mediaType === 'youtube' ? 'YouTube URL' : slide.mediaType === 'video' ? 'Video File' : 'Image File'}
                                                        </label>

                                                        <div className="relative h-48 bg-gray-100 rounded border border-gray-300 overflow-hidden group">
                                                            {/* Preview */}
                                                            {slide.mediaType === 'image' || !slide.mediaType ? (
                                                                <img src={slide.image} alt="Preview" className="w-full h-full object-cover" />
                                                            ) : slide.mediaType === 'video' ? (
                                                                <video src={slide.videoUrl} className="w-full h-full object-cover" controls />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-black text-white">
                                                                    <Youtube size={48} />
                                                                </div>
                                                            )}

                                                            {/* Overlay Actions (Upload Only) */}
                                                            {slide.mediaType !== 'youtube' && (
                                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                                                    <input 
                                                                        type="file" 
                                                                        ref={fileInputRef}
                                                                        className="hidden" 
                                                                        accept={slide.mediaType === 'video' ? "video/*" : "image/*"} 
                                                                        onChange={(e) => handleFileUpload(e, slide.id, slide.mediaType === 'video' ? 'videoUrl' : 'image')}
                                                                    />
                                                                    <button 
                                                                        onClick={() => fileInputRef.current?.click()}
                                                                        disabled={isUploading}
                                                                        className="bg-white text-masuma-dark px-4 py-2 rounded font-bold text-xs uppercase flex items-center gap-2 hover:bg-masuma-orange hover:text-white transition"
                                                                    >
                                                                        {isUploading ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}
                                                                        Change File
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* URL Inputs */}
                                                        {slide.mediaType === 'youtube' ? (
                                                            <input 
                                                                type="text"
                                                                value={slide.videoUrl || ''}
                                                                onChange={e => updateSlide(slide.id, 'videoUrl', e.target.value)}
                                                                className="w-full p-2 border border-gray-300 rounded focus:border-masuma-orange outline-none text-xs text-gray-500"
                                                                placeholder="https://www.youtube.com/watch?v=..."
                                                            />
                                                        ) : (
                                                            <input 
                                                                type="text"
                                                                value={slide.mediaType === 'video' ? slide.videoUrl : slide.image}
                                                                onChange={e => updateSlide(slide.id, slide.mediaType === 'video' ? 'videoUrl' : 'image', e.target.value)}
                                                                className="w-full p-2 border border-gray-300 rounded focus:border-masuma-orange outline-none text-xs text-gray-500"
                                                                placeholder="Or paste Media URL..."
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'announcement' && (
                        <div className="space-y-6">
                            <h3 className="font-bold text-lg uppercase text-masuma-dark border-b border-gray-100 pb-2 mb-6">Top Bar Announcement</h3>
                            
                            <div className="flex items-center gap-3 mb-4">
                                <input 
                                    type="checkbox" 
                                    className="w-5 h-5 text-masuma-orange rounded focus:ring-masuma-orange" 
                                    checked={config.CMS_ANNOUNCEMENT_ENABLED === 'true'}
                                    onChange={e => handleChange('CMS_ANNOUNCEMENT_ENABLED', String(e.target.checked))}
                                />
                                <span className="text-sm font-bold text-gray-700">Enable Announcement Bar</span>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-gray-500">Message</label>
                                <input 
                                    type="text" 
                                    value={config.CMS_ANNOUNCEMENT_TEXT}
                                    onChange={e => handleChange('CMS_ANNOUNCEMENT_TEXT', e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded focus:border-masuma-orange outline-none" 
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-gray-500">Background Color (Hex)</label>
                                <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 rounded border border-gray-200" style={{ backgroundColor: config.CMS_ANNOUNCEMENT_COLOR }}></div>
                                    <input 
                                        type="text" 
                                        value={config.CMS_ANNOUNCEMENT_COLOR}
                                        onChange={e => handleChange('CMS_ANNOUNCEMENT_COLOR', e.target.value)}
                                        className="w-32 p-2 border border-gray-300 rounded focus:border-masuma-orange outline-none font-mono" 
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'layout' && (
                        <div className="space-y-6">
                             <h3 className="font-bold text-lg uppercase text-masuma-dark border-b border-gray-100 pb-2 mb-6">Header & Footer Details</h3>
                             
                             <div className="space-y-2">
                                 <label className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2"><Phone size={14}/> Header Phone Number</label>
                                 <input 
                                     type="text" 
                                     value={config.CMS_HEADER_PHONE}
                                     onChange={e => handleChange('CMS_HEADER_PHONE', e.target.value)}
                                     className="w-full p-3 border border-gray-300 rounded focus:border-masuma-orange outline-none"
                                     placeholder="+254 700..."
                                 />
                             </div>

                             <hr className="border-gray-100 my-4" />
                             
                             <div className="space-y-2">
                                 <label className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2"><FileText size={14}/> Footer About Text</label>
                                 <textarea 
                                     value={config.CMS_FOOTER_ABOUT}
                                     onChange={e => handleChange('CMS_FOOTER_ABOUT', e.target.value)}
                                     className="w-full p-3 border border-gray-300 rounded focus:border-masuma-orange outline-none h-24 resize-none"
                                     placeholder="Brief company description..."
                                 ></textarea>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2"><MapPin size={14}/> Footer Address</label>
                                    <input 
                                        type="text" 
                                        value={config.CMS_CONTACT_ADDRESS}
                                        onChange={e => handleChange('CMS_CONTACT_ADDRESS', e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded focus:border-masuma-orange outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2"><Mail size={14}/> Footer Email</label>
                                    <input 
                                        type="text" 
                                        value={config.CMS_CONTACT_EMAIL}
                                        onChange={e => handleChange('CMS_CONTACT_EMAIL', e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded focus:border-masuma-orange outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2"><Phone size={14}/> Footer Phone</label>
                                    <input 
                                        type="text" 
                                        value={config.CMS_CONTACT_PHONE}
                                        onChange={e => handleChange('CMS_CONTACT_PHONE', e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded focus:border-masuma-orange outline-none"
                                    />
                                </div>
                             </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CmsManager;
