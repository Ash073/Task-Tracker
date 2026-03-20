const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const { parseOCRToItems } = require('./localAI.service');
const path = require('path');
const os = require('os');
const sharp = require('sharp');

/**
 * Extract text from image using OCR.space API with resizing and retries
 */
async function extractTextFromImage(imagePath, retries = 3) {
  const apiKey = process.env.OCR_SPACE_API_KEY || 'K82707443288957';
  let attempt = 0;
  let lastError = null;
  let finalImagePath = imagePath;
  let resizedCreated = false;

  try {
    // Check file size and resize if needed
    const stats = fs.statSync(imagePath);
    const fileSizeInMB = stats.size / (1024 * 1024);
    console.log(`[OCR] Original image size: ${fileSizeInMB.toFixed(2)} MB`);

    // If image is larger than 1MB, resize it to stay within API limits and speed up upload
    if (fileSizeInMB > 1.0) {
      console.log(`[OCR] Resizing large image...`);
      const resizedPath = path.join(os.tmpdir(), `resized_ocr_${Date.now()}.jpg`);
      
      await sharp(imagePath)
        .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(resizedPath);
      
      finalImagePath = resizedPath;
      resizedCreated = true;
      const resizedStats = fs.statSync(resizedPath);
      console.log(`[OCR] Resized image size: ${(resizedStats.size / (1024 * 1024)).toFixed(2)} MB`);
    }

    while (attempt < retries) {
      attempt++;
      const formData = new FormData();
      formData.append('apikey', apiKey);
      formData.append('file', fs.createReadStream(finalImagePath));
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    // Try Engine 2 (Handwriting) first, fallback to Engine 1 if it fails repeatedly
    const engine = (attempt === retries) ? '1' : '2'; 
    formData.append('OCREngine', engine);
    formData.append('isCreateSearchablePdf', 'false');

    try {
      console.log(`[OCR] Attempt ${attempt}/${retries} for ${imagePath} using Engine ${engine}...`);
      const response = await axios.post('https://api.ocr.space/parse/image', formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 60000, // 60 seconds per attempt to leave room for retries
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      console.log(`[OCR] API Response received (Attempt ${attempt}). Status: ${response.status}`);

      if (response.data && response.data.ParsedResults && response.data.ParsedResults.length > 0) {
        const text = response.data.ParsedResults[0].ParsedText;
        console.log(`[OCR] Successfully extracted ${text.length} characters.`);
        return text;
      } else {
        const errorMsg = response.data?.ErrorMessage || response.data?.ErrorDetails || 'OCR.space failed to parse image';
        console.warn(`[OCR API warning] Attempt ${attempt} failed: ${JSON.stringify(response.data)}`);
        
        // If it's a specific "Engine 2" error or timeout, we might want to retry immediately with Engine 1
        if (engine === '2' && (errorMsg.toString().includes('E101') || errorMsg.toString().includes('Engine 2'))) {
           console.log(`[OCR] Engine 2 failed with timeout/error, trying next attempt or fallback.`);
        }
        
        lastError = new Error(errorMsg);
      }
    } catch (err) {
      lastError = err;
      const status = err.response?.status;
      const data = err.response?.data;
      
      console.error(`[OCR Service Error] Attempt ${attempt} failed:`, data || err.message);
      
      // If it's a 503 or 429, wait longer
      if (status === 503 || status === 429 || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`[OCR] Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        // For other errors, still retry if we have attempts left
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  // If all retries failed, try Tesseract as a LAST resort since it's in package.json
  try {
    console.log(`[OCR] All API attempts failed. Falling back to local Tesseract...`);
    const Tesseract = require('tesseract.js');
    const result = await Tesseract.recognize(imagePath, 'eng');
    if (result.data && result.data.text) {
       console.log(`[OCR] Tesseract fallback successful.`);
       return result.data.text;
    }
  } catch (tessErr) {
    console.error(`[OCR] Tesseract fallback also failed:`, tessErr.message);
  }

    throw new Error('OCR API failed after multiple attempts: ' + lastError.message);
  } catch (outerErr) {
    console.error(`[OCR Fatal Error]`, outerErr.message);
    throw outerErr;
  } finally {
    // Clean up resized file if it was created
    if (resizedCreated && finalImagePath && fs.existsSync(finalImagePath)) {
      try {
        fs.unlinkSync(finalImagePath);
        console.log(`[OCR] Cleaned up temporary resized image.`);
      } catch (cleanErr) {
        console.warn(`[OCR] Failed to cleanup resized image:`, cleanErr.message);
      }
    }
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
