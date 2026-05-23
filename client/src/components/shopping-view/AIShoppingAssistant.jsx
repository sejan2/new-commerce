import { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { X, Send, ShoppingBag, Sparkles, ChevronDown } from "lucide-react";

const SYSTEM_PROMPT = `You are ShopBot, a smart shopping assistant for ShopZone — a fashion e-commerce store.

You have access to the store's product catalog which will be provided to you.

Your job:
1. Help users find products based on what they describe (e.g. "I need something for a wedding", "show me red sneakers under 2000")
2. Recommend products from the catalog by name, price, and category
3. Write compelling product descriptions when asked
4. Suggest outfit combinations or gift ideas

Rules:
- Only recommend products that exist in the catalog provided
- Always mention the product name and price when recommending
- Be friendly, concise, and fashion-forward
- If no products match, suggest browsing a category
- Respond in plain text only, no markdown formatting
- Keep responses under 150 words`;

export default function AIShoppingAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! 👋 I'm your AI shopping assistant. Tell me what you're looking for — occasion, budget, style — and I'll find the perfect match!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pulse, setPulse] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const { productList } = useSelector((state) => state.shopProducts);
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

  const buildCatalog = () => {
    if (!productList?.length) return "No products currently available.";
    return productList
      .slice(0, 40)
      .map(
        (p) =>
          `- ${p.title} | Category: ${p.category} | Brand: ${p.brand} | Price: ${p.price} | Sale: ${p.salePrice || "N/A"} | ${p.description || ""}`
      )
      .join("\n");
  };

  const extractProductMentions = (text) => {
    if (!productList?.length) return [];
    return productList.filter((p) =>
      text.toLowerCase().includes(p.title?.toLowerCase())
    );
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const catalog = buildCatalog();
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `${SYSTEM_PROMPT}\n\nCurrent Product Catalog:\n${catalog}`,
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();
      const reply = data.content?.[0]?.text || "Sorry, I couldn't process that. Please try again.";
      const mentioned = extractProductMentions(reply);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply, products: mentioned },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Oops! Something went wrong. Please try again." },
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
    "Show me trending items",
    "Gift ideas under ৳2000",
    "Casual outfits for men",
    "Best women's accessories",
  ];

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {!open && (
          <div
            className="flex items-center gap-2 bg-white text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg border border-indigo-100 cursor-pointer hover:bg-indigo-50 transition"
            onClick={() => setOpen(true)}
          >
            <Sparkles className="w-3 h-3" />
            AI Shopping Help
          </div>
        )}
        <button
          onClick={() => setOpen((o) => !o)}
          className="relative w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110"
          style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}
        >
          {pulse && (
            <span className="absolute inset-0 rounded-full animate-ping opacity-30"
              style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }} />
          )}
          {open ? (
            <ChevronDown className="w-6 h-6 text-white" />
          ) : (
            <Sparkles className="w-6 h-6 text-white" />
          )}
        </button>
      </div>

      {/* Chat Window */}
      <div
        className={`fixed bottom-24 right-6 z-50 w-80 sm:w-96 flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-gray-100 transition-all duration-300 ${
          open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
        style={{ height: "520px", background: "#fff" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 text-white"
          style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">ShopBot AI</p>
              <p className="text-indigo-200 text-[10px]">Powered by Claude</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="hover:bg-white/20 rounded-full p-1 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ background: "#f8f9ff" }}>
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "text-white rounded-br-sm"
                    : "bg-white text-gray-700 shadow-sm border border-gray-100 rounded-bl-sm"
                }`}
                style={msg.role === "user" ? { background: "linear-gradient(135deg,#4f46e5,#7c3aed)" } : {}}
              >
                {msg.content}

                {/* Product chips */}
                {msg.products?.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1.5">
                    {msg.products.slice(0, 3).map((p) => (
                      <button
                        key={p._id}
                        onClick={() => {
                          navigate("/shop/listing");
                          setOpen(false);
                        }}
                        className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-xl px-2.5 py-1.5 transition text-left"
                      >
                        {p.image && (
                          <img src={p.image} alt={p.title} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-indigo-800 font-semibold text-[11px] truncate">{p.title}</p>
                          <p className="text-indigo-500 text-[10px]">
                            ৳{p.salePrice || p.price}
                            {p.salePrice && <span className="line-through text-gray-400 ml-1">৳{p.price}</span>}
                          </p>
                        </div>
                        <ShoppingBag className="w-3 h-3 text-indigo-400 flex-shrink-0 ml-auto" />
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
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick prompts — only show when just started */}
        {messages.length === 1 && (
          <div className="px-3 py-2 flex gap-1.5 flex-wrap border-t border-gray-100 bg-white">
            {quickPrompts.map((q) => (
              <button
                key={q}
                onClick={() => { setInput(q); setTimeout(sendMessage, 100); }}
                className="text-[10px] font-medium px-2.5 py-1 rounded-full border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-3 py-3 border-t border-gray-100 bg-white flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition"
            style={{ maxHeight: "80px" }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition disabled:opacity-40"
            style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </>
  );
}