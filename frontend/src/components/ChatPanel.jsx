import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Send,
  MessageCircle,
  Tag,
  Check,
  XCircle,
  ChevronLeft,
  RefreshCw,
  CheckCheck,
  Search,
  ShoppingBag,
} from 'lucide-react';
import { formatPrice, formatRelativeTime } from '../utils/format';
import Button from './ui/Button';

function NegotiationOfferCard({ msg, isMine, listingPrice, onAccept, onDecline, onCounter, onBuyNow }) {
  const isAccepted = msg.offer_type === 'accept';
  const isDeclined = msg.offer_type === 'decline';
  const isPending = msg.offer_type === 'offer';

  let discountLabel = null;
  if (isPending && listingPrice && msg.offer_price && msg.offer_price < listingPrice) {
    const pct = Math.round(((listingPrice - msg.offer_price) / listingPrice) * 100);
    if (pct > 0) discountLabel = `-${pct} % par rapport au prix affiché`;
  }

  return (
    <div
      className={`rounded-[8px] p-3.5 max-w-[310px] border-[1.5px] ${
        isMine ? 'ml-auto' : 'mr-auto'
      } ${
        isAccepted
          ? 'bg-[#DCFCE7] border-[#86EFAC]'
          : isDeclined
          ? 'bg-[#FEE2E2] border-[#FCA5A5]'
          : 'bg-neo-surface border-neo-ink shadow-tactile-sm'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-neo-ink-2 flex items-center gap-1">
          <Tag size={12} aria-hidden="true" />
          <span>{isAccepted ? 'Offre acceptée' : isDeclined ? 'Offre refusée' : 'Offre de prix'}</span>
        </span>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-[4px] ${
            isAccepted
              ? 'bg-[#15803D] text-white'
              : isDeclined
              ? 'bg-[#B91C1C] text-white'
              : 'bg-neo-cobalt text-white'
          }`}
        >
          {isAccepted ? 'Validée' : isDeclined ? 'Déclinée' : 'En attente'}
        </span>
      </div>

      {msg.offer_price != null && (
        <div className="my-1.5">
          <div className="font-mono text-xl font-bold text-neo-ink tabular-nums">
            {formatPrice(msg.offer_price)}
          </div>
          {discountLabel && (
            <p className="text-[11px] font-semibold text-[#15803D] mt-0.5">{discountLabel}</p>
          )}
        </div>
      )}

      {msg.content && (
        <p className="text-xs text-neo-ink-2 leading-relaxed my-2 bg-neo-muted p-2.5 rounded-[6px] border border-neo-border">
          {msg.content}
        </p>
      )}

      {!isMine && isPending && (
        <div className="flex flex-col gap-1.5 mt-3 pt-2.5 border-t border-neo-border">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="xs"
              className="flex-1"
              onClick={() => onAccept?.(msg.offer_price)}
            >
              <Check size={13} aria-hidden="true" /> Accepter
            </Button>
            <Button
              variant="danger-outline"
              size="xs"
              onClick={() => onDecline?.()}
            >
              <XCircle size={13} aria-hidden="true" /> Refuser
            </Button>
          </div>
          {onCounter && (
            <button
              type="button"
              onClick={() => onCounter(msg.offer_price)}
              className="text-center text-xs font-semibold text-neo-cobalt hover:underline bg-transparent border-0 py-1 cursor-pointer"
            >
              Faire une contre-offre
            </button>
          )}
        </div>
      )}

      {isAccepted && msg.offer_price && onBuyNow && !isMine && (
        <div className="mt-3 pt-2.5 border-t border-[#86EFAC]">
          <Button
            variant="primary"
            size="sm"
            className="w-full"
            onClick={() => onBuyNow(msg.offer_price)}
          >
            <ShoppingBag size={14} aria-hidden="true" />
            <span>Acheter à {formatPrice(msg.offer_price)}</span>
          </Button>
        </div>
      )}

      <div className={`flex items-center gap-1 mt-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
        <span className="text-[10px] text-neo-ink-3">{formatRelativeTime(msg.sent_at)}</span>
        {isMine && (
          <CheckCheck size={12} className={msg.read ? 'text-neo-cobalt' : 'text-neo-ink-3'} aria-hidden="true" />
        )}
      </div>
    </div>
  );
}

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
      className={`max-w-[78%] rounded-[8px] px-3.5 py-2.5 border-[1.5px] ${
        isMine
          ? 'ml-auto bg-neo-cobalt text-white border-[#1E3A8A]'
          : 'mr-auto bg-neo-surface text-neo-ink border-neo-border'
      }`}
    >
      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
      <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
        <span className={`text-[10px] ${isMine ? 'text-blue-100' : 'text-neo-ink-3'}`}>
          {formatRelativeTime(msg.sent_at)}
        </span>
        {isMine && (
          <CheckCheck size={12} className={msg.read ? 'text-white' : 'text-blue-200'} aria-hidden="true" />
        )}
      </div>
    </div>
  );
}

function ConvItem({ conv, listingInfo, onClick }) {
  const otherInitial = conv.other_party?.[0]?.toUpperCase() || '?';
  const hasUnread = conv.unread > 0;
  const cardName = listingInfo?.card_name || conv.card_name;
  const price = listingInfo?.price || conv.listing_price;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-[6px] text-left cursor-pointer border-[1.5px] transition-colors ${
        hasUnread
          ? 'bg-[#EFF6FF] dark:bg-[#0B2545] border-neo-cobalt'
          : 'bg-neo-surface border-neo-border hover:border-neo-border-strong'
      }`}
    >
      <div className="w-10 h-10 rounded-[6px] bg-neo-cobalt text-white flex items-center justify-center font-bold text-sm shrink-0">
        {otherInitial}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-neo-ink truncate">{conv.other_party}</p>
          <span className="text-[11px] text-neo-ink-3 shrink-0">{formatRelativeTime(conv.last_at)}</span>
        </div>
        {cardName && (
          <p className="text-xs text-neo-cobalt font-medium truncate mt-0.5 flex items-center gap-1">
            <Tag size={11} aria-hidden="true" />
            <span className="truncate">{cardName}</span>
            {price && <span className="font-mono text-neo-ink-3">({formatPrice(price)})</span>}
          </p>
        )}
        <p className={`text-xs truncate mt-0.5 ${hasUnread ? 'text-neo-ink font-semibold' : 'text-neo-ink-3'}`}>
          {conv.last_offer_type === 'offer'
            ? `Offre proposée : ${formatPrice(conv.last_offer_price)}`
            : conv.last_offer_type === 'accept'
            ? `Offre acceptée : ${formatPrice(conv.last_offer_price)}`
            : conv.last_message || 'Nouvelle conversation'}
        </p>
      </div>

      {hasUnread && (
        <span className="w-5 h-5 rounded-[4px] bg-neo-vermilion text-white font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
          {conv.unread > 9 ? '9+' : conv.unread}
        </span>
      )}
    </button>
  );
}

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
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  const fetchConversations = useCallback(async () => {
    if (!myName) return;
    setLoadingConvs(true);
    try {
      const token = localStorage.getItem('pokevinted_token');
      const res = await fetch(`/api/messages/conversations?username=${encodeURIComponent(myName)}`, {
        headers: token ? { 'x-session-token': token } : {},
      });
      if (res.ok) {
        setConversations(await res.json());
      }
    } catch {
      // Best effort
    } finally {
      setLoadingConvs(false);
    }
  }, [myName]);

  const fetchThread = useCallback(
    async (conv) => {
      if (!conv || !myName || isFetchingRef.current) return;
      isFetchingRef.current = true;
      try {
        const token = localStorage.getItem('pokevinted_token');
        const res = await fetch(
          `/api/messages/thread?listing_id=${encodeURIComponent(conv.listing_id)}&user_a=${encodeURIComponent(myName)}&user_b=${encodeURIComponent(conv.other_party)}`,
          { headers: token ? { 'x-session-token': token } : {} }
        );
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } catch {
        // Best effort
      } finally {
        isFetchingRef.current = false;
      }
    },
    [myName]
  );

  useEffect(() => {
    if (view === 'conversations') {
      fetchConversations();
    } else if (view === 'thread' && activeConv) {
      fetchThread(activeConv);
      pollRef.current = setInterval(() => fetchThread(activeConv), 5000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [view, activeConv, fetchConversations, fetchThread]);

  useEffect(() => {
    scrollToBottom(false);
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    if (view === 'thread') {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [view]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() && !offerMode) return;
    if (!activeConv || !myName) return;

    const trimmedInput = input.trim();
    const isOffer = offerMode && Boolean(offerPrice);
    const parsedOfferPrice = isOffer ? parseFloat(offerPrice) : null;
    const messageContent = isOffer
      ? trimmedInput || `Je vous propose une offre à ${formatPrice(parsedOfferPrice)}.`
      : trimmedInput;

    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      sender_name: myName,
      recipient_name: activeConv.other_party,
      content: messageContent,
      offer_price: parsedOfferPrice,
      offer_type: isOffer ? 'offer' : 'chat',
      read: false,
      sent_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInput('');
    setOfferMode(false);
    setOfferPrice('');
    scrollToBottom(true);

    setSending(true);
    try {
      const token = localStorage.getItem('pokevinted_token');
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-session-token': token } : {}),
        },
        body: JSON.stringify({
          listing_id: activeConv.listing_id,
          sender_name: myName,
          recipient_name: activeConv.other_party,
          content: messageContent,
          offer_price: parsedOfferPrice,
          offer_type: isOffer ? 'offer' : 'chat',
        }),
      });
      if (res.ok) fetchThread(activeConv);
    } catch {
      // Best effort
    } finally {
      setSending(false);
    }
  };

  const handleOfferResponse = async (type, price) => {
    if (!activeConv || !myName) return;
    const body = {
      listing_id: activeConv.listing_id,
      sender_name: myName,
      recipient_name: activeConv.other_party,
      content:
        type === 'accept'
          ? `Offre acceptée à ${formatPrice(price)}.`
          : 'Offre déclinée pour le moment.',
      offer_price: type === 'accept' ? price : null,
      offer_type: type,
    };

    setMessages((prev) => [
      ...prev,
      { id: `temp-${Date.now()}`, ...body, read: false, sent_at: new Date().toISOString() },
    ]);
    scrollToBottom(true);

    try {
      const token = localStorage.getItem('pokevinted_token');
      await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-session-token': token } : {}),
        },
        body: JSON.stringify(body),
      });

      if (type === 'accept' && price && activeConv?.listing_id) {
        await fetch(`/api/listings/${activeConv.listing_id}/price`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'x-session-token': token } : {}),
          },
          body: JSON.stringify({ price, seller_name: myName }),
        }).catch(() => {});
      }
      fetchThread(activeConv);
    } catch {
      // Best effort
    }
  };

  const applyQuickDiscount = (pct) => {
    const base = listingPrice || activeConv?.listing_price;
    if (!base) return;
    setOfferPrice(Math.max(1, base * (1 - pct / 100)).toFixed(2));
  };

  if (!currentUser) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3 p-6 bg-neo-surface text-center">
        <div className="w-11 h-11 rounded-[8px] bg-neo-muted border-[1.5px] border-neo-border flex items-center justify-center text-neo-ink-3">
          <MessageCircle size={20} />
        </div>
        <p className="text-sm font-bold text-neo-ink">Messagerie PokéVinted</p>
        <p className="text-xs text-neo-ink-3 max-w-xs">
          Connectez-vous pour discuter avec les vendeurs et proposer des offres de prix.
        </p>
      </div>
    );
  }

  const filteredConvs = conversations.filter((c) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return c.other_party?.toLowerCase().includes(q) || c.last_message?.toLowerCase().includes(q);
  });

  const activeCardName = cardName || activeConv?.card_name;
  const activeCardImage = cardImage || activeConv?.card_image;
  const activeListingPrice = listingPrice || activeConv?.listing_price;

  return (
    <div className="flex flex-col h-full bg-neo-canvas text-neo-ink">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b-[1.5px] border-neo-border bg-neo-surface shrink-0">
        {view === 'thread' && (
          <button
            type="button"
            onClick={() => {
              setView('conversations');
              if (pollRef.current) clearInterval(pollRef.current);
            }}
            aria-label="Retour aux discussions"
            className="w-8 h-8 rounded-[6px] hover:bg-neo-muted text-neo-ink-3 hover:text-neo-ink flex items-center justify-center cursor-pointer"
          >
            <ChevronLeft size={18} />
          </button>
        )}

        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {view === 'thread' && activeConv ? (
            <>
              <div className="w-8 h-8 rounded-[6px] bg-neo-cobalt text-white flex items-center justify-center font-bold text-xs shrink-0">
                {activeConv.other_party?.[0]?.toUpperCase() || '?'}
              </div>
              <p className="text-sm font-bold text-neo-ink truncate">{activeConv.other_party}</p>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <MessageCircle size={18} className="text-neo-cobalt" aria-hidden="true" />
              <div>
                <p className="text-sm font-bold text-neo-ink leading-tight">Messagerie</p>
                <p className="text-[11px] text-neo-ink-3">Négociations & échanges directs</p>
              </div>
            </div>
          )}
        </div>

        {view === 'thread' && (
          <button
            type="button"
            onClick={() => fetchThread(activeConv)}
            aria-label="Actualiser la discussion"
            className="w-8 h-8 rounded-[6px] hover:bg-neo-muted text-neo-ink-3 hover:text-neo-ink flex items-center justify-center cursor-pointer"
          >
            <RefreshCw size={14} />
          </button>
        )}

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la messagerie"
            className="w-8 h-8 rounded-[6px] hover:bg-neo-muted text-neo-ink-3 hover:text-neo-ink flex items-center justify-center cursor-pointer"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Listing Mini Context Bar */}
      {view === 'thread' && (activeCardName || activeListingPrice) && (
        <div className="px-4 py-2.5 bg-neo-surface border-b-[1.5px] border-neo-border flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {activeCardImage ? (
              <img
                src={activeCardImage}
                alt={activeCardName || 'Carte'}
                className="w-8 h-11 object-contain rounded-[3px] border border-neo-border bg-neo-muted shrink-0"
              />
            ) : (
              <div className="w-8 h-10 rounded-[3px] bg-neo-muted border border-neo-border flex items-center justify-center text-neo-ink-3 shrink-0">
                <Tag size={12} />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-neo-ink truncate">{activeCardName || 'Carte Pokémon'}</p>
              <p className="text-[11px] text-neo-ink-3 font-mono">
                Prix : <strong className="text-neo-ink">{formatPrice(activeListingPrice)}</strong>
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="xs"
            onClick={() => {
              setOfferMode(true);
              if (activeListingPrice && !offerPrice) {
                setOfferPrice((activeListingPrice * 0.9).toFixed(2));
              }
            }}
          >
            <Tag size={12} aria-hidden="true" />
            <span>Faire une offre</span>
          </Button>
        </div>
      )}

      {/* Conversations View */}
      {view === 'conversations' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-3 bg-neo-surface border-b border-neo-border">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neo-ink-3" aria-hidden="true" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Rechercher une discussion…"
                className="neo-input pl-9 text-xs"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loadingConvs ? (
              <p className="text-xs text-neo-ink-3 text-center py-12">Chargement…</p>
            ) : filteredConvs.length === 0 ? (
              <div className="py-16 text-center px-6 space-y-2">
                <p className="text-sm font-bold text-neo-ink">Aucune conversation</p>
                <p className="text-xs text-neo-ink-3">
                  Ouvrez une annonce et cliquez sur « Faire une offre » pour démarrer une négociation.
                </p>
              </div>
            ) : (
              filteredConvs.map((conv) => {
                const foundListing = listings.find((l) => l.id === conv.listing_id);
                return (
                  <ConvItem
                    key={conv.conversation_id}
                    conv={conv}
                    listingInfo={foundListing}
                    onClick={() => {
                      setActiveConv({
                        ...conv,
                        card_name: foundListing?.card_name || conv.card_name,
                        card_image: foundListing?.image_url || foundListing?.card_image || conv.card_image,
                        listing_price: foundListing?.price || conv.listing_price,
                      });
                      setMessages([]);
                      setView('thread');
                    }}
                  />
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Thread View */}
      {view === 'thread' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="py-16 text-center space-y-1.5">
                <p className="text-sm font-bold text-neo-ink">Démarrez l’échange</p>
                <p className="text-xs text-neo-ink-3">
                  Posez une question ou proposez un prix au vendeur.
                </p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <MessageBubble
                  key={msg.id || i}
                  msg={msg}
                  isMine={msg.sender_name.toLowerCase() === myName.toLowerCase()}
                  listingPrice={activeListingPrice}
                  onAccept={(p) => handleOfferResponse('accept', p)}
                  onDecline={() => handleOfferResponse('decline', null)}
                  onCounter={(lastPrice) => {
                    setOfferMode(true);
                    setOfferPrice(lastPrice ? String(lastPrice) : '');
                  }}
                  onBuyNow={(p) => onBuyNow?.(activeConv?.listing_id, p)}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {offerMode && (
            <div className="p-3.5 bg-neo-surface border-t-[1.5px] border-neo-ink space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neo-ink flex items-center gap-1.5">
                  <Tag size={13} className="text-neo-cobalt" aria-hidden="true" />
                  <span>Proposer un prix</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setOfferMode(false);
                    setOfferPrice('');
                  }}
                  aria-label="Annuler la proposition"
                  className="p-1 text-neo-ink-3 hover:text-neo-ink cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              {activeListingPrice && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-neo-ink-3">Suggestions :</span>
                  {[-5, -10, -15].map((pct) => (
                    <Button key={pct} variant="subtle" size="xs" onClick={() => applyQuickDiscount(Math.abs(pct))}>
                      {pct} %
                    </Button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    placeholder={activeListingPrice ? (activeListingPrice * 0.9).toFixed(2) : 'Montant'}
                    min="0.50"
                    step="0.50"
                    autoFocus
                    className="neo-input pr-8 font-mono font-bold tabular-nums"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSend();
                    }}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neo-ink-3">€</span>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSend}
                  disabled={!offerPrice || parseFloat(offerPrice) <= 0 || sending}
                >
                  Envoyer l&apos;offre
                </Button>
              </div>
            </div>
          )}

          <form
            onSubmit={handleSend}
            className="flex items-center gap-2 p-3 border-t-[1.5px] border-neo-border bg-neo-surface shrink-0"
          >
            <Button
              variant={offerMode ? 'secondary' : 'outline'}
              size="icon"
              onClick={() => setOfferMode((v) => !v)}
              aria-label="Proposer un prix"
              title="Proposer un prix"
            >
              <Tag size={15} />
            </Button>

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={offerMode ? 'Message d’accompagnement…' : `Écrire à ${activeConv?.other_party || 'vendeur'}…`}
              className="neo-input flex-1"
              maxLength={1000}
              disabled={sending}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />

            <Button
              type="submit"
              variant="primary"
              size="icon"
              disabled={sending || (!input.trim() && !offerMode)}
              aria-label="Envoyer le message"
            >
              <Send size={15} />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
