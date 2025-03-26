let relevantShifts = loadFromLocalStorage('relevantShifts') || [];
let days = [];
let hourlyData = [];

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        processExcel(e.dataTransfer.files[0]);
    }
});
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) processExcel(e.target.files[0]);
});

function saveToLocalStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}
function loadFromLocalStorage(key) {
    let value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
}

function processExcel(file) {
    let reader = new FileReader();
    reader.onload = function (e) {
        let data = new Uint8Array(e.target.result);
        let workbook = XLSX.read(data, { type: 'array' });
        let sheet = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });

        // Datum erkennen
        for (let i = 0; i < sheet.length; i++) {
            const possibleDays = sheet[i].slice(1, 8);
            if (isDateRow(possibleDays)) {
                days = possibleDays.map(cell => cell.trim());
                break;
            }
        }

        if (days.length !== 7) {
            alert("Datumszeile konnte nicht erkannt werden.");
            return;
        }

        let resultContainer = document.getElementById('resultContainer');
        resultContainer.innerHTML = '';

        hourlyData = [];
        for (let i = 1; i <= 7; i++) {
            hourlyData.push(analyzeDay(sheet, i));
        }

        saveToLocalStorage('workScheduleData', hourlyData);
        saveToLocalStorage('workScheduleDays', days);
        saveToLocalStorage('rawExcelData', sheet);

        displayResultsVertically(hourlyData, resultContainer);
        document.getElementById('exportPdf').style.display = 'block';
    };
    reader.readAsArrayBuffer(file);
}

function isDateRow(row) {
    return row.every(cell =>
        typeof cell === 'string' &&
        cell.trim().match(/^[A-ZÄÖÜa-zäöü]{2,3}\.? \d{2}\.\d{2}\.$/)
    );
}

function analyzeDay(rows, dayIndex) {
    let hours = new Array(24).fill(0);
    for (let i = 1; i < rows.length; i++) {
        let cols = rows[i];
        if (!cols || !cols[dayIndex]) continue;

        let shiftType = cols[dayIndex];
        if (relevantShifts.includes(shiftType)) {
            let shiftTime = rows[i - 1][dayIndex]?.trim() || '';
            if (shiftTime.includes('-')) {
                let [start, end] = shiftTime.split('-').map(t => parseInt(t.trim().split(':')[0]));
                if (end === 0) end = 24;
                for (let h = start; h < end; h++) hours[h]++;
            }
        }
    }
    return hours;
}

function displayResultsVertically(hourlyData, resultContainer) {
    let resultHTML = `<div id="dayFilter" class="day-filter"></div>`;
    resultHTML += `<table><thead><tr><th>Uhrzeit</th>`;
    days.forEach(day => resultHTML += `<th>${day}</th>`);
    resultHTML += `</tr></thead><tbody>`;

    for (let hour = 0; hour < 24; hour++) {
        resultHTML += `<tr><td>${hour}:00 - ${hour + 1}:00</td>`;
        hourlyData.forEach(dayHours => {
            resultHTML += `<td>${dayHours[hour]}</td>`;
        });
        resultHTML += `</tr>`;
    }

    resultHTML += `</tbody></table>`;
    resultContainer.innerHTML = resultHTML;
    createDayCheckboxes(); // ✅ Checkboxen aktualisieren
}

function loadSavedData() {
    let savedDays = loadFromLocalStorage('workScheduleDays');
    let savedHourlyData = loadFromLocalStorage('workScheduleData');
    if (savedDays && savedHourlyData) {
        days = savedDays;
        hourlyData = savedHourlyData;
        let resultContainer = document.getElementById('resultContainer');
        displayResultsVertically(hourlyData, resultContainer);
        document.getElementById('exportPdf').style.display = 'block';
    }
}

function exportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 10;

    doc.setFontSize(16);
    doc.text("MoD Schichtzeiten-Analyse", 10, y);
    y += 10;

    let headers = [["Uhrzeit"].concat(days)];
    let tableData = [];
    for (let hour = 0; hour < 24; hour++) {
        let row = [`${hour}:00 - ${hour + 1}:00`];
        hourlyData.forEach(dayHours => row.push(dayHours[hour]));
        tableData.push(row);
    }

    doc.autoTable({
        head: headers,
        body: tableData,
        startY: y,
        theme: 'grid',
        styles: { fontSize: 10 }
    });

    doc.save("schichtübersicht.pdf");
}

function createDayCheckboxes() {
    const container = document.getElementById('dayFilter');
    container.innerHTML = '';
    days.forEach((day, index) => {
        const label = document.createElement('label');
        label.style.marginRight = '10px';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = true;
        checkbox.dataset.dayIndex = index;
        checkbox.addEventListener('change', () => {
            toggleDayColumn(index, checkbox.checked);
        });
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(" " + day));
        container.appendChild(label);
    });
}

function toggleDayColumn(dayIndex, visible) {
    const table = document.querySelector('#resultContainer table');
    if (!table) return;

    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td, th');
        if (cells.length > dayIndex + 1) {
            cells[dayIndex + 1].style.display = visible ? '' : 'none';
        }
    });
}

window.onload = loadSavedData;
