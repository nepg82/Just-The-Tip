const billInput = document.getElementById("billAmount");

const tipStrip = document.getElementById("tipStrip");
const stripContent = document.getElementById("stripContent");
const percentRow = document.getElementById("percentRow");
const dollarRow = document.getElementById("dollarRow");

const tipValue = document.getElementById("tipValue");
const totalValue = document.getElementById("totalValue");

const settingsButton = document.getElementById("settingsButton");
const settingsDialog = document.getElementById("settingsDialog");

const defaultTipSelect = document.getElementById("defaultTip");
const saveSettings = document.getElementById("saveSettings");

const cancelSettings = document.getElementById("cancelSettings");


// ------------------------------
// Shared coordinate system
// ------------------------------
//
// Both rows live on one horizontal axis measured in "dollar pixels":
// a dollar tick at value v sits at x = edgePadding + v * PX_PER_DOLLAR.
// A percent tick at value i represents (bill * i / 100) dollars, so its
// true position would be edgePadding + (bill * i / 100) * PX_PER_DOLLAR.
// That simplifies to edgePadding + i * pxPerPercent, where
// pxPerPercent = PX_PER_DOLLAR * bill / 100.
//
// pxPerPercent scales with the bill (1% of a bigger bill is worth more),
// so it's clamped to a readable range. Inside that range, the rows are
// pixel-accurate to each other -- tapping 35% lands exactly between the
// two dollar ticks that bracket its true dollar value. Outside that
// range (very small or very large bills) the spacing is clamped for
// usability, so the visual alignment becomes approximate -- but the
// number shown in the output field is always exact regardless.

const PX_PER_DOLLAR = 250;          // fixed scale for the dollar axis
const DOLLAR_TICK_STEP = 0.25;      // dollars between dollar ticks
const MIN_PERCENT_TICK_PX = 56;     // floor on percent-tick spacing
const MAX_PERCENT_TICK_PX = 168;    // ceiling on percent-tick spacing

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function getBill() {
    return parseFloat(billInput.value) || 0;
}

function computePxPerPercent(bill) {
    return clamp(PX_PER_DOLLAR * bill / 100, MIN_PERCENT_TICK_PX, MAX_PERCENT_TICK_PX);
}

// Same "how far above the bill should the dollar row reach" rule the
// original two-wheel version used.
function computeDollarMax(bill) {
    const halfBill = bill * 0.5;
    if (halfBill <= 50) return 50;
    return Math.ceil(halfBill / 25) * 25;
}


// ------------------------------
// State
// ------------------------------

let savedTip =
    localStorage.getItem("defaultTip");

let selectionMode = "percent";   // "percent" | "dollar" -- which axis last drove the selection

let selectedPercent =
    savedTip !== null
        ? parseInt(savedTip)
        : 20;

let selectedDollarAmount = 0;

let currentDollarMax = 50;
let pxPerPercent = MIN_PERCENT_TICK_PX;
let edgePadding = 0;

let updatingStrip = false;   // true while a programmatic scroll is in flight


// ------------------------------
// Settings Dropdown
// ------------------------------

for (let i = 0; i <= 100; i++) {

    const option = document.createElement("option");

    option.value = i;
    option.textContent = `${i}%`;

    if (i === selectedPercent) {
        option.selected = true;
    }

    defaultTipSelect.appendChild(option);

}



// ------------------------------
// Build rows
// ------------------------------

function buildPercentRow() {

    percentRow.innerHTML = "";

    for (let i = 0; i <= 100; i++) {

        const item = document.createElement("div");

        item.className = "stripItem";
        item.dataset.value = i;
        item.textContent = `${i}%`;

        item.onclick = () => {
            selectPercent(i, true);
        };

        percentRow.appendChild(item);

    }

}



function buildDollarRow(maxAmount) {

    dollarRow.innerHTML = "";

    const maxCents = Math.round(maxAmount * 100);

    for (let cents = 0; cents <= maxCents; cents += 25) {

        const amount = cents / 100;

        const item = document.createElement("div");

        item.className = "stripItem";
        item.dataset.value = amount;
        item.textContent = `$${amount.toFixed(2)}`;

        item.onclick = () => {
            selectDollar(amount, true);
        };

        dollarRow.appendChild(item);

    }

}



// ------------------------------
// Positioning
// ------------------------------

function xForPercent(i) {
    return edgePadding + i * pxPerPercent;
}

function xForDollar(v) {
    return edgePadding + v * PX_PER_DOLLAR;
}

function layoutPercentRow() {
    [...percentRow.children].forEach((item, i) => {
        item.style.left = `${xForPercent(i)}px`;
    });
}

