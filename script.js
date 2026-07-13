const billInput = document.getElementById("billAmount");
const wheel = document.getElementById("tipWheel");

const tipValue = document.getElementById("tipValue");
const totalValue = document.getElementById("totalValue");

const settingsButton = document.getElementById("settingsButton");
const settingsDialog = document.getElementById("settingsDialog");
const defaultTipSelect = document.getElementById("defaultTip");
const saveSettings = document.getElementById("saveSettings");

let selectedTip = parseInt(localStorage.getItem("defaultTip")) || 20;


// ------------------------------
// Build Settings List
// ------------------------------

for (let i = 0; i <= 50; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = `${i}%`;
    if (i === selectedTip) option.selected = true;
    defaultTipSelect.appendChild(option);
}


// ------------------------------
// Build Tip Wheel
// ------------------------------

function buildWheel() {

    wheel.innerHTML = "";

    const bill = parseFloat(billInput.value) || 0;

    for (let i = 0; i <= 50; i++) {

        const item = document.createElement("div");
        item.className = "tipItem";
        item.dataset.tip = i;

        item.innerHTML = `
            <div class="tipPercent">${i}%</div>
            <div class="tipDollar">$${(bill * i / 100).toFixed(2)}</div>
        `;

        item.onclick = () => {
            selectedTip = i;
            highlightSelection();
            calculate();
            item.scrollIntoView({
                behavior: "smooth",
                inline: "center",
                block: "nearest"
            });
        };

        wheel.appendChild(item);
    }

    highlightSelection();

    requestAnimationFrame(() => {
        wheel.children[selectedTip].scrollIntoView({
            behavior: "instant",
            inline: "center",
            block: "nearest"
        });
    });

}

buildWheel();


// ------------------------------
// Highlight
// ------------------------------

function highlightSelection() {

    [...wheel.children].forEach(child =>
        child.classList.remove("selected")
    );

    wheel.children[selectedTip].classList.add("selected");
}


// ------------------------------
// Calculate
// ------------------------------

function calculate() {

    const bill = parseFloat(billInput.value) || 0;

    const tip = bill * selectedTip / 100;

    tipValue.textContent = `$${tip.toFixed(2)}`;
    totalValue.textContent = `$${(bill + tip).toFixed(2)}`;

    [...wheel.children].forEach(item => {

        const pct = parseInt(item.dataset.tip);

        item.querySelector(".tipDollar").textContent =
            `$${(bill * pct / 100).toFixed(2)}`;

    });

}


// ------------------------------
// Wheel Scrolling
// ------------------------------

let scrollTimer;

wheel.addEventListener("scroll", () => {

    clearTimeout(scrollTimer);

    scrollTimer = setTimeout(() => {

        const center =
            wheel.scrollLeft + wheel.offsetWidth / 2;

        let nearest = 0;
        let distance = Infinity;

        [...wheel.children].forEach((item, index) => {

            const itemCenter =
                item.offsetLeft + item.offsetWidth / 2;

            const d = Math.abs(center - itemCenter);

            if (d < distance) {
                distance = d;
                nearest = index;
            }

        });

        selectedTip = nearest;

        highlightSelection();
        calculate();

    }, 75);

});


// ------------------------------
// Bill Changed
// ------------------------------

billInput.addEventListener("input", calculate);


// ------------------------------
// Settings
// ------------------------------

settingsButton.onclick = () => {

    defaultTipSelect.value = selectedTip;
    settingsDialog.showModal();

};

saveSettings.onclick = () => {

    selectedTip = parseInt(defaultTipSelect.value);

    localStorage.setItem("defaultTip", selectedTip);

    highlightSelection();
    calculate();

    wheel.children[selectedTip].scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest"
    });

};

calculate();

billInput.focus();
