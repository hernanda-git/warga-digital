/**
 * Delete All Jasa Service Images from Storage Bucket
 * 
 * Run this in your browser console on Supabase Dashboard
 * or in a Node.js script with @supabase/supabase-js installed
 */

// ============================================================
// OPTION 1: Browser Console (Supabase Dashboard)
// ============================================================
// 1. Go to Supabase Dashboard → Storage → jasa-images
// 2. Open Browser DevTools (F12)
// 3. Paste and run this script:

(async function deleteAllJasaImages() {
  console.log('⚠️ Starting image deletion...');
  
  // Get all folders and files from the page
  const storageItems = document.querySelectorAll('[role="checkbox"]');
  
  if (storageItems.length === 0) {
    console.log('✅ No files found in storage bucket');
    return;
  }
  
  console.log(`📁 Found ${storageItems.length} items to delete`);
  
  // Select all items
  storageItems.forEach(item => {
    if (item instanceof HTMLInputElement) {
      item.checked = true;
    }
  });
  
  // Click delete button
  const deleteButton = document.querySelector('button[color="red"]');
  if (deleteButton) {
    console.log('🗑️ Clicking delete button...');
    deleteButton.click();
    
    // Confirm deletion
    setTimeout(() => {
      const confirmButton = document.querySelector('button[data-testid="confirm-delete"]');
      if (confirmButton) {
        console.log('✅ Confirming deletion...');
        confirmButton.click();
      }
    }, 500);
  }
  
  console.log('✅ Deletion complete!');
})();

// ============================================================
// OPTION 2: Node.js Script (Programmatic)
// ============================================================
// Install: npm install @supabase/supabase-js
// Then run: node delete-jasa-images.js

/*
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_SERVICE_ROLE_KEY'; // Use service role for admin access

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteAllJasaImages() {
  try {
    console.log('📁 Listing all files in jasa-images bucket...');
    
    const { data, error } = await supabase.storage
      .from('jasa-images')
      .list('', { limit: 1000 });
    
    if (error) {
      console.error('❌ Error listing files:', error.message);
      return;
    }
    
    if (data.length === 0) {
      console.log('✅ No files found in storage bucket');
      return;
    }
    
    console.log(`📁 Found ${data.length} files to delete`);
    
    // Get all file paths
    const filePath = data.map(file => file.name);
    
    console.log('🗑️ Deleting files...');
    
    const { error: deleteError } = await supabase.storage
      .from('jasa-images')
      .remove(paths);
    
    if (deleteError) {
      console.error('❌ Error deleting files:', deleteError.message);
      return;
    }
    
    console.log(`✅ Successfully deleted ${data.length} files!`);
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

deleteAllJasaImages();
*/

// ============================================================
// OPTION 3: Supabase Dashboard (Manual)
// ============================================================
// 1. Go to Supabase Dashboard → Storage
// 2. Click on 'jasa-images' bucket
// 3. Press Ctrl+A (or Cmd+A on Mac) to select all
// 4. Click Delete button
// 5. Confirm deletion

// ============================================================
// IMPORTANT NOTES:
// ============================================================
// - Database deletion does NOT automatically delete storage files
// - You MUST manually delete files from storage bucket
// - Files are stored in format: {userId}/{serviceId}/{filename}
// - Deleting database records orphan the files (they still exist in storage)
// - Storage files continue to incur costs even if DB records are deleted
