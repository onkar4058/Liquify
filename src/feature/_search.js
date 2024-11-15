(() => {
  window.searchLoaded = false;

  startSearch = () => {
    if (!window.SEARCH_INJECTED_FLAG) {
      window.SEARCH_INJECTED_FLAG = true;
      return false;
    }

    // Create setInterval to act as a listener until theme editor elements exist
    let searchIntervalListener = setInterval(() => {
      // Locate iframe and file search element
      let hasThemeIframe = document.querySelector(`main iframe`);

      let frameDocument =
        (hasThemeIframe && hasThemeIframe.contentDocument) || document;

      let frameContent =
        (hasThemeIframe &&
          hasThemeIframe.contentDocument &&
          hasThemeIframe.contentDocument.querySelector(
            '[type="search"]'
          )) ||
        document.querySelector('[type="search"]');
      if (!frameContent) return;

      // Element found, clear interval
      clearInterval(searchIntervalListener);

      window.searchLoaded = true;

      chrome.runtime.onMessage.addListener(function (request, sender) {
        if (request.data) {
          let parsed = JSON.parse(request.data);
          // Get asset list
          getAssets(frameContent, parsed);
        }
      });

      // Set loading message
      let searchInput = frameContent;
      searchInput.setAttribute("placeholder", "Enhanced search loading...");
      searchInput
        .closest('[data-diffy-attribute="search"]')
        .classList.add("search-loading");
      searchInput.disabled = true;

      getAssets = (searchInput, parsed) => {
        getAssetData(searchInput, parsed);
      };

      getAssetData = (frameContent, parsed) => {
        createSearchField(parsed, frameContent);
      };

      createSearchField = (assetArray, searchElement) => {
        searchElement
          .closest('[data-diffy-attribute="search"]')
          .classList.remove("search-loading");

        // Clone and replace search element to remove event listeners
        let searchParent = searchElement.parentNode;
        const newItem = document.createElement("div");
        newItem.innerHTML =
          '<input id="liquify-search" placeholder="Filter files..." autocomplete="off" class="Polaris-TextField__Input Polaris-TextField__Input--hasClearButton" type="search" aria-labelledby=":r3:Label :r3:-Prefix" aria-invalid="false" data-1p-ignore="true" data-lpignore="true" data-form-type="other" value="">';
        searchElement.parentNode.replaceChild(
          newItem.firstElementChild,
          searchElement
        );

        // Set properties of new search
        let searchInput = searchParent.querySelector("#liquify-search");
        searchInput.setAttribute(
          "placeholder",
          "Search filename / contents..."
        );
        searchInput.classList.remove("search-loading");

        // On type event listener
        searchInput.addEventListener("input", (e) => {
          // Open all folders so all files render
          let collapsibles = frameDocument.querySelectorAll(
            '[id^=Collapsible-folder-][aria-hidden="true"]'
          );
          collapsibles.forEach((collapsible) => {
            collapsible.parentElement.querySelector("button").click();
          });

          let searchTerm = e.target.value;

          // Find matches in asset files
          let filtered = assetArray.filter((obj) =>
            Object.values(obj).some((asset) => {
              if ("value" in asset) {
                return asset.value.includes(searchTerm);
              } else {
                console.log("asset failed", asset);
                return false;
              }
            })
          );

          // Create list of matched files
          let filteredFiles = filtered.map((item) => (item = item.asset.key));
          filterFileList(filteredFiles, searchTerm);
        });
      };

      filterFileList = (fileList, searchTerm) => {
        let assetList = frameDocument.querySelectorAll(
          '[aria-label="File picker"] li[data-diffy-attribute^="fileName-"]'
        );

        for (let item of assetList) {
          let assetKey = item.getAttribute("data-diffy-attribute");
          assetKey = assetKey.slice(assetKey.indexOf("-") + 1);

          // Show file if filename or contents match search term, else hide
          if (assetKey) {
            if (
              fileList.includes(assetKey) ||
              assetKey.includes(searchTerm) ||
              searchTerm == ""
            ) {
              item.style.display = "block";
              // Open asset folder if collapsed
              try {
                item.parentNode.parentNode.parentNode.classList.remove(
                  "is-collapsed"
                );
              } catch (error) {}
            } else {
              item.style.display = "none";
            }
          }
        }
      };

      chrome.runtime.sendMessage({ searchReady: true });
    }, 500);
  };

  // On load begin search
  window.onload = startSearch();

  // Detect page change
  let previousUrl = "";
  const assetObserver = new MutationObserver(() => {
    if (location.href !== previousUrl) {
      previousUrl = location.href;

      if (location.href == "https://online-store-web.shopifyapps.com/admin/online-store/themes")
        window.searchLoaded = false;

      if (
        location.href.includes("/themes/") &&
        !location.href.includes("editor") &&
        !window.searchLoaded
      )
        startSearch();
    }
  });
  const config = { subtree: true, childList: true };
  assetObserver.observe(document, config);
})();
