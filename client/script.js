document.getElementById("date-select").value = new Date()
  .toISOString()
  .split("T")[0];

let chartInstance = null;
let updateInterval = null;

const timeZoneOffset = new Date().getTimezoneOffset() * 60 * 1000;

async function fetchGarages() {
  const response = await fetch("/api/garages");
  const garages = await response.json();
  const select = document.getElementById("garage-select");

  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = "Wählen Sie eine Parkgarage";
  emptyOption.disabled = true;
  emptyOption.selected = true;
  select.appendChild(emptyOption);

  garages.forEach((garage) => {
    const option = document.createElement("option");
    option.value = garage.id;
    option.textContent = garage.name;
    select.appendChild(option);
  });

  const hash = window.location.hash.substring(1);
  if (hash && garages.find((garage) => garage.id === Number(hash))) {
    select.value = hash;
    updateChart();
  }
}

async function fetchData(id, date, offset = 0) {
  const end = new Date(date).getTime() + timeZoneOffset - offset + 24 * 60 * 60 * 1000;
  const start = new Date(end - 24 * 60 * 60 * 1000).getTime();
  const response = await fetch(`/api/data/${id}?start=${start}&end=${end}`);
  const { data } = await response.json();
  return data;
}

function cleanData(data) {
  return data.filter((entry, index, array) => {
    if (entry.free_capacity !== null) {
      return true;
    }
    const prev = array[index - 1];
    const next = array[index + 1];
    return !(
      prev &&
      next &&
      prev.free_capacity !== null &&
      next.free_capacity !== null
    );
  });
}

function renderChart(data, comparisonData = {}) {
  data = cleanData(data);
  if (comparisonData.yesterday) {
    comparisonData.yesterday = cleanData(comparisonData.yesterday);
  }
  if (comparisonData.lastWeek) {
    comparisonData.lastWeek = cleanData(comparisonData.lastWeek);
  }

  const ctx = document.getElementById("parking-chart").getContext("2d");
  const labels = data.map((entry) => entry.updated_at);
  const values = data.map((entry) => entry.free_capacity);
  const datasets = [
    {
      label: "Verfügbare Plätze",
      data: values,
      borderColor: "rgba(75, 192, 192, 1)",
      borderWidth: 3, // Increase line thickness
      pointRadius: 0, // Remove dots
    },
  ];

  if (comparisonData.yesterday) {
    datasets.push({
      label: "Gestern",
      data: comparisonData.yesterday.map((entry) => entry.free_capacity),
      borderColor: "rgba(192, 75, 75, 1)",
      borderWidth: 3, // Increase line thickness
      borderDash: [5, 5],
      pointRadius: 0, // Remove dots
    });
  }

  if (comparisonData.lastWeek) {
    datasets.push({
      label: "Letzte Woche",
      data: comparisonData.lastWeek.map((entry) => entry.free_capacity),
      borderColor: "rgba(75, 75, 192, 1)",
      borderWidth: 3, // Increase line thickness
      borderDash: [5, 5],
      pointRadius: 0, // Remove dots
    });
  }

  const minTime = new Date(labels[0]).setHours(0, 0, 0, 0);
  const maxTime = new Date(labels[0]).setHours(23, 59, 59, 999);

  if (chartInstance) {
    chartInstance.data.labels = labels;
    chartInstance.data.datasets = datasets;
    chartInstance.update();
  } else {
    chartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: datasets,
      },
      options: {
        scales: {
          x: {
            type: "time",
            time: {
              unit: "hour",
              tooltipFormat: "HH:mm",
              displayFormats: {
                hour: "HH:mm",
              },
            },
            min: minTime,
            max: maxTime,
          },
          y: {
            beginAtZero: true,
          },
        },
        plugins: {
          zoom: {
            pan: {
              enabled: true,
              mode: "x",
              threshold: 1,
            },
            limits: {
              x: { min: minTime, max: maxTime },
            },
            zoom: {
              wheel: {
                enabled: true,
              },
              pinch: {
                enabled: true,
              },
              mode: "x",
            },
          },
        },
      },
    });
  }
}

async function updateChart() {
  const garageId = document.getElementById("garage-select").value;
  const date = document.getElementById("date-select").value;
  if (garageId) {
    window.location.hash = garageId;

    const data = await fetchData(garageId, date);
    const comparisonData = {};
    if (document.getElementById("show-yesterday").checked) {
      comparisonData.yesterday = (await fetchData(
        garageId,
        date,
        24 * 60 * 60 * 1000
      )).map((d) => { ...d, updated_at: d.updated_at + 24 * 60 * 60 * 1000 });
    }
    if (document.getElementById("show-last-week").checked) {
      comparisonData.lastWeek = (await fetchData(
        garageId,
        date,
        7 * 24 * 60 * 60 * 1000
      )).map((d) => { ...d, updated_at: d.updated_at + 7 * 24 * 60 * 60 * 1000 });
    }
    renderChart(data, comparisonData);

    // Clear any existing interval
    if (updateInterval) {
      clearInterval(updateInterval);
    }

    // Set interval to update data every 5 minutes
    updateInterval = setInterval(async () => {
      const newData = await fetchData(garageId, date);
      renderChart(newData, comparisonData);
    }, 300000); // 300000 ms = 5 minutes
  }
}

document
  .getElementById("garage-select")
  .addEventListener("change", updateChart);

document.getElementById("date-select").addEventListener("change", updateChart);

document
  .getElementById("show-yesterday")
  .addEventListener("change", updateChart);

document
  .getElementById("show-last-week")
  .addEventListener("change", updateChart);

document.getElementById("prev-date").addEventListener("click", () => {
  const dateInput = document.getElementById("date-select");
  const currentDate = new Date(dateInput.value);
  currentDate.setDate(currentDate.getDate() - 1);
  dateInput.value = currentDate.toISOString().split("T")[0];
  updateChart();
});

document.getElementById("next-date").addEventListener("click", () => {
  const dateInput = document.getElementById("date-select");
  const currentDate = new Date(dateInput.value);
  currentDate.setDate(currentDate.getDate() + 1);
  dateInput.value = currentDate.toISOString().split("T")[0];
  updateChart();
});

fetchGarages();
