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

function money(value) {
    return `$${value.toFixed(2)}`;
}

function clamp(value, min, max) {
    return Math.min(
        Math.max(value, min),
        max
    );
}

function roundMoney(value) {
    return Math.round(value * 100) / 100;
}

// --------------------------------------------------
// Build Wheel
// --------------------------------------------------

function buildWheel() {

    stripContent.innerHTML = "";

    const maxTip =
        bill * MAX_TIP_PERCENT / 100;

    const maxDollar =
        Math.ceil(maxTip);

    const width =
        maxDollar * PIXELS_PER_DOLLAR;

    stripContent.style.width =
        `${width}px`;

    for (
        let cents = 0;
        cents <= maxDollar * 100;
        cents++
    ) {
        const amount =
            cents / 100;
        const tick =
            document.createElement("div");
        tick.className = "tick";
        tick.style.left =
            `${amount * PIXELS_PER_DOLLAR}px`;

        // Only show labels on whole dollars
        if (cents % 100 === 0) {
            const percent =
                bill > 0
                    ? Math.round(amount / bill * 100)
                    : 0;
            tick.innerHTML = `
                <span class="percent">
                    ${percent}%
                </span>
                <span class="dollar">
                    $${amount.toFixed(0)}
                </span>
            `;
            stripContent.appendChild(tick);
        }
    }

    // Padding lets first and last values
    // reach the center line

    stripContent.style.paddingLeft =
        `${tipStrip.clientWidth / 2}px`;

    stripContent.style.paddingRight =
        `${tipStrip.clientWidth / 2}px`;

}

// --------------------------------------------------
// Set Tip
// --------------------------------------------------

function setTip(amount, moveWheel = false) {
    selectedTip =
        clamp(
            roundMoney(amount),
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
            ? selectedTip / bill * 100
            : 0;

    tipAmount.textContent =
        money(selectedTip);

    tipPercent.textContent =
        `${percent.toFixed(1)}%`;

    tipValue.textContent =
        money(selectedTip);

    totalValue.textContent =
        money(
            bill + selectedTip
        );
}

// --------------------------------------------------
// Scroll Selection
// --------------------------------------------------

function handleScroll() {
    if (updatingScroll)
        return;

    const center =
        tipStrip.scrollLeft
        + tipStrip.clientWidth / 2;

    let amount =
        center / PIXELS_PER_DOLLAR;

    amount =
        clamp(
            amount,
            0,
            bill
        );
    setTip(amount);
}

// --------------------------------------------------
// Bill Input
// --------------------------------------------------

billInput.addEventListener(
    "input",
    () => {
        let digits =
            billInput.value.replace(
                /\D/g,
                ""
            );

        if (digits.length > 6) {
            digits =
                digits.slice(0,6);
        }

        if (digits === "") {
            bill = 0;
            billInput.value = "";
            setTip(0);
        }

        else {
            bill =
                parseInt(
                    digits,
                    10
                ) / 100;

            billInput.value =
                bill.toFixed(2);

            buildWheel();

            // Start at 20%
            setTip(
                bill * .20,
                true
            );
        }
    }
);

// --------------------------------------------------
// Startup
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

buildWheel();

setTip(0);

billInput.focus();
