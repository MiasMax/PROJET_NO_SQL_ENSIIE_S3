import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Send, MessageCircle, Tag, Check, XCircle,
  ChevronLeft, RefreshCw, CheckCheck, Sparkles,
  ShieldCheck, AlertCircle, Search, ArrowRight,
  ShoppingBag,
} from 'lucide-react';

// ─── Relative time formatting ───────────────────────────────────────────────
function formatRelativeTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const now = new Date();
  const diffSec = Math.floor((now - d) / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffHours < 24) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return d.toLocaleDateString('fr-FR', { weekday: 'short' });
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function formatEuro(val) {
  if (val == null || isNaN(val)) return '0,00 €';
  return `${Number(val).toFixed(2).replace('.', ',')} €`;
}

// ─── Negotiation Offer Card ────────────────────────────────────────────────
function NegotiationOfferCard({ msg, isMine, listingPrice, onAccept, onDecline, onCounter, onBuyNow }) {
  const isAccepted = msg.offer_type === 'accept';
  const isDeclined = msg.offer_type === 'decline';
  const isPending = msg.offer_type === 'offer';

  // Calculate discount percentage if listingPrice is available
  let discountLabel = null;
  if (isPending && listingPrice && msg.offer_price && msg.offer_price < listingPrice) {
    const pct = Math.round(((listingPrice - msg.offer_price) / listingPrice) * 100);
    if (pct > 0) discountLabel = `-${pct}% par rapport au prix demandé`;
  }

  return (
    <div
      className={`rounded-2xl p-4 max-w-[320px] transition-all shadow-lg ${
        isMine ? 'ml-auto rounded-br-xs' : 'mr-auto rounded-bl-xs'
      } ${
        isAccepted
          ? 'bg-emerald-950/40 border border-emerald-500/40'
          : isDeclined
          ? 'bg-rose-950/30 border border-rose-500/30'
          : 'bg-[#182030] border border-white/10'
      }`}
    >
      {/* Header status badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <Tag size={13} className={isAccepted ? 'text-emerald-400' : isDeclined ? 'text-rose-400' : 'text-[#00a8b5]'} />
          <span className="text-[11px] font-bold tracking-wide uppercase text-slate-300">
            {isAccepted ? 'Offre acceptée' : isDeclined ? 'Offre refusée' : "Offre de prix"}
          </span>
        </div>
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            isAccepted
              ? 'bg-emerald-500/20 text-emerald-300'
              : isDeclined
              ? 'bg-rose-500/20 text-rose-300'
              : 'bg-[#007782]/30 text-[#00c5d4] border border-[#007782]/50'
          }`}
        >
          {isAccepted ? 'Validée' : isDeclined ? 'Déclinée' : 'En attente'}
        </span>
      </div>

      {/* Offer price highlight */}
      {msg.offer_price != null && (
        <div className="my-2">
          <div className="text-2xl font-black text-white tabular-nums tracking-tight">
            {formatEuro(msg.offer_price)}
          </div>
          {discountLabel && (
            <p className="text-[11px] font-medium text-emerald-400 mt-0.5">
              {discountLabel}
            </p>
          )}
        </div>
      )}

      {/* Accompanying message text */}
      {msg.content && (
        <p className="text-xs text-slate-300 leading-relaxed my-2 bg-black/20 p-2.5 rounded-xl border border-white/5">
          {msg.content}
        </p>
      )}

      {/* Action buttons for received offers in pending state */}
      {!isMine && isPending && (
        <div className="flex flex-col gap-2 mt-3 pt-2.5 border-t border-white/10">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onAccept && onAccept(msg.offer_price)}
              className="flex-1 h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <Check size={14} /> Accepter
            </button>
            <button
              type="button"
              onClick={() => onDecline && onDecline()}
              className="h-9 px-3 rounded-xl bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-300 border border-white/10 hover:border-rose-500/30 font-semibold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <XCircle size={14} /> Refuser
            </button>
          </div>
          {onCounter && (
            <button
              type="button"
              onClick={() => onCounter(msg.offer_price)}
              className="text-center text-[11px] font-semibold text-[#00c5d4] hover:text-[#38e1ef] transition-colors py-1 cursor-pointer"
            >
              Faire une contre-offre →
            </button>
          )}
        </div>
      )}

      {/* Direct purchase CTA when offer is accepted (shown only to buyer) */}
      {isAccepted && msg.offer_price && onBuyNow && !isMine && (
        <div className="mt-3 pt-2.5 border-t border-emerald-500/20">
          <button
            type="button"
            onClick={() => onBuyNow(msg.offer_price)}
            className="w-full h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md cursor-pointer"
          >
            <ShoppingBag size={14} />
            <span>Finaliser l'achat à {formatEuro(msg.offer_price)}</span>
          </button>
        </div>
      )}

      {/* Timestamp & read receipt */}
      <div className={`flex items-center gap-1 mt-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
        <span className="text-[10px] text-slate-400">{formatRelativeTime(msg.sent_at)}</span>
        {isMine && (
          <CheckCheck size={12} className={msg.read ? 'text-[#00c5d4]' : 'text-slate-500'} />
        )}
      </div>
    </div>
  );
}

// ─── Message Bubble ────────────────────────────────────────────────────────
function MessageBubble({ msg, isMine, listingPrice, onAccept, onDecline, onCounter, onBuyNow }) {
  const isOffer = msg.offer_type && msg.offer_type !== 'chat';

  if (isOffer) {
    return (
      <NegotiationOfferCard
        msg={msg}
        isMine={isMine}
        listingPrice={listingPrice}
        onAccept={onAccept}
        onDecline={onDecline}
        onCounter={onCounter}
        onBuyNow={onBuyNow}
      />
    );
  }

  return (
    <div
      className={`max-w-[78%] rounded-2xl px-4 py-2.5 shadow-sm transition-all ${
        isMine
          ? 'ml-auto bg-[#007782] text-white rounded-br-xs'
          : 'mr-auto bg-[#1a202c] text-slate-100 border border-white/[0.08] rounded-bl-xs'
      }`}
    >
      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
      <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
        <span className={`text-[10px] ${isMine ? 'text-teal-100/75' : 'text-slate-400'}`}>
          {formatRelativeTime(msg.sent_at)}
        </span>
        {isMine && (
          <CheckCheck size={12} className={msg.read ? 'text-teal-200' : 'text-teal-200/50'} />
        )}
      </div>
    </div>
  );
}

// ─── Conversation List Item ────────────────────────────────────────────────
function ConvItem({ conv, listingInfo, onClick }) {
  const otherInitial = conv.other_party?.[0]?.toUpperCase() || '?';
  const hasUnread = conv.unread > 0;
  const cardName = listingInfo?.card_name || conv.card_name;
  const price = listingInfo?.price || conv.listing_price;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3.5 p-3 rounded-2xl transition-all text-left group cursor-pointer border ${
        hasUnread
          ? 'bg-[#182030]/90 border-[#007782]/40 hover:border-[#007782]'
          : 'bg-[#121620]/60 border-white/[0.05] hover:bg-[#182030] hover:border-white/10'
      }`}
    >
      {/* Avatar with subtle online badge */}
      <div className="relative flex-shrink-0">
        <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm text-white bg-gradient-to-br from-[#007782] to-[#00555e] shadow-md border border-white/10">
          {otherInitial}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <p className="text-sm font-semibold text-white truncate group-hover:text-[#00c5d4] transition-colors">
            {conv.other_party}
          </p>
          <span className="text-[11px] text-slate-400 shrink-0">
            {formatRelativeTime(conv.last_at)}
          </span>
        </div>
        {cardName && (
          <p className="text-[11px] text-[#00c5d4] font-medium truncate flex items-center gap-1.5 mb-0.5">
            <span>📦 {cardName}</span>
            {price && <span className="text-slate-400 font-normal">({formatEuro(price)})</span>}
          </p>
        )}
        <p className={`text-xs truncate ${hasUnread ? 'text-slate-200 font-medium' : 'text-slate-400'}`}>
          {conv.last_offer_type === 'offer'
            ? `💰 Offre proposée : ${formatEuro(conv.last_offer_price)}`
            : conv.last_offer_type === 'accept'
            ? `✓ Offre acceptée à ${formatEuro(conv.last_offer_price)}`
            : conv.last_message || 'Nouvelle conversation'}
        </p>
      </div>

      {hasUnread && (
        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white bg-[#007782] flex-shrink-0 shadow-sm">
          {conv.unread > 9 ? '9+' : conv.unread}
        </span>
      )}
    </button>
  );
}

// ─── Main Chat Panel Component ─────────────────────────────────────────────
export default function ChatPanel({
  currentUser,
  listingId,
  sellerName,
  listingPrice,
  cardName,
  cardImage,
  listings = [],
  onClose,
  onBuyNow,
}) {
  const [view, setView] = useState(listingId ? 'thread' : 'conversations');
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(
    listingId
      ? {
          listing_id: listingId,
          other_party: sellerName,
          listing_price: listingPrice,
          card_name: cardName,
          card_image: cardImage,
        }
      : null
  );
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [offerMode, setOfferMode] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const pollRef = useRef(null);
  const isFetchingRef = useRef(false);

  const myName = currentUser?.name || currentUser?.username || '';

  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  }, []);

  // ── Load conversations list ──────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    if (!myName) return;
    setLoadingConvs(true);
    try {
      const res = await fetch(`/api/messages/conversations?username=${encodeURIComponent(myName)}`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (e) {
      // Best effort
    } finally {
      setLoadingConvs(false);
    }
  }, [myName]);

  // ── Load thread messages ──────────────────────────────────────────────────
  const fetchThread = useCallback(async (conv) => {
    if (!conv || !myName || isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const res = await fetch(
        `/api/messages/thread?listing_id=${encodeURIComponent(conv.listing_id)}&user_a=${encodeURIComponent(myName)}&user_b=${encodeURIComponent(conv.other_party)}`
      );
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (e) {
      // Best effort
    } finally {
      isFetchingRef.current = false;
    }
  }, [myName]);

  // Initialize and poll
  useEffect(() => {
    if (view === 'conversations') {
      fetchConversations();
    } else if (view === 'thread' && activeConv) {
      fetchThread(activeConv);
      // Controlled polling every 5 seconds without piling requests
      pollRef.current = setInterval(() => {
        fetchThread(activeConv);
      }, 5000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [view, activeConv, fetchConversations, fetchThread]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom(false);
  }, [messages.length, scrollToBottom]);

  // Focus input when opening thread
  useEffect(() => {
    if (view === 'thread') {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [view]);

  // ── Send message (Instant Optimistic update) ─────────────────────────────
  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() && !offerMode) return;
    if (!activeConv || !myName) return;

    const trimmedInput = input.trim();
    const isOffer = offerMode && Boolean(offerPrice);
    const parsedOfferPrice = isOffer ? parseFloat(offerPrice) : null;

    const messageContent = isOffer
      ? (trimmedInput || `Je vous propose une offre à ${formatEuro(parsedOfferPrice)}.`)
      : trimmedInput;

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      sender_name: myName,
      recipient_name: activeConv.other_party,
      content: messageContent,
      offer_price: parsedOfferPrice,
      offer_type: isOffer ? 'offer' : 'chat',
      read: false,
      sent_at: new Date().toISOString(),
    };

    // 1. Optimistic instant insert (0ms perceived delay)
    setMessages((prev) => [...prev, optimisticMsg]);
    setInput('');
    setOfferMode(false);
    setOfferPrice('');
    scrollToBottom(true);

    // 2. Perform background network sync
    setSending(true);
    try {
      const body = {
        listing_id: activeConv.listing_id,
        sender_name: myName,
        recipient_name: activeConv.other_party,
        content: messageContent,
        offer_price: parsedOfferPrice,
        offer_type: isOffer ? 'offer' : 'chat',
      };

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        // Refresh silently to get canonical server ID
        fetchThread(activeConv);
      }
    } catch (err) {
      // Best effort fallback
    } finally {
      setSending(false);
    }
  };

  // ── Respond to offer (accept / decline) ──────────────────────────────────
  const handleOfferResponse = async (type, price) => {
    if (!activeConv || !myName) return;
    const body = {
      listing_id: activeConv.listing_id,
      sender_name: myName,
      recipient_name: activeConv.other_party,
      content: type === 'accept'
        ? `J'accepte avec plaisir votre offre de ${formatEuro(price)} !`
        : "Je décline cette proposition pour l'instant.",
      offer_price: type === 'accept' ? price : null,
      offer_type: type,
    };

    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      sender_name: myName,
      recipient_name: activeConv.other_party,
      content: body.content,
      offer_price: body.offer_price,
      offer_type: body.offer_type,
      read: false,
      sent_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom(true);

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      // When seller accepts the offer, update the listing price so the buyer can purchase at agreed price
      if (type === 'accept' && price && activeConv?.listing_id) {
        try {
          await fetch(`/api/listings/${activeConv.listing_id}/price`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ new_price: price }),
          });
        } catch (e) {
          // Best effort
        }
      }

      fetchThread(activeConv);
    } catch (e) {
      // Best effort
    }
  };

  // ── Open a conversation thread ───────────────────────────────────────────
  const openConversation = (conv) => {
    const foundListing = listings.find((l) => l.id === conv.listing_id);
    setActiveConv({
      ...conv,
      card_name: foundListing?.card_name || conv.card_name,
      card_image: foundListing?.card_image || conv.card_image,
      listing_price: foundListing?.price || conv.listing_price,
    });
    setMessages([]);
    setView('thread');
  };

  // ── Quick discount helper ────────────────────────────────────────────────
  const applyQuickDiscount = (pct) => {
    const base = listingPrice || activeConv?.listing_price;
    if (!base) return;
    const discounted = Math.max(1, base * (1 - pct / 100));
    setOfferPrice(discounted.toFixed(2));
  };

  // ── Keyboard ESC handler ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (offerMode) {
          setOfferMode(false);
        } else if (view === 'thread' && conversations.length > 0) {
          setView('conversations');
          if (pollRef.current) clearInterval(pollRef.current);
        } else {
          onClose?.();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [view, offerMode, conversations.length, onClose]);

  // Auth gate
  if (!currentUser) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3 p-6 bg-[#0c0e14] text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#007782]/20 flex items-center justify-center text-[#00c5d4]">
          <MessageCircle size={24} />
        </div>
        <p className="text-white font-semibold text-base">Messagerie PokéVinted</p>
        <p className="text-slate-400 text-xs max-w-xs">
          Veuillez vous connecter pour négocier et échanger avec les autres dresseurs.
        </p>
      </div>
    );
  }

  // Filter conversations
  const filteredConvs = conversations.filter((c) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      c.other_party?.toLowerCase().includes(q) ||
      c.last_message?.toLowerCase().includes(q)
    );
  });

  const activeCardName = cardName || activeConv?.card_name;
  const activeListingPrice = listingPrice || activeConv?.listing_price;

  return (
    <div className="flex flex-col h-full bg-[#0c0e14] text-slate-100 select-none">
      {/* ── Top Header Bar ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.08] bg-[#121620]/80 backdrop-blur-md shrink-0">
        {view === 'thread' && (
          <button
            type="button"
            onClick={() => {
              setView('conversations');
              if (pollRef.current) clearInterval(pollRef.current);
            }}
            className="p-1.5 -ml-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Retour aux conversations"
          >
            <ChevronLeft size={20} />
          </button>
        )}

        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {view === 'thread' && activeConv ? (
            <>
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-[#007782] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  {activeConv.other_party?.[0]?.toUpperCase() || '?'}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white truncate leading-tight">
                  {activeConv.other_party}
                </p>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#007782]/20 flex items-center justify-center text-[#00c5d4]">
                <MessageCircle size={16} />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-tight">Messagerie</p>
                <p className="text-[11px] text-slate-400">Négociations & échanges directs</p>
              </div>
            </div>
          )}
        </div>

        {view === 'thread' && (
          <button
            type="button"
            onClick={() => fetchThread(activeConv)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Actualiser la discussion"
          >
            <RefreshCw size={14} className={isFetchingRef.current ? 'animate-spin text-[#00c5d4]' : ''} />
          </button>
        )}

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Fermer"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* ── Listing Mini Context Bar (When inside a thread) ───────── */}
      {view === 'thread' && (activeCardName || activeListingPrice) && (
        <div className="px-4 py-2.5 bg-[#141a26] border-b border-white/[0.08] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {cardImage ? (
              <img
                src={cardImage}
                alt={activeCardName || 'Carte'}
                className="w-8 h-11 object-cover rounded-md border border-white/10 shadow-sm shrink-0"
              />
            ) : (
              <div className="w-7 h-9 rounded bg-[#1f283a] border border-white/10 flex items-center justify-center text-slate-400 shrink-0">
                <Tag size={12} />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">
                {activeCardName || 'Carte Pokémon'}
              </p>
              <p className="text-[11px] text-slate-400">
                Prix vendeur :{' '}
                <span className="font-bold text-white tabular-nums">
                  {formatEuro(activeListingPrice)}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setOfferMode(true);
              if (activeListingPrice && !offerPrice) {
                setOfferPrice((activeListingPrice * 0.9).toFixed(2));
              }
            }}
            className="h-7 px-2.5 rounded-lg bg-[#007782]/20 hover:bg-[#007782]/30 text-[#00c5d4] border border-[#007782]/40 text-[11px] font-semibold flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
          >
            <Sparkles size={11} />
            <span>Faire une offre</span>
          </button>
        </div>
      )}

      {/* ── View: Conversation List ───────────────────────────────── */}
      {view === 'conversations' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Search bar */}
          <div className="p-3 border-b border-white/[0.06]">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Rechercher une discussion…"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#141824] border border-white/10 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#007782] transition-colors"
              />
            </div>
          </div>

          {/* Conversations scroll area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loadingConvs ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <div className="w-7 h-7 border-2 border-[#007782] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-400">Chargement des échanges…</span>
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-6">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-500">
                  <MessageCircle size={24} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-300">Aucune conversation</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Rendez-vous sur une annonce et cliquez sur <span className="text-[#00c5d4]">"Faire une offre"</span> pour démarrer une négociation en direct.
                  </p>
                </div>
              </div>
            ) : (
              filteredConvs.map((conv) => {
                const foundListing = listings.find((l) => l.id === conv.listing_id);
                return (
                  <ConvItem
                    key={conv.conversation_id}
                    conv={conv}
                    listingInfo={foundListing}
                    onClick={() => openConversation(conv)}
                  />
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── View: Thread Messages ─────────────────────────────────── */}
      {view === 'thread' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-center px-4">
                <div className="w-10 h-10 rounded-xl bg-[#007782]/15 flex items-center justify-center text-[#00c5d4]">
                  <Sparkles size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">Démarrez la négociation</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Envoyez un message amical ou proposez un prix au vendeur.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <MessageBubble
                  key={msg.id || i}
                  msg={msg}
                  isMine={msg.sender_name.toLowerCase() === myName.toLowerCase()}
                  listingPrice={activeListingPrice}
                  onAccept={(price) => handleOfferResponse('accept', price)}
                  onDecline={() => handleOfferResponse('decline', null)}
                  onCounter={(lastPrice) => {
                    setOfferMode(true);
                    setOfferPrice(lastPrice ? String(lastPrice) : '');
                  }}
                  onBuyNow={(price) => onBuyNow && onBuyNow(activeConv?.listing_id, price)}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Offer Drawer Panel */}
          {offerMode && (
            <div className="p-4 bg-[#141b29] border-t border-white/10 shadow-2xl animate-in slide-in-from-bottom duration-150">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Tag size={15} className="text-[#00c5d4]" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Proposition de prix direct
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOfferMode(false);
                    setOfferPrice('');
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Quick discount chips */}
              {activeListingPrice && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] text-slate-400 font-medium">Rabais suggéré :</span>
                  {[-5, -10, -15].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => applyQuickDiscount(Math.abs(pct))}
                      className="px-2.5 py-1 rounded-lg bg-[#1c2436] hover:bg-[#007782]/30 hover:border-[#007782] text-slate-300 hover:text-[#00c5d4] border border-white/10 text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              )}

              {/* Price input */}
              <div className="flex items-center gap-2 mb-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    placeholder={activeListingPrice ? `Ex: ${(activeListingPrice * 0.9).toFixed(2)}` : 'Montant'}
                    min="0.50"
                    step="0.50"
                    autoFocus
                    className="w-full pl-3 pr-8 py-2 rounded-xl bg-[#0c0e14] border border-[#007782]/60 text-base font-black text-white placeholder-slate-500 focus:outline-none focus:border-[#00c5d4] tabular-nums"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSend();
                    }}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    €
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!offerPrice || parseFloat(offerPrice) <= 0 || sending}
                  className="h-10 px-4 rounded-xl bg-[#007782] hover:bg-[#006872] active:bg-[#00555e] text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md disabled:opacity-40 cursor-pointer"
                >
                  <span>Proposer l'offre</span>
                  <ArrowRight size={13} />
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                Le vendeur sera notifié immédiatement et pourra accepter ou faire une contre-proposition.
              </p>
            </div>
          )}

          {/* Bottom Composer Input Bar */}
          <form
            onSubmit={handleSend}
            className="flex items-center gap-2 px-3 py-3 border-t border-white/[0.08] bg-[#121620]/90 backdrop-blur-md shrink-0"
          >
            {/* Offer Toggle Button */}
            <button
              type="button"
              onClick={() => setOfferMode(!offerMode)}
              className={`p-2.5 rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                offerMode
                  ? 'bg-[#007782] text-white shadow-md'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10'
              }`}
              title="Proposer une négociation de prix"
            >
              <Tag size={16} />
            </button>

            {/* Text input */}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                offerMode
                  ? 'Ajouter un mot pour accompagner votre offre…'
                  : `Message pour ${activeConv?.other_party || 'le vendeur'}…`
              }
              className="flex-1 px-4 py-2.5 rounded-2xl bg-[#181d2a] border border-white/10 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#007782] transition-colors"
              maxLength={1000}
              disabled={sending}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />

            {/* Send CTA Button */}
            <button
              type="submit"
              disabled={sending || (!input.trim() && !offerMode)}
              className="w-10 h-10 rounded-2xl bg-[#007782] hover:bg-[#006872] active:bg-[#00555e] text-white flex items-center justify-center shrink-0 transition-all shadow-md active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              title="Envoyer"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
