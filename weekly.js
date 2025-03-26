window.onload = function() {
    loadWeeklyChart();  // Wochendiagramm laden
};

// Funktion zum Laden der Wochendaten und Erstellen des Liniendiagramms
function loadWeeklyChart() {
    let savedDays = loadFromLocalStorage('workScheduleDays');  // Lade die Tage aus dem LocalStorage
    let savedHourlyData = loadFromLocalStorage('workScheduleData');  // Lade die Arbeitsstunden-Daten aus dem LocalStorage

    if (savedDays && savedHourlyData) {
        // Bereite die Daten für das Liniendiagramm vor
        createWeeklyLineChart(savedDays, savedHourlyData);  // Liniendiagramm für die Woche erstellen
    } else {
        alert('Keine Arbeitsstunden-Daten gefunden. Bitte lade zuerst die Excel-Datei auf der Tabellen-Seite hoch.');
        console.error("Keine Arbeitsstunden-Daten im LocalStorage gefunden");
    }
}

// Funktion zum Erstellen eines verbesserten Liniendiagramms
function createWeeklyLineChart(days, hourlyData) {
    const ctx = document.getElementById('weeklyChart').getContext('2d');

    // Bereite die Datenreihen für jeden Tag vor
    let datasets = [];
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF']; // Feste Farben für jeden Tag

    days.forEach((day, index) => {
        datasets.push({
            label: day,  // Der Name des Tages wird als Label verwendet
            data: hourlyData[index],  // Daten für den entsprechenden Tag
            fill: false,  // Keine Füllung unter der Linie
            borderColor: colors[index],  // Feste Farbe aus dem Array
            backgroundColor: colors[index],  // Punktfarbe
            pointBackgroundColor: colors[index],  // Farbe der Punkte
            pointBorderColor: '#fff',  // Farbe des Randes der Punkte
            pointRadius: 5,  // Größe der Punkte
            pointHoverRadius: 7,  // Größe beim Hover über den Punkt
            borderWidth: 2,  // Dicke der Linie
            tension: 0.3,  // Leichte Kurve in der Linie
        });
    });

    // Erstelle das Liniendiagramm mit den neuen Optionen
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['0-1', '1-2', '2-3', '3-4', '4-5', '5-6', '6-7', '7-8', '8-9', '9-10', '10-11', '11-12', '12-13', '13-14', '14-15', '15-16', '16-17', '17-18', '18-19', '19-20', '20-21', '21-22', '22-23', '23-24'],  // Zeitperioden
            datasets: datasets  // Datenreihen für jeden Tag der Woche
        },
        options: {
            responsive: true,  // Sorgt dafür, dass das Diagramm auf allen Bildschirmgrößen funktioniert
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: '#333',  // Farbe der Legende
                        font: {
                            size: 14,
                        },
                    },
                    position: 'top',  // Position der Legende oben
                    padding: 20  // Abstand der Legende vom Rand
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${days[context.datasetIndex]}: ${context.raw} Fahrer`;  // Der jeweilige Tag und die Mitarbeiterzahl im Tooltip
                        },
                    },
                    backgroundColor: '#333',  // Hintergrundfarbe des Tooltips
                    titleColor: '#fff',  // Textfarbe des Titels
                    bodyColor: '#fff',  // Textfarbe des Tooltip-Körpers
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(200, 200, 200, 0.2)',  // Anpassung der Gitterlinien
                    },
                    title: {
                        display: true,
                        text: 'Anzahl der Fahrer',
                        color: '#333',
                        font: {
                            size: 14,
                        },
                    },
                },
                x: {
                    grid: {
                        display: false,  // Entferne die Gitterlinien der X-Achse
                    },
                    title: {
                        display: true,
                        text: 'Uhrzeit',
                        color: '#333',
                        font: {
                            size: 14,
                        },
                    },
                    ticks: {
                        padding: 10  // Abstand der X-Achsen-Beschriftungen vom Rand
                    }
                },
            },
            layout: {
                padding: {
                    left: 20,  // Abstand auf der linken Seite
                    right: 20,  // Abstand auf der rechten Seite
                    top: 20,  // Abstand oben
                    bottom: 20  // Abstand unten
                }
            }
        },
    });
}

// Funktion zum Laden der Daten aus dem LocalStorage
function loadFromLocalStorage(key) {
    let value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
}
