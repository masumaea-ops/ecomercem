import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  schema?: Record<string, any>;
  keywords?: string;
  noindex?: boolean;
}

const SEO: React.FC<SEOProps> = ({ 
  title, 
  description, 
  image = 'https://masuma.africa/og-image.jpg', 
  url, 
  type = 'website',
  schema,
  keywords,
  noindex = false
}) => {
  const siteTitle = 'Masuma Autoparts East Africa';
  const fullTitle = title.toLowerCase().includes('masuma') ? title : `${title} | ${siteTitle}`;
  const rawUrl = url || (typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : 'https://masuma.africa');
  const currentUrl = rawUrl.split('?')[0].split('#')[0];
  const defaultKeywords = 'Masuma Kenya, car parts Kenya, spare parts Nairobi, Japanese car parts Kenya, genuine car parts Nairobi';
  const combinedKeywords = keywords ? `${keywords}, ${defaultKeywords}` : defaultKeywords;

  return (
    <Helmet>
      {/* Standard Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={combinedKeywords} />
      <link rel="canonical" href={currentUrl} />
      <meta name="robots" content={noindex ? "noindex, nofollow" : "index, follow"} />
      <meta name="language" content="English" />
      <meta name="revisit-after" content="7 days" />

      {/* Open Graph / Facebook / WhatsApp */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Structured Data (JSON-LD) for Google Rich Snippets */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;