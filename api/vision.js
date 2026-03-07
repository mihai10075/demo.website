// api/vision.js

export const config = {
  api: {
    bodyParser: false, // we manually read multipart/form-data
  },
};

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const contentType = req.headers["content-type"] || "";
    if (!contentType.startsWith("multipart/form-data")) {
      return res
        .status(400)
        .json({ ok: false, error: "Expected multipart/form-data" });
    }

    // 1) Read raw body into a buffer
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // 2) Extract boundary from header
    const boundaryMatch = contentType.match(/boundary=(.*)$/);
    if (!boundaryMatch) {
      return res
        .status(400)
        .json({ ok: false, error: "No boundary in content-type" });
    }
    const boundary = boundaryMatch[1];

    // 3) Split multipart body into parts
    const parts = buffer
      .toString("latin1")
      .split(`--${boundary}`)
      .filter((p) => p.trim() && p.trim() !== "--");

    // 4) Find the part with name="file"
    const filePart = parts.find((p) => p.includes('name="file"'));
    if (!filePart) {
      return res
        .status(400)
        .json({ ok: false, error: "No file field found" });
    }

    // 5) Separate headers from body
    const [rawHeaders, rawBody] = filePart.split("\r\n\r\n");
    const bodyLatin1 = rawBody.replace(/\r\n--$/, ""); // remove trailing boundary at end

    const headerMatch = rawHeaders.match(
      /Content-Disposition:.*name="file"; filename="([^"]*)"/i
    );
    const filename = headerMatch ? headerMatch[1] : "unknown";

    const typeMatch = rawHeaders.match(/Content-Type: ([^\r\n]*)/i);
    const mimeType = typeMatch ? typeMatch[1] : "application/octet-stream";

    // 6) Convert body string back to binary buffer
    const fileBuffer = Buffer.from(bodyLatin1, "latin1");

    // 7) Turn buffer into a data URL for the vision model
    const base64 = fileBuffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // 8) Call OpenAI vision-enabled model
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Look at this image. First, describe it in detail. " +
                "Then, if there is any readable text, extract it clearly.",
            },
            {
              type: "image_url",
              image_url: { url: dataUrl },
            },
          ],
        },
      ],
    });

    const visionText =
      completion.choices?.[0]?.message?.content?.trim() ||
      "I could not analyze this image.";

    // 9) Return JSON in the shape your front-end expects
    return res.status(200).json({
      ok: true,
      description: visionText,
      text: visionText,
      file: {
        name: filename,
        type: mimeType,
        size: fileBuffer.length,
      },
    });
  } catch (err) {
    console.error("Vision error:", err);
    return res
      .status(500)
      .json({ ok: false, error: "Vision processing failed" });
  }
}
