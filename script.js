const billInput = document.getElementById("billAmount");

const percentWheel = document.getElementById("percentWheel");
const dollarWheel = document.getElementById("dollarWheel");

const tipValue = document.getElementById("tipValue");
const totalValue = document.getElementById("totalValue");

const settingsButton = document.getElementById("settingsButton");
const settingsDialog = document.getElementById("settingsDialog");

const defaultTipSelect = document.getElementById("defaultTip");
const saveSettings = document.getElementById("saveSettings");

const cancelSettings = document.getElementById("cancelSettings");


let savedTip =
    localStorage.getItem("defaultTip");

let selectedPercent =
    savedTip !== null
        ? parseInt(savedTip)
        : 20;

let selectedAmount = 0;
let updatingPercentWheel = false;
let updatingDollarWheel = false;
let activeWheel = "percent";

let currentDollarWheelMax = 50;

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
// Build Percentage Wheel
// ------------------------------

function buildPercentWheel() {

    percentWheel.innerHTML = "";


    for (let i = 0; i <= 100; i++) {

        const item = document.createElement("div");

        item.className = "tipItem";

        item.dataset.value = i;


        item.innerHTML = `
            <div class="tipPrimary">${i}%</div>
            <div class="tipSecondary">
                $0.00
            </div>
        `;


        item.onclick = () => {

            if (updatingPercentWheel) return;

            activeWheel = "percent";
            clearHighlight(dollarWheel);

            selectedPercent = i;

            selectedAmount =
                calculateAmountFromPercent(i);


            updatePercentWheelPosition();
            updateDollarWheelPosition();
            updateDisplay();

        };


        percentWheel.appendChild(item);

    }

}



// ------------------------------
// Build Dollar Wheel
// ------------------------------

function buildDollarWheel(maxAmount = 50) {
    
    dollarWheel.innerHTML = "";


    const maxCents = Math.round(maxAmount * 100);

    for (let cents = 0; cents <= maxCents; cents += 25) {

        const amount =
            cents / 100;


        const item = document.createElement("div");


        item.className = "tipItem";


        item.dataset.value = amount;



        item.innerHTML = `
            <div class="tipPrimary">
                $${amount.toFixed(2)}
            </div>
            <div class="tipSecondary">
                0%
            </div>
        `;



        item.onclick = () => {

            if (updatingDollarWheel) return;

            activeWheel = "dollar";
            clearHighlight(percentWheel);

            selectedAmount = amount;
            selectedPercent =
                calculatePercentFromAmount(amount);


            updatePercentWheelPosition();

            updateDisplay();

            scrollWheelTo(dollarWheel, item, (v) => { updatingDollarWheel = v; });
            highlight(dollarWheel, cents / 25);

        };



        dollarWheel.appendChild(item);

    }

}



// ------------------------------
// Scroll helper
// ------------------------------

// Scrolls `targetItem` into view within `wheel`, holding the programmatic-
// scroll flag (via setFlag) true until the animation genuinely finishes.
// Uses the native 'scrollend' event where available; falls back to a
// generous timeout for browsers without it, or for no-op scrolls (item
// already centered) where scrollend never fires.
function scrollWheelTo(wheel, targetItem, setFlag) {

    if (!targetItem) return;

    setFlag(true);

    let settled = false;

    const finish = () => {
        if (settled) return;
        settled = true;
        setFlag(false);
    };

    if ("onscrollend" in window) {
        wheel.addEventListener("scrollend", finish, { once: true });
    }

    // Safety net: guarantees the flag always clears even if scrollend
    // doesn't fire (unsupported browser, or the item was already centered
    // so no scrolling actually happened).
    setTimeout(finish, 500);

    targetItem.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest"
    });

}



// ------------------------------
// Calculations
// ------------------------------

function calculateAmountFromPercent(percent) {

    const bill =
        parseFloat(billInput.value) || 0;

    if (bill > 10000) {
        return 0;
    }

    return bill * percent / 100;

}



function calculatePercentFromAmount(amount) {

    const bill =
        parseFloat(billInput.value) || 0;


    if (bill === 0) return 0;


    return Math.round(
        amount / bill * 100
    );

}

function getDollarWheelMaximum() {

    const bill =
        parseFloat(billInput.value) || 0;

    const halfBill =
        bill * 0.5;

    if (halfBill <= 50) {
        return 50;
    }

    return Math.ceil(halfBill / 25) * 25;

}

function rebuildDollarWheel() {

    const newMax =
        getDollarWheelMaximum();

    if (newMax === currentDollarWheelMax) {
        return;
    }

    currentDollarWheelMax = newMax;

    buildDollarWheel(newMax);

}

// ------------------------------
// Update Wheels
// ------------------------------

function updateDollarWheelValues() {

    const bill =
        parseFloat(billInput.value) || 0;



    [...dollarWheel.children].forEach(item => {

        const amount =
            parseFloat(item.dataset.value);


        item.querySelector(".tipSecondary")
            .textContent =
            bill
            ? `${Math.round(amount / bill * 100)}%`
            : "0%";

    });



}



function updatePercentWheelValues() {


    [...percentWheel.children].forEach(item => {


        const percent =
            parseInt(item.dataset.value);


        item.querySelector(".tipSecondary")
            .textContent =
            `$${calculateAmountFromPercent(percent).toFixed(2)}`;


    });


}



function updatePercentWheelPosition() {

    const target =
        percentWheel.children[selectedPercent];

    if (!target) return;

    scrollWheelTo(percentWheel, target, (v) => { updatingPercentWheel = v; });

   if (activeWheel === "percent") {
        highlight(percentWheel, selectedPercent);
    }

}



