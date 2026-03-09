// pages/api/vision.js

export const config = {
  api: {
    bodyParser: false, // we manually read multipart/form-data
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const contentType = req.headers["content-type"] || "";
    if (!contentType.startsWith("multipart/form-data")) {
      return res.status(400).json({ error: "Expected multipart/form-data" });
    }

    // Read raw body into a buffer (same pattern as upload.js)
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Very basic header parsing to get filename and mime type (optional)
    const text = buffer.toString("latin1");
    const match = text.match(
      /Content-Disposition:.*name="file"; filename="([^"]*)"/i
    );
    const filename = match ? match[1] : "unknown";

    const typeMatch = text.match(/Content-Type: ([^\r\n]*)/i);
    const mimeType = typeMatch ? typeMatch[1] : "application/octet-stream";

    // NOTE: Here is where you'd call a real vision API later:
    // - Extract just the binary portion from `buffer`
    // - Send it to OpenAI/Claude/another service
    // - Get back a textual description and put it into `description`

    const description =
      `Vision not configured yet, but this is where the analysis of ` +
      `image "${filename}" (type: ${mimeType}) would go. ` +
      `Once a real vision API is wired, this will describe what the photo contains.`;

    return res.status(200).json({
      ok: true,
      description,
      file: {
        name: filename,
        type: mimeType,
        size: buffer.length,
      },
    });
  } catch (err) {
    console.error("Vision error:", err);
    return res.status(500).json({ error: "Vision processing failed" });
  }
}
