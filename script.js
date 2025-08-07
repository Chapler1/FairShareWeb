// Load saved names from localStorage, reset amounts to 0
let saved = JSON.parse(localStorage.getItem("fairshare") || "[]");
let people = saved.map((p) => ({ name: p.name, amount: 0 }));

// Initial render
renderList();

// Render the list of people with input fields
function renderList() {
  const list = document.getElementById("people-list");
  list.innerHTML = "";

  people.forEach((p, i) => {
    list.innerHTML += `
      <div class="flex items-center bg-purple-700/70 backdrop-blur-sm px-3 py-2 rounded-lg shadow">
        <span class="font-bold text-lg w-44 truncate">${p.name}</span>
        <input type="text" 
               value="${p.amount ? formatCurrencyValue(p.amount) : ""}" 
               onfocus="clearInput(this)" 
               onblur="updateAmount(${i}, this.value); formatCurrency(this)" 
               class="bg-transparent border-b-2 border-white text-right flex-shrink-0 w-28 h-8 leading-8 focus:outline-none focus:border-blue-300 placeholder-gray-400 ml-auto"
               placeholder="$0.00">
        <button onclick="removePerson(${i})" 
                class="text-red-300 hover:text-red-500 font-bold text-xl ml-3 flex-shrink-0">×</button>
      </div>`;
  });
}

// Add a person to the list
function addPerson() {
  const name = document.getElementById("nameInput").value.trim();
  if (name) {
    people.push({ name, amount: 0 });
    saveNamesOnly();
    renderList();
    document.getElementById("nameInput").value = "";
  }
}

// Remove a person by index
function removePerson(i) {
  people.splice(i, 1);
  saveNamesOnly();
  renderList();
}

// Clear input value on focus
function clearInput(input) {
  input.value = "";
}

// Remove formatting from currency string
function unformatCurrency(input) {
  input.value = input.value.replace(/[^0-9.-]/g, "");
}

// Format input value as currency
function formatCurrency(input) {
  let value = parseFloat(input.value.replace(/[^0-9.-]/g, ""));
  input.value = !isNaN(value)
    ? value.toLocaleString("en-US", { style: "currency", currency: "USD" })
    : "$0.00";
}

// Format numeric value as currency (used for rendering)
function formatCurrencyValue(value) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

// Update person's amount when input loses focus
function updateAmount(i, value) {
  let num = parseFloat(value.replace(/[^0-9.-]/g, "")) || 0;
  people[i].amount = num;
}

// Calculate payments and display results
function calculate() {
  let results = calculateBills(people);
  const resultsDiv = document.getElementById("results");

  resultsDiv.innerHTML = results.length
    ? results.map((r) => formatResult(r)).join("")
    : "<p class='text-gray-200'>All expenses are balanced.</p>";

  resultsDiv.classList.remove("hidden");
}

function formatResult(text) {
  let parts = text.split(" pays ");
  if (parts.length === 2) {
    let payer = parts[0].trim();
    let [receiver, amount] = parts[1].split(/ (?=\$)/);

    return `
      <div class="grid grid-cols-[33%_13%_33%_21%] gap-2 w-[calc(100%-32px)] text-white items-center border-b border-white/20 pb-2 mb-2 last:border-b-0 last:pb-0 last:mb-0">        
        <div class="py-1 text-left text-sm font-semibold truncate">${payer}</div>
        <div class="py-1 text-left text-sm">pays</div>
        <div class="py-1 text-left text-sm font-semibold truncate">${receiver}</div>
        <div class="py-1 text-right text-normal font-semibold whitespace-nowrap">${amount}</div>
      </div>`;
  }
    return '';
}

// Bill-splitting algorithm
function calculateBills(people) {
  const total = people.reduce((sum, p) => sum + p.amount, 0);
  const perPerson = total / people.length;

  let debtors = [],
    creditors = [],
    results = [];

  // Separate debtors and creditors
  people.forEach((p) => {
    let balance = perPerson - p.amount;
    if (balance > 0) debtors.push({ name: p.name, amount: balance });
    else if (balance < 0) creditors.push({ name: p.name, amount: -balance });
  });

  // Match debtors to creditors in least amount of transactions possible
  debtors.forEach((d) => {
    while (d.amount > 0 && creditors.length > 0) {
      let c = creditors[0];
      let payment = Math.min(d.amount, c.amount);
      results.push(
        `${d.name} pays ${c.name} ${payment.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
        })}`
      );
      d.amount -= payment;
      c.amount -= payment;
      if (c.amount <= 0) creditors.shift();
    }
  });

  return results;
}

// Save names to localStorage, leaving amounts blank
function saveNamesOnly() {
  localStorage.setItem(
    "fairshare",
    JSON.stringify(people.map((p) => ({ name: p.name })))
  );
}
