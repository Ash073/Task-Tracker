const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const { parseOCRToItems } = require('./localAI.service');

/**
 * Extract text from image using OCR.space API
 */
async function extractTextFromImage(imagePath) {
  const apiKey = process.env.OCR_SPACE_API_KEY || 'K82707443288957';
  const formData = new FormData();
  formData.append('apikey', apiKey);
  formData.append('file', fs.createReadStream(imagePath));
  formData.append('language', 'eng');
  formData.append('isOverlayRequired', 'false');
  formData.append('detectOrientation', 'true');
  formData.append('scale', 'true');
  formData.append('OCREngine', '2'); // Engine 2 is better for handwriting and numeric data
  formData.append('isTable', 'true'); // Helps preserve line-by-line structure for lists

  try {
    const response = await axios.post('https://api.ocr.space/parse/image', formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 60000 // Increase timeout to 60s for handwritten/large images
    });

    if (response.data && response.data.ParsedResults && response.data.ParsedResults.length > 0) {
      return response.data.ParsedResults[0].ParsedText;
    } else {
      const errorMsg = response.data?.ErrorMessage || response.data?.ErrorDetails || 'OCR.space failed to parse image';
      throw new Error(errorMsg);
    }
  } catch (err) {
    console.error('[OCR Service Error]', err.response?.data || err.message);
    throw new Error('OCR API failed: ' + err.message);
  }
}

/**
 * Full pipeline: image → text → shopping items
 */
async function imageToShoppingItems(imagePath) {
  const text = await extractTextFromImage(imagePath);
  const items = parseOCRToItems(text);
  return { rawText: text, items };
}

module.exports = { extractTextFromImage, imageToShoppingItems };
