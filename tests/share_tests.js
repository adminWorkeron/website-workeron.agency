/**
 * Workeron.ai — Share Button Verification Tests
 * 
 * Instructions:
 * 1. Open blog.html in a browser.
 * 2. Open Developer Tools (F12 or Cmd+Opt+I) -> Console.
 * 3. Copy-paste this entire file into the console and press Enter.
 * 4. Call `runShareTests()` to execute the suite.
 */

console.log("%c🧪 Workeron.ai Share Test Suite Loaded", "color: #21F0D1; font-size: 16px; font-weight: bold;");
console.log("Run `runShareTests()` to start verification.");

const shareTestUtils = {
    log: (msg) => console.log(`%c[INFO]%c ${msg}`, "color: #3b82f6", "color: inherit"),
    pass: (msg) => console.log(`%c[PASS]%c ${msg}`, "color: #10b981; font-weight: bold", "color: inherit"),
    fail: (msg) => console.error(`[FAIL] ${msg}`),
    wait: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

async function testShareButtons() {
    console.group("%c🔗 Article Share Buttons Test", "font-weight: bold; font-size: 14px;");
    
    // Original functions to restore later
    const originalOpen = window.open;
    const originalClipboard = navigator.clipboard.writeText;
    
    let openedUrl = '';
    let clipboardText = '';

    try {
        // 1. Open an article modal
        shareTestUtils.log("Opening first available article...");
        const firstArticle = document.querySelector('.article-card, [onclick*="openArticleModal"]');
        if (!firstArticle) throw new Error("No article cards found on page");
        
        firstArticle.click();
        await shareTestUtils.wait(800); // Wait for animation
        
        const modal = document.getElementById('articleModal');
        if (!modal || !modal.classList.contains('active')) throw new Error("Article modal failed to open");
        shareTestUtils.pass("Article modal opened.");

        // Mock window.open
        window.open = (url) => { 
            openedUrl = url; 
            shareTestUtils.log(`Blocked popup to: ${url}`);
            return null; 
        };
        
        // Mock clipboard
        navigator.clipboard.writeText = (text) => {
            clipboardText = text;
            return Promise.resolve();
        };

        // 2. Test Copy Link
        shareTestUtils.log("Testing 'Copy Link'...");
        const copyBtn = Array.from(document.querySelectorAll('.share-btn')).find(b => b.textContent.includes('Copy Link'));
        if (!copyBtn) throw new Error("'Copy Link' button not found");
        
        copyBtn.click();
        await shareTestUtils.wait(100);
        
        if (clipboardText.includes('?article=')) {
            shareTestUtils.pass(`Link copied to mock clipboard: ${clipboardText}`);
        } else {
            throw new Error(`Clipboard text invalid: ${clipboardText}`);
        }
        
        const toast = document.getElementById('toastNotification');
        if (toast && toast.classList.contains('show') && toast.textContent.includes('copied')) {
            shareTestUtils.pass("Toast notification displayed correctly.");
        } else {
            throw new Error("Toast notification did not appear.");
        }

        // 3. Test Twitter
        shareTestUtils.log("Testing 'Twitter' share...");
        const twitterBtn = Array.from(document.querySelectorAll('.share-btn')).find(b => b.textContent.includes('Twitter'));
        if (!twitterBtn) throw new Error("'Twitter' button not found");
        
        twitterBtn.click();
        if (openedUrl.includes('twitter.com/intent/tweet')) {
            shareTestUtils.pass("Twitter share URL generated correctly.");
        } else {
            throw new Error(`Invalid Twitter URL: ${openedUrl}`);
        }

        // 4. Test Telegram
        shareTestUtils.log("Testing 'Telegram' share...");
        const telegramBtn = Array.from(document.querySelectorAll('.share-btn')).find(b => b.textContent.includes('Telegram'));
        if (!telegramBtn) throw new Error("'Telegram' button not found");
        
        telegramBtn.click();
        if (openedUrl.includes('t.me/share/url')) {
            shareTestUtils.pass("Telegram share URL generated correctly.");
        } else {
            throw new Error(`Invalid Telegram URL: ${openedUrl}`);
        }

        shareTestUtils.pass("All share buttons verified successfully!");

    } catch (err) {
        shareTestUtils.fail(err.message);
    } finally {
        // Restore environment
        window.open = originalOpen;
        navigator.clipboard.writeText = originalClipboard;
        
        shareTestUtils.log("Closing modal...");
        closeArticleModal();
    }
    console.groupEnd();
}

async function runShareTests() {
    console.clear();
    console.log("%c🚀 Starting Share Buttons Verification", "color: #21F0D1; font-weight: bold; font-size: 16px; margin-bottom: 10px;");
    
    await testShareButtons();
    
    console.log("");
    console.log("%c✨ Test Suite Complete.", "color: #21F0D1; font-weight: bold;");
}
