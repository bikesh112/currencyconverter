document.addEventListener('DOMContentLoaded', function() {
    fetch('/api/get-options/')
        .then(response => response.json())
        .then(data => {
            const tickerSelect = document.getElementById('ticker');
            data.tickers.forEach(ticker => {
                const option = document.createElement('option');
                option.value = ticker;
                option.textContent = ticker;
                tickerSelect.appendChild(option);
            });

            const intervalSelect = document.getElementById('interval');
            for (const [key, value] of Object.entries(data.intervals)) {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = key;
                intervalSelect.appendChild(option);
            }
        })
        .catch(error => console.error('Error fetching options:', error));
});

let chartInstance = null;

document.getElementById('rates-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const ticker = document.getElementById('ticker').value;
    const interval = document.getElementById('interval').value;
    const no_of_rows = document.getElementById('no_of_rows').value;

    fetch('/api/get-rates/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({
            ticker: ticker,
            interval: interval,
            no_of_rows: no_of_rows
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('API Response:', data); // Log the API response

        const historicalLabels = data.historical.map(rate => new Date(rate[0] * 1000));
        const historicalValues = data.historical.map(rate => rate[1]);

        const predictedLabels = data.predicted.map(rate => new Date(rate[0] * 1000));
        const predictedValues = data.predicted.map(rate => rate[1]);

        // Include the last historical label and value in the predicted data
        if (historicalLabels.length > 0 && historicalValues.length > 0) {
            predictedLabels.unshift(historicalLabels[historicalLabels.length - 1]);
            predictedValues.unshift(historicalValues[historicalValues.length - 1]);
        }

        const ctx = document.getElementById('ratesChart').getContext('2d');

        if (chartInstance) {
            chartInstance.destroy();
        }

        const timeUnit = getTimeUnit(interval);

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [...historicalLabels, ...predictedLabels],
                datasets: [
                    {
                        label: 'Historical Prices',
                        data: historicalValues,
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Predicted Prices',
                        data: new Array(historicalValues.length).fill(null).concat(predictedValues),
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1,
                        borderDash: [5, 5]
                    }
                ]
            },
            options: {
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: timeUnit,
                            tooltipFormat: 'll HH:mm',
                            displayFormats: {
                                minute: 'HH:mm',
                                hour: 'HH:mm',
                                day: 'MMM D',
                                week: 'MMM D',
                                month: 'MMM YYYY'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Price'
                        },
                        beginAtZero: false // Adjust this based on your data range
                    }
                }
            }
        });
    })
    .catch(error => console.error('Error:', error));
});

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function getTimeUnit(interval) {
    switch (interval) {
        case '1':
            return 'minute';
        case '5':
            return 'minute';
        case '15':
            return 'minute';
        case '30':
            return 'minute';
        case '60':
            return 'hour';
        case '240':
            return 'hour';
        case '1440':
            return 'day';
        case '10080':
            return 'week';
        case '43200':
            return 'month';
        default:
            return 'minute'; // Default to minute if interval is not recognized
    }
}
