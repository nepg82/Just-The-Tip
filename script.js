const billInput = document.getElementById("billAmount");

const percentWheel = document.getElementById("percentWheel");
const dollarWheel = document.getElementById("dollarWheel");

const tipValue = document.getElementById("tipValue");
const totalValue = document.getElementById("totalValue");

const settingsButton = document.getElementById("settingsButton");
const settingsDialog = document.getElementById("settingsDialog");

const defaultTipSelect = document.getElementById("defaultTip");
const saveSettings = document.getElementById("saveSettings");


let selectedPercent =
    parseInt(localStorage.getItem("defaultTip")) || 20;


let selectedAmount = 0;

let updatingWheel = false;



// ------------------------------
// Settings Dropdown
// ------------------------------

for (let i = 0; i <= 50; i++) {

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


    for (let i = 0; i <= 50; i++) {

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

            if (updatingWheel) return;


            selectedPercent = i;

            selectedAmount =
                calculateAmountFromPercent(i);


            updateDollarWheelPosition();

            updateDisplay();

            highlight(percentWheel);

        };


        percentWheel.appendChild(item);

    }

}



// ------------------------------
// Build Dollar Wheel
// ------------------------------

function buildDollarWheel() {

    dollarWheel.innerHTML = "";


    for (let cents = 0; cents <= 5000; cents += 25) {


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

            if (updatingWheel) return;


            selectedAmount = amount;

            selectedPercent =
                calculatePercentFromAmount(amount);


            updatePercentWheelPosition();

            updateDisplay();

            highlight(dollarWheel);

        };



        dollarWheel.appendChild(item);

    }

}



// ------------------------------
// Calculations
// ------------------------------

function calculateAmountFromPercent(percent) {

    const bill =
        parseFloat(billInput.value) || 0;


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


    target.scrollIntoView({

        behavior:"smooth",

        inline:"center",

        block:"nearest"

    });


}



function updateDollarWheelPosition() {


    let closest = 0;

    let distance = Infinity;


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



    dollarWheel.children[closest]
        .scrollIntoView({

            behavior:"smooth",

            inline:"center",

            block:"nearest"

        });


}



// ------------------------------
// Display
// ------------------------------

function updateDisplay() {


    const tip =
        selectedAmount;


    const bill =
        parseFloat(billInput.value) || 0;



    tipValue.textContent =
        `$${tip.toFixed(2)}`;


    totalValue.textContent =
        `$${(bill + tip).toFixed(2)}`;


    updatePercentWheelValues();

    updateDollarWheelValues();

}



function highlight(wheel) {


    [...wheel.children].forEach(item =>
        item.classList.remove("selected")
    );



    let closest = 0;

    let distance = Infinity;


    const center =
        wheel.scrollLeft + wheel.offsetWidth / 2;



    [...wheel.children].forEach((item,index)=>{


        const itemCenter =
            item.offsetLeft + item.offsetWidth / 2;


        const difference =
            Math.abs(center - itemCenter);



        if (difference < distance) {

            distance = difference;

            closest = index;

        }

    });



    wheel.children[closest]
        .classList.add("selected");

}



// ------------------------------
// Wheel Scrolling
// ------------------------------

function watchWheel(wheel, callback) {


    let timer;


    wheel.addEventListener("scroll",()=>{


        clearTimeout(timer);



        timer=setTimeout(()=>{


            if (updatingWheel)
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
                wheel.children[closest]
            );


        },100);


    });


}



// ------------------------------
// Events
// ------------------------------

billInput.addEventListener("input",()=>{


    selectedAmount =
        calculateAmountFromPercent(
            selectedPercent
        );


    updateDisplay();


});

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



watchWheel(percentWheel,(item)=>{


    selectedPercent =
        parseInt(item.dataset.value);


    selectedAmount =
        calculateAmountFromPercent(
            selectedPercent
        );


    updateDollarWheelPosition();

    updateDisplay();

});



watchWheel(dollarWheel,(item)=>{


    selectedAmount =
        parseFloat(item.dataset.value);


    selectedPercent =
        calculatePercentFromAmount(
            selectedAmount
        );


    updatePercentWheelPosition();

    updateDisplay();

});




// ------------------------------
// Preferences
// ------------------------------

settingsButton.onclick = ()=>{

    defaultTipSelect.value =
        selectedPercent;

    settingsDialog.showModal();

};



saveSettings.onclick = ()=>{


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


    updateDollarWheelPosition();

    updateDisplay();


};



// ------------------------------
// Startup
// ------------------------------

buildPercentWheel();

buildDollarWheel();


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
