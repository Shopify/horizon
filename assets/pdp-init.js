function updateOptionAvailability() {
  const selectedSize = document.querySelector('#sku-size-picker .option-button.active')?.dataset.optionValue;
  const selectedFrame = document.querySelector('#sku-frame-picker .option-button.active')?.dataset.optionValue;

  // Disable unavailable frames for selected size
  const availableFramesForSize = new Set(
    window.ABSTRACT_VARIANTS
      .filter(v => v.size === selectedSize && v.available)
      .map(v => v.frame)
  );
  document.querySelectorAll('#sku-frame-picker .option-button').forEach(button => {
    const optionValue = button.dataset.optionValue;
    if (availableFramesForSize.has(optionValue)) {
      button.classList.remove('unavailable');
      button.disabled = false;
    } else {
      button.classList.add('unavailable');
      button.disabled = true;
    }
  });

  // Disable unavailable sizes for selected frame
  const availableSizesForFrame = new Set(
    window.ABSTRACT_VARIANTS
      .filter(v => v.frame === selectedFrame && v.available)
      .map(v => v.size)
  );
  document.querySelectorAll('#sku-size-picker .option-button').forEach(button => {
    const optionValue = button.dataset.optionValue;
    if (availableSizesForFrame.has(optionValue)) {
      button.classList.remove('unavailable');
      button.disabled = false;
    } else {
      button.classList.add('unavailable');
      button.disabled = true;
    }
  });
}

function syncHorizonVariantInput(variantId, sizeOption, frameOption) {
  document.querySelectorAll('input[ref="abstractVariantId"]').forEach(input => {
    input.value = variantId || '';
  });
  document.querySelectorAll('input[ref="sizeOption"]').forEach(input => {
    input.value = sizeOption || '';
  });
  document.querySelectorAll('input[ref="frameOption"]').forEach(input => {
    input.value = frameOption || '';
  });
}

function updateSkuPicker() {
  const sizeElement = document.querySelector('#sku-size-picker .option-button.active');
  const size = sizeElement ? sizeElement.dataset.optionValue : null;

  const frameElement = document.querySelector('#sku-frame-picker .option-button.active');
  const frame = frameElement ? frameElement.dataset.optionValue : null;
 
  if (!size || !frame) {
    document.getElementById('sku-variant-id').value = '';
    const addToCartButton = document.getElementById('add-to-cart-form')?.querySelector('button[type="submit"]');
    if (addToCartButton) { addToCartButton.disabled = true; }
    document.getElementById('sku-price').innerText = 'Select Options';
    return;
  }

  const match = window.ABSTRACT_VARIANTS.find(v => v.size === size && v.frame === frame && v.border == "No Border");
  window.SELECTED_ABSTRACT_VARIANT = match;

  document.dispatchEvent(new CustomEvent('abstractVariantChange', {detail: window.SELECTED_ABSTRACT_VARIANT}));

  if (match && match.available) {
    document.getElementById('sku-variant-id').value = match.id;
    syncHorizonVariantInput(match.id, size, frame);
    document.getElementById('line-item-size-prop').value = size;
    document.getElementById('line-item-frame-prop').value = frame;
    const addToCartButton = document.getElementById('add-to-cart-form')?.querySelector('button[type="submit"]');
    if (addToCartButton) { addToCartButton.disabled = false; }
    document.getElementById('sku-price').innerText = match.price_formatted;
  } else {
    document.getElementById('sku-variant-id').value = '';
    const addToCartButton = document.getElementById('add-to-cart-form')?.querySelector('button[type="submit"]');
    if (addToCartButton) { addToCartButton.disabled = true; }
    document.getElementById('sku-price').innerText = 'Unavailable';
  }

  if (typeof window.frameUp_setVirtualOptionValues === 'function') {
    window.frameUp_setVirtualOptionValues([{option: "Frame", value: frame},{option: "Size", value: size}]);
  }
}

function handleOptionClick(event) {
  const clickedButton = event.currentTarget;
  const parentGroup = clickedButton.closest('.button-group, .image-button-group');
  parentGroup.querySelectorAll('.option-button').forEach(button => {
    button.classList.remove('active');
  });
  clickedButton.classList.add('active');
  updateSkuPicker();
  updateOptionAvailability();
  updateMockGallery();
}

// Helpers for option picking
function getSelectedOption(groupSelector) {
  const selected = document.querySelector(groupSelector + ' .option-button.active');
  return selected ? selected.dataset.optionValue : null;
}

function updateMockGallery() {
  const size = getSelectedOption('#sku-size-picker');
  const frame = getSelectedOption('#sku-frame-picker');

  const match = window.ABSTRACT_VARIANTS.find(v =>
    v.size === size && v.frame === frame && v.border == "No Border"
  );
  window.SELECTED_ABSTRACT_VARIANT = match;
  if (!match) return;

  const hiddenId = document.getElementById('sku-variant-id');
  if (hiddenId) hiddenId.value = match.id;
  
  const skuPrice = document.getElementById('sku-price');
  if(skuPrice) {
    skuPrice.textContent = match.price_formatted || '';
  }
  updateMockGalleryDOM(match);
}
function updateMockGalleryDOM(variant) {
  if (!variant) return;
  let mockConfig = {};
  try {
    mockConfig = (typeof variant.mock_config === 'object') ? variant.mock_config : JSON.parse(variant.mock_config);
  } catch(e) { mockConfig = {}; }
  const overlayUrl = mockConfig.mock_image_url || '';
  const placement = mockConfig.artwork_placement || {};

  // Find all containers with the class .mock-container:
  const mockContainers = document.querySelectorAll('.mockup-container');

  mockContainers.forEach(container => {
    // Always remove the old overlay!
    let overlayEl = container.querySelector('.mockup-overlay');
    if (overlayEl) {
      overlayEl.remove();
    }

    if (overlayUrl) {
      // Create and add new overlay image:
      overlayEl = document.createElement('img');
      overlayEl.className = 'mockup-overlay';
      overlayEl.src = overlayUrl;
      overlayEl.alt = 'Mock Frame';
      container.prepend(overlayEl);
      // log:
      console.log("Added new overlay image:", overlayUrl, "to", container);
    } else {
      console.log("No overlayUrl for this variant; overlay image not added in", container);
    }

    // Update the artwork element if it exists:
    const artEl = container.querySelector('.mockup-artwork');
    if (artEl) {
      artEl.style.left = placement.left || '';
      // artEl.style.top = placement.top || '';
      artEl.style.width = placement.width || '';
      artEl.style.transform = placement.transform || '';
    }
  });
}
document.addEventListener('DOMContentLoaded', function() {
  //--- 1. Find the cheapest (lowest price, available) variant:
  let cheapest = null, minPrice = null;
  (window.ABSTRACT_VARIANTS || []).forEach(v => {
    if (!v.available) return;
    if (minPrice === null || v.price < minPrice) {
      minPrice = v.price;
      cheapest = v;
    }
  });

  if (cheapest) {
    //--- 2. Activate matching buttons in both pickers for the cheapest variant:
    document.querySelectorAll('#sku-size-picker .option-button').forEach(btn => {
      if (btn.dataset.optionValue == cheapest.size) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    document.querySelectorAll('#sku-frame-picker .option-button').forEach(btn => {
      if (btn.dataset.optionValue == cheapest.frame) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    //--- 3. Now update everything else:
    updateSkuPicker();
    updateOptionAvailability();
    updateMockGallery();
  }

  //--- Add listeners to picker buttons:
  document.querySelectorAll('.option-group .option-button').forEach(button => {
    button.addEventListener('click', handleOptionClick);
  });
});