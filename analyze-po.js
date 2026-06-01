import { GoogleGenAI } from "@google/genai";

// Menggunakan SDK Resmi @google/genai
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Jaga-jaga jika file foto dari HP beresolusi besar
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileBase64, mimeType } = req.body;

    if (!fileBase64 || !mimeType) {
      return res.status(400).json({ error: 'Missing file data atau mimeType' });
    }

    // Koreksi penulisan instruksi agar AI mengembalikan format data nota yang pas
    const prompt = `
      Anda adalah sistem OCR AI profesional untuk Mulia Group Workshop Production.
      Tugas Anda adalah membaca dokumen Purchase Order (PO) atau foto nota cetak yang dilampirkan.
      Ekstrak informasi penting dan kembalikan HASILNYA HANYA DALAM FORMAT JSON BERSIH seperti struktur di bawah ini. Jangan tambahkan teks pembuka atau penutup markdown (seperti \`\`\`json).

      Format JSON yang wajib Anda kembalikan:
      {
        "po_ref": "Nomor PO atau Nomor Referensi yang ditemukan (jika tidak ada tulis '-')",
        "client_info": "Nama Perusahaan/Pelanggan, Alamat, dan No HP jika terdeteksi",
        "items": [
          {
            "description": "Nama barang / jenis cetakan / deskripsi pekerjaan yang jelas",
            "qty": angka_jumlah_barang_integer,
            "price": angka_harga_satuan_integer
          }
        ]
      }
    `;

    // Memanggil Gemini menggunakan model flash terbaru
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        prompt,
        {
          inlineData: {
            mimeType: mimeType,
            data: fileBase64
          }
        }
      ],
    });

    const responseText = response.text.trim();
    
    // Bersihkan jika AI tidak sengaja membungkusnya dengan tag markdown ```json
    const cleanJsonString = responseText.replace(/^
```json\s*|```$/g, '');
    const parsedData = JSON.parse(cleanJsonString);

    return res.status(200).json(parsedData);

  } catch (error) {
    console.error("Error Processing PO:", error);
    return res.status(500).json({ error: 'Gagal memproses dokumen PO: ' + error.message });
  }
}