const billInput = document.getElementById("billAmount");

const tipStrip = document.getElementById("tipStrip");
const stripContent = document.getElementById("stripContent");

const tipAmount = document.getElementById("tipAmount");
const tipPercent = document.getElementById("tipPercent");

const tipValue = document.getElementById("tipValue");
const totalValue = document.getElementById("totalValue");

// --------------------------------------------------
// Configuration
// --------------------------------------------------

const PIXELS_PER_DOLLAR = 80;
const MAX_TIP_PERCENT = 100;
let bill = 0;
let selectedTip = 0;
let updatingScroll = false;

// --------------------------------------------------
// Helpers
// --------------------------------------------------

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function money(value) {
    return `$${value.toFixed(2)}`;
}

// --------------------------------------------------
// Wheel generation
// --------------------------------------------------

function buildWheel() {
    stripContent.innerHTML = "";
    const maxTip = bill * MAX_TIP_PERCENT / 100;
    const maxDollar = Math.ceil(maxTip);
    stripContent.style.width = `${maxDollar * PIXELS_PER_DOLLAR}px`;

    for (let dollar = 0; dollar <= maxDollar; dollar++) {
        const tick = document.createElement("div");
        tick.className = "tick";
        tick.style.left = `${dollar * PIXELS_PER_DOLLAR}px`;

        const percent =
            bill > 0
                ? Math.round((dollar / bill) * 100)
                : 0;

        tick.innerHTML = `
            <span class="percent">
                ${percent}%
            </span>

            <span class="dollar">
                $${dollar}
            </span>
        `;
        stripContent.appendChild(tick);
    }
    stripContent.style.paddingLeft = `${tipStrip.clientWidth / 2}px`;
    stripContent.style.paddingRight = `${tipStrip.clientWidth / 2}px`;
}

// --------------------------------------------------
// Selection
// --------------------------------------------------

function setTip(amount, moveWheel = false) {

    selectedTip =
        clamp(
            amount,
            0,
            bill
        );

    updateDisplay();

    if (moveWheel) {
        updatingScroll = true;
        tipStrip.scrollTo({
            left:
                selectedTip * PIXELS_PER_DOLLAR
                - tipStrip.clientWidth / 2,
            behavior:"smooth"
        });

        setTimeout(() => {
            updatingScroll = false;
        }, 400);
    }
}

// --------------------------------------------------
// Display
// --------------------------------------------------

function updateDisplay() {

    const percent =
        bill > 0
            ? (selectedTip / bill) * 100
            : 0;

    tipAmount.textContent = money(selectedTip);
    tipPercent.textContent = `${percent.toFixed(1)}%`;
    tipValue.textContent = money(selectedTip);
    totalValue.textContent = money(bill + selectedTip);
}

// --------------------------------------------------
// Scroll handling
// --------------------------------------------------

function handleScroll() {
    if (updatingScroll) {
        return;
    }
    const amount = tipStrip.scrollLeft / PIXELS_PER_DOLLAR;
    setTip( Math.round(amount * 100) / 100 );
}

// --------------------------------------------------
// Bill Entry
// --------------------------------------------------

billInput.addEventListener("input", () => {

    let digits =
        billInput.value.replace(/\D/g, "");

    if (digits.length > 6) {
        digits = digits.slice(0,6);
    }

    if (digits === "") {
        bill = 0;
        billInput.value = "";
        buildWheel();
        setTip(0);
        return;
    }

    bill = parseInt(digits,10) / 100;

    billInput.value = bill.toFixed(2);

    billInput.setSelectionRange(
        billInput.value.length,
        billInput.value.length
    );

    buildWheel();

    // Start around 20%
    setTip(
        bill * 0.20,
        true
    );
});

function moveBillCaretToEnd() {
    requestAnimationFrame(() => {
        billInput.setSelectionRange(
            billInput.value.length,
            billInput.value.length
        );
    });
}

billInput.addEventListener(
    "focus",
    moveBillCaretToEnd
);

billInput.addEventListener(
    "click",
    moveBillCaretToEnd
);

// --------------------------------------------------
// Startup / Events
// --------------------------------------------------

tipStrip.addEventListener(
    "scroll",
    handleScroll
);

window.addEventListener(
    "resize",
    () => {
        buildWheel();
        setTip(
            selectedTip,
            true
        );
    }
);

requestAnimationFrame(() => {
    buildWheel();
    setTip(0);
});

billInput.focus();
