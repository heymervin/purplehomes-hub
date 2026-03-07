// Test script to verify GHL image upload with base64 (proper method)

const GHL_DOCUMENT_URL = 'https://services.leadconnectorhq.com/documents/download/hBD4w0mva1ZGbgr5Hbbv';
const PROXIED_URL = `http://localhost:8080/api/proxy-image?url=${encodeURIComponent(GHL_DOCUMENT_URL)}`;

console.log('Testing GHL Image Upload Flow (Base64 Method)...\n');
console.log('1. Original GHL Document URL:', GHL_DOCUMENT_URL);
console.log('2. Proxied URL:', PROXIED_URL);
console.log('\n3. Fetching image through proxy...');

// Fetch image through proxy
fetch(PROXIED_URL)
  .then(response => {
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }
    console.log('✅ Image fetched successfully!');
    return response.blob();
  })
  .then(blob => {
    console.log(`\n4. Image size: ${blob.size} bytes, type: ${blob.type}`);
    console.log('\n5. Converting to base64...');

    // Convert blob to base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  })
  .then(base64Data => {
    console.log(`✅ Converted to base64 (${base64Data.length} chars)`);
    console.log('\n6. Uploading to GHL media library...');

    // Upload to GHL
    return fetch('http://localhost:8080/api/ghl/media/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base64Data: base64Data,
        name: `test-hero-image-${Date.now()}.jpg`,
        contentType: 'image/jpeg',
      }),
    });
  })
  .then(response => {
    console.log('\n7. Upload response status:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('\n8. Upload response data:', JSON.stringify(data, null, 2));

    if (data.url) {
      console.log('\n✅✅✅ SUCCESS! GHL-hosted URL:', data.url);
      console.log('\nThis URL can now be saved to the hero_image_upload custom field!');
    } else {
      console.log('\n❌ FAILED: No URL in response');
    }
  })
  .catch(error => {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  });