function updateDollarWheelPosition() {

    let closest = 0;

    let distance = Infinity;

    if (!Number.isFinite(selectedAmount)) {
        selectedAmount = 0;
    }
    
    [...dollarWheel.children].forEach((item,index)=>{


        const value =
            parseFloat(item.dataset.value);


        const difference =
            Math.abs(value - selectedAmount);


        if (difference < distance) {

            distance = difference;

            closest = index;

        }

    });


    scrollWheelTo(
        dollarWheel,
        dollarWheel.children[closest],
        (v) => { updatingDollarWheel = v; }
    );

    if (activeWheel === "dollar") {
        highlight(dollarWheel, closest);
    }

}



// ------------------------------
// Display
// ------------------------------

let wheelLabelsTimer = null;

// The per-item wheel labels (100+ DOM nodes across both wheels) are more
// expensive to refresh than the headline tip/total figures. Debouncing
// them keeps rapid bill-amount typing from thrashing the DOM every
// keystroke, while the numbers that matter most stay instant.
function scheduleWheelLabelsUpdate() {

    clearTimeout(wheelLabelsTimer);

    wheelLabelsTimer = setTimeout(() => {

        updatePercentWheelValues();
        updateDollarWheelValues();

    }, 120);

}

function updateDisplay() {


    const tip =
        selectedAmount;


    const bill =
        parseFloat(billInput.value) || 0;



    tipValue.textContent =
        `$${tip.toFixed(2)}`;


    totalValue.textContent =
        `$${(bill + tip).toFixed(2)}`;


    scheduleWheelLabelsUpdate();

}



function highlight(wheel, index) {

    [...wheel.children].forEach(item =>
        item.classList.remove("selected")
    );

    const target = wheel.children[index];

    if (target) {
        target.classList.add("selected");
    }

}

function clearHighlight(wheel) {
    [...wheel.children].forEach(item =>
        item.classList.remove("selected")
    );
}


// ------------------------------
// Wheel Scrolling
// ------------------------------

function watchWheel(wheel, callback, isProgrammaticScroll) {


    let timer;


    wheel.addEventListener("scroll",()=>{


        clearTimeout(timer);



        timer=setTimeout(()=>{


            if (isProgrammaticScroll())
                return;



            const center =
                wheel.scrollLeft +
                wheel.offsetWidth / 2;



            let closest = 0;

            let distance = Infinity;



            [...wheel.children]
            .forEach((item,index)=>{


                const itemCenter =
                    item.offsetLeft +
                    item.offsetWidth / 2;



                const difference =
                    Math.abs(center-itemCenter);



                if(difference < distance){

                    distance=difference;
                    closest=index;

                }


            });



            callback(
                wheel.children[closest],
                closest
            );


        },100);


    });


}



// ------------------------------
// Events
// ------------------------------

billInput.addEventListener("input", () => {

    // Keep only digits
    let digits = billInput.value.replace(/\D/g, "");

    // Cap at 6 digits ($9,999.99). This keeps bills comfortably under the
    // 10,000 cutoff in calculateAmountFromPercent, so the tip can never
    // silently drop to $0.00 with no explanation.
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

rebuildDollarWheel();

selectedAmount =
    calculateAmountFromPercent(
        selectedPercent
    );

updateDisplay();

updateDollarWheelPosition();
updatePercentWheelPosition();

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

        selectedAmount =
            calculateAmountFromPercent(selectedPercent);

        updateDisplay();

        updateDollarWheelPosition();
        updatePercentWheelPosition();

    }

});


watchWheel(percentWheel,(item, index)=>{


    activeWheel = "percent";
    clearHighlight(dollarWheel);
    selectedPercent = parseInt(item.dataset.value);

    selectedAmount =
        calculateAmountFromPercent(
            selectedPercent
        );


    updateDollarWheelPosition();

    updateDisplay();

    highlight(percentWheel, index);

}, () => updatingPercentWheel);



watchWheel(dollarWheel,(item, index)=>{


    activeWheel = "dollar";
    clearHighlight(percentWheel);

    selectedAmount = parseFloat(item.dataset.value);

    selectedPercent =
        calculatePercentFromAmount(
            selectedAmount
        );


    updatePercentWheelPosition();

    updateDisplay();

    highlight(dollarWheel, index);

}, () => updatingDollarWheel);




// ------------------------------
// Preferences
// ------------------------------

settingsButton.onclick = ()=>{

    defaultTipSelect.value =
        selectedPercent;

    settingsDialog.showModal();

};


saveSettings.onclick = ()=>{

    activeWheel = "percent";
    clearHighlight(dollarWheel);
    
    selectedPercent =
        parseInt(defaultTipSelect.value);

    localStorage.setItem(
        "defaultTip",
        selectedPercent
    );

    selectedAmount =
        calculateAmountFromPercent(
            selectedPercent
        );

    updatePercentWheelPosition();
    updateDollarWheelPosition();
    updateDisplay();
    settingsDialog.close();


};

cancelSettings.onclick = ()=>{

    settingsDialog.close();

};

// ------------------------------
// Startup
// ------------------------------

buildPercentWheel();

currentDollarWheelMax =
    getDollarWheelMaximum();

buildDollarWheel(currentDollarWheelMax);


selectedAmount =
    calculateAmountFromPercent(
        selectedPercent
    );


updateDisplay();


setTimeout(()=>{

    updatePercentWheelPosition();

    updateDollarWheelPosition();

},100);


billInput.focus();
