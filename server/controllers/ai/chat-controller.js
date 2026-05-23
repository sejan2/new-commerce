const Product = require("../../models/Product");

// ── MCP Tool Definitions ──────────────────────────────────────────────────────
const tools = [
  {
    name: "search_products",
    description: "Search products by keyword in title, description or brand",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search keyword" },
        limit: { type: "number", description: "Max results (default 5)" },
      },
      required: ["query"],
    },
  },
  {
    name: "filter_products",
    description: "Filter products by category, brand, min/max price",
    parameters: {
      type: "object",
      properties: {
        category: { type: "string", description: "e.g. men, women, kids, accessories, footwear" },
        brand: { type: "string", description: "e.g. nike, adidas, zara, h&m, levi, puma" },
        minPrice: { type: "number" },
        maxPrice: { type: "number" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "get_featured_products",
    description: "Get top rated or sale/discounted products",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string", description: "Either 'sale' for discounted or 'top' for highest rated" },
        limit: { type: "number" },
      },
      required: ["type"],
    },
  },
];

// ── Tool Execution ────────────────────────────────────────────────────────────
async function executeTool(name, args) {
  const limit = args.limit || 5;

  if (name === "search_products") {
    const regex = new RegExp(args.query, "i");
    return await Product.find({
      $or: [{ title: regex }, { description: regex }, { brand: regex }],
    }).limit(limit);
  }

  if (name === "filter_products") {
    const query = {};
    if (args.category) query.category = new RegExp(args.category, "i");
    if (args.brand) query.brand = new RegExp(args.brand, "i");
    if (args.minPrice !== undefined || args.maxPrice !== undefined) {
      query.price = {};
      if (args.minPrice !== undefined) query.price.$gte = args.minPrice;
      if (args.maxPrice !== undefined) query.price.$lte = args.maxPrice;
    }
    return await Product.find(query).limit(limit);
  }

  if (name === "get_featured_products") {
    if (args.type === "sale") {
      return await Product.find({ salePrice: { $gt: 0 } }).sort({ salePrice: 1 }).limit(limit);
    }
    return await Product.find({ averageReview: { $gt: 0 } }).sort({ averageReview: -1 }).limit(limit);
  }

  return [];
}

function formatProducts(products) {
  if (!products || products.length === 0) return "No products found.";
  if (!Array.isArray(products)) products = [products];
  return products
    .map(
      (p) =>
        `ID:${p._id} | ${p.title} | Brand:${p.brand} | Category:${p.category} | Price:${p.price} | Sale:${p.salePrice || "N/A"} | Rating:${p.averageReview || "N/A"}`
    )
    .join("\n");
}

// ── Main Chat Handler ─────────────────────────────────────────────────────────
const chatWithAI = async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ success: false, message: "Messages required" });
  }

  const SYSTEM_PROMPT = `You are ShopBot, a smart AI shopping assistant for ShopZone — a fashion e-commerce store.
You have tools to search the live product database. Always use tools to find real products before recommending.
Rules: always use a tool first, mention product title and price, be friendly and concise, keep under 150 words, never invent products.`;

  try {
    // Convert messages to Gemini format
    const geminiContents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    let allProducts = [];
    let finalText = "";

    // Agentic loop
    for (let i = 0; i < 5; i++) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: geminiContents,
            tools: [{ function_declarations: tools }],
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("Gemini API error:", data);
        return res.status(500).json({ success: false, message: "AI service error" });
      }

      const candidate = data.candidates?.[0];
      const parts = candidate?.content?.parts || [];

      // Check for function calls
      const functionCalls = parts.filter((p) => p.functionCall);

      if (functionCalls.length === 0) {
        // No tool calls — get final text
        finalText = parts.find((p) => p.text)?.text || "";
        break;
      }

      // Add model response to history
      geminiContents.push({ role: "model", parts });

      // Execute tools and add results
      const toolResultParts = [];
      for (const part of functionCalls) {
        const { name, args } = part.functionCall;
        const result = await executeTool(name, args);
        if (Array.isArray(result)) allProducts.push(...result);

        toolResultParts.push({
          functionResponse: {
            name,
            response: { result: formatProducts(result) },
          },
        });
      }

      geminiContents.push({ role: "user", parts: toolResultParts });
    }

    // Deduplicate products
    const seen = new Set();
    const uniqueProducts = allProducts.filter((p) => {
      const id = p._id?.toString();
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    res.json({
      success: true,
      message: finalText,
      products: uniqueProducts.slice(0, 4),
    });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

module.exports = { chatWithAI };