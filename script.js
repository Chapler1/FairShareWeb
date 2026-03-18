function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name) {
  return document.cookie.split("; ").reduce((result, c) => {
    const [k, v] = c.split("=");
    return k === name ? decodeURIComponent(v) : result;
  }, null);
}

// Load saved names from cookie, reset amounts to 0
let saved = JSON.parse(getCookie("fairshare") || "[]");
let people = saved.map((p) => ({ name: p.name, amount: 0 }));

// Initial render
renderList();

// Render the list of people with input fields
function renderList() {
  const list = document.getElementById("people-list");
  list.innerHTML = "";

  people.forEach((p, i) => {
    const initial = p.name.charAt(0).toUpperCase();
    list.innerHTML += `
      <div class="person-row">
        <div class="avatar">${initial}</div>
        <span class="person-name">${p.name}</span>
        <input type="text"
               class="amount-input"
               value="${p.amount ? formatCurrencyValue(p.amount) : ""}"
               onfocus="clearInput(this)"
               onblur="updateAmount(${i}, this.value); formatCurrency(this)"
               placeholder="$0.00">
        <button class="remove-btn" onclick="removePerson(${i})">×</button>
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
let copyText = "";

function calculate() {
  let results = calculateBills(people);
  const resultsDiv = document.getElementById("results");
  const content = document.getElementById("results-content");

  content.innerHTML = results.length
    ? results.map((r) => formatResult(r)).join("")
    : "<p class='balanced-msg'>Everyone's square! 🎉</p>";

  resultsDiv.classList.add("visible");

  const paidLines = people
    .filter((p) => p.amount > 0)
    .map((p) => `${p.name}: ${formatCurrencyValue(p.amount)}`)
    .join("\n");

  const settlementLines = results.join("\n");

  copyText = paidLines
    ? `Paid:\n${paidLines}\n\nSettlements:\n${settlementLines || "Everyone's square!"}`
    : `Settlements:\n${settlementLines || "Everyone's square!"}`;
}

function copyResults() {
  if (!copyText) return;
  navigator.clipboard.writeText(copyText).then(() => {
    const btn = document.getElementById("copy-btn");
    btn.textContent = "Copied!";
    btn.classList.add("copied");
    setTimeout(() => {
      btn.textContent = "Copy";
      btn.classList.remove("copied");
    }, 2000);
  });
}

function formatResult(text) {
  let parts = text.split(" pays ");
  if (parts.length === 2) {
    let payer = parts[0].trim();
    let [receiver, amount] = parts[1].split(/ (?=\$)/);

    return `
      <div class="result-row">
        <span class="result-name payer">${payer}</span>
        <div class="result-arrow"></div>
        <span class="result-name receiver">${receiver}</span>
        <span class="amount-badge">${amount}</span>
      </div>`;
  }
  return "";
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

// Save names to cookie, leaving amounts blank
function saveNamesOnly() {
  setCookie("fairshare", JSON.stringify(people.map((p) => ({ name: p.name }))), 365);
}
