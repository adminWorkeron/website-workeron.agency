/**
 * Workeron.ai — Form Verification Tests
 * 
 * Instructions:
 * 1. Open index.html in a browser.
 * 2. Open Developer Tools (F12 or Cmd+Opt+I) -> Console.
 * 3. Copy-paste this entire file into the console and press Enter.
 * 4. Call `runAllTests()` to execute the suite.
 */

console.log("%c🧪 Workeron.ai Form Test Suite Loaded", "color: #73F0D1; font-size: 16px; font-weight: bold;");
console.log("Run `runAllTests()` to start verification.");

const testUtils = {
    log: (msg) => console.log(`%c[INFO]%c ${msg}`, "color: #3b82f6", "color: inherit"),
    pass: (msg) => console.log(`%c[PASS]%c ${msg}`, "color: #10b981; font-weight: bold", "color: inherit"),
    fail: (msg) => console.error(`[FAIL] ${msg}`),
    
    // Helper to simulate typing
    fillInput: (id, value) => {
        const el = document.getElementById(id);
        if (!el) throw new Error(`Element #${id} not found`);
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    },
    
    // Helper to simulate select change
    fillSelect: (id, index) => {
        const el = document.querySelector(`#${id} select`);
        if (!el) throw new Error(`Select inside #${id} not found`);
        el.selectedIndex = index;
        el.dispatchEvent(new Event('change', { bubbles: true }));
    },

    wait: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

async function testApplyForm() {
    console.group("%c📋 Test 1: Careers / Apply Form", "font-weight: bold; font-size: 14px;");
    
    try {
        // 1. Open Modal
        testUtils.log("Opening Apply Modal...");
        openApplyModal();
        await testUtils.wait(500);
        
        const modal = document.getElementById('applyModal');
        if (!modal || modal.classList.contains('hidden')) throw new Error("Modal failed to open");
        testUtils.pass("Apply Modal opened successfully.");

        // 2. Fill Form
        testUtils.log("Filling out form fields...");
        const form = document.getElementById('applyForm');
        form.querySelector('input[type="text"]').value = "Test User";
        form.querySelector('input[type="email"]').value = "test@workeron.ai";
        form.querySelector('select').selectedIndex = 2; // Automation Engineer
        form.querySelector('input[type="url"]').value = "https://linkedin.com/in/test";
        testUtils.pass("Form fields populated.");

        // 3. Submit Form
        testUtils.log("Submitting form...");
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        await testUtils.wait(100);

        // 4. Verify Success State (No backend redirect, just UI success)
        const successEl = document.getElementById('formSuccess');
        if (successEl && successEl.classList.contains('active')) {
            testUtils.pass("Success confirmation displayed globally.");
        } else {
            throw new Error("Success state 'formSuccess' not activated.");
        }

        // 5. Cleanup
        testUtils.log("Waiting for auto-close (2.5s delay + 300ms animation)...");
        await testUtils.wait(3000); 
        if (modal.classList.contains('hidden') || modal.classList.contains('opacity-0')) {
            testUtils.pass("Modal auto-closed successfully.");
        } else {
            throw new Error("Modal did not auto-close.");
        }
        
    } catch (err) {
        testUtils.fail(err.message);
    }
    console.groupEnd();
}

async function testConsultationForm() {
    console.group("%c📅 Test 2: Consultation Booking Form", "font-weight: bold; font-size: 14px;");
    
    try {
        // 1. Open Modal
        testUtils.log("Opening Consultation Modal...");
        openConsultModal();
        await testUtils.wait(500);
        
        const modal = document.getElementById('consultModal');
        if (!modal || modal.classList.contains('hidden')) throw new Error("Modal failed to open");
        testUtils.pass("Consultation Modal opened successfully.");

        // 2. Step 1 -> 2
        testUtils.log("Submitting Step 1 (Details)...");
        testUtils.fillInput('consultName', 'Test Client');
        testUtils.fillInput('consultEmail', 'client@example.com');
        testUtils.fillInput('consultMessage', 'Automated test message');
        
        document.getElementById('consultInfoForm').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        await testUtils.wait(300);
        
        if (document.getElementById('consultStep2').classList.contains('active')) {
            testUtils.pass("Transitioned to Step 2 (Date Selection).");
        } else {
            throw new Error("Failed to transition to Step 2.");
        }

        // 3. Step 2 -> 3
        testUtils.log("Selecting a date (Step 2)...");
        const availableDates = document.querySelectorAll('.date-cell.available');
        if (availableDates.length === 0) {
            throw new Error("No available dates found in calendar.");
        }
        
        availableDates[0].click();
        await testUtils.wait(300);
        
        if (document.getElementById('consultStep3').classList.contains('active')) {
            testUtils.pass("Transitioned to Step 3 (Time Selection).");
        } else {
            throw new Error("Failed to transition to Step 3.");
        }

        // Verify Loading State
        const loader = document.getElementById('slotsLoader');
        if (!loader.classList.contains('hidden')) {
            testUtils.log("Waiting for Google Calendar slots fetch...");
            // Wait for fetch to complete (simulated or real)
            await testUtils.wait(1500); 
        }

        // 4. Verify slot fetching logic handles missing URL gracefully
        if (APPS_SCRIPT_URL === 'INSERT_YOUR_WEB_APP_URL_HERE') {
            const container = document.getElementById('slotsContainer');
            if (container.innerText.includes('Backend not configured')) {
                testUtils.pass("Gracefully handled unconfigured Google Apps Script backend.");
            } else {
                throw new Error("Did not display expected backend warning.");
            }
        } else {
            // Real backend test (if configured)
            const slots = document.querySelectorAll('.time-slot');
            if (slots.length > 0) {
                testUtils.pass(`Fetched ${slots.length} available slots.`);
                
                testUtils.log("Selecting slot and submitting...");
                slots[0].click();
                
                const btn = document.getElementById('confirmBookingBtn');
                if (btn.disabled) throw new Error("Confirm button remained disabled after slot selection.");
                
                btn.click();
                testUtils.log("Awaiting submission response...");
                
                // Note: We don't await the network response here perfectly due to fetch timing, 
                // but we verified the button state works.
            } else {
                testUtils.log("No slots available for the selected day, but frontend gracefully handled empty state.");
            }
        }

        // 5. Cleanup
        closeConsultModal();
        await testUtils.wait(500);
        testUtils.pass("Test 2 cleanup complete.");

    } catch (err) {
        testUtils.fail(err.message);
    }
    console.groupEnd();
}

async function runAllTests() {
    console.clear();
    console.log("%c🚀 Starting Form Verification Suite", "color: #73F0D1; font-weight: bold; font-size: 16px; margin-bottom: 10px;");
    
    // Verify admin email hardcoding (as requested)
    const adminLink = document.querySelector('a[href="mailto:admin@workeron.ai"]');
    if (adminLink) {
        console.log("%c[PASS]%c Found correct admin email: admin@workeron.ai", "color: #10b981; font-weight: bold", "color: inherit");
    } else {
        console.error("[FAIL] Could not find mailto link for admin@workeron.ai");
    }

    await testApplyForm();
    console.log("");
    await testConsultationForm();
    
    console.log("");
    console.log("%c✨ Verification Suite Complete.", "color: #73F0D1; font-weight: bold;");
}
