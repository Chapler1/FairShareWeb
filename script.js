// Load saved names but reset amounts to 0 on page load
let saved = JSON.parse(localStorage.getItem("fairshare") || "[]");
let people = saved.map(p => ({ name: p.name, amount: 0 }));

renderList();

function renderList() {
    const list = document.getElementById("people-list");
    list.innerHTML = "";
    people.forEach((p, i) => {
        list.innerHTML += `
        <div class="flex items-center bg-purple-700/70 backdrop-blur-sm px-3 py-2 rounded-lg shadow">
          <span class="font-bold text-lg w-44 truncate">${p.name}</span>
          <input type="text" 
                 value="${p.amount ? formatCurrencyValue(p.amount) : ''}" 
                 onfocus="clearInput(this)" 
                 onblur="updateAmount(${i}, this.value); formatCurrency(this)" 
                 class="bg-transparent border-b-2 border-white text-right flex-shrink-0 w-28 h-8 leading-8 focus:outline-none focus:border-blue-300 placeholder-gray-400 ml-auto"
                 placeholder="$0.00">
          <button onclick="removePerson(${i})" 
                  class="text-red-300 hover:text-red-500 font-bold text-xl ml-3 flex-shrink-0">×</button>
        </div>`;
    });
}

function addPerson() {
    const name = document.getElementById("nameInput").value.trim();
    if (name) {
        people.push({ name, amount: 0 });
        saveNamesOnly();
        renderList();
        document.getElementById("nameInput").value = "";
    }
}

function removePerson(i) {
    people.splice(i, 1);
    saveNamesOnly();
    renderList();
}

function clearInput(input) {
    input.value = "";
}

function unformatCurrency(input) {
    input.value = input.value.replace(/[^0-9.-]/g, "");
}

function formatCurrency(input) {
    let value = parseFloat(input.value.replace(/[^0-9.-]/g, ""));
    if (!isNaN(value)) {
        input.value = value.toLocaleString("en-US", { 
            style: "currency", 
            currency: "USD" 
        });
    } else {
        input.value = "$0.00";
    }
}

function formatCurrencyValue(value) {
    return value.toLocaleString("en-US", { 
        style: "currency", 
        currency: "USD" 
    });
}

function updateAmount(i, value) {
    let num = parseFloat(value.replace(/[^0-9.-]/g, "")) || 0;
    people[i].amount = num;
}

function calculate() {
    let results = calculateBills(people);
    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = results.length 
        ? results.map(r => formatResult(r)).join("") 
        : "<p class='text-gray-200'>All expenses are balanced.</p>";
    resultsDiv.classList.remove("hidden");
}

function formatResult(text) {
    // Split only on the first occurrence of " pays "
    let parts = text.split(" pays ");
    if (parts.length === 2) {
        let payer = parts[0];
        let [receiver, amount] = parts[1].split(/ (?=\$)/); 
        return `<p class="text-white font-medium">
                  <span class="font-bold">${payer}</span> pays 
                  <span class="font-bold">${receiver}</span> 
                  <span class="font-bold">${amount}</span>
                </p>`;
    }
    return `<p class="text-white">${text}</p>`;
}


function calculateBills(people) {
    const total = people.reduce((sum, p) => sum + p.amount, 0);
    const perPerson = total / people.length;
    let debtors = [], creditors = [], results = [];

    people.forEach(p => {
        let balance = perPerson - p.amount;
        if (balance > 0) debtors.push({ name: p.name, amount: balance });
        else if (balance < 0) creditors.push({ name: p.name, amount: -balance });
    });

    debtors.forEach(d => {
        while (d.amount > 0 && creditors.length > 0) {
            let c = creditors[0];
            let payment = Math.min(d.amount, c.amount);
            results.push(`${d.name} pays ${c.name} ${payment.toLocaleString("en-US",{style:"currency",currency:"USD"})}`);
            d.amount -= payment;
            c.amount -= payment;
            if (c.amount <= 0) creditors.shift();
        }
    });
    return results;
}

// Save only names for persistence (no amounts)
function saveNamesOnly() {
    localStorage.setItem("fairshare", JSON.stringify(people.map(p => ({ name: p.name }))));
}

