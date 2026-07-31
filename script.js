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

const QUARTER_MAGNET_CENTS = 2;


// --------------------------------------------------
// State
// --------------------------------------------------

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
    return Math.min(max, Math.max(min, value));
}


function cents(value) {
    return Math.round(value * 100);
}


// --------------------------------------------------
// Wheel generation
// --------------------------------------------------

function buildWheel() {

    stripContent.innerHTML = "";

    const maxTip =
        bill * MAX_TIP_PERCENT / 100;

    const maxCents =
        cents(maxTip);

    const width =
        maxTip * PIXELS_PER_DOLLAR;


    stripContent.style.width =
        `${width}px`;


    for (let c = 0; c <= maxCents; c++) {

        const amount = c / 100;

        const tick =
            document.createElement("div");

        tick.className = "tick";

        tick.style.left =
            `${amount * PIXELS_PER_DOLLAR}px`;


        const percent =
            bill > 0
                ? amount / bill * 100
                : 0;


        tick.innerHTML = `
            <span class="percent">
                ${Math.round(percent)}%
            </span>

            <span class="dollar">
                $${amount.toFixed(2)}
            </span>
        `;


        stripContent.appendChild(tick);
    }


    const padding =
        tipStrip.clientWidth / 2;


    stripContent.style.paddingLeft =
        `${padding}px`;

    stripContent.style.paddingRight =
        `${padding}px`;
}


// --------------------------------------------------
// Magnetic quarter snapping
// --------------------------------------------------

function applyQuarterMagnet(amount) {

    const centsValue =
        cents(amount);

    const remainder =
        centsValue % 25;

    let snapped =
        centsValue;


    if (remainder <= QUARTER_MAGNET_CENTS) {

        snapped =
            centsValue - remainder;

    }
    else if (25 - remainder <= QUARTER_MAGNET_CENTS) {

        snapped =
            centsValue + (25 - remainder);

    }


    return snapped / 100;
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
// Scroll handling
// --------------------------------------------------

function handleScroll() {

    if (updatingScroll)
        return;


    const amount =
        tipStrip.scrollLeft
        / PIXELS_PER_DOLLAR;


    const snapped =
        applyQuarterMagnet(amount);


    setTip(snapped);

}



// --------------------------------------------------
// Bill input
// --------------------------------------------------

billInput.addEventListener(
    "input",
    () => {


        let digits =
            billInput.value.replace(/\D/g,"");


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
