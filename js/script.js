let relevantShifts = loadFromLocalStorage('relevantShifts') || [];
let days = [];
let hourlyData = [];
let rufData = [];

function saveToLocalStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}
function loadFromLocalStorage(key) {
    let value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
}

function initDropZone(dropZoneId, inputId, callback) {
    const dropZone = document.getElementById(dropZoneId);
    const input = document.getElementById(inputId);

    dropZone.addEventListener('click', () => input.click());
    dropZone.addEventListener('dragover', e => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) callback(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', e => {
        if (input.files.length > 0) callback(input.files[0]);
    });
}

function isDateRow(row) {
    return row.every(cell =>
        typeof cell === 'string' &&
        cell.trim().match(/^[A-ZÄÖÜa-zäöü]{2,3}\.? \d{2}\.\d{2}\.$/)
    );
}

function analyzeDay(rows, dayIndex, typeFilter) {
    let hours = new Array(24).fill(0);
    for (let i = 1; i < rows.length; i++) {
        let cols = rows[i];
        if (!cols || !cols[dayIndex]) continue;
        let shiftType = cols[dayIndex];
        if (typeFilter(shiftType)) {
            let time = rows[i - 1][dayIndex]?.trim() || '';
            if (time.includes('-')) {
                let [start, end] = time.split('-').map(t => parseInt(t.trim().split(':')[0]));
                if (end === 0) end = 24;
                for (let h = start; h < end; h++) hours[h]++;
            }
        }
    }
    return hours;
}

function displayResultsVertically(hourlyData, resultContainer) {
    let ruf = loadFromLocalStorage('rufData') || [];
    let html = `<div id="dayFilter" class="day-filter"></div><table><thead><tr><th>Uhrzeit</th>`;
    days.forEach(day => html += `<th>${day}</th>`);
    html += `</tr></thead><tbody>`;

    for (let hour = 0; hour < 24; hour++) {
        html += `<tr><td>${hour}:00 - ${hour + 1}:00</td>`;
        hourlyData.forEach((dayHours, idx) => {
            const regular = dayHours[hour];
            const rufCount = ruf[idx]?.[hour] || 0;
            html += `<td>${regular}${rufCount > 0 ? ` <span class="ruf-klein">(${rufCount})</span>` : ''}</td>`;
        });
        html += `</tr>`;
    }
    html += `</tbody></table>`;
    resultContainer.innerHTML = html;
    createDayCheckboxes();
}

function createDayCheckboxes() {
    const container = document.getElementById('dayFilter');
    container.innerHTML = '';
    days.forEach((day, i) => {
        const label = document.createElement('label');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = true;
        cb.dataset.dayIndex = i;
        cb.addEventListener('change', () => toggleDayColumn(i, cb.checked));
        label.appendChild(cb);
        label.appendChild(document.createTextNode(' ' + day));
        container.appendChild(label);
    });
}

function toggleDayColumn(dayIndex, visible) {
    document.querySelectorAll('#resultContainer table tr').forEach(row => {
        const cells = row.querySelectorAll('td, th');
        if (cells.length > dayIndex + 1) {
            cells[dayIndex + 1].style.display = visible ? '' : 'none';
        }
    });
}

function processExcel(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });

        for (let i = 0; i < data.length; i++) {
            const possible = data[i].slice(1, 8);
            if (isDateRow(possible)) {
                days = possible.map(cell => cell.trim());
                break;
            }
        }
        if (days.length !== 7) return alert("Datumszeile nicht erkannt.");

        const resultContainer = document.getElementById('resultContainer');
        hourlyData = [];
        for (let i = 1; i <= 7; i++) {
            hourlyData.push(analyzeDay(data, i, shift => relevantShifts.includes(shift)));
        }
        saveToLocalStorage('workScheduleData', hourlyData);
        saveToLocalStorage('workScheduleDays', days);
        saveToLocalStorage('rawExcelData', data);
        displayResultsVertically(hourlyData, resultContainer);
        document.getElementById('exportPdf').style.display = 'block';
    };
    reader.readAsArrayBuffer(file);
}

function processRufExcel(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });

        rufData = [];
        for (let i = 1; i <= 7; i++) {
            rufData.push(analyzeDay(data, i, shift => shift.includes('Rufbereitschaft')));
        }
        saveToLocalStorage('rufData', rufData);

        if (hourlyData.length > 0) {
            const resultContainer = document.getElementById('resultContainer');
            displayResultsVertically(hourlyData, resultContainer);
        }
    };
    reader.readAsArrayBuffer(file);
}

function loadSavedData() {
    days = loadFromLocalStorage('workScheduleDays') || [];
    hourlyData = loadFromLocalStorage('workScheduleData') || [];
    if (days.length && hourlyData.length) {
        const resultContainer = document.getElementById('resultContainer');
        displayResultsVertically(hourlyData, resultContainer);
        document.getElementById('exportPdf').style.display = 'block';
    }
}

function exportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("MoD Schichtzeiten-Analyse", 10, 10);
    let tableData = [];
    for (let h = 0; h < 24; h++) {
        let row = [`${h}:00 - ${h + 1}:00`];
        hourlyData.forEach((d, i) => {
            const r = loadFromLocalStorage('rufData')?.[i]?.[h] || 0;
            row.push(`${d[h]}${r > 0 ? `(${r})` : ''}`);
        });
        tableData.push(row);
    }
    doc.autoTable({
        head: [["Uhrzeit"].concat(days)],
        body: tableData,
        startY: 20,
        theme: 'grid',
        styles: { fontSize: 10 }
    });
    doc.save("schichtuebersicht.pdf");
}

initDropZone("mainDropZone", "fileInput", processExcel);
initDropZone("rufDropZone", "rufFileInput", processRufExcel);
window.onload = loadSavedData;
