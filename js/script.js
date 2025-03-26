// Lade die relevanten Schichten aus LocalStorage oder setze eine leere Liste als Standardwert
let relevantShifts = loadFromLocalStorage('relevantShifts') || [];

// Funktion zum Speichern der relevanten Schichten in LocalStorage
function saveRelevantShifts(shifts) {
    saveToLocalStorage('relevantShifts', shifts);
}

let days = [];  // Hier werden die tatsächlichen Tage (Datum) aus der Excel-Datei gespeichert
let hourlyData = [];  // Hier werden die stündlichen Mitarbeiterdaten gespeichert

// Drag-and-Drop-Events für die Datei
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('dragover');
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        processExcel(files[0]); // Verarbeite die Datei
    }
});

dropZone.addEventListener('click', () => {
    fileInput.click();  // Öffne den Dateiauswahl-Dialog
});

fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        processExcel(file);  // Verarbeite die ausgewählte Datei
    }
});

// Speichere die Daten in LocalStorage
function saveToLocalStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

// Funktion zum Laden von Daten aus dem LocalStorage
function loadFromLocalStorage(key) {
    let value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
}

// Excel-Datei verarbeiten und die Schichtdaten analysieren
function processExcel(file) {
    let reader = new FileReader();
    reader.onload = function (e) {
        let data = new Uint8Array(e.target.result);
        let workbook = XLSX.read(data, { type: 'array' });

        let sheetName = workbook.SheetNames[0];
        let worksheet = workbook.Sheets[sheetName];

        let jsonSheet = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Finde die Zeile, die die Datumseinträge enthält
        for (let i = 0; i < jsonSheet.length; i++) {
            const potentialDays = jsonSheet[i].slice(1, 8); // Prüfe die Spalten B bis H
            if (isDateRow(potentialDays)) {
                days = potentialDays;
                break; // Beende die Schleife, wenn die Zeile mit Datum gefunden wurde
            }
        }

        let resultContainer = document.getElementById('resultContainer');
        resultContainer.innerHTML = ''; 

        hourlyData = [];
        for (let dayIndex = 1; dayIndex <= 7; dayIndex++) {
            hourlyData.push(analyzeDay(jsonSheet, dayIndex)); // Berechne die Mitarbeiterstunden für jeden Tag
        }

        // Speichere die Schichtdaten in LocalStorage
        saveToLocalStorage('workScheduleData', hourlyData);
        saveToLocalStorage('workScheduleDays', days);

        // Speichere auch die Rohdaten der Excel-Datei im LocalStorage
        saveToLocalStorage('rawExcelData', jsonSheet);

        displayResultsVertically(hourlyData, resultContainer); // Zeige die Ergebnisse in einer Tabelle an
        document.getElementById('exportPdf').style.display = 'block'; // Zeige den PDF-Export-Button an
    };

    reader.readAsArrayBuffer(file); // Lese die Datei als ArrayBuffer
}

// Prüft, ob eine Zeile wahrscheinlich Datumseinträge enthält
function isDateRow(row) {
    return row.every(cell =>
        typeof cell === 'string' &&
        cell.match(/^[A-ZÄÖÜa-zäöü]{2,3}\.? \d{2}\.\d{2}\.$/)
    );
}


// Arbeitsstunden analysieren und zählen
function analyzeDay(rows, dayIndex) {
    let hours = new Array(24).fill(0); // Array für 24 Stunden (0 bis 23)
    for (let i = 1; i < rows.length; i++) {
        let cols = rows[i];
        if (!cols || !cols[dayIndex]) continue; // Überspringe leere Zeilen

        let shiftType = cols[dayIndex];
        if (relevantShifts.includes(shiftType)) { // Überprüfen, ob die Schicht relevant ist
            let shiftTime = rows[i - 1][dayIndex] ? rows[i - 1][dayIndex].trim() : ''; // Hol die Schichtzeit
            if (shiftTime.includes('-')) {
                let times = shiftTime.split('-');
                let startHour = parseInt(times[0].trim().split(':')[0]);
                let endHour = parseInt(times[1].trim().split(':')[0]);
                if (endHour === 0) endHour = 24;  // Behandle 00:00 als Mitternacht

                // Zähle die Stunden, in denen Mitarbeiter arbeiten
                for (let hour = startHour; hour < endHour; hour++) {
                    hours[hour]++;
                }
            }
        }
    }
    return hours;
}

// Ergebnisse in der Tabelle anzeigen
function displayResultsVertically(hourlyData, resultContainer) {
    let resultHTML = `<table><thead><tr><th>Uhrzeit</th>`;
    
    // Füge die tatsächlichen Tage als Spaltenüberschriften hinzu
    days.forEach(day => {
        resultHTML += `<th>${day}</th>`;
    });
    resultHTML += `</tr></thead><tbody>`;

    // Füge die Stunden (0 bis 23) als Zeilen hinzu
    for (let hour = 0; hour < 24; hour++) {
        resultHTML += `<tr><td>${hour}:00 - ${hour + 1}:00</td>`;
        hourlyData.forEach(dayHours => {
            resultHTML += `<td>${dayHours[hour]}</td>`;
        });
        resultHTML += `</tr>`;
    }

    resultHTML += `</tbody></table>`;
    resultContainer.innerHTML = resultHTML;
}

// Funktion zum Laden der Daten und Anzeige nach dem Seitenladen
function loadSavedData() {
    let savedDays = loadFromLocalStorage('workScheduleDays');
    let savedHourlyData = loadFromLocalStorage('workScheduleData');

    if (savedDays && savedHourlyData) {
        days = savedDays;
        hourlyData = savedHourlyData;
        let resultContainer = document.getElementById('resultContainer');
        displayResultsVertically(hourlyData, resultContainer);
        document.getElementById('exportPdf').style.display = 'block';
    } else {
        console.log('Keine gespeicherten Daten gefunden.');
    }
}

// PDF-Export-Funktion
function exportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let x = 10, y = 10;

    // Titel des PDFs
    doc.setFontSize(16);
    doc.text("MoD Schichtzeiten-Analyse", x, y);
    y += 10;

    // Daten für die Tabelle erstellen
    let tableData = [];
    for (let hour = 0; hour < 24; hour++) {
        let row = [`${hour}:00 - ${hour + 1}:00`];
        hourlyData.forEach(dayHours => {
            row.push(dayHours[hour]);
        });
        tableData.push(row);
    }

    let headers = [["Uhrzeit"].concat(days)];

    doc.autoTable({
        head: headers,
        body: tableData,
        startY: y,
        theme: 'grid',
        styles: { fontSize: 10 }
    });

    doc.save("schichtübersicht.pdf");
}

// Lade gespeicherte Daten beim Start
window.onload = function() {
    loadSavedData();
};
