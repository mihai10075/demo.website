// pages/api/upload.js
export const config = {
  api: {
    bodyParser: false, // we will manually parse form-data
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

    // Read raw body into a buffer (we won't fully parse it here, just basic info)
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Very simple fake parser: we only inspect headers to extract the filename and type.
    const text = buffer.toString("latin1");
    const match = text.match(
      /Content-Disposition:.*name="file"; filename="([^"]*)"/i
    );
    const filename = match ? match[1] : "unknown";

    const typeMatch = text.match(/Content-Type: ([^\r\n]*)/i);
    const mimeType = typeMatch ? typeMatch[1] : "application/octet-stream";

    const sizeBytes = buffer.length;

    return res.status(200).json({
      ok: true,
      file: {
        name: filename,
        type: mimeType,
        size: sizeBytes,
      },
    });
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ error: "Upload failed" });
  }
}
