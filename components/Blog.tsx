import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Clock, Calendar, Share2, ArrowRight, BookOpen, Loader2, 
  ChevronLeft, ChevronRight, Check, Shield, Search, X, Tag, Sparkles, 
  User, ShieldCheck, Flame, Wrench, Bookmark, ThumbsUp 
} from 'lucide-react';
import { BlogPost, Product } from '../types';
import { apiClient } from '../utils/apiClient';
import SEO from './SEO';
import { trackEvent } from '../utils/analytics';
import ShareButtons from './ShareButtons';
import ProductImage from './ProductImage';
import { sanitizeClientHtml } from '../utils/clientSanitizer';


interface BlogProps {
  addToCart: (product: Product) => void;
  initialPostId?: string | null;
  onProductClick?: (product: Product) => void;
  onNavigateToPost?: (postId: string, title?: string) => void;
}

const Blog: React.FC<BlogProps> = ({ addToCart, initialPostId, onProductClick, onNavigateToPost }) => {
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 1 });
  
  // New Interactive Features
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [readingProgress, setReadingProgress] = useState(0);

  // 1. Initial Data Fetch & Deep Link Check
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      
      if (initialPostId) {
        try {
          const res = await apiClient.get(`/blog/${initialPostId}`);
          if (res.data) {
            setSelectedPost(res.data);
          }
        } catch (e) {
          console.error("Deep link post not found");
          setSelectedPost(null);
        }
      } else {
        setSelectedPost(null);
      }

      await fetchPosts(1);
      setIsLoading(false);
    };
    
    init();
  }, [initialPostId]);

  // Scroll Reading Progress Listener
  useEffect(() => {
    if (!selectedPost) return;

    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = Math.min(100, Math.max(0, (window.scrollY / totalHeight) * 100));
        setReadingProgress(progress);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [selectedPost]);

  const fetchPosts = async (page: number) => {
    try {
      const res = await apiClient.get(`/blog?page=${page}&limit=${pagination.limit}`);

      if (res.data && res.data.data) {
        setPosts(res.data.data);
        setPagination(res.data.meta);
      } else if (Array.isArray(res.data)) {
        setPosts(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch blog posts');
    }
  };

  // 2. Dynamic Categories
  const categories = useMemo(() => {
    const unique = new Set<string>();
    posts.forEach(p => {
      if (p.category && p.category.trim()) {
        unique.add(p.category.trim());
      }
    });
    return ['All', ...Array.from(unique)];
  }, [posts]);

  // 3. Filtered Posts
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const matchesCategory = selectedCategory === 'All' || post.category.toLowerCase() === selectedCategory.toLowerCase();
      const query = searchQuery.trim().toLowerCase();
      const matchesQuery = !query || 
        post.title.toLowerCase().includes(query) ||
        post.excerpt.toLowerCase().includes(query) ||
        (post.category && post.category.toLowerCase().includes(query));
      return matchesCategory && matchesQuery;
    });
  }, [posts, selectedCategory, searchQuery]);

  // 4. Handle Post Selection (Update URL)
  const handleSelectPost = (e: React.MouseEvent, post: BlogPost) => {
    e.preventDefault();
    trackEvent('Engagement', 'View Blog Post', post.title);
    if (onNavigateToPost) {
      onNavigateToPost(post.id, post.title);
    } else {
      setSelectedPost(post);
      const slug = `${post.title} ${post.id}`.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      const newUrl = `/blog/${slug}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 5. Handle Back Navigation
  const handleBack = () => {
    setSelectedPost(null);
    const newUrl = '/blog';
    window.history.pushState({ path: newUrl }, '', newUrl);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setIsLoading(true);
      fetchPosts(newPage).then(() => {
        setIsLoading(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  };

  useEffect(() => {
    if (selectedPost) {
      const fetchRelated = async () => {
        try {
          const res = await apiClient.get(`/products?category=${selectedPost.relatedProductCategory}`);
          const productsData = res.data.data || res.data; 
          setRelatedProducts(Array.isArray(productsData) ? productsData.slice(0, 4) : []);
        } catch (e) {
          setRelatedProducts([]);
        }
      };
      fetchRelated();
    }
  }, [selectedPost]);

  // Next and Previous Articles
  const currentPostIndex = useMemo(() => {
    if (!selectedPost) return -1;
    return posts.findIndex(p => p.id === selectedPost.id);
  }, [selectedPost, posts]);

  const prevPost = currentPostIndex > 0 ? posts[currentPostIndex - 1] : null;
  const nextPost = currentPostIndex !== -1 && currentPostIndex < posts.length - 1 ? posts[currentPostIndex + 1] : null;

  // -------------------------------------------------------------
  // VIEW: SINGLE ARTICLE READER
  // -------------------------------------------------------------
  if (selectedPost) {
    const postSlug = (selectedPost as any).slug || `${selectedPost.title} ${selectedPost.id}`.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    const canonicalArticleUrl = `https://masuma.africa/blog/${postSlug}`;

    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": selectedPost.title,
      "image": selectedPost.image ? (selectedPost.image.startsWith('http') ? selectedPost.image : `https://masuma.africa${selectedPost.image}`) : "https://masuma.africa/og-image.jpg",
      "datePublished": selectedPost.date,
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": canonicalArticleUrl
      },
      "author": {
        "@type": "Organization",
        "name": "Masuma Autoparts EA Ltd"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Masuma Autoparts East Africa",
        "logo": {
          "@type": "ImageObject",
          "url": "https://masuma.africa/logo.png"
        }
      },
      "description": selectedPost.excerpt
    };

    return (
      <div className="animate-fade-in bg-white min-h-screen relative">
        <SEO 
          title={`${selectedPost.title} | Masuma Kenya`} 
          description={selectedPost.excerpt} 
          image={selectedPost.image} 
          url={canonicalArticleUrl}
          type="article" 
          schema={articleSchema}
        />

        {/* Top Reading Progress Bar */}
        <div className="fixed top-0 left-0 right-0 h-1.5 z-[200] bg-gray-100">
          <div 
            className="h-full bg-masuma-orange transition-all duration-150 ease-out shadow-sm"
            style={{ width: `${readingProgress}%` }}
          />
        </div>

        {/* Hero Header with Magazine Background */}
        <div className="relative min-h-[50vh] md:min-h-[62vh] w-full flex flex-col justify-between overflow-hidden select-none bg-masuma-dark">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-masuma-dark/70 to-black/60 z-10"></div>
          <img 
            src={selectedPost.image} 
            alt={selectedPost.title} 
            className="w-full h-full object-cover absolute inset-0 transform scale-105 filter blur-[1px] brightness-75 transition-transform duration-1000" 
            onContextMenu={e => e.preventDefault()} 
          />
          
          {/* Header Watermark */}
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none z-10">
            <svg width="100%" height="100%">
              <pattern id="wm-blog-header" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
                <text x="0" y="100" className="font-display font-bold text-xl uppercase tracking-widest fill-white">MASUMA EA LTD</text>
              </pattern>
              <rect width="100%" height="100%" fill="url(#wm-blog-header)" />
            </svg>
          </div>

          {/* Top Bar Navigation */}
          <div className="relative z-20 max-w-screen-xl mx-auto w-full px-4 sm:px-6 pt-6 flex items-center justify-between">
            <button 
              onClick={handleBack}
              className="text-white/90 hover:text-masuma-orange transition flex items-center gap-2 font-bold uppercase text-xs tracking-widest bg-black/40 hover:bg-black/70 backdrop-blur-md px-4 py-2.5 rounded-full border border-white/10 shadow-lg group"
            >
              <ArrowLeft size={16} className="transform group-hover:-translate-x-1 transition-transform" /> Back to Knowledge Center
            </button>

            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-white/70 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10">
              <ShieldCheck size={14} className="text-masuma-orange" /> Verified Technical Publication
            </span>
          </div>

          {/* Headline & Meta Info */}
          <div className="relative z-20 max-w-screen-xl mx-auto w-full px-4 sm:px-6 pb-12 pt-16 flex flex-col justify-end">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="bg-masuma-orange text-white font-bold uppercase tracking-widest text-[11px] px-3.5 py-1 rounded-full shadow-md">
                {selectedPost.category}
              </span>
              <span className="flex items-center gap-1.5 text-gray-300 text-xs font-medium bg-black/40 backdrop-blur-md px-3 py-1 rounded-full">
                <Clock size={13} className="text-masuma-orange" /> {selectedPost.readTime}
              </span>
              <span className="flex items-center gap-1.5 text-gray-300 text-xs font-medium bg-black/40 backdrop-blur-md px-3 py-1 rounded-full">
                <Calendar size={13} className="text-masuma-orange" /> {selectedPost.date}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white font-display leading-[1.1] max-w-4xl tracking-tight mb-6 drop-shadow-md uppercase">
              {selectedPost.title}
            </h1>

            {/* Author Byline */}
            <div className="flex items-center gap-3 pt-4 border-t border-white/10">
              <div className="w-10 h-10 rounded-full bg-masuma-orange flex items-center justify-center text-white font-black text-xs shadow-md ring-2 ring-white/20">
                ME
              </div>
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  Masuma Engineering Team <ShieldCheck size={14} className="text-masuma-orange" />
                </p>
                <p className="text-[11px] text-gray-400">Automotive Technical & Diagnostics Division</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Layout */}
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Main Article Content */}
          <div className="lg:col-span-8">
            
            {/* Quick Takeaway / Abstract Box */}
            {selectedPost.excerpt && (
              <div className="p-6 bg-amber-50/70 border-l-4 border-masuma-orange rounded-r-2xl mb-10 shadow-sm">
                <p className="text-[11px] font-black uppercase text-masuma-orange tracking-widest mb-1.5 flex items-center gap-1.5">
                  <Sparkles size={14} /> Key Technical Summary
                </p>
                <p className="text-sm md:text-base text-gray-700 font-medium leading-relaxed italic">
                  "{selectedPost.excerpt}"
                </p>
              </div>
            )}

            {/* Article Body */}
            <article className="prose prose-lg md:prose-xl max-w-none text-gray-700 leading-relaxed prose-headings:font-display prose-headings:uppercase prose-headings:text-masuma-dark prose-headings:tracking-tight prose-a:text-masuma-orange prose-a:font-bold prose-img:rounded-2xl prose-img:shadow-xl">
              <div dangerouslySetInnerHTML={{ __html: sanitizeClientHtml(selectedPost.content) }} />
            </article>


            {/* Author Credibility Card */}
            <div className="mt-14 p-6 sm:p-8 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-masuma-dark text-white flex items-center justify-center font-black text-xl shadow-lg shrink-0">
                MEA
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold text-masuma-dark text-sm uppercase tracking-wide">
                    Masuma East Africa Editorial
                  </h4>
                  <span className="text-[9px] font-bold uppercase bg-masuma-orange/10 text-masuma-orange px-2 py-0.5 rounded-full">
                    Official Publisher
                  </span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Published by certified automotive parts specialists at Masuma Autoparts East Africa Ltd. Delivering genuine Japanese engineering specifications, installation standards, and preventative maintenance guides across Kenya and the East African region.
                </p>
              </div>
            </div>

            {/* Share Buttons */}
            <div className="mt-10 pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Share this guide:</span>
              <ShareButtons 
                url={`${window.location.origin}/blog/${`${selectedPost.title} ${selectedPost.id}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')}`}
                title={selectedPost.title}
                contentId={selectedPost.id}
                contentType="POST"
              />
            </div>

            {/* Next / Previous Article Navigation */}
            <div className="mt-12 pt-8 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {prevPost ? (
                <button
                  onClick={(e) => handleSelectPost(e, prevPost)}
                  className="p-4 rounded-xl border border-gray-200 hover:border-masuma-orange hover:shadow-md transition text-left group flex flex-col justify-between"
                >
                  <span className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-1 group-hover:text-masuma-orange">
                    <ChevronLeft size={14} /> Previous Guide
                  </span>
                  <p className="text-xs font-bold text-masuma-dark group-hover:text-masuma-orange transition line-clamp-2 mt-1">
                    {prevPost.title}
                  </p>
                </button>
              ) : <div />}

              {nextPost && (
                <button
                  onClick={(e) => handleSelectPost(e, nextPost)}
                  className="p-4 rounded-xl border border-gray-200 hover:border-masuma-orange hover:shadow-md transition text-right group flex flex-col justify-between"
                >
                  <span className="text-[10px] font-black uppercase text-gray-400 flex items-center justify-end gap-1 group-hover:text-masuma-orange">
                    Next Guide <ChevronRight size={14} />
                  </span>
                  <p className="text-xs font-bold text-masuma-dark group-hover:text-masuma-orange transition line-clamp-2 mt-1">
                    {nextPost.title}
                  </p>
                </button>
              )}
            </div>
          </div>

          {/* Sticky Sidebar: Related Parts & Consultation */}
          <div className="lg:col-span-4">
            <div className="sticky top-24 space-y-6">
              
              {/* Related Parts Card */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xl shadow-gray-100/50">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                  <h3 className="text-sm font-black text-masuma-dark font-display uppercase tracking-wider flex items-center gap-2">
                    <BookOpen size={16} className="text-masuma-orange" />
                    Recommended Parts
                  </h3>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">
                    {selectedPost.relatedProductCategory}
                  </span>
                </div>
                
                <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                  Genuine Japanese replacement components matching the topic of this guide:
                </p>
                
                <div className="space-y-3.5">
                  {relatedProducts.length > 0 ? relatedProducts.map(product => (
                    <div 
                      key={product.id} 
                      onClick={(e) => {
                        if (onProductClick) {
                          e.preventDefault();
                          onProductClick(product);
                        }
                      }}
                      className="bg-gray-50/70 p-3 rounded-xl flex gap-3 hover:bg-white hover:shadow-md transition border border-gray-100 group cursor-pointer"
                    >
                      <div className="w-16 h-16 bg-white rounded-lg shrink-0 overflow-hidden relative p-1.5 flex items-center justify-center border border-gray-100">
                        <ProductImage 
                          src={product.image} 
                          sku={product.sku} 
                          alt={product.name} 
                          className="w-full h-full object-contain group-hover:scale-105 transition duration-300" 
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-masuma-dark text-xs uppercase leading-tight truncate group-hover:text-masuma-orange transition">
                          {product.name}
                        </h4>
                        <p className="text-[10px] text-gray-400 font-mono">SKU: {product.sku}</p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-masuma-orange font-black text-xs">
                            KES {product.price.toLocaleString()}
                          </p>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation(); 
                              addToCart(product);
                            }}
                            className="text-[9px] font-black uppercase bg-masuma-dark text-white px-2.5 py-1 rounded-md hover:bg-masuma-orange transition"
                          >
                            + Cart
                          </button>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <p className="text-xs text-gray-400 italic text-center py-4">No specific parts linked.</p>
                  )}
                </div>
              </div>

              {/* Technical Assistance CTA Card */}
              <div className="bg-gradient-to-br from-masuma-dark to-black text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                  <span className="text-[10px] font-black uppercase text-masuma-orange tracking-widest block mb-2">Need Workshop Advice?</span>
                  <h4 className="text-base font-bold uppercase font-display leading-tight mb-2">Unsure which part fits your chassis?</h4>
                  <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                    Provide your VIN / Chassis Number to our technicians for instant compatibility verification.
                  </p>
                  <a
                    href="https://wa.me/254700000000?text=Hello%20Masuma,%20I%20need%20help%20identifying%20parts%20for%20my%20car"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-masuma-orange hover:bg-orange-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-masuma-orange/20"
                  >
                    Chat With Parts Specialist
                  </a>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW: MAGAZINE HOME / LISTING
  // -------------------------------------------------------------
  const featuredPost = filteredPosts.length > 0 && selectedCategory === 'All' && !searchQuery.trim() ? filteredPosts[0] : null;
  const gridPosts = featuredPost ? filteredPosts.slice(1) : filteredPosts;

  return (
    <div className="animate-fade-in bg-[#FAFAFA] min-h-screen pb-24">
      <SEO 
        title="Automotive Blog & Maintenance Guides | Masuma Kenya" 
        description="Expert Japanese automotive repair guides, maintenance tips, and Masuma genuine spare parts news in Kenya." 
        url="https://masuma.africa/blog"
      />
      
      {/* Magazine Hero Header */}
      <div className="bg-masuma-dark text-white py-16 md:py-24 relative overflow-hidden select-none">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-masuma-orange/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-masuma-orange font-bold uppercase tracking-[0.2em] text-[10px] mb-4">
            <Flame size={12} /> Official Technical Publication
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black font-display uppercase tracking-tight mb-4">
            Automotive Insights & Guides
          </h1>
          <div className="h-1 w-20 bg-masuma-orange mx-auto mb-5 rounded-full"></div>
          <p className="text-gray-400 max-w-2xl mx-auto text-sm sm:text-base font-light leading-relaxed">
            Professional diagnostic walkthroughs, preventive maintenance standards, and genuine Japanese parts engineering for Kenyan road conditions.
          </p>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 -mt-8 relative z-20">
        
        {/* Search & Filter Control Bar */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 sm:p-6 mb-10 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search guides, parts, issues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-masuma-orange focus:bg-white transition"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200 ${
                  selectedCategory.toLowerCase() === cat.toLowerCase()
                    ? 'bg-masuma-orange text-white shadow-md shadow-masuma-orange/30 scale-105'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-masuma-dark'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex flex-col justify-center items-center h-80 space-y-3">
            <Loader2 className="animate-spin text-masuma-orange" size={44} />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Publications...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm p-8 max-w-md mx-auto">
            <div className="w-16 h-16 bg-orange-50 text-masuma-orange rounded-full flex items-center justify-center mx-auto mb-4">
              <Search size={28} />
            </div>
            <h3 className="text-lg font-bold text-masuma-dark font-display uppercase tracking-tight mb-2">No Articles Found</h3>
            <p className="text-xs text-gray-500 mb-6">
              We couldn't find any guides matching "{searchQuery}" in {selectedCategory}.
            </p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
              className="px-6 py-2.5 bg-masuma-dark text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-masuma-orange transition shadow-md"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <>
            {/* FEATURED STORY HERO SPOTLIGHT */}
            {featuredPost && (
              <div 
                onClick={(e) => handleSelectPost(e, featuredPost)}
                className="group mb-12 bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-500 cursor-pointer grid grid-cols-1 lg:grid-cols-12 transform hover:-translate-y-1"
              >
                <div className="lg:col-span-7 relative h-72 sm:h-96 lg:h-full min-h-[300px] overflow-hidden">
                  <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                    <span className="bg-masuma-orange text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                      <Flame size={12} /> Featured Publication
                    </span>
                    <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold uppercase px-3 py-1 rounded-full">
                      {featuredPost.category}
                    </span>
                  </div>
                  <img 
                    src={featuredPost.image} 
                    alt={featuredPost.title} 
                    className="w-full h-full object-cover transform group-hover:scale-105 transition duration-700 ease-out" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent lg:hidden"></div>
                </div>

                <div className="lg:col-span-5 p-6 sm:p-10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 font-medium mb-3 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5"><Calendar size={13} /> {featuredPost.date}</span>
                      <span className="flex items-center gap-1.5"><Clock size={13} /> {featuredPost.readTime}</span>
                    </div>

                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-masuma-dark font-display uppercase tracking-tight leading-tight group-hover:text-masuma-orange transition-colors mb-4">
                      {featuredPost.title}
                    </h2>

                    <p className="text-gray-600 text-xs sm:text-sm line-clamp-4 leading-relaxed mb-6 font-normal">
                      {featuredPost.excerpt}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-masuma-dark text-white font-bold text-[10px] flex items-center justify-center">
                        MEA
                      </div>
                      <span className="text-xs font-bold text-masuma-dark uppercase">Masuma Tech Team</span>
                    </div>

                    <span className="text-masuma-orange font-bold text-xs uppercase tracking-wider flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Read Full Guide <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* EDITORIAL GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {gridPosts.map((post) => (
                <a 
                  key={post.id}
                  href={`/blog/${(post.title ? `${post.title} ${post.id}` : post.id).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')}`} 
                  className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full cursor-pointer transform hover:-translate-y-1 select-none overflow-hidden"
                  onClick={(e) => handleSelectPost(e, post)}
                >
                  <div className="relative h-56 overflow-hidden bg-gray-100">
                    <div className="absolute top-3.5 left-3.5 z-10">
                      <span className="bg-masuma-dark/90 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md backdrop-blur-sm">
                        {post.category}
                      </span>
                    </div>
                    <img 
                      src={post.image} 
                      alt={post.title} 
                      className="w-full h-full object-cover transform group-hover:scale-105 transition duration-500 ease-out"
                      onContextMenu={e => e.preventDefault()}
                    />
                  </div>
                  
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 text-[10px] text-gray-400 mb-2.5 font-medium uppercase tracking-wider">
                        <span className="flex items-center gap-1"><Calendar size={11} /> {post.date}</span>
                        <span className="flex items-center gap-1"><Clock size={11} /> {post.readTime}</span>
                      </div>

                      <h3 className="text-base font-bold text-masuma-dark font-display mb-2.5 leading-snug group-hover:text-masuma-orange transition-colors uppercase line-clamp-2">
                        {post.title}
                      </h3>

                      <p className="text-gray-500 text-xs line-clamp-3 mb-6 leading-relaxed">
                        {post.excerpt}
                      </p>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-50 flex items-center justify-between text-masuma-dark font-bold uppercase text-[10px] tracking-widest group-hover:text-masuma-orange transition">
                      <span>Read Article</span>
                      <ArrowRight size={14} className="transform group-hover:translate-x-1.5 transition-transform" />
                    </div>
                  </div>
                </a>
              ))}
            </div>
            
            {/* Pagination Controls */}
            {pagination.pages > 1 && (
              <div className="mt-16 flex justify-center items-center gap-3">
                <button 
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-xl hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition font-bold text-xs uppercase tracking-wider text-gray-600 shadow-sm"
                >
                  <ChevronLeft size={16} /> Prev
                </button>
                
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    let pNum = i + 1;
                    if (pagination.pages > 5 && pagination.page > 3) {
                      pNum = pagination.page - 2 + i;
                      if (pNum > pagination.pages) pNum = pagination.pages - (4 - i);
                    }
                    return (
                      <button
                        key={pNum}
                        onClick={() => handlePageChange(pNum)}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl text-xs font-bold transition shadow-sm ${
                          pagination.page === pNum 
                            ? 'bg-masuma-orange text-white' 
                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-100'
                        }`}
                      >
                        {pNum}
                      </button>
                    );
                  })}
                </div>

                <button 
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-xl hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition font-bold text-xs uppercase tracking-wider text-gray-600 shadow-sm"
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Blog;