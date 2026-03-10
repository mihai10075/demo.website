// pages/api/vision.js

export const config = {
  api: { bodyParser: false },
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

    // Read raw multipart body from client
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    // Forward same multipart body to OCR.space
    const apiKey = process.env.OCR_SPACE_API_KEY || "helloworld"; // replace with your key
    const ocrRes = await fetch("https://api.ocr.space/Parse/Image", {
      method: "POST",
      headers: {
        apikey: apiKey,
        "Content-Type": contentType, // keep original boundary
      },
      body: buffer,
    });

    console.log("OCR status", ocrRes.status);

    if (!ocrRes.ok) {
      const txt = await ocrRes.text();
      console.error("OCR error body:", txt);
      return res.status(500).json({ error: "OCR failed" });
    }

    const ocrJson = await ocrRes.json();
    console.log("OCR JSON", JSON.stringify(ocrJson, null, 2));

    const parsedText =
      ocrJson?.ParsedResults?.[0]?.ParsedText?.trim() || "";

    // Extract filename + mime type from multipart body (same style as your old code)
    const latin = buffer.toString("latin1");
    const nameMatch = latin.match(
      /Content-Disposition:.*name="file"; filename="([^"]*)"/i
    );
    const typeMatch = latin.match(/Content-Type: ([^\r\n]*)/i);
    const filename = nameMatch ? nameMatch[1] : "unknown";
    const mimeType = typeMatch ? typeMatch[1] : "application/octet-stream";

    const description = parsedText
      ? `The OCR tool thinks the text in the image is:\n\n${parsedText}`
      : `OCR could not confidently read the image "${filename}" (type: ${mimeType}). Ask the user to type the text or upload a clearer photo.`;

    return res.status(200).json({
      ok: true,
      description,
      text: parsedText,
      file: {
        name: filename,
        type: mimeType,
        size: buffer.length,
      },
    });
  } catch (err) {
    console.error("Vision/OCR error:", err);
    return res.status(500).json({ error: "Vision processing failed" });
  }
}
