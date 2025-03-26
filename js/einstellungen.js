// Funktion zum Speichern der relevanten Schichten in LocalStorage
document.getElementById('schichtForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const schichtenInput = document.getElementById('schichtenInput').value;

    if (schichtenInput) {
        // Schichten in ein Array umwandeln und speichern
        let relevantShifts = JSON.parse(localStorage.getItem('relevantShifts')) || [];
        const newShifts = schichtenInput.split(',').map(shift => shift.trim());

        // Neue Schichten zu den bestehenden hinzufügen und doppelte vermeiden
        relevantShifts = [...new Set([...relevantShifts, ...newShifts])];

        // Speichere im LocalStorage
        localStorage.setItem('relevantShifts', JSON.stringify(relevantShifts));
        document.getElementById('schichtenInput').value = ''; // Input-Feld leeren
        renderSchichtenList(); // Liste aktualisieren
    }
});

// Funktion zum Laden und Anzeigen der relevanten Schichten
function renderSchichtenList() {
    const schichtenList = document.getElementById('schichtenList');
    const relevantShifts = JSON.parse(localStorage.getItem('relevantShifts')) || [];

    // Liste leeren
    schichtenList.innerHTML = '';

    // Schichten in die Liste einfügen
    relevantShifts.forEach((shift, index) => {
        const li = document.createElement('li');
        li.innerHTML = `${shift} <button onclick="removeShift(${index})">Löschen</button>`;
        schichtenList.appendChild(li);
    });
}

// Funktion zum Entfernen einer Schicht
function removeShift(index) {
    let relevantShifts = JSON.parse(localStorage.getItem('relevantShifts')) || [];
    relevantShifts.splice(index, 1); // Entferne die Schicht an der angegebenen Position

    // Aktualisiere LocalStorage und Liste
    localStorage.setItem('relevantShifts', JSON.stringify(relevantShifts));
    renderSchichtenList(); // Liste aktualisieren
}

// Funktion zum Laden der gespeicherten Schichten beim Laden der Seite
window.onload = function() {
    renderSchichtenList(); // Initiale Anzeige der Schichtenliste
};
