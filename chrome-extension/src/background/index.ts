import { createClient } from '@supabase/supabase-js';

const supabaseURL = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseURL, supabaseAnonKey);

chrome.contextMenus.onClicked.addListener(genericOnClick);

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  // Create "Extract 3D Video" context menu item
  chrome.contextMenus.create(
    {
      id: 'extract-3d-video',
      title: 'Record Voxel Video',
      type: 'normal',
      contexts: ['video'], // Shows on video elements
    },
    function () {
      if (chrome.runtime.lastError) {
        console.log('Got expected error: ' + chrome.runtime.lastError.message);
      }
    },
  );

  // Create "Extract 3D Model" context menu item
  chrome.contextMenus.create(
    {
      id: 'extract-3d-model',
      title: 'Extract 3D Model',
      type: 'normal',
      contexts: ['video'], // Shows on video elements
    },
    function () {
      if (chrome.runtime.lastError) {
        console.log('Got expected error: ' + chrome.runtime.lastError.message);
      }
    },
  );
});

function genericOnClick(info, tab) {
  if (info.menuItemId === 'extract-3d-video') {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'video_selected', srcUrl: info.srcUrl, flow: 'video' });
    });
  } else if (info.menuItemId === 'extract-3d-model') {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'video_selected', srcUrl: info.srcUrl, flow: 'model' });
    });
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    // Send a message to the content script on a URL change
    chrome.tabs.sendMessage(tabId, { type: 'url_changed', url: changeInfo.url });
  }
});

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'get_mask_for_frame') {
    try {
      const { b64Image, positive_coordinates, positive_coords_percent, user_id } = message;

      const response = await fetch(
        'https://hackpack-io--sam2-class-test-example-fastapi-app.modal.run/fetch_image_mask',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ image: b64Image, positive_coordinates, positive_coords_percent, user_id }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        chrome.tabs.sendMessage(sender.tab.id, { type: 'mask_generated', mask: data.mask });
        sendResponse({ success: true, message: 'Image and coordinates received', mask: data.mask });
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.message || 'Something is busted try again later!';
        chrome.tabs.sendMessage(sender.tab.id, { type: 'error_occurred', message: errorMessage });
        sendResponse({ success: false, message: errorMessage });
      }
    } catch (error) {
      console.error('Error fetching mask:', error);
      const errorMessage = 'An unexpected error occurred! Please reload and try again.';
      chrome.tabs.sendMessage(sender.tab.id, { type: 'error_occurred', message: errorMessage });
      sendResponse({ success: false, message: errorMessage });
    }
  } else if (message.type === 'generate_3d_video') {
    try {
      const { title, description, frames, positive_coordinates, positive_coords_percent, user_id, framerate } = message;

      const response = await fetch('https://hackpack-io--sdv-api-fastapi-app.modal.run/create_3d_video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          frames,
          positive_coordinates,
          positive_coords_percent,
          user_id,
          framerate,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          const voxelVideoUrl = `https://www.voxelvideo.com/voxel_video/${data.sdv_id}`;

          // Send the success message back to the content script along with the URL
          chrome.tabs.sendMessage(sender.tab.id, {
            type: '3d_video_created',
            success: true,
            voxelVideoUrl: voxelVideoUrl,
            message: data.message,
          });
        } else {
          console.error('3D video creation did not return a success status:', data.message);
          chrome.tabs.sendMessage(sender.tab.id, {
            type: 'error_occurred',
            message: data.message,
          });
        }
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.message || 'Something is busted try again later!';
        chrome.tabs.sendMessage(sender.tab.id, { type: 'error_occurred', message: errorMessage });
      }
    } catch (error) {
      console.error('Error generating 3D video:', error);
      const errorMessage = error.message || 'An unexpected error occurred!';
      chrome.tabs.sendMessage(sender.tab.id, { type: 'error_occurred', message: errorMessage });
    }
  } else if (message.type === 'generate_3d_model') {
    try {
      const { title, user_id, mask, frame } = message;

      const response = await fetch('https://hackpack-io--sdv-api-fastapi-app.modal.run/create_3d_model', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, user_id, mask, frame }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          const voxelModelUrl = `https://www.voxelvideo.com/voxel_model/${data.sdv_id}`;

          // Send the success message back to the content script along with the URL
          chrome.tabs.sendMessage(sender.tab.id, {
            type: '3d_model_created',
            success: true,
            voxelModelUrl: voxelModelUrl,
            message: data.message,
          });
        } else {
          console.error('3D model creation did not return a success status:', data.message);
          chrome.tabs.sendMessage(sender.tab.id, {
            type: 'error_occurred',
            message: data.message,
          });
        }
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.message || 'Something is busted try again later!';
        chrome.tabs.sendMessage(sender.tab.id, { type: 'error_occurred', message: errorMessage });
      }
    } catch (error) {
      console.error('Error generating 3D model:', error);
      const errorMessage = error.message || 'An unexpected error occurred!';
      chrome.tabs.sendMessage(sender.tab.id, { type: 'error_occurred', message: errorMessage });
    }
  } else if (message.type === 'check_user') {
    try {
      const res = await chrome.storage.local.get('rolo');
      const rolo = res['rolo'];

      if (rolo) {
        checkUser(rolo, sender);
      } else {
        chrome.tabs.sendMessage(sender.tab.id, { user: false });
      }
    } catch (error) {
      console.error(error);
      if (sender.tab) {
        message = 'Something is busted try again later!';
        chrome.tabs.sendMessage(sender.tab.id, { type: 'error_occurred', message: message });
      }
    }
  } else if (message.type === 'set_user') {
    try {
      const rolo = message.rolo;
      await chrome.storage.local.set({ rolo });
      checkUser(rolo, sender);
    } catch (error) {
      console.error(error);
      if (sender.tab) {
        message = 'Something is busted try again later!';
        chrome.tabs.sendMessage(sender.tab.id, { type: 'error_occurred', message: message });
      }
    }
  } else if (message.type === 'upload_frame') {
    try {
      const { frame, user_id, frameIndex } = message;
      const response = await fetch('https://hackpack-io--sdv-api-fastapi-app.modal.run/upload_frame', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ frame: frame, user_id: user_id }),
      });

      if (response.ok) {
        const data = await response.json();
        chrome.tabs.sendMessage(sender.tab.id, {
          type: 'frame_uploaded',
          success: true,
          frame_id: data.frame_id,
          frameIndex: frameIndex,
        });
      } else {
        const errorData = await response.json();
        const errorMessage = 'Something is busted try again later!';
        chrome.tabs.sendMessage(sender.tab.id, { type: 'error_occurred', message: errorMessage });
      }
    } catch (error) {
      const errorMessage = 'Something is busted try again later!';
      chrome.tabs.sendMessage(sender.tab.id, { type: 'error_occurred', message: errorMessage });
    }
  } else if (message.type === 'clear_token') {
    clearLocalStorage();
    chrome.tabs.sendMessage(sender.tab.id, { type: 'token_cleared' });
  }
  return true;
});

function clearLocalStorage() {
  chrome.storage.local.clear(() => {
    if (chrome.runtime.lastError) {
      console.error('Error clearing local storage:', chrome.runtime.lastError);
    } else {
      console.log('Local storage cleared successfully.');
    }
  });
}

async function checkUser(rolo: string, sender: any) {
  const { data, error } = await supabase
    .from('user_credits') // Replace with your table name
    .select('credits')
    .eq('api_key', rolo)
    .single();

  if (error || !data) {
    console.error('Error fetching user credits:', error);
    chrome.tabs.sendMessage(sender.tab.id, { user: true, rolo: rolo, error: 'supabase_error' });
  } else if (data.credits <= 0) {
    chrome.tabs.sendMessage(sender.tab.id, { user: true, rolo: rolo, credits: 0, error: 'Not enough credits' });
  } else {
    chrome.tabs.sendMessage(sender.tab.id, { user: true, rolo: rolo, credits: data.credits });
  }

  return true;
}

//clearLocalStorage();