function layoutDollarRow() {
    [...dollarRow.children].forEach((item) => {
        const v = parseFloat(item.dataset.value);
        item.style.left = `${xForDollar(v)}px`;
    });
}

function layoutContentWidth() {
    const percentWidth = xForPercent(100);
    const dollarWidth = xForDollar(currentDollarMax);
    stripContent.style.width = `${Math.max(percentWidth, dollarWidth) + edgePadding}px`;
}

// Recomputes tick spacing/positions for the current bill. Rebuilds the
// dollar row only if its range actually needs to change (never shrinking
// past whatever's currently selected, so a selection can't be yanked out
// from under the user).
function recalcLayout() {

    const bill = getBill();

    edgePadding = tipStrip.clientWidth / 2;
    pxPerPercent = computePxPerPercent(bill);

    let newMax = computeDollarMax(bill);

    if (selectionMode === "dollar" && selectedDollarAmount > newMax) {
        newMax = Math.ceil(selectedDollarAmount / 25) * 25;
    }

    if (newMax !== currentDollarMax) {
        currentDollarMax = newMax;
        buildDollarRow(currentDollarMax);
    }

    layoutPercentRow();
    layoutDollarRow();
    layoutContentWidth();

}



// ------------------------------
// Highlighting
// ------------------------------

function clearHighlights() {
    [...percentRow.children].forEach(el => el.classList.remove("selected"));
    [...dollarRow.children].forEach(el => el.classList.remove("selected"));
}

function highlightPercent(i) {
    clearHighlights();
    const target = percentRow.children[i];
    if (target) target.classList.add("selected");
}

function highlightDollar(amount) {
    clearHighlights();
    const idx = Math.round(amount / DOLLAR_TICK_STEP);
    const target = dollarRow.children[idx];
    if (target) target.classList.add("selected");
}



// ------------------------------
// Scrolling
// ------------------------------

// Scrolls so that x-position `xTarget` sits at the strip's center,
// holding `updatingStrip` true until the animation genuinely finishes
// (via the 'scrollend' event, with a timeout safety net) so the scroll
// listener below doesn't mistake this for a user drag mid-animation.
//
// A monotonic token guards against overlapping calls: if the user taps a
// second tile before the first tile's scroll has settled, the first
// call's (now-stale) finish() must NOT be allowed to clear the flag out
// from under the second, still-in-flight scroll.
let scrollToken = 0;

function scrollStripTo(xTarget, animate) {

    const token = ++scrollToken;

    updatingStrip = true;

    let settled = false;
    const finish = () => {
        if (settled) return;
        if (token !== scrollToken) return; // superseded by a newer call
        settled = true;
        updatingStrip = false;
    };

    if (animate && "onscrollend" in window) {
        tipStrip.addEventListener("scrollend", finish, { once: true });
    }

    setTimeout(finish, animate ? 500 : 50);

    tipStrip.scrollTo({
        left: xTarget - tipStrip.clientWidth / 2,
        behavior: animate ? "smooth" : "auto"
    });

}

// Instant re-center used when the bill amount changes (the percent row's
// spacing just shifted, so the selected tile needs to stay under the
// center indicator) -- deliberately not animated, so it doesn't fight
// with the user's typing. Shares the same version token for the same
// reason as scrollStripTo above.
function recenterInstant(xTarget) {

    const token = ++scrollToken;

    updatingStrip = true;
    tipStrip.scrollLeft = xTarget - tipStrip.clientWidth / 2;

    requestAnimationFrame(() => {
        if (token !== scrollToken) return;
        updatingStrip = false;
    });

}



// ------------------------------
// Selection
// ------------------------------

function selectPercent(i, animate) {
    selectionMode = "percent";
    selectedPercent = i;
    highlightPercent(i);
    updateDisplay();
    scrollStripTo(xForPercent(i), animate);
}

function selectDollar(amount, animate) {
    selectionMode = "dollar";
    selectedDollarAmount = amount;
    highlightDollar(amount);
    updateDisplay();
    scrollStripTo(xForDollar(amount), animate);
}

function currentTip() {
    const bill = getBill();
    if (selectionMode === "dollar") return selectedDollarAmount;
    return bill * selectedPercent / 100;
}



// ------------------------------
// Display
// ------------------------------

function updateDisplay() {

    const tip = currentTip();
    const bill = getBill();

    tipValue.textContent = `$${tip.toFixed(2)}`;
    totalValue.textContent = `$${(bill + tip).toFixed(2)}`;

}



// ------------------------------
// Drag-to-select (free scroll)
// ------------------------------

