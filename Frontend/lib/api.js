/**
 * VaidhyaNetra AI — API Client
 * Handles all communication with the FastAPI backend.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Validate that the selected file is a supported image type before sending.
 * @param {File} file
 */
export function validateMRIFile(file) {
  if (!file) return { valid: false, error: "No file selected." };

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/bmp"];
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".bmp", ".dcm"];

  const ext = "." + file.name.split(".").pop().toLowerCase();
  const typeOk = allowedTypes.includes(file.type) || ext === ".dcm";

  if (!typeOk && !allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `Unsupported file type: ${file.type || ext}. Please upload a JPEG, PNG, or DICOM file.`,
    };
  }

  // 20 MB limit
  const MAX_SIZE = 20 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 20 MB.`,
    };
  }

  return { valid: true, error: null };
}

/**
 * POST /predict — Send an MRI image and patient ID to the backend for analysis.
 *
 * @param {string} patientId  - The VN-XXXX patient registration ID
 * @param {File}   imageFile  - The selected MRI image file
 * @param {AbortSignal} [signal] - Optional AbortController signal for cancellation
 * @returns {Promise<PredictResponse>}
 */
export async function predictMRI(patientId, imageFile, signal) {
  const validation = validateMRIFile(imageFile);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const formData = new FormData();
  formData.append("patient_id", patientId);
  formData.append("file", imageFile);

  const response = await fetch(`${API_BASE_URL}/predict`, {
    method: "POST",
    body: formData,
    // Do NOT set Content-Type manually — browser sets it with correct boundary
    signal,
  });

  if (!response.ok) {
    let errorDetail = `Server error (${response.status})`;
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errorDetail;
    } catch {
      // ignore parse errors
    }
    throw new Error(errorDetail);
  }

  /** @type {PredictResponse} */
  const data = await response.json();
  return data;
}

/**
 * GET /patient/:id — Fetch patient records from the backend (MongoDB).
 * @param {string} patientId
 */
export async function fetchPatientFromBackend(patientId) {
  const response = await fetch(`${API_BASE_URL}/patient/${patientId}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Failed to fetch patient (${response.status})`);
  return await response.json();
}

/**
 * GET /report/:scanId — Returns the URL to download the scan PDF report.
 * @param {string} scanId
 */
export function getReportURL(scanId) {
  return `${API_BASE_URL}/report/${scanId}`;
}

/**
 * @typedef {Object} PredictResponse
 * @property {string}  scan_id
 * @property {string}  mri_image_url
 * @property {string}  heatmap_url
 * @property {boolean} tumor_detected
 * @property {number}  confidence
 * @property {number}  tumor_size
 * @property {string}  explanation
 */
