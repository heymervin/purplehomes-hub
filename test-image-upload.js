// Test script to verify GHL image upload works
// This simulates what PropertyDetailModal does when saving

const GHL_DOCUMENT_URL = 'https://services.leadconnectorhq.com/documents/download/hBD4w0mva1ZGbgr5Hbbv';
const PROXIED_URL = `/api/proxy-image?url=${encodeURIComponent(GHL_DOCUMENT_URL)}`;

console.log('Testing GHL Image Upload Flow...\n');
console.log('1. Original GHL Document URL:', GHL_DOCUMENT_URL);
console.log('2. Proxied URL for upload:', PROXIED_URL);
console.log('\n3. Attempting to upload to GHL media library...');

// Test the upload endpoint
fetch('http://localhost:8080/api/ghl/media/upload', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    fileUrl: PROXIED_URL,
    name: `test-hero-image-${Date.now()}.jpg`,
  }),
})
  .then(response => {
    console.log('\n4. Upload response status:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('\n5. Upload response data:', JSON.stringify(data, null, 2));

    if (data.url) {
      console.log('\n✅ SUCCESS! GHL-hosted URL:', data.url);
      console.log('\nThis URL can now be saved to the hero_image_upload custom field!');
    } else {
      console.log('\n❌ FAILED: No URL in response');
    }
  })
  .catch(error => {
    console.error('\n❌ ERROR:', error.message);
  });
