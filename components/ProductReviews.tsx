import React, { useState, useEffect, useId } from 'react';
import { ProductReview, ReviewStats } from '../types';
import { Star, ShieldCheck, ThumbsUp, MessageSquare, CheckCircle2, AlertCircle, ChevronDown, Award } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

interface ProductReviewsProps {
  productId: string;
  productName: string;
  productSku: string;
}

const RATING_DESCRIPTIONS: Record<number, string> = {
  1: 'Poor - Did not meet expectations',
  2: 'Fair - Below standard',
  3: 'Average - Satisfactory',
  4: 'Good - High quality part',
  5: 'Excellent - Genuine OEM Spec quality'
};

export const ProductReviews: React.FC<ProductReviewsProps> = ({ productId, productName, productSku }) => {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    averageRating: 0,
    totalReviews: 0,
    verifiedCount: 0,
    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [helpfulVoted, setHelpfulVoted] = useState<Record<string, boolean>>({});

  // Form State
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  // Live verification check state
  const [verifyingOrder, setVerifyingOrder] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ isVerified: boolean; details?: string } | null>(null);

  // Prefill user details if logged in from localStorage
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('masuma_user') || localStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user.fullName && !customerName) setCustomerName(user.fullName);
        if (user.email && !customerEmail) setCustomerEmail(user.email);
        if (user.phone && !customerPhone) setCustomerPhone(user.phone);
      }
    } catch (e) {
      // Ignore parse errors
    }
  }, []);

  // Fetch reviews when productId, activeFilter, or sortBy changes
  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeFilter !== 'all') params.append('filter', activeFilter);
      if (sortBy) params.append('sort', sortBy);

      const res = await apiClient.get(`/products/${productId}/reviews?${params.toString()}`);
      if (res.data) {
        setReviews(res.data.reviews || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (productId) {
      fetchReviews();
    }
  }, [productId, activeFilter, sortBy]);

  // Check verification eligibility live when orderNumber or email changes (debounced)
  useEffect(() => {
    if (!orderNumber.trim() && !customerEmail.trim() && !customerPhone.trim()) {
      setVerificationResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      setVerifyingOrder(true);
      try {
        const params = new URLSearchParams();
        params.append('productId', productId);
        if (orderNumber.trim()) params.append('orderNumber', orderNumber.trim());
        if (customerEmail.trim()) params.append('email', customerEmail.trim());
        if (customerPhone.trim()) params.append('phone', customerPhone.trim());

        const res = await apiClient.get(`/reviews/verify-eligibility?${params.toString()}`);
        if (res.data) {
          setVerificationResult(res.data);
        }
      } catch (err) {
        setVerificationResult(null);
      } finally {
        setVerifyingOrder(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [orderNumber, customerEmail, customerPhone, productId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!rating || rating < 1 || rating > 5) {
      setFormError('Please select a star rating between 1 and 5.');
      return;
    }
    if (!customerName.trim()) {
      setFormError('Please provide your name.');
      return;
    }
    if (!comment.trim() || comment.trim().length < 5) {
      setFormError('Please share a few words about your experience (minimum 5 characters).');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        rating,
        title: title.trim() || undefined,
        comment: comment.trim(),
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        orderNumber: orderNumber.trim() || undefined
      };

      const res = await apiClient.post(`/products/${productId}/reviews`, payload);
      
      if (res.data) {
        setFormSuccess(true);
        setTitle('');
        setComment('');
        setIsFormOpen(false);
        // Refresh reviews list
        fetchReviews();
        setTimeout(() => setFormSuccess(false), 5000);
      }
    } catch (err: any) {
      console.error('Submission error:', err);
      const msg = err.response?.data?.error || 'Failed to submit review. Please check the fields and try again.';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHelpfulClick = async (reviewId: string) => {
    if (helpfulVoted[reviewId]) return;

    try {
      setHelpfulVoted(prev => ({ ...prev, [reviewId]: true }));
      setReviews(prev =>
        prev.map(r => (r.id === reviewId ? { ...r, helpfulCount: (r.helpfulCount || 0) + 1 } : r))
      );
      await apiClient.post(`/reviews/${reviewId}/helpful`);
    } catch (e) {
      // Revert if error
      setHelpfulVoted(prev => ({ ...prev, [reviewId]: false }));
      setReviews(prev =>
        prev.map(r => (r.id === reviewId ? { ...r, helpfulCount: Math.max(0, (r.helpfulCount || 1) - 1) } : r))
      );
    }
  };

  const renderStars = (score: number, size = 16, interactive = false) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(star => {
          const isFilled = (interactive ? (hoverRating || rating) : score) >= star;
          const isHalf = !interactive && score >= star - 0.5 && score < star;

          return (
            <button
              key={star}
              type={interactive ? 'button' : undefined}
              disabled={!interactive}
              onClick={interactive ? () => setRating(star) : undefined}
              onMouseEnter={interactive ? () => setHoverRating(star) : undefined}
              onMouseLeave={interactive ? () => setHoverRating(0) : undefined}
              className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform p-0.5 focus:outline-none' : 'cursor-default'}`}
              aria-label={interactive ? `${star} Star` : undefined}
            >
              <Star
                size={size}
                className={`${
                  isFilled
                    ? 'fill-amber-400 text-amber-400'
                    : isHalf
                    ? 'fill-amber-400/50 text-amber-400'
                    : 'text-gray-200 fill-gray-100'
                } transition-colors`}
              />
            </button>
          );
        })}
      </div>
    );
  };

  const verifiedPercentage =
    stats.totalReviews > 0 ? Math.round((stats.verifiedCount / stats.totalReviews) * 100) : 0;

  return (
    <div id="product-reviews-section" className="pt-8 border-t border-gray-100 space-y-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-masuma-orange"></span>
            <h3 className="text-xs font-black uppercase tracking-[0.25em] text-masuma-dark font-display">
              Customer Ratings & Verified Reviews
            </h3>
          </div>
          <p className="text-xs text-gray-500 mt-1 font-medium">
            Real feedback from verified vehicle owners and automotive mechanics across Kenya
          </p>
        </div>

        <button
          id="btn-open-review-form"
          type="button"
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-masuma-dark text-white hover:bg-masuma-orange font-black text-xs uppercase tracking-wider transition-all duration-300 shadow-sm active:scale-95 touch-target"
        >
          <MessageSquare size={15} />
          {isFormOpen ? 'Close Form' : 'Write a Review'}
        </button>
      </div>

      {/* Success Banner */}
      {formSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
          <div className="text-xs font-semibold">
            Thank you! Your review has been submitted and is now published for other drivers.
          </div>
        </div>
      )}

      {/* Rating Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-gray-50/70 border border-gray-100 p-6 md:p-8 rounded-3xl">
        {/* Score Column */}
        <div className="md:col-span-4 flex flex-col justify-center items-center md:items-start md:border-r md:border-gray-200/70 md:pr-8">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl md:text-5xl font-black text-masuma-dark tracking-tight">
              {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '5.0'}
            </span>
            <span className="text-sm font-bold text-gray-400">/ 5.0</span>
          </div>

          <div className="mt-2">{renderStars(stats.averageRating > 0 ? stats.averageRating : 5, 20)}</div>

          <div className="mt-3 text-xs font-bold text-gray-600">
            Based on {stats.totalReviews} customer {stats.totalReviews === 1 ? 'review' : 'reviews'}
          </div>

          {stats.verifiedCount > 0 && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100/60 border border-emerald-200/70 text-emerald-800 rounded-full text-[10px] font-bold uppercase tracking-wider">
              <ShieldCheck size={13} className="text-emerald-700" />
              <span>{verifiedPercentage}% Verified Purchases</span>
            </div>
          )}
        </div>

        {/* Breakdown Bars */}
        <div className="md:col-span-8 flex flex-col justify-center space-y-2">
          {[5, 4, 3, 2, 1].map(star => {
            const count = stats.ratingDistribution[star] || 0;
            const pct = stats.totalReviews > 0 ? Math.round((count / stats.totalReviews) * 100) : 0;

            return (
              <button
                key={star}
                type="button"
                onClick={() => setActiveFilter(activeFilter === star.toString() ? 'all' : star.toString())}
                className={`flex items-center gap-3 w-full text-left group/bar py-1 px-2 rounded-lg transition-colors ${
                  activeFilter === star.toString() ? 'bg-white shadow-xs' : 'hover:bg-white/60'
                }`}
              >
                <span className="w-10 text-[11px] font-bold text-gray-700 flex items-center gap-1">
                  {star} <Star size={12} className="fill-amber-400 text-amber-400 inline" />
                </span>

                <div className="flex-1 h-2.5 bg-gray-200/80 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all duration-700 rounded-full group-hover/bar:bg-masuma-orange"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <span className="w-12 text-right text-[11px] font-semibold text-gray-500">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Write a Review Collapsible Form */}
      {isFormOpen && (
        <form
          id="product-review-form"
          onSubmit={handleSubmitReview}
          className="bg-white border-2 border-masuma-orange/30 p-6 md:p-8 rounded-3xl space-y-6 shadow-xl animate-fadeIn"
        >
          <div className="border-b border-gray-100 pb-4">
            <h4 className="text-sm font-black uppercase tracking-wider text-masuma-dark font-display">
              Reviewing: <span className="text-masuma-orange">{productName}</span>
            </h4>
            <p className="text-xs text-gray-400 font-bold mt-1 uppercase">Part SKU: {productSku}</p>
          </div>

          {formError && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Star Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Overall Rating <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-4">
              {renderStars(rating, 28, true)}
              <span className="text-xs font-semibold text-masuma-dark">
                {RATING_DESCRIPTIONS[hoverRating || rating]}
              </span>
            </div>
          </div>

          {/* Review Headline */}
          <div className="space-y-1.5">
            <label htmlFor="review-title-input" className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Review Headline <span className="text-gray-400 font-normal lowercase">(optional)</span>
            </label>
            <input
              id="review-title-input"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Perfect OEM fit for my 2017 Prado, smooth performance"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:border-masuma-orange focus:outline-none transition-colors"
            />
          </div>

          {/* Detailed Comment */}
          <div className="space-y-1.5">
            <label htmlFor="review-comment-input" className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Your Review & Comments <span className="text-red-500">*</span>
            </label>
            <textarea
              id="review-comment-input"
              rows={4}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Tell other motorists about the build quality, vehicle fitment, installation experience, or durability..."
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:border-masuma-orange focus:outline-none transition-colors resize-y"
            />
          </div>

          {/* Customer Details Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="review-customer-name" className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Your Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="review-customer-name"
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="e.g., Benson Kamau"
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:border-masuma-orange focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="review-customer-email" className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Email Address <span className="text-gray-400 font-normal lowercase">(confidential)</span>
              </label>
              <input
                id="review-customer-email"
                type="email"
                value={customerEmail}
                onChange={e => setCustomerEmail(e.target.value)}
                placeholder="e.g., benson@example.com"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:border-masuma-orange focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Verified Customer Badge Verification Box */}
          <div className="p-4 bg-gray-50 border border-gray-200/80 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-masuma-dark">
                Verified Customer Status
              </span>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Purchased this part from Masuma online, WhatsApp, or in-store? Enter your Order Number or POS Receipt Number below to display the official <span className="font-semibold text-emerald-700">Verified Purchase</span> badge on your review.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <input
                  id="review-order-number-input"
                  type="text"
                  value={orderNumber}
                  onChange={e => setOrderNumber(e.target.value)}
                  placeholder="e.g., M-10492 or Receipt Number"
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:border-masuma-orange focus:outline-none transition-colors"
                />
              </div>

              {verifyingOrder && (
                <div className="text-[11px] font-bold text-gray-400 flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-masuma-orange rounded-full animate-spin" />
                  Verifying...
                </div>
              )}

              {verificationResult?.isVerified && (
                <div className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-100 text-emerald-800 rounded-xl text-[11px] font-bold border border-emerald-300 animate-fadeIn">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  {verificationResult.details || 'Verified Purchase Confirmed'}
                </div>
              )}
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-5 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs uppercase tracking-wider hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>

            <button
              id="btn-submit-customer-review"
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-masuma-orange text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-masuma-dark transition-all duration-300 shadow-md active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Publishing...
                </>
              ) : (
                'Submit Review'
              )}
            </button>
          </div>
        </form>
      )}

      {/* Filter and Sorting Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
              activeFilter === 'all'
                ? 'bg-masuma-dark text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Reviews ({stats.totalReviews})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('verified')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors ${
              activeFilter === 'verified'
                ? 'bg-emerald-700 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <ShieldCheck size={13} />
            Verified Only ({stats.verifiedCount})
          </button>

          {[5, 4, 3].map(st => (
            <button
              key={st}
              type="button"
              onClick={() => setActiveFilter(st.toString())}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                activeFilter === st.toString()
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {st} ★ ({stats.ratingDistribution[st] || 0})
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Sort:</span>
          <select
            id="review-sort-select"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-800 rounded-xl px-3 py-1.5 focus:outline-none focus:border-masuma-orange"
          >
            <option value="newest">Newest First</option>
            <option value="highest">Highest Rating</option>
            <option value="lowest">Lowest Rating</option>
            <option value="helpful">Most Helpful</option>
          </select>
        </div>
      </div>

      {/* Reviews Listing */}
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-gray-200 border-t-masuma-orange rounded-full animate-spin" />
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Loading reviews...</span>
        </div>
      ) : reviews.length === 0 ? (
        <div className="p-8 text-center bg-gray-50/50 border border-dashed border-gray-200 rounded-3xl space-y-4">
          <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto text-gray-400">
            <Star size={24} className="text-amber-400" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-masuma-dark">No customer reviews yet</h4>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Be the first verified customer to share feedback about the fitment and performance of this genuine part.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="px-6 py-2.5 bg-masuma-orange text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-masuma-dark transition-colors inline-flex items-center gap-2"
          >
            <MessageSquare size={14} /> Write the First Review
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(rev => {
            const dateStr = rev.createdAt
              ? new Date(rev.createdAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })
              : 'Recent';

            return (
              <div
                key={rev.id}
                id={`review-${rev.id}`}
                className="bg-white border border-gray-100 p-5 md:p-6 rounded-2xl hover:border-gray-200 transition-shadow hover:shadow-sm space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-masuma-dark text-white font-black text-xs flex items-center justify-center shrink-0">
                      {rev.customerName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-masuma-dark">{rev.customerName}</span>
                        {rev.isVerifiedPurchase && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold tracking-wider uppercase">
                            <ShieldCheck size={11} className="text-emerald-600" />
                            Verified Customer
                          </span>
                        )}
                        {rev.orderNumber && (
                          <span className="text-[10px] font-semibold text-gray-400">
                            (Ref: {rev.orderNumber})
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium">{dateStr}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">{renderStars(rev.rating, 14)}</div>
                </div>

                {rev.title && (
                  <h5 className="text-xs font-bold text-gray-900 tracking-tight">
                    {rev.title}
                  </h5>
                )}

                <p className="text-xs text-gray-600 leading-relaxed">
                  {rev.comment}
                </p>

                <div className="pt-2 flex items-center justify-between border-t border-gray-50 text-[11px] text-gray-400">
                  <div className="flex items-center gap-1 text-[10px] text-gray-400">
                    <Award size={13} className="text-masuma-orange" />
                    <span>Masuma Genuine Part Verification</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleHelpfulClick(rev.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors ${
                      helpfulVoted[rev.id]
                        ? 'bg-emerald-50 text-emerald-700 font-bold'
                        : 'hover:bg-gray-100 text-gray-500 font-medium'
                    }`}
                  >
                    <ThumbsUp size={12} className={helpfulVoted[rev.id] ? 'fill-emerald-600' : ''} />
                    <span>Helpful ({rev.helpfulCount || 0})</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProductReviews;