// After the user drags the strip and lets go, find whichever tick --
// percent or dollar -- ended up closest to the center indicator, and
// make that the selection (same as tapping it directly), snapping it
// neatly into place.
function attachScrollWatcher() {

    let timer;

    tipStrip.addEventListener("scroll", () => {

        clearTimeout(timer);

        timer = setTimeout(() => {

            if (updatingStrip) return;

            const centerX = tipStrip.scrollLeft + tipStrip.clientWidth / 2;

            let nearestPercent = 0;
            let percentDist = Infinity;

            for (let i = 0; i <= 100; i++) {
                const d = Math.abs(xForPercent(i) - centerX);
                if (d < percentDist) {
                    percentDist = d;
                    nearestPercent = i;
                }
            }

            let nearestDollar = 0;
            let dollarDist = Infinity;

            [...dollarRow.children].forEach((item) => {
                const v = parseFloat(item.dataset.value);
                const d = Math.abs(xForDollar(v) - centerX);
                if (d < dollarDist) {
                    dollarDist = d;
                    nearestDollar = v;
                }
            });

            if (percentDist <= dollarDist) {
                selectPercent(nearestPercent, true);
            } else {
                selectDollar(nearestDollar, true);
            }

        }, 100);

    });

}



// ------------------------------
// Events
// ------------------------------

let layoutTimer = null;

function scheduleLayoutRecalc() {

    clearTimeout(layoutTimer);

    layoutTimer = setTimeout(() => {

        recalcLayout();

        if (selectionMode === "percent") {
            recenterInstant(xForPercent(selectedPercent));
            highlightPercent(selectedPercent);
        } else {
            highlightDollar(selectedDollarAmount);
        }

    }, 120);

}

billInput.addEventListener("input", () => {

    // Keep only digits
    let digits = billInput.value.replace(/\D/g, "");

    // Cap at 6 digits ($9,999.99) so the bill amount stays within a
    // sane, well-tested range.
    if (digits.length > 6) {
        digits = digits.slice(0, 6);
    }

    // Empty field
    if (digits === "") {
        billInput.value = "";
    } else {
        // Interpret as cents
        const amount = (parseInt(digits, 10) / 100).toFixed(2);
        billInput.value = amount;
    }

    // This field always treats new input as appending to the cents value
    // (like a calculator tape), so the cursor belongs at the end -
    // pin it there explicitly rather than relying on the browser default.
    billInput.setSelectionRange(billInput.value.length, billInput.value.length);

    // Tip/total numbers update instantly; the (more expensive) row
    // layout recalculation is debounced so rapid typing doesn't thrash it.
    updateDisplay();
    scheduleLayoutRecalc();

});

function moveBillCaretToEnd() {
    requestAnimationFrame(() => {
        billInput.setSelectionRange(billInput.value.length, billInput.value.length);
    });
}

billInput.addEventListener("focus", moveBillCaretToEnd);
billInput.addEventListener("click", moveBillCaretToEnd);

billInput.addEventListener("keydown", (event) => {

    if (event.key === "Enter" || event.key === "Tab") {

        event.preventDefault();

        billInput.blur();

        clearTimeout(layoutTimer);
        recalcLayout();

        if (selectionMode === "percent") {
            recenterInstant(xForPercent(selectedPercent));
            highlightPercent(selectedPercent);
        } else {
            highlightDollar(selectedDollarAmount);
        }

        updateDisplay();

    }

});

window.addEventListener("resize", () => {

    recalcLayout();

    if (selectionMode === "percent") {
        recenterInstant(xForPercent(selectedPercent));
    } else {
        recenterInstant(xForDollar(selectedDollarAmount));
    }

});



// ------------------------------
// Preferences
// ------------------------------

settingsButton.onclick = () => {

    const bill = getBill();

    const displayPercent =
        selectionMode === "percent"
            ? selectedPercent
            : (bill ? Math.round(selectedDollarAmount / bill * 100) : selectedPercent);

    defaultTipSelect.value = displayPercent;

    settingsDialog.showModal();

};


saveSettings.onclick = () => {

    const percent = parseInt(defaultTipSelect.value);

    localStorage.setItem("defaultTip", percent);

    selectPercent(percent, true);

    settingsDialog.close();

};

cancelSettings.onclick = () => {

    settingsDialog.close();

};



// ------------------------------
// Startup
// ------------------------------

buildPercentRow();

currentDollarMax = computeDollarMax(getBill());
buildDollarRow(currentDollarMax);

attachScrollWatcher();

recalcLayout();
highlightPercent(selectedPercent);
updateDisplay();

requestAnimationFrame(() => {
    recenterInstant(xForPercent(selectedPercent));
});

billInput.focus();
