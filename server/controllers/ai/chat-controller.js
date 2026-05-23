const Product = require("../../models/Product");

const chatWithAI = async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ success: false, message: "Messages required" });
  }

  try {
    // Fetch live products from DB
    const products = await Product.find({}).limit(50);

    const catalog = products.map((p) =>
      `ID:${p._id} | Title:${p.title} | Brand:${p.brand} | Category:${p.category} | Price:${p.price} | Sale Price:${p.salePrice || "none"} | Stock:${p.totalStock} | Rating:${p.averageReview || "no rating"} | Image:${p.image || ""}`
    ).join("\n");

    const systemPrompt = `You are ShopBot, a smart AI shopping assistant for ShopZone — a fashion e-commerce store.

Here is the LIVE product catalog from the database:
${catalog}

Rules:
- Only recommend products that exist in the catalog above
- Always mention product Title and Price
- Be friendly, concise, fashion-forward
- Keep responses under 150 words
- If no match found, suggest browsing a category
- Never invent products`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq API error:", data);
      return res.status(500).json({ success: false, message: "AI service error" });
    }

    const replyText = data.choices?.[0]?.message?.content || "Sorry, I could not find anything. Please try again.";

    // Match mentioned products from reply
    const mentioned = products.filter((p) =>
      p.title && replyText.toLowerCase().includes(p.title.toLowerCase())
    );

    // Deduplicate
    const seen = new Set();
    const uniqueProducts = mentioned.filter((p) => {
      const id = p._id?.toString();
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    res.json({
      success: true,
      message: replyText,
      products: uniqueProducts.slice(0, 4),
    });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

module.exports = { chatWithAI };