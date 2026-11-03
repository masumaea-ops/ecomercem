import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, ExternalLink, ShieldCheck, MapPin, MessageSquareText, Globe, Search, ShoppingBag, Check, Eye } from 'lucide-react';
import { sendMessageToGemini } from '../services/geminiService';
import { ChatMessage, Product } from '../types';
import { trackAIInteraction } from '../utils/analytics';

interface ExtendedChatMessage extends ChatMessage {
  sources?: { uri: string; title: string }[];
  products?: Product[];
}

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  addToCart?: (product: Product, quantity?: number) => void;
  onSelectProduct?: (product: Product) => void;
}

/**
 * Lightweight, secure markdown formatter for chat bubbles:
 * Supports **bold**, [links](urls), bullet points, and horizontal rules.
 */
const FormattedMessageText: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');

  const renderBold = (str: string, keyPrefix: string) => {
    const boldParts = str.split(/(\*\*[^*]+\*\*)/g);
    return boldParts.map((sub, sIdx) => {
      if (sub.startsWith('**') && sub.endsWith('**')) {
        return (
          <strong key={`${keyPrefix}-b-${sIdx}`} className="font-bold text-gray-900">
            {sub.slice(2, -2)}
          </strong>
        );
      }
      return <React.Fragment key={`${keyPrefix}-t-${sIdx}`}>{sub}</React.Fragment>;
    });
  };

  const renderFormattedLine = (content: string) => {
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = linkRegex.exec(content)) !== null) {
      const before = content.slice(lastIndex, match.index);
      if (before) {
        parts.push(renderBold(before, `before-${lastIndex}`));
      }
      const label = match[1];
      const url = match[2];
      parts.push(
        <a
          key={`link-${match.index}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold underline text-masuma-orange hover:text-orange-700 inline-flex items-center gap-0.5 break-all transition"
        >
          {label}
          <ExternalLink size={10} className="inline ml-0.5 shrink-0" />
        </a>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push(renderBold(content.slice(lastIndex), `after-${lastIndex}`));
    }

    return parts.length > 0 ? parts : renderBold(content, 'single');
  };

  return (
    <div className="space-y-1.5 leading-relaxed text-sm">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-2" />;
        }

        if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-masuma-orange font-bold leading-none mt-1">•</span>
              <div className="flex-1">{renderFormattedLine(trimmed.slice(2))}</div>
            </div>
          );
        }

        if (trimmed === '---') {
          return <hr key={idx} className="my-2 border-gray-200" />;
        }

        return <div key={idx}>{renderFormattedLine(line)}</div>;
      })}
    </div>
  );
};

const AIAssistant: React.FC<AIAssistantProps> = ({ isOpen, onClose, addToCart, onSelectProduct }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [addedProductIds, setAddedProductIds] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<ExtendedChatMessage[]>([
    { 
      role: 'model', 
      text: "Jambo! Karibu to Masuma Autoparts East Africa. 🇰🇪\n\nI am your live technical automotive consultant. How can I help you today?\n\n• **Shop Directions:** How to find us at Ruby Mall, Accra Road, Nairobi.\n• **Parts Lookup:** High-durability Japanese parts for Toyota, Nissan, Subaru, Mazda, Honda, etc.\n• **Quality Guarantee:** Learn about our 12-Month Unlimited Mileage Warranty.\n• **Fast Delivery:** 1-hour dispatch in Nairobi CBD and countrywide courier across Kenya." 
    }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, isLoading]);

  const handleSend = async (overrideInput?: string) => {
    const textToSend = overrideInput || input;
    if (!textToSend.trim()) return;

    const userMessage: ExtendedChatMessage = { role: 'user', text: textToSend };
    
    // Update state first so we have the latest conversation turns
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    
    if (!overrideInput) setInput('');
    setIsLoading(true);
    trackAIInteraction(textToSend);

    try {
      const history = updatedMessages.map(m => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.text }]
      }));

      const result = await sendMessageToGemini(history, textToSend);
      
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: result.text,
        sources: result.sources,
        products: result.products
      }]);
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: "Karibu! Our customer service and parts specialists are standing by. You can visit us on the First Floor of Ruby Mall on Accra Road (behind NCBA Bank, Nairobi CBD), or chat with our master technician on WhatsApp at [+254 792 506 590](https://wa.me/254792506590).", 
        isError: false 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1500] pointer-events-none flex flex-col md:flex-row items-end justify-end">
      <div className="absolute inset-0 bg-black/40 pointer-events-auto md:bg-transparent" onClick={onClose}></div>

      <div className="pointer-events-auto absolute md:relative bottom-0 right-0 w-full h-[92dvh] md:h-[750px] md:w-[460px] md:bottom-6 md:right-6 bg-white rounded-t-3xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 animate-slide-up pb-safe">
        
        {/* Header */}
        <div className="bg-masuma-dark p-4 md:p-5 flex justify-between items-center text-white border-b-4 border-masuma-orange shadow-lg">
          <div className="flex items-center gap-3">
            <div className="bg-masuma-orange p-2 rounded-lg shadow-inner">
              <Bot size={22} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                Masuma Live Expert
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              </h3>
              <p className="text-[10px] text-gray-300 font-medium">Ruby Mall Nairobi CBD • 12-Mo Warranty</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close Chat" className="p-2 text-gray-400 hover:text-white transition bg-white/5 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4 bg-gray-50/60 scroll-smooth">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[88%] p-4 shadow-sm rounded-2xl ${
                  msg.role === 'user' 
                    ? 'bg-masuma-orange text-white rounded-tr-none' 
                    : 'bg-white text-masuma-dark border border-gray-200/80 rounded-tl-none'
                } ${msg.isError ? 'border-red-400 text-red-700 bg-red-50' : ''}`}>
                
                {msg.role === 'user' ? (
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</div>
                ) : (
                  <>
                    <FormattedMessageText text={msg.text} />

                    {msg.products && msg.products.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-black text-masuma-dark uppercase tracking-wider flex items-center gap-1.5">
                            <ShoppingBag size={12} className="text-masuma-orange" />
                            Live In-Stock Parts ({msg.products.length}):
                          </p>
                          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                            Ruby Mall FF25
                          </span>
                        </div>
                        <div className="flex flex-col gap-2">
                          {msg.products.map((prod) => (
                            <div key={prod.id} className="bg-white p-2.5 rounded-xl border border-gray-200/90 shadow-sm hover:border-masuma-orange/50 transition flex items-center gap-3">
                              <div className="w-13 h-13 bg-gray-50 rounded-lg overflow-hidden shrink-0 border border-gray-100 flex items-center justify-center p-1">
                                {prod.image ? (
                                  <img src={prod.image} alt={prod.name} className="w-12 h-12 object-contain" />
                                ) : (
                                  <span className="text-[8px] font-bold text-gray-400">MASUMA</span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className="text-[9px] font-mono font-bold bg-gray-100 text-masuma-dark px-1.5 py-0.5 rounded">
                                    {prod.sku}
                                  </span>
                                  <span className="text-[8px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                    {prod.stock ? 'In Stock' : 'Order Ready'}
                                  </span>
                                </div>
                                <h4 className="font-bold text-xs text-masuma-dark truncate leading-tight mb-1" title={prod.name}>
                                  {prod.name}
                                </h4>
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-xs font-black text-masuma-orange">
                                    KSh {Number(prod.price).toLocaleString()}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    {onSelectProduct && (
                                      <button
                                        type="button"
                                        onClick={() => onSelectProduct(prod)}
                                        className="px-2 py-1 text-[10px] font-bold uppercase rounded bg-gray-100 hover:bg-gray-200 text-masuma-dark transition flex items-center gap-1"
                                        title="View Details"
                                      >
                                        <Eye size={10} /> View
                                      </button>
                                    )}
                                    {addToCart && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          addToCart(prod, 1);
                                          setAddedProductIds(prev => new Set([...prev, prod.id]));
                                          setTimeout(() => {
                                            setAddedProductIds(prev => {
                                              const next = new Set(prev);
                                              next.delete(prod.id);
                                              return next;
                                            });
                                          }, 2000);
                                        }}
                                        className={`px-2 py-1 text-[10px] font-bold uppercase rounded transition flex items-center gap-1 ${
                                          addedProductIds.has(prod.id)
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-masuma-dark hover:bg-masuma-orange text-white'
                                        }`}
                                      >
                                        {addedProductIds.has(prod.id) ? (
                                          <>
                                            <Check size={10} /> Added
                                          </>
                                        ) : (
                                          <>
                                            <ShoppingBag size={10} /> + Cart
                                          </>
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
                
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-[9px] font-black text-gray-400 uppercase mb-2 flex items-center gap-1">
                      <Globe size={10} className="text-masuma-orange" /> Verified References & Actions:
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {msg.sources.map((src, sIdx) => (
                        <a key={sIdx} href={src.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] text-masuma-dark font-bold hover:text-masuma-orange transition flex items-center gap-1.5 bg-gray-50 p-2 rounded-lg border border-gray-100 truncate group">
                          <ExternalLink size={10} className="shrink-0 group-hover:scale-110 transition text-masuma-orange" />
                          <span className="truncate">{src.title}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white text-masuma-dark p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-masuma-orange rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-masuma-orange rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-masuma-orange rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Expert is consulting catalog...</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] font-bold text-masuma-orange uppercase animate-pulse px-1">
                  <Search size={10} /> Searching Masuma technical fitment data...
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Action Prompt Suggestions */}
        {!isLoading && messages.length < 12 && (
          <div className="px-4 py-2.5 flex gap-2 overflow-x-auto bg-white border-t border-gray-100 scrollbar-hide">
            <button onClick={() => handleSend("How to find Ruby Mall on Accra Road?")} className="whitespace-nowrap px-3.5 py-1.5 bg-gray-100 hover:bg-masuma-orange hover:text-white text-[11px] font-bold uppercase rounded-full border border-gray-200 transition flex items-center gap-1.5 text-gray-700">
              <MapPin size={12} className="text-masuma-orange"/> Shop Location
            </button>
            <button onClick={() => handleSend("Current price of Fielder shocks in Kenya?")} className="whitespace-nowrap px-3.5 py-1.5 bg-gray-100 hover:bg-masuma-orange hover:text-white text-[11px] font-bold uppercase rounded-full border border-gray-200 transition flex items-center gap-1.5 text-gray-700">
              <Globe size={12}/> Fielder Shocks
            </button>
            <button onClick={() => handleSend("Tell me about Masuma 1-year warranty")} className="whitespace-nowrap px-3.5 py-1.5 bg-gray-100 hover:bg-masuma-orange hover:text-white text-[11px] font-bold uppercase rounded-full border border-gray-200 transition flex items-center gap-1.5 text-gray-700">
              <ShieldCheck size={12}/> 1-Year Warranty
            </button>
            <a href="https://wa.me/254792506590" target="_blank" rel="noopener noreferrer" className="whitespace-nowrap px-3.5 py-1.5 bg-green-50 text-green-700 hover:bg-green-600 hover:text-white text-[11px] font-bold uppercase rounded-full border border-green-200 transition flex items-center gap-1.5">
              <MessageSquareText size={12}/> WhatsApp Live
            </a>
          </div>
        )}

        {/* Input Area */}
        <div className="p-3 sm:p-4 bg-white border-t border-gray-100 pb-safe">
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about Ruby Mall location, parts, or car issues..."
                className="w-full pl-4 pr-10 py-3.5 bg-gray-100 border border-gray-200 rounded-xl focus:ring-2 focus:ring-masuma-orange/20 focus:bg-white focus:border-masuma-orange transition outline-none text-sm"
                disabled={isLoading}
              />
              <MessageSquareText className="absolute right-3 top-3.5 text-gray-300" size={18} />
            </div>
            <button 
              onClick={() => handleSend()} 
              disabled={isLoading || !input.trim()} 
              aria-label="Send message"
              className="p-3.5 bg-masuma-dark text-white hover:bg-masuma-orange disabled:opacity-50 transition rounded-xl shadow-md flex items-center justify-center"
            >
              <Send size={18} />
            </button>
          </div>
          <p className="text-[9px] text-center text-gray-400 font-medium tracking-wide mt-2">Masuma Autoparts East Africa Ltd • Ruby Mall, Nairobi</p>
        </div>

      </div>
    </div>
  );
};

export default AIAssistant;
export { AIAssistant };