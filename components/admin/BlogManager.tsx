import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Edit, Trash2, Calendar, Image as ImageIcon, Save, X, Loader2, 
  UploadCloud, Bold, Italic, Underline, Strikethrough, List, ListOrdered, 
  Link as LinkIcon, Heading2, Heading3, Quote, Code, Youtube, AlertTriangle, 
  Lightbulb, Wrench, Table, Eye, FileText, CheckCircle2, Clock, Globe, 
  ShieldCheck, HelpCircle, ArrowUpRight 
} from 'lucide-react';
import { BlogPost } from '../../types';
import { apiClient } from '../../utils/apiClient';
import { sanitizeClientHtml } from '../../utils/clientSanitizer';


const BlogManager: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingInline, setIsUploadingInline] = useState(false);
  
  const [formData, setFormData] = useState<Partial<BlogPost>>({});
  const [previewMode, setPreviewMode] = useState<'article' | 'card'>('article');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inlineImageInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const postsRes = await apiClient.get('/blog?limit=100');
      if (postsRes.data && postsRes.data.data) {
        setPosts(postsRes.data.data);
      } else {
        setPosts([]);
      }

      const catRes = await apiClient.get('/categories');
      if (catRes.data) {
        setCategories(catRes.data.map((c: any) => c.name));
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute Word Count & Auto Read Time
  const contentStats = React.useMemo(() => {
    const rawText = (formData.content || '').replace(/<[^>]*>/g, ' ');
    const words = rawText.trim().split(/\s+/).filter(Boolean).length;
    const estimatedMinutes = Math.max(1, Math.ceil(words / 180));
    return {
      words,
      autoReadTime: `${estimatedMinutes} min read`
    };
  }, [formData.content]);

  // Sync auto read-time if not manually set
  useEffect(() => {
    if (isEditing && contentStats.words > 0 && !formData.readTime) {
      setFormData(prev => ({ ...prev, readTime: contentStats.autoReadTime }));
    }
  }, [contentStats.autoReadTime, isEditing]);

  const handleAddNew = () => {
    setFormData({
      title: '',
      category: 'Maintenance',
      readTime: '5 min read',
      image: '',
      content: '',
      excerpt: '',
      isPublished: true,
      relatedProductCategory: categories[0] || 'Filters'
    });
    setIsEditing(true);
  };

  const handleEdit = (post: BlogPost) => {
    setFormData({
      ...post,
      isPublished: post.isPublished !== undefined ? post.isPublished : true
    });
    setIsEditing(true);
  };

  // Upload Featured Header Image
  const handleFeaturedImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const uploadData = new FormData();
    uploadData.append('file', file);
    uploadData.append('image', file);

    try {
      const res = await apiClient.post('/upload', uploadData);
      if (res.data && res.data.url) {
        setFormData(prev => ({ ...prev, image: res.data.url }));
      } else {
        throw new Error('Upload failed');
      }
    } catch (error: any) {
      const errMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error';
      alert('Upload failed: ' + errMsg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Upload and insert an inline photo directly into the content
  const handleInlineImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingInline(true);
    const uploadData = new FormData();
    uploadData.append('file', file);
    uploadData.append('image', file);

    try {
      const res = await apiClient.post('/upload', uploadData);
      if (res.data && res.data.url) {
        const caption = prompt('Enter a caption for this technical diagram/photo (optional):', '') || '';
        const imgBlock = `\n<figure class="my-6 rounded-2xl overflow-hidden border border-gray-100 shadow-md bg-white">
  <img src="${res.data.url}" alt="${caption || 'Technical Diagram'}" class="w-full h-auto object-cover max-h-[500px]" />
  ${caption ? `<figcaption class="p-3 text-center text-xs font-semibold text-gray-500 bg-gray-50 border-t border-gray-100">${caption}</figcaption>` : ''}
</figure>\n`;
        insertRaw(imgBlock);
      }
    } catch (error: any) {
      const errMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error';
      alert('Image upload failed: ' + errMsg);
    } finally {
      setIsUploadingInline(false);
      if (inlineImageInputRef.current) inlineImageInputRef.current.value = '';
    }
  };

  // --- Insertion Helper Functions ---
  const insertRaw = (snippet: string) => {
    const textarea = contentRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.content || '';
    const newText = text.substring(0, start) + snippet + text.substring(end);

    setFormData(prev => ({ ...prev, content: newText }));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + snippet.length, start + snippet.length);
    }, 0);
  };

  const insertFormat = (startTag: string, endTag: string = '') => {
    const textarea = contentRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.content || '';
    const before = text.substring(0, start);
    const selection = text.substring(start, end) || 'Sample Text';
    const after = text.substring(end);

    let finalStart = startTag;
    if (startTag === '<a href="') {
      const url = prompt('Enter Destination URL:', 'https://');
      if (!url) return;
      finalStart = `<a href="${url}" target="_blank" class="text-masuma-orange font-bold hover:underline">`;
    }

    const newText = `${before}${finalStart}${selection}${endTag}${after}`;
    setFormData(prev => ({ ...prev, content: newText }));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + finalStart.length, end + finalStart.length);
    }, 0);
  };

  // Embed YouTube Video
  const insertYouTubeVideo = () => {
    const rawUrl = prompt('Enter YouTube Video Link (Watch, Shorts, or Share link):', 'https://youtu.be/...');
    if (!rawUrl) return;

    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = rawUrl.match(regExp);
    const id = (match && match[2].length === 11) ? match[2] : null;

    if (!id) {
      alert('Could not detect a valid YouTube Video ID. Please check the URL.');
      return;
    }

    const videoSnippet = `\n<div class="my-8 aspect-video w-full rounded-2xl overflow-hidden shadow-xl border border-gray-100 bg-black">
  <iframe 
    src="https://www.youtube.com/embed/${id}?rel=0&modestbranding=1" 
    class="w-full h-full border-0" 
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
    allowfullscreen
    title="Technical Video Walkthrough">
  </iframe>
</div>\n`;
    insertRaw(videoSnippet);
  };

  // Insert Callout Blocks
  const insertWarningBox = () => {
    const note = prompt('Enter the Safety Warning details:', 'Always disconnect the negative battery terminal before servicing electrical components.') || '';
    const snippet = `\n<div class="my-6 p-4 md:p-5 bg-red-50/80 border-l-4 border-red-500 rounded-r-2xl text-red-950 shadow-sm">
  <div class="flex items-center gap-2 font-black uppercase text-xs text-red-600 tracking-wider mb-1">
    <span>⚠️ CRITICAL WORKSHOP WARNING</span>
  </div>
  <p class="text-xs md:text-sm font-medium leading-relaxed">${note}</p>
</div>\n`;
    insertRaw(snippet);
  };

  const insertProTipBox = () => {
    const tip = prompt('Enter the Technician Pro-Tip:', 'Apply a thin layer of synthetic silicone brake grease to slide pins to prevent uneven pad taper.') || '';
    const snippet = `\n<div class="my-6 p-4 md:p-5 bg-amber-50/80 border-l-4 border-amber-500 rounded-r-2xl text-amber-950 shadow-sm">
  <div class="flex items-center gap-2 font-black uppercase text-xs text-amber-600 tracking-wider mb-1">
    <span>💡 MASTER TECHNICIAN PRO-TIP</span>
  </div>
  <p class="text-xs md:text-sm font-medium leading-relaxed">${tip}</p>
</div>\n`;
    insertRaw(snippet);
  };

  const insertOemSpecBox = () => {
    const spec = prompt('Enter OEM Specification / Torque standard:', 'Torque caliper mounting bolts to 78 Nm (58 ft-lb) using a calibrated torque wrench.') || '';
    const snippet = `\n<div class="my-6 p-4 md:p-5 bg-blue-50/80 border-l-4 border-blue-500 rounded-r-2xl text-blue-950 shadow-sm">
  <div class="flex items-center gap-2 font-black uppercase text-xs text-blue-600 tracking-wider mb-1">
    <span>🔧 OEM SPECIFICATION</span>
  </div>
  <p class="text-xs md:text-sm font-medium leading-relaxed font-mono">${spec}</p>
</div>\n`;
    insertRaw(snippet);
  };

  // Insert Specs Table
  const insertSpecsTable = () => {
    const snippet = `\n<div class="my-6 overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
  <table class="w-full text-left text-xs md:text-sm border-collapse">
    <thead class="bg-gray-100 text-masuma-dark font-display font-black uppercase text-[11px] tracking-wider">
      <tr>
        <th class="p-3 border-b border-gray-200">Component</th>
        <th class="p-3 border-b border-gray-200">Recommended Specification</th>
        <th class="p-3 border-b border-gray-200">Replacement Interval</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-gray-100 bg-white">
      <tr class="hover:bg-gray-50/50">
        <td class="p-3 font-bold text-gray-800">Engine Oil Filter</td>
        <td class="p-3 font-mono text-gray-600">OE Pleated Micro-Fiber</td>
        <td class="p-3 text-gray-600">Every 5,000 km</td>
      </tr>
      <tr class="hover:bg-gray-50/50">
        <td class="p-3 font-bold text-gray-800">Front Ceramic Brake Pads</td>
        <td class="p-3 font-mono text-gray-600">Min. Thickness 3.0mm</td>
        <td class="p-3 text-gray-600">Inspect Every 10,000 km</td>
      </tr>
    </tbody>
  </table>
</div>\n`;
    insertRaw(snippet);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.content) {
      return alert('Article Title and Body Content are required before publishing.');
    }
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        readTime: formData.readTime || contentStats.autoReadTime,
        isPublished: formData.isPublished !== undefined ? formData.isPublished : true
      };

      if (formData.id) {
        await apiClient.put(`/blog/${formData.id}`, payload);
      } else {
        await apiClient.post('/blog', payload);
      }
      setIsEditing(false);
      fetchData();
    } catch (error) {
      console.error('Failed to save post', error);
      alert('Failed to save article. Please check backend connection.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article? This action cannot be undone.')) return;
    try {
      await apiClient.delete(`/blog/${id}`);
      fetchData();
    } catch (error) {
      alert('Failed to delete article');
    }
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-6 bg-gray-50/50">
      
      {/* Hidden file input for inline body images */}
      <input 
        type="file" 
        ref={inlineImageInputRef}
        className="hidden" 
        accept="image/*" 
        onChange={handleInlineImageUpload}
      />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-masuma-dark font-display uppercase tracking-tight flex items-center gap-2">
            <FileText className="text-masuma-orange" size={24} /> Technical Content Studio
          </h2>
          <p className="text-xs text-gray-500 font-medium">Author, format, and publish automotive maintenance guides and workshop manuals.</p>
        </div>
        
        {!isEditing && (
          <button 
            onClick={handleAddNew}
            className="bg-masuma-orange text-white px-5 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-orange-600 transition shadow-lg shadow-masuma-orange/20 flex items-center gap-2"
          >
            <Plus size={16} /> New Article
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col lg:flex-row animate-slide-up">
          
          {/* Main Writing Area */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            
            {/* Title & Status Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-100">
              <div className="flex-1 w-full">
                <input 
                  type="text" 
                  value={formData.title || ''}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full text-2xl sm:text-3xl font-black font-display text-masuma-dark outline-none placeholder:text-gray-300 uppercase tracking-tight" 
                  placeholder="ARTICLE HEADLINE (e.g. How to Inspect Ceramic Brake Pads)..." 
                />
              </div>

              {/* Publication Status Toggle */}
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, isPublished: !prev.isPublished }))}
                className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition ${
                  formData.isPublished 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${formData.isPublished ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                {formData.isPublished ? 'Published' : 'Draft Mode'}
              </button>
            </div>

            {/* Quick Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Category</label>
                <input 
                  type="text" 
                  value={formData.category || ''}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-masuma-orange focus:bg-white" 
                  placeholder="e.g. Braking Systems" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Estimated Read Time</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={formData.readTime || contentStats.autoReadTime}
                    onChange={e => setFormData({ ...formData, readTime: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-masuma-orange focus:bg-white pr-8" 
                    placeholder="e.g. 5 min read" 
                  />
                  <Clock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Linked Part Category</label>
                <select 
                  value={formData.relatedProductCategory || ''}
                  onChange={e => setFormData({ ...formData, relatedProductCategory: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-masuma-orange focus:bg-white"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Featured Header Banner Image */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex justify-between">
                <span>Featured Cover Image</span>
                <span className="text-gray-400">Max size 50MB</span>
              </label>
              <div className="flex gap-2">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleFeaturedImageUpload}
                />
                <input 
                  type="text" 
                  value={formData.image || ''}
                  onChange={e => setFormData({ ...formData, image: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-masuma-orange focus:bg-white" 
                  placeholder="https://yourdomain.com/media/banner.jpg" 
                />
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-4 py-2.5 bg-masuma-dark text-white rounded-xl text-xs font-bold uppercase hover:bg-masuma-orange transition flex items-center gap-1.5 shrink-0"
                >
                  {isUploading ? <Loader2 size={16} className="animate-spin"/> : <UploadCloud size={16} />}
                  <span>Upload Cover</span>
                </button>
              </div>
            </div>

            {/* Excerpt / Summary */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Excerpt / Quick Takeaway</label>
              <textarea 
                value={formData.excerpt || ''}
                onChange={e => setFormData({ ...formData, excerpt: e.target.value })}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-masuma-orange focus:bg-white text-xs leading-relaxed h-20 resize-none"
                placeholder="2-3 sentence overview shown in Google search previews and social cards..."
              />
            </div>

            {/* Rich Text Body Editor & Studio Toolbar */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Article Body & Interactive Formatting
                </label>
                <div className="text-[11px] font-semibold text-gray-400 flex items-center gap-3">
                  <span>Words: <strong className="text-masuma-dark">{contentStats.words}</strong></span>
                  <span>Est. Read: <strong className="text-masuma-orange">{contentStats.autoReadTime}</strong></span>
                </div>
              </div>

              {/* Comprehensive Rich Text & Media Toolbar */}
              <div className="bg-gray-100 p-2 rounded-t-xl border border-gray-200 border-b-0 flex flex-wrap items-center gap-1">
                
                {/* Standard Typography Group */}
                <div className="flex items-center gap-0.5 bg-white p-1 rounded-lg border border-gray-200">
                  <button type="button" onClick={() => insertFormat('<b>', '</b>')} className="p-1.5 hover:bg-gray-100 hover:text-masuma-orange rounded text-gray-600" title="Bold"><Bold size={15}/></button>
                  <button type="button" onClick={() => insertFormat('<i>', '</i>')} className="p-1.5 hover:bg-gray-100 hover:text-masuma-orange rounded text-gray-600" title="Italic"><Italic size={15}/></button>
                  <button type="button" onClick={() => insertFormat('<u>', '</u>')} className="p-1.5 hover:bg-gray-100 hover:text-masuma-orange rounded text-gray-600" title="Underline"><Underline size={15}/></button>
                  <button type="button" onClick={() => insertFormat('<s>', '</s>')} className="p-1.5 hover:bg-gray-100 hover:text-masuma-orange rounded text-gray-600" title="Strikethrough"><Strikethrough size={15}/></button>
                </div>

                {/* Headings */}
                <div className="flex items-center gap-0.5 bg-white p-1 rounded-lg border border-gray-200">
                  <button type="button" onClick={() => insertFormat('<h2 class="text-2xl font-black uppercase font-display text-masuma-dark mt-8 mb-3">', '</h2>')} className="p-1.5 hover:bg-gray-100 hover:text-masuma-orange rounded text-gray-600" title="Major Heading (H2)"><Heading2 size={15}/></button>
                  <button type="button" onClick={() => insertFormat('<h3 class="text-xl font-bold uppercase font-display text-masuma-dark mt-6 mb-2">', '</h3>')} className="p-1.5 hover:bg-gray-100 hover:text-masuma-orange rounded text-gray-600" title="Sub-section (H3)"><Heading3 size={15}/></button>
                  <button type="button" onClick={() => insertFormat('<p class="mb-4 text-gray-700 leading-relaxed">', '</p>')} className="p-1.5 hover:bg-gray-100 hover:text-masuma-orange rounded text-gray-600 text-xs font-bold px-2" title="Paragraph">P</button>
                </div>

                {/* Lists & Quotes */}
                <div className="flex items-center gap-0.5 bg-white p-1 rounded-lg border border-gray-200">
                  <button type="button" onClick={() => insertFormat('<ul class="list-disc pl-6 my-4 space-y-2">\n  <li>', '</li>\n</ul>')} className="p-1.5 hover:bg-gray-100 hover:text-masuma-orange rounded text-gray-600" title="Bullet List"><List size={15}/></button>
                  <button type="button" onClick={() => insertFormat('<ol class="list-decimal pl-6 my-4 space-y-2">\n  <li>', '</li>\n</ol>')} className="p-1.5 hover:bg-gray-100 hover:text-masuma-orange rounded text-gray-600" title="Numbered List"><ListOrdered size={15}/></button>
                  <button type="button" onClick={() => insertFormat('<blockquote class="border-l-4 border-masuma-orange pl-4 italic text-gray-600 my-4">', '</blockquote>')} className="p-1.5 hover:bg-gray-100 hover:text-masuma-orange rounded text-gray-600" title="Quote"><Quote size={15}/></button>
                  <button type="button" onClick={() => insertFormat('<a href="', '">Link Text</a>')} className="p-1.5 hover:bg-gray-100 hover:text-masuma-orange rounded text-gray-600" title="Hyperlink"><LinkIcon size={15}/></button>
                </div>

                {/* Technical Media Insertions */}
                <div className="flex items-center gap-0.5 bg-white p-1 rounded-lg border border-gray-200">
                  <button 
                    type="button" 
                    onClick={() => inlineImageInputRef.current?.click()} 
                    disabled={isUploadingInline}
                    className="p-1.5 hover:bg-gray-100 text-blue-600 rounded flex items-center gap-1 font-bold text-[11px] px-2" 
                    title="Insert In-Article Photo/Diagram"
                  >
                    {isUploadingInline ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                    <span>+ Photo</span>
                  </button>

                  <button 
                    type="button" 
                    onClick={insertYouTubeVideo} 
                    className="p-1.5 hover:bg-gray-100 text-red-600 rounded flex items-center gap-1 font-bold text-[11px] px-2" 
                    title="Embed YouTube Video"
                  >
                    <Youtube size={15} />
                    <span>+ Video</span>
                  </button>

                  <button 
                    type="button" 
                    onClick={insertSpecsTable} 
                    className="p-1.5 hover:bg-gray-100 text-purple-600 rounded flex items-center gap-1 font-bold text-[11px] px-2" 
                    title="Insert Specs Table"
                  >
                    <Table size={14} />
                    <span>+ Table</span>
                  </button>
                </div>

                {/* Automotive Specialized Callouts */}
                <div className="flex items-center gap-1 ml-auto">
                  <button 
                    type="button" 
                    onClick={insertWarningBox} 
                    className="px-2.5 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-[10px] font-black uppercase flex items-center gap-1"
                    title="Insert Mechanic Warning Alert"
                  >
                    <AlertTriangle size={12} /> Warning
                  </button>

                  <button 
                    type="button" 
                    onClick={insertProTipBox} 
                    className="px-2.5 py-1 bg-amber-100 text-amber-800 hover:bg-amber-200 rounded-lg text-[10px] font-black uppercase flex items-center gap-1"
                    title="Insert Workshop Pro Tip"
                  >
                    <Lightbulb size={12} /> Pro-Tip
                  </button>

                  <button 
                    type="button" 
                    onClick={insertOemSpecBox} 
                    className="px-2.5 py-1 bg-blue-100 text-blue-800 hover:bg-blue-200 rounded-lg text-[10px] font-black uppercase flex items-center gap-1"
                    title="Insert OEM Specification"
                  >
                    <Wrench size={12} /> Spec
                  </button>
                </div>

              </div>

              {/* Raw / HTML Content Area */}
              <textarea 
                ref={contentRef}
                value={formData.content || ''}
                onChange={e => setFormData({ ...formData, content: e.target.value })}
                className="w-full h-96 p-4 border border-gray-200 rounded-b-xl outline-none focus:ring-2 focus:ring-masuma-orange font-mono text-xs leading-relaxed resize-y" 
                placeholder="Write your article text here or use the toolbar buttons above to embed photos, YouTube videos, and technical specification boxes..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button 
                type="button" 
                onClick={() => setIsEditing(false)} 
                className="px-5 py-2.5 text-gray-500 font-bold uppercase text-xs hover:text-masuma-dark rounded-xl"
              >
                Cancel
              </button>
              
              <button 
                type="button" 
                onClick={handleSave} 
                disabled={isSaving}
                className="px-7 py-2.5 bg-masuma-orange text-white font-bold uppercase tracking-wider text-xs rounded-xl hover:bg-orange-600 transition flex items-center gap-2 shadow-lg shadow-masuma-orange/20 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                <span>{formData.id ? 'Save Updates' : 'Publish Article'}</span>
              </button>
            </div>
          </div>

          {/* Live Preview Sidebar */}
          <div className="w-full lg:w-[480px] bg-gray-50/70 border-l border-gray-200 flex flex-col h-[70vh] lg:h-auto overflow-hidden">
            <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Eye size={14} /> Real-Time Preview
              </span>

              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg text-[10px] font-bold uppercase">
                <button
                  type="button"
                  onClick={() => setPreviewMode('article')}
                  className={`px-2.5 py-1 rounded-md transition ${previewMode === 'article' ? 'bg-white text-masuma-orange shadow-sm' : 'text-gray-500'}`}
                >
                  Article
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('card')}
                  className={`px-2.5 py-1 rounded-md transition ${previewMode === 'card' ? 'bg-white text-masuma-orange shadow-sm' : 'text-gray-500'}`}
                >
                  Catalog Card
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {previewMode === 'card' ? (
                /* Card Preview */
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-lg max-w-sm mx-auto">
                  <div className="h-44 bg-gray-200 flex items-center justify-center text-gray-400 overflow-hidden relative">
                    {formData.image ? (
                      <img src={formData.image} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <ImageIcon size={32} />
                    )}
                    <span className="absolute top-3 left-3 bg-masuma-orange text-white text-[9px] font-black uppercase px-2 py-0.5 rounded shadow">
                      {formData.category || 'Category'}
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-3 text-[10px] text-gray-400 uppercase font-medium mb-1.5">
                      <span>Today</span>
                      <span>•</span>
                      <span>{formData.readTime || contentStats.autoReadTime}</span>
                    </div>
                    <h3 className="text-base font-bold text-masuma-dark font-display uppercase leading-tight line-clamp-2">
                      {formData.title || 'Article Headline Will Appear Here...'}
                    </h3>
                    <p className="text-xs text-gray-500 mt-2 line-clamp-3 leading-relaxed">
                      {formData.excerpt || 'Write an excerpt above to summarize this guide for readers...'}
                    </p>
                  </div>
                </div>
              ) : (
                /* Full Article Preview */
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                  {formData.image && (
                    <img src={formData.image} className="w-full h-48 object-cover rounded-xl shadow-md" alt="" />
                  )}
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-masuma-orange uppercase bg-orange-50 px-2.5 py-0.5 rounded-full">
                      {formData.category || 'Category'}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {formData.readTime || contentStats.autoReadTime}
                    </span>
                  </div>

                  <h1 className="text-xl font-black text-masuma-dark font-display uppercase tracking-tight leading-tight">
                    {formData.title || 'Article Headline'}
                  </h1>

                  {formData.excerpt && (
                    <div className="p-3 bg-amber-50 border-l-4 border-masuma-orange text-xs text-gray-700 italic rounded-r-lg">
                      {formData.excerpt}
                    </div>
                  )}

                  {/* Rendered HTML */}
                  <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed border-t border-gray-100 pt-4">
                    {formData.content ? (
                      <div dangerouslySetInnerHTML={{ __html: sanitizeClientHtml(formData.content) }} />
                    ) : (
                      <p className="italic text-gray-400 text-xs">Start writing in the editor to see formatted text, photos, callouts, and videos render here live...</p>
                    )}
                  </div>

                </div>
              )}
            </div>
          </div>

        </div>
      ) : (
        /* Articles Management Table / Grid */
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="animate-spin text-masuma-orange" size={36} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <div key={post.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col">
                  <div className="relative h-44 bg-gray-100">
                    <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                    
                    <div className="absolute top-3 left-3">
                      <span className="bg-masuma-dark/90 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded backdrop-blur-sm">
                        {post.category}
                      </span>
                    </div>

                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition bg-white/90 backdrop-blur-md rounded-xl p-1 shadow-md">
                      <button 
                        onClick={() => handleEdit(post)} 
                        className="p-1.5 hover:text-masuma-orange text-gray-600 rounded-lg hover:bg-gray-100" 
                        title="Edit Article"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(post.id)} 
                        className="p-1.5 hover:text-red-500 text-gray-600 rounded-lg hover:bg-gray-100" 
                        title="Delete Article"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 text-[10px] text-gray-400 font-medium uppercase mb-2">
                        <span className="flex items-center gap-1"><Calendar size={11} /> {post.date}</span>
                        <span>•</span>
                        <span>{post.readTime}</span>
                      </div>

                      <h3 className="font-bold text-masuma-dark text-sm uppercase leading-snug mb-2 line-clamp-2 font-display group-hover:text-masuma-orange transition">
                        {post.title}
                      </h3>

                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                        {post.excerpt}
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">
                        Parts: <strong className="text-masuma-dark">{post.relatedProductCategory}</strong>
                      </span>

                      <button 
                        onClick={() => handleEdit(post)}
                        className="text-xs font-bold text-masuma-orange uppercase tracking-wider hover:underline flex items-center gap-1"
                      >
                        Edit <Edit size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {posts.length === 0 && (
                <div className="col-span-3 text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300 text-gray-400">
                  <FileText size={40} className="mx-auto mb-3 text-gray-300" />
                  <h4 className="text-sm font-bold uppercase text-gray-600">No Publications Found</h4>
                  <p className="text-xs mt-1 mb-4">Create your first technical guide to educate motorists and boost SEO.</p>
                  <button 
                    onClick={handleAddNew} 
                    className="px-5 py-2 bg-masuma-orange text-white rounded-xl text-xs font-bold uppercase"
                  >
                    + Create Article
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default BlogManager;
