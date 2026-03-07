// api/vision.js

export const config = {
  api: {
    bodyParser: false, // we manually read multipart/form-data
  },
};

const OCRSPACE_API_KEY = process.env.OCRSPACE_API_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  if (!OCRSPACE_API_KEY) {
    return res.status(500).json({
      ok: false,
      error: "OCRSPACE_API_KEY is not set on the server",
    });
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

    // 2) Extract boundary
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
    const bodyLatin1 = rawBody.replace(/\r\n--$/, ""); // remove trailing boundary

    const headerMatch = rawHeaders.match(
      /Content-Disposition:.*name="file"; filename="([^"]*)"/i
    );
    const filename = headerMatch ? headerMatch[1] : "unknown";

    const typeMatch = rawHeaders.match(/Content-Type: ([^\r\n]*)/i);
    const mimeType = typeMatch ? typeMatch[1] : "application/octet-stream";

    // 6) Convert body string back to binary buffer
    const fileBuffer = Buffer.from(bodyLatin1, "latin1");

    // 7) Send to OCR.Space API
    const ocrBody = new FormData();
    ocrBody.append("file", new Blob([fileBuffer], { type: mimeType }), filename);
    ocrBody.append("language", "eng");
    ocrBody.append("isOverlayRequired", "false");

    const ocrRes = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: {
        apikey: OCRSPACE_API_KEY,
      },
      body: ocrBody,
    });

    if (!ocrRes.ok) {
      return res.status(500).json({
        ok: false,
        error: "OCR API request failed with status " + ocrRes.status,
      });
    }

    const ocrJson = await ocrRes.json();

    if (ocrJson.IsErroredOnProcessing) {
      return res.status(200).json({
        ok: false,
        error:
          ocrJson.ErrorMessage?.[0] ||
          "OCR processing failed on remote service",
        file: {
          name: filename,
          type: mimeType,
          size: fileBuffer.length,
        },
      });
    }

    const parsedResults = ocrJson.ParsedResults || [];
    const joinedText = parsedResults
      .map((r) => r.ParsedText || "")
      .join("\n")
      .trim();

    const description =
      joinedText.length > 0
        ? "Detected the following text in the image:\n\n" + joinedText
        : "No readable text was detected in the image.";

    // 8) Return in the shape your front-end expects
    return res.status(200).json({
      ok: true,
      description,
      text: joinedText,
      file: {
        name: filename,
        type: mimeType,
        size: fileBuffer.length,
      },
    });
  } catch (err) {
    console.error("Vision error (OCR.Space):", err);
    return res
      .status(500)
      .json({ ok: false, error: "Vision processing failed" });
  }
}
