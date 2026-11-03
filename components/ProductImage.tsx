import React, { useState, useEffect } from 'react';

interface ProductImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  sku?: string;
  alt: string;
  className?: string;
  priority?: boolean;
}

export const getSafeProductImageUrl = (url?: string, sku?: string): string => {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return sku ? `/images/parts/${sku}.jpg` : '/images/parts/fallback.jpg';
  }

  // Detect broken legacy remote domains or dead placeholder service
  if (
    url.includes('via.placeholder.com') ||
    url.includes('masuma.com/wp-content/uploads')
  ) {
    return sku ? `/images/parts/${sku}.jpg` : '/images/parts/fallback.jpg';
  }

  return url;
};

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  sku,
  alt,
  className = '',
  priority = false,
  ...rest
}) => {
  const [currentSrc, setCurrentSrc] = useState<string>(() => getSafeProductImageUrl(src, sku));
  const [hasFailed, setHasFailed] = useState<boolean>(false);

  useEffect(() => {
    setCurrentSrc(getSafeProductImageUrl(src, sku));
    setHasFailed(false);
  }, [src, sku]);

  const handleFallback = () => {
    if (!hasFailed) {
      setHasFailed(true);
      if (sku && currentSrc !== `/images/parts/${sku}.jpg`) {
        setCurrentSrc(`/images/parts/${sku}.jpg`);
      } else if (currentSrc !== '/images/parts/fallback.jpg') {
        setCurrentSrc('/images/parts/fallback.jpg');
      }
    }
  };

  return (
    <img
      src={currentSrc}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      onError={handleFallback}
      onLoad={(e) => {
        const img = e.currentTarget;
        // On iOS Safari / mobile networks, 0-byte images fire onLoad with naturalWidth === 0
        if (img.naturalWidth === 0 || img.naturalHeight === 0) {
          handleFallback();
        }
      }}
      className={className}
      {...rest}
    />
  );
};

export default ProductImage;
