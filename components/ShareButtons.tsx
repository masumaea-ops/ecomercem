import React, { useState } from 'react';
import { Share2, Link, Check, Facebook, Twitter, MessageCircle, Linkedin } from 'lucide-react';
import { trackShare } from '../utils/analytics';

interface ShareButtonsProps {
  url: string;
  title: string;
  contentId: string;
  contentType: 'PRODUCT' | 'POST';
}

const ShareButtons: React.FC<ShareButtonsProps> = ({ url, title, contentId, contentType }) => {
  const [copied, setCopied] = useState(false);

  const shareData = {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    trackShare('COPY_LINK', contentId, contentType);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePlatformShare = (platform: string, shareUrl: string) => {
    window.open(shareUrl, '_blank', 'width=600,height=400');
    trackShare(platform, contentId, contentType);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-gray-400">
        <Share2 size={16} />
        <span className="text-[10px] font-black uppercase tracking-widest">Share this {contentType.toLowerCase()}</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {/* WhatsApp */}
        <button 
          onClick={() => handlePlatformShare('WHATSAPP', shareData.whatsapp)}
          className="w-10 h-10 bg-[#25D366] text-white rounded-xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-[#25D366]/20"
          title="Share on WhatsApp"
        >
          <MessageCircle size={20} />
        </button>

        {/* Facebook */}
        <button 
          onClick={() => handlePlatformShare('FACEBOOK', shareData.facebook)}
          className="w-10 h-10 bg-[#1877F2] text-white rounded-xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-[#1877F2]/20"
          title="Share on Facebook"
        >
          <Facebook size={20} />
        </button>

        {/* Twitter / X */}
        <button 
          onClick={() => handlePlatformShare('TWITTER', shareData.twitter)}
          className="w-10 h-10 bg-[#000000] text-white rounded-xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-black/20"
          title="Share on X"
        >
          <Twitter size={20} />
        </button>

        {/* LinkedIn */}
        <button 
          onClick={() => handlePlatformShare('LINKEDIN', shareData.linkedin)}
          className="w-10 h-10 bg-[#0A66C2] text-white rounded-xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-[#0A66C2]/20"
          title="Share on LinkedIn"
        >
          <Linkedin size={20} />
        </button>

        {/* Copy Link */}
        <button 
          onClick={handleCopyLink}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-lg ${copied ? 'bg-green-500 text-white shadow-green-500/20' : 'bg-white text-masuma-dark border border-gray-100 hover:border-masuma-orange shadow-gray-200/50'}`}
          title="Copy Link"
        >
          {copied ? <Check size={20} /> : <Link size={20} />}
        </button>
      </div>
    </div>
  );
};

export default ShareButtons;
