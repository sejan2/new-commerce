import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Send, ShoppingBag, Sparkles, ChevronDown, Bot } from "lucide-react";

export default function AIShoppingAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! 👋 I'm ShopBot — your AI shopping assistant. Tell me what you're looking for and I'll search our catalog for you!",
      products: [],
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pulse, setPulse] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
      setPulse(false);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { role: "user", content: input.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      // Build messages array for API (only role + content, no products)
      const apiMessages = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/ai/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages }),
        }
      );

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message || "Sorry, I couldn't find anything. Try rephrasing!",
          products: data.products || [],
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Oops! Something went wrong. Please try again.", products: [] },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickPrompts = [
    "Show me sale items 🏷️",
    "Men's casual outfits 👕",
    "Gift ideas under ৳2000 🎁",
    "Top rated products ⭐",
  ];

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {!open && (
          <div
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 bg-white text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg border border-indigo-100 cursor-pointer hover:bg-indigo-50 transition animate-bounce"
          >
            <Sparkles className="w-3 h-3" /> Ask AI
          </div>
        )}
        <button
          onClick={() => setOpen((o) => !o)}
          className="relative w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95"
          style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}
        >
          {pulse && (
            <span
              className="absolute inset-0 rounded-full animate-ping opacity-25"
              style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}
            />
          )}
          {open ? <ChevronDown className="w-6 h-6 text-white" /> : <Sparkles className="w-6 h-6 text-white" />}
        </button>
      </div>

      {/* Chat Window */}
      <div
        className={`fixed bottom-24 right-6 z-50 flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-gray-100 bg-white transition-all duration-300 ${
          open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-6 pointer-events-none"
        }`}
        style={{ width: "360px", height: "540px" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">ShopBot AI</p>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                <p className="text-indigo-200 text-[10px]">Powered by Claude + MCP</p>
              </div>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="hover:bg-white/20 rounded-full p-1.5 transition">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ background: "#f5f6ff" }}>
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] ${msg.role === "user" ? "" : "w-full"}`}>
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "text-white rounded-br-sm"
                      : "bg-white text-gray-700 shadow-sm border border-gray-100 rounded-bl-sm"
                  }`}
                  style={msg.role === "user" ? { background: "linear-gradient(135deg,#4f46e5,#7c3aed)" } : {}}
                >
                  {msg.content}
                </div>

                {/* Product Cards */}
                {msg.products?.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {msg.products.map((p) => (
                      <button
                        key={p._id}
                        onClick={() => { navigate("/shop/listing"); setOpen(false); }}
                        className="w-full flex items-center gap-3 bg-white hover:bg-indigo-50 border border-indigo-100 hover:border-indigo-300 rounded-xl px-3 py-2 transition text-left shadow-sm"
                      >
                        {p.image ? (
                          <img src={p.image} alt={p.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-100" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <ShoppingBag className="w-4 h-4 text-indigo-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-800 font-semibold text-xs truncate">{p.title}</p>
                          <p className="text-indigo-500 text-xs font-bold mt-0.5">
                            ৳{p.salePrice || p.price}
                            {p.salePrice > 0 && p.salePrice < p.price && (
                              <span className="line-through text-gray-400 font-normal ml-1.5">৳{p.price}</span>
                            )}
                          </p>
                          <p className="text-gray-400 text-[10px] capitalize">{p.brand} · {p.category}</p>
                        </div>
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                          <ShoppingBag className="w-3 h-3 text-indigo-500" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick Prompts */}
        {messages.length === 1 && (
          <div className="px-3 py-2 flex gap-1.5 flex-wrap border-t border-gray-100 bg-white flex-shrink-0">
            {quickPrompts.map((q) => (
              <button
                key={q}
                onClick={() => setInput(q)}
                className="text-[10px] font-medium px-2.5 py-1 rounded-full border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-3 py-3 border-t border-gray-100 bg-white flex items-end gap-2 flex-shrink-0">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Show me Nike shoes under ৳3000..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition"
            style={{ maxHeight: "80px" }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 disabled:opacity-40 disabled:hover:scale-100"
            style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </>
  );
}